import {useEffect, useState, useMemo} from "react";
import { expandDeltas } from "../utils/expandDeltas";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceArea
} from "recharts";
import { getSqlWorker } from "../db";
import {CIV, CHART_COLORS} from "../civPalette";
import { CIVILIZATION_DEFINES } from "../icons";
import { useLang } from "../LangContext";
import { useChartZoom } from "../hooks/useChartZoom";
import { useLegendToggle, InteractiveLegend } from "../hooks/useLegendToggle";
import { HashParams, mergeHash } from "../routing";
import { CivXTick, CivYTick, CivAxisLabel, CivTooltip } from "./CivSvgText";
import CivSelect from "./CivSelect";

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

export default function GameView({ initialHash = {} }: Props) {
    const { t } = useLang();
    const [gameIds,   setGameIds]   = useState<string[]>([]);
    const [datasets,  setDatasets]  = useState<Dataset[]>([]);
    const [selGame,   setSelGame]   = useState("");
    const [selDs,     setSelDs]     = useState("");
    const [chartData, setChartData] = useState<any[]>([]);
    const [players,   setPlayers]   = useState<string[]>([]);
    const [civs,   setCivs]   = useState<string[]>([]);
    const [colors,   setColors]   = useState<number[]>([]);
    const [noData,    setNoData]    = useState(false);


    useEffect(() => {
        (async () => {
            const [gRes, dRes] = await Promise.all([
                getSqlWorker().exec(`
                    SELECT DISTINCT GameID, REPLACE(GROUP_CONCAT(Player ORDER BY PlayerID),',',', ') FROM Games
                    LEFT JOIN GameSeeds USING(GameID)
                    WHERE GameSeed NOT NULL
                    GROUP BY GameID
                    ORDER BY GameID
                `),
                getSqlWorker().exec("SELECT ReplayDataSetID, ReplayDataSetKey FROM ReplayDataSetKeys ORDER BY ReplayDataSetKey"),
            ]);
            const ids: string[] = [];
            gRes[0]?.values.forEach((r: any[]) => ids[r[0]] = String(r[1]));
            const ds: Dataset[] = dRes[0]?.values.map((r: any[]) => ({
                id: r[0] as number, key: r[1] as string,
            })) ?? [];
            //console.log('ids', ids)
            setGameIds(ids);
            setDatasets(ds);

            if (initialHash.GameID && ids[Number(initialHash.GameID)] !== undefined) {
                setSelGame(initialHash.GameID);
            } else if (ids.length) {
                setSelGame(String(ids.findIndex((id) => id !== undefined)) ?? '1');
            }

            if (initialHash.Dataset && ds.length) {
                const match = ds.find(
                    (d) => d.key.toLowerCase() === initialHash.Dataset!.toLowerCase() || String(d.id) === initialHash.Dataset
                );
                setSelDs(match ? String(match.id) : String(ds[0].id));
            } else if (ds.length) {
                setSelDs(String(ds[0].id));
            }
        })();
    }, []);

    useEffect(() => {
        if (!selGame || !selDs || !datasets.length) return;
        const dsKey = datasets.find((d) => String(d.id) === selDs)?.key ?? selDs;
        mergeHash({ GameID: selGame, Dataset: dsKey });
    }, [selGame, selDs, datasets]);

    useEffect(() => {
        if (!selGame || !selDs) return;
        (async () => {
            const gsRes = await getSqlWorker().exec(
                `SELECT GameSeed FROM GameSeeds WHERE GameID = ${selGame} LIMIT 1`
            );
            if (!gsRes[0]?.values.length) { setChartData([]); setNoData(true); return; }
            const gameSeed = gsRes[0].values[0][0] as number;

            const pRes = await getSqlWorker().exec(`
                SELECT PlayerID, Player, IFNULL(PlayerQuitTurn, EndTurn), CivID, CivKey
                FROM Players
                JOIN GameSeeds USING(GameSeed)
                JOIN Games USING(GameID, PlayerID)
                JOIN CivKeys USING(CivID)
                WHERE GameSeed = ${gameSeed}
                ORDER BY PlayerID`
            );
            const pMap = new Map<number, string>(
                (pRes[0]?.values ?? []).map((r: any[]) => [r[0] as number, r[1] as string])
            );
            const pMap2 = new Map<number, number>(
                (pRes[0]?.values ?? []).map((r: any[]) => [r[0] as number, r[3] as number])
            );
            const pMap3 = new Map<number, string>(
                (pRes[0]?.values ?? []).map((r: any[]) => [r[0] as number, r[4] as string])
            );
            setPlayers(Array.from(pMap.values()));
            setColors(Array.from(pMap2.values()));
            setCivs(Array.from(pMap3.values()));

            const playerQuitTurns: {[key: string]: number} = {};
            for (const [_, player, playerQuitTurn] of pRes[0]?.values) {
                playerQuitTurns[player] = playerQuitTurn;
            }

            const res = await getSqlWorker().exec(`
                SELECT Turn, PlayerID, Value
                FROM ReplayDataSetsChanges
                WHERE GameSeed = ${gameSeed} AND ReplayDataSetID = ${selDs}
                ORDER BY PlayerID, Turn
            `);
            if (!res[0] || res[0].values.length === 0) { setChartData([]); setNoData(true); return; }
            setNoData(false);

            const deltaRows: [number, string, number][] = (res[0].values as [number, number, number][]).map(
                ([turn, pid, delta]) => [turn, pMap.get(pid) ?? `Player ${pid}`, delta]
            );
            setChartData(expandDeltas(deltaRows, playerQuitTurns));
        })();
    }, [selGame, selDs]);

    const legend = useLegendToggle(players);
    const visiblePlayers = useMemo(() => players.filter((p) => legend.isVisible(p)), [players, legend.isVisible]);
    const legendItems = useMemo(() =>
            players.map((name, i) => ({ key: name, color: CivToColor(colors[i]) ?? CHART_COLORS[i % CHART_COLORS.length], label: `${name} (${civs[i]})` })),
        [players],
    );

    const zoom = useChartZoom(chartData, "turn", visiblePlayers);
    const datasetName = datasets.find((ds) => String(ds.id) === selDs)?.key ?? "";

    return (
        <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                <h3 className="text-base tracking-wide mb-0.5" style={{ color: CIV.text }}>{t("TXT_KEY_GAME_TITLE")}</h3>
                <div className="flex flex-wrap gap-4">
                    <CivSelect
                        label={t("TXT_KEY_GAME")}
                        value={selGame}
                        onChange={setSelGame}
                        options={gameIds.map((label, id) => ({ value: String(id), label: `Game ${id} (${label})` }))}
                        minWidth={450}
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
                                {players.map((name, i) =>
                                    legend.isVisible(name) ? (
                                        <Line key={name} type="monotone" dataKey={name}
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
