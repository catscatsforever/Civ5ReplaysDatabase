import { useEffect, useState, useMemo } from "react";
import { expandDeltas } from "../utils/expandDeltas";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceArea,
} from "recharts";
import { getSqlWorker } from "../db";
import { CIV, CHART_COLORS } from "../civPalette";
import { CIVILIZATION_DEFINES } from "../icons";
import { useLang } from "../LangContext";
import { useChartZoom } from "../hooks/useChartZoom";
import { useLegendToggle, InteractiveLegend } from "../hooks/useLegendToggle";
import { HashParams, mergeHash } from "../routing";
import CivSelect from "@/components/CivSelect.tsx";
import {CivAxisLabel, CivTooltip, CivXTick, CivYTick} from "@/components/CivSvgText.tsx";

interface Dataset { id: number; key: string; }
interface Props { initialHash?: HashParams }

function CivToColor(id: number): string {
    for (const key of Object.keys(CIVILIZATION_DEFINES)) {
        if (CIVILIZATION_DEFINES[key].CivID === id) {
            return CIVILIZATION_DEFINES[key].SecondaryColor;
        }
    }
    return CIVILIZATION_DEFINES.CIVILIZATION_BARBARIAN.SecondaryColor;
}

export default function PlayerView({ initialHash = {} }: Props) {
    const { t } = useLang();
    // Players come from Games.Player (unique names)
    const [players,   setPlayers]   = useState<string[]>([]);
    const [datasets,  setDatasets]  = useState<Dataset[]>([]);
    const [selPlayer, setSelPlayer] = useState("");
    const [selDs,     setSelDs]     = useState("");
    const [chartData, setChartData] = useState<any[]>([]);
    const [gameKeys,  setGameKeys]  = useState<string[]>([]);
    const [civs,   setCivs]   = useState<string[]>([]);
    const [colors,   setColors]   = useState<number[]>([]);
    const [noData,    setNoData]    = useState(false);

    useEffect(() => {
        (async () => {
            const [pRes, dRes] = await Promise.all([
                getSqlWorker().exec(`
                    SELECT DISTINCT Player , REPLACE(GROUP_CONCAT(CivKey ORDER BY GameID),',',', ') FROM Games
                    LEFT JOIN GameSeeds USING(GameID)
                    LEFT JOIN Players USING(GameSeed, PlayerID)
                    LEFT JOIN CivKeys USING(CivID)
                    WHERE GameSeed NOT NULL
                    GROUP BY Player
                    ORDER BY Player`),
                getSqlWorker().exec("SELECT ReplayDataSetID, ReplayDataSetKey FROM ReplayDataSetKeys ORDER BY ReplayDataSetKey"),
            ]);
            const ps = (pRes[0]?.values ?? []).map((r: any[]) => r[0]);
            const ds: Dataset[] = (dRes[0]?.values ?? []).map((r: any[]) => ({
                id: r[0] as number, key: r[1] as string,
            }));
            setPlayers(ps);
            setDatasets(ds);

            if (initialHash.Player && ps.length) {
                const match = ps.find((p) => p.toLowerCase() === initialHash.Player!.toLowerCase());
                setSelPlayer(match ?? (ps[0] || ""));
            } else if (ps.length) {
                setSelPlayer(ps[0]);
            }

            if (initialHash.Dataset && ds.length) {
                const match = ds.find(
                    (d) => String(d.id) === initialHash.Dataset
                );
                setSelDs(match ? String(match.id) : String(ds[0].id));
            } else if (ds.length) {
                setSelDs(String(ds[0].id));
            }
        })();
    }, []);

    useEffect(() => {
        if (!selPlayer || !selDs || !players.length || !datasets.length) return;
        mergeHash({ Player: selPlayer, Dataset: selDs });
    }, [selPlayer, selDs, players, datasets]);

    useEffect(() => {
        if (!selPlayer || !selDs) return;
        (async () => {
            const gRes = await getSqlWorker().exec(`
                SELECT GameSeed, GameID, IFNULL(PlayerQuitTurn, EndTurn), CivID, CivKey
                FROM Players
                JOIN GameSeeds USING(GameSeed)
                JOIN Games USING(GameID, PlayerID)
                JOIN CivKeys USING(CivID)
                WHERE Player = '${selPlayer.replace(/'/g, "''")}'
                ORDER BY PlayerID
            `);
            if (!gRes[0]?.values.length) { setChartData([]); setGameKeys([]); setNoData(true); return; }

            const pMap2 = new Map<number, number>(
                (gRes[0]?.values ?? []).map((r: any[]) => [r[0] as number, r[3] as number])
            );
            setColors(Array.from(pMap2.values()));
            const pMap3 = new Map<number, string>(
                (gRes[0]?.values ?? []).map((r: any[]) => [r[0] as number, r[4] as string])
            );
            setCivs(Array.from(pMap3.values()));
            const gameRows = gRes[0].values as [number, number, number][];

            const pidRes = await getSqlWorker().exec(`
              SELECT GameSeed, PlayerID
              FROM Games
              JOIN GameSeeds USING(GameID)
              WHERE Player = '${selPlayer.replace(/'/g, "''")}'
            `);
            const seedToPid = new Map<number, number>(
                (pidRes[0]?.values ?? []).map((r: any[]) => [r[0] as number, r[1] as number])
            );

            const gKeys: string[] = [];
            const allDeltaRows: [number, string, number][] = [];
            const playerQuitTurns: {[key: string]: number} = {};

            for (const [gameSeed, gameId, playerQuitTurn] of gameRows) {
                const pid = seedToPid.get(gameSeed);
                if (pid === undefined) continue;
                const gKey = `${t("TXT_KEY_GAME")} ${gameId}`;
                gKeys.push(gKey);

                const res = await getSqlWorker().exec(`
                  SELECT Turn, Value
                  FROM ReplayDataSetsChanges
                  WHERE GameSeed = ${gameSeed} AND ReplayDataSetID = ${selDs} AND PlayerID = ${pid}
                  ORDER BY Turn
                `);
                (res[0]?.values ?? []).forEach(([turn, delta]: any[]) => {
                    allDeltaRows.push([turn as number, gKey, delta as number]);
                });
                playerQuitTurns[gKey] = playerQuitTurn;
            }

            if (gKeys.length === 0) { setChartData([]); setGameKeys([]); setNoData(true); return; }
            setNoData(false);
            setGameKeys(gKeys);
            //console.log('playerQuitTurns', playerQuitTurns)
            setChartData(expandDeltas(allDeltaRows, playerQuitTurns));
        })();
    }, [selPlayer, selDs, t]);

    const legend = useLegendToggle(gameKeys);
    const visibleKeys = useMemo(() => gameKeys.filter((k) => legend.isVisible(k)), [gameKeys, legend.isVisible]);
    const legendItems = useMemo(() =>
            gameKeys.map((key, i) => ({ key, color: CivToColor(colors[i]) ?? CHART_COLORS[i % CHART_COLORS.length], label: `${key} (${civs[i]})` })),
        [gameKeys],
    );

    const zoom = useChartZoom(chartData, "turn", visibleKeys);
    const datasetName = datasets.find((ds) => String(ds.id) === selDs)?.key ?? "";

    return (
        <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                <h3 className="text-base tracking-wide mb-0.5" style={{ color: CIV.text }}>{t("TXT_KEY_PLAYER_TITLE")}</h3>
                <div className="flex flex-wrap gap-4">
                    <CivSelect
                        label={t("TXT_KEY_PLAYER")}
                        value={selPlayer}
                        onChange={setSelPlayer}
                        options={players.map((p) => ({ value: p, label: p }))}
                        minWidth={200}
                    />
                    <CivSelect
                        label={t("TXT_KEY_DATASET")}
                        value={selDs}
                        onChange={setSelDs}
                        options={datasets.map((ds) => ({ value: String(ds.id), label: `${ds.key}` }))}
                        minWidth={300}
                    />
                </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                {noData ? (
                    <p className="text-center py-16" style={{ color: CIV.muted }}>{t("TXT_KEY_NO_DATA")}</p>
                ) : (
                    <div onDoubleClick={zoom.resetZoom} style={{ cursor: zoom.isZoomed ? "zoom-out" : "crosshair" }}>
                        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: CIV.muted }}>{selPlayer}</p>
                        <InteractiveLegend items={legendItems} hiddenKeys={legend.hiddenKeys} onClick={legend.handleClick} hint={t("TXT_KEY_LEGEND_HINT")} />
                        <ResponsiveContainer width="100%" height={420}>
                            <LineChart data={zoom.zoomedData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                                       onMouseDown={zoom.onMouseDown} onMouseMove={zoom.onMouseMove} onMouseUp={zoom.onMouseUp}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CIV.grid} />
                                <XAxis dataKey="turn" tick={<CivXTick />}
                                       label={<CivAxisLabel value={t("TXT_KEY_TURN")} fontSize={18} offset0={8} />}
                                       domain={zoom.isZoomed ? ["dataMin", "dataMax"] : undefined} />
                                <YAxis tick={<CivYTick />} domain={zoom.yDomain ?? ["auto", "auto"]}
                                       label={<CivAxisLabel value={datasetName} fontSize={18} offset0={8} angle0={-90} />} />
                                <Tooltip content={<CivTooltip labelStyle={{ color: CIV.gold }} label0={t('TXT_KEY_TURN')} />} />
                                {gameKeys.map((key, i) =>
                                    legend.isVisible(key) ? (
                                        <Line key={key} type="monotone" dataKey={key}
                                              stroke={CivToColor(colors[i]) ?? CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2}
                                              dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                                    ) : null,
                                )}
                                {zoom.showRef && <ReferenceArea {...zoom.refAreaProps} />}
                            </LineChart>
                        </ResponsiveContainer>
                        <p className="text-right text-[10px] mt-1 select-none"
                           style={{ color: zoom.isZoomed ? CIV.teal : CIV.muted, opacity: zoom.isZoomed ? 1 : 0.6 }}>
                            {zoom.isZoomed ? t("TXT_KEY_ZOOM_ACTIVE") : t("TXT_KEY_ZOOM_HINT")}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
