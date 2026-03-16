import { useEffect, useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Sector, ReferenceArea,
} from "recharts";
import { getSqlWorker } from "../db";
import { CIV, TOOLTIP_STYLE } from "../civPalette";
import { useLang } from "../LangContext";
import { useChartZoom } from "../hooks/useChartZoom";
import { useLegendToggle } from "../hooks/useLegendToggle";
import { SunBurstChart } from "./SunBurstChart.tsx";

const VIRIDIS = ["#FDE725", "#90D743", "#35B779", "#21908C", "#31688E", "#440154"];

function Card({ children, title }: { children: React.ReactNode; title: string }) {
    return (
        <div className="rounded-xl overflow-hidden flex flex-col"
             style={{ background: CIV.surface, border: `2px solid ${CIV.border}`, boxShadow: "0 4px 24px #00000060" }}>
            <div className="px-5 py-4" style={{ borderBottom: `2px solid ${CIV.border}` }}>
                <h3 className="text-3xl tracking-wide" style={{ color: CIV.text }}>{title}</h3>
            </div>
            <div className="p-4 flex-1">{children}</div>
        </div>
    );
}

// Raw row type returned from SQL
type CivStandingRow = { name: string; [key: string]: number | string };
type sunBurst = { name: string; label: string; value: number; fill?: string; children: sunBurst[] }

function sortCivData(rows: CivStandingRow[]): CivStandingRow[] {
    // Sort by s1 desc, then s2 desc, ..., s6 desc (most 1st-places at top)
    return [...rows].sort((a, b) => {
        for (let s = 1; s <= 6; s++) {
            const diff = ((b[`s${s}`] as number) ?? 0) - ((a[`s${s}`] as number) ?? 0);
            if (diff !== 0) return diff;
        }
        return 0;
    });
}

function CivStandingsChart() {
    const { t } = useLang();
    const [data, setData] = useState<any[]>([]);
    const [showPct, setShowPct] = useState(false);

    useEffect(() => {
        (async () => {
            const res2 = await getSqlWorker().exec(`
                SELECT CivKey, Standing, COUNT(*) AS cnt
                FROM Games g
                JOIN GameSeeds gs ON gs.GameID = g.GameID
                JOIN Teams tm     ON tm.GameSeed = gs.GameSeed AND tm.LeaderID = g.PlayerID
                JOIN Players pl   ON pl.GameSeed = gs.GameSeed AND pl.TeamID = tm.TeamID
                JOIN CivKeys USING(CivID)
                GROUP BY pl.CivID, g.Standing
                ORDER BY pl.CivID, g.Standing
            `);
            const rows = (res2[0]);
            if (!rows) return;
            const civMap = new Map<string, Record<string, number>>();
            (rows.values as [string, number, number][]).forEach(([civ, standing, cnt]) => {
                const key = civ.replace("CIVILIZATION_", "");
                if (!civMap.has(key)) civMap.set(key, {});
                civMap.get(key)![`s${standing}`] = cnt;
            });
            setData(sortCivData(Array.from(civMap.entries()).map(([name, vals]) => ({ name, ...vals }))));
        })();
    }, []);

    const standings = [1, 2, 3, 4, 5, 6];
    const sKeys = standings.map((s) => `s${s}`);

    // Compute percentage data: for each civ, divide each standing count by total games for that civ
    const displayData = useMemo<CivStandingRow[]>(() => {
        if (!showPct) return data;
        return sortCivData(data.map((row) => {
            const total = standings.reduce((sum, s) => sum + ((row[`s${s}`] as number) ?? 0), 0);
            const pctRow: CivStandingRow = { name: row.name as string };
            standings.forEach((s) => {
                const abs = (row[`s${s}`] as number) ?? 0;
                pctRow[`s${s}`] = total > 0 ? Math.round((abs / total) * 1000) / 10 : 0;
                // Store absolute value alongside for tooltip
                pctRow[`s${s}_abs`] = abs;
            });
            return pctRow;
        }));
    }, [data, showPct]);
    const legend = useLegendToggle(sKeys);
    const visibleKeys = useMemo(() => sKeys.filter((k) => legend.isVisible(k)), [legend.isVisible, sKeys.join(",")]);
    const zoom = useChartZoom(displayData, "name", visibleKeys, { layout: "vertical" });

    // Custom tooltip that always shows absolute values
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ ...TOOLTIP_STYLE, padding: "10px 14px" }}>
                <p style={{ color: CIV.gold, marginBottom: 6, fontWeight: 600 }}>{label}</p>
                {[...payload].map((entry: any) => {
                    const sNum = String(entry.dataKey).replace("s", "");
                    const absVal = showPct ? (entry.payload[`s${sNum}_abs`] ?? entry.value) : entry.value;
                    const pctVal = showPct ? entry.value : null;
                    return (
                        <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: entry.fill, flexShrink: 0 }} />
                            <span style={{ color: CIV.text, fontSize: 12 }}>
                                {t("TXT_KEY_SUMMARY_CIV_PLACE")} {sNum}:{" "}
                                <span style={{ color: CIV.gold }}>
                                    {absVal} {showPct && pctVal !== null && <span style={{ color: CIV.muted }}>({pctVal}%)</span>}
                                </span>
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <Card title={t("TXT_KEY_SUMMARY_CIV_TITLE")}>
            {/* Toggle row */}
            <div className="flex items-center gap-2 mb-3" style={{ justifyContent: 'right' }}>
                <button
                    className={`civ-btn civ-btn-chip${!showPct ? " civ-btn-active" : ""}`}
                    onClick={() => setShowPct(false)}
                >{t("TXT_KEY_SUMMARY_CIV_TOGGLE_ABS")}</button>
                <button
                    className={`civ-btn civ-btn-chip${showPct ? " civ-btn-active" : ""}`}
                    onClick={() => setShowPct(true)}
                >{t("TXT_KEY_SUMMARY_CIV_TOGGLE_PCT")}</button>
            </div>
            <div onDoubleClick={zoom.resetZoom} style={{ cursor: zoom.isZoomed ? "zoom-out" : "crosshair" }}>
                <ResponsiveContainer width="100%" height={1140}>
                    <BarChart data={zoom.zoomedData} layout="vertical"
                              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                              onMouseDown={zoom.onMouseDown} onMouseMove={zoom.onMouseMove} onMouseUp={zoom.onMouseUp}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CIV.grid} />
                        <XAxis
                            type="number" tick={{ fill: CIV.tick, fontSize: 11 }} allowDecimals={showPct}
                            tickFormatter={showPct ? (v) => `${Math.round(v)}%` : undefined}
                            domain={showPct ? [0, 100] : undefined}
                            label={{
                                value: showPct ? t("TXT_KEY_SUMMARY_CIV_X_LABEL_PCT") : t("TXT_KEY_SUMMARY_CIV_Y_LABEL"),
                                position: "insideBottom", offset: -4, fill: CIV.muted, fontSize: 11,
                            }}
                        />
                        <YAxis dataKey="name" type="category" tick={{ fill: CIV.tick, fontSize: 11 }} width={110} interval={0} />
                        <Tooltip content={<CustomTooltip />} />
                        {standings.map((s, i) =>
                            legend.isVisible(`s${s}`) ? (
                                <Bar key={s} dataKey={`s${s}`} stackId="a" fill={VIRIDIS[i]} isAnimationActive={false} />
                            ) : null,
                        )}
                        {zoom.showRef && <ReferenceArea {...zoom.refAreaProps} />}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}


function VictoryIdeologyChart() {
    const { t } = useLang();
    const [data, setData] = useState<sunBurst>({ name: 'Root', label: '', value: 0, children: [] });
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const winLabel: Record<string, string> = {
        domination: t("TXT_KEY_SUMMARY_WIN_DOMINATION"),
        scientific: t("TXT_KEY_SUMMARY_WIN_SCIENTIFIC"),
        diplomatic: t("TXT_KEY_SUMMARY_WIN_DIPLOMATIC"),
        cultural:   t("TXT_KEY_SUMMARY_WIN_CULTURAL"),
        time:       t("TXT_KEY_SUMMARY_WIN_TIME"),
    };

    const WIN_COLORS: Record<string, string> = {
        Domination: '#BE1600',
        Science: '#0089AD',
        Diplomatic: '#7E73D3',
        Cultural: '#AD007B',
        Time: '#84572D',
    };
    useEffect(() => {
        (async () => {
            const res = await getSqlWorker().exec(`
                WITH T2 AS (
                    SELECT WinID, IFNULL(BranchID, -1) AS BranchID
                    FROM Games
                    JOIN GameSeeds USING(GameID)
                    LEFT JOIN (
                        SELECT GameID AS gid, Player AS plr, MAX(Turn) AS mt, BranchID
                        FROM ReplayEvents
                        JOIN GameSeeds USING(GameSeed)
                        JOIN Games USING(GameID, PlayerID)
                        JOIN PolicyKeys ON PolicyID = Num2
                        WHERE ReplayEventType = 61 AND BranchID IN (9,10,11) AND WinID > 0
                        GROUP BY gid, plr
                    ) ON gid = GameID AND plr = Player
                    WHERE WinID > 0 AND GameSeed NOT NULL
                    GROUP BY GameID
                )
                SELECT
                REPLACE(PRINTF("[%s,%s]", wt, GROUP_CONCAT(QUOTE(PolicyBranch))), '''', '"') AS "labels",
                REPLACE(PRINTF("[%s,%s]", wt, GROUP_CONCAT(QUOTE(id))), '''', '"') AS "ids",
                REPLACE(PRINTF("[%s,%s]", root, GROUP_CONCAT(QUOTE(WinType))), '''', '"') AS "parents",
                PRINTF("[%s,%s]", gsum, GROUP_CONCAT(QUOTE("sum"))) AS "values"
                FROM (
                    SELECT PRINTF("%s-%s", WinType, IIF(BranchID != -1, PolicyBranch, "No Ideology")) AS id, WinType,
                    IIF(BranchID != -1, PolicyBranch, "No Ideology") AS PolicyBranch, COUNT(WinID) AS "sum"
                    FROM T2
                    JOIN WinTypes USING(WinID)
                    LEFT JOIN PolicyBranches USING(BranchID)
                    GROUP BY WinID, BranchID
                )
                LEFT JOIN (
                    SELECT GROUP_CONCAT(QUOTE('')) AS root, GROUP_CONCAT(QUOTE(wintype)) AS wt, GROUP_CONCAT(wsum) AS gsum FROM (
                        SELECT WinType, COUNT(BranchID) AS wsum
                        FROM T2
                        JOIN WinTypes USING(WinID)
                        GROUP BY WinID
                    )
                );
            `);
            const x: { labels: string[], ids: string[], values: number[], parents: string[], suffix: string[] } = {labels: [], ids: [], values: [], parents: [], suffix: [] }
            Object.assign(x, ...res[0].columns.map((n, index) => ({[n]: JSON.parse(res[0].values[0][index])})))
            const total = (x.values ?? []).reduce((partialSum, a) => partialSum + a, 0);
            if (!res[0]) return;
            const blob: sunBurst = { name: 'Root', label: '', value: 0, children: [] };
            (x.ids ?? []).forEach((r, i) => {
                const name = x.labels[i]
                const parent = x.parents[i]
                const value = x.values[i]
                if (parent === "") {
                    //blob.value += value;
                    blob?.children.push({ name: name, label: `${value} (${(value / total * 100).toFixed(2)}%)`, value: 0, fill: WIN_COLORS[r], children: [] })
                }
                else {
                    blob?.children.find(v => v.name === parent)?.children.push({ name: name, label: '', value: value, fill: WIN_COLORS[parent] + "CC", children: [] })
                }
            });
            console.log('DATA', x, blob)
            setData(blob);
        })();
    }, []);

    //const allPieKeys = useMemo(() => data.map((d) => d.name), [data]);
    //const legend = useLegendToggle(allPieKeys);
    //useEffect(() => { setActiveIndex(null); }, [legend.hiddenKeys]);
    //const visibleData = useMemo(() => data.filter((d) => legend.isVisible(d.name)), [data, legend.isVisible]);
    //console.log('vd', visibleData)
    //const legendItems = useMemo(() =>
    //      //data.map((d) => ({ key: d.name, color: WIN_COLORS[d.name] ?? CIV.gold, label: winLabel[d.name] ?? d.name })),
    //  // eslint-disable-next-line react-hooks/exhaustive-deps
    //    [data, t],
    //);

    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
        return (
            <g>
                <text x={cx} y={cy - 12} textAnchor="middle" fill={CIV.text} fontSize={14}>{winLabel[payload.name] ?? payload.name}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fill={CIV.muted} fontSize={12}>{value} {t("TXT_KEY_SUMMARY_WIN_WINS")}</text>
                <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
                        startAngle={startAngle} endAngle={endAngle} fill={fill} />
            </g>
        );
    };

    return (
        <Card title={t("TXT_KEY_SUMMARY_WIN_TITLE")}>
            <ResponsiveContainer width="100%" height={450} className="flex gap-2 flex-wrap" style={{ justifyContent: 'center' }}>
                <SunBurstChart data={data} size={450}
                               dataKey="value" nameKey="name"
                               {...(activeIndex !== null ? { activeIndex } : {} as any)}
                               activeShape={renderActiveShape}
                               onMouseEnter={(_: any, i: number) => setActiveIndex(i)}
                               onMouseLeave={() => setActiveIndex(null)}
                               isAnimationActive={false}>
                </SunBurstChart>
            </ResponsiveContainer>
            {/*<InteractiveLegend items={legendItems} hiddenKeys={legend.hiddenKeys} onClick={legend.handleClick} hint={t("TXT_KEY_LEGEND_HINT")} />*/}
        </Card>
    );
}

function GamesPlayedChart() {
    const { t } = useLang();
    const [data, setData] = useState<{ game: string; pct: number }[]>([]);

    useEffect(() => {
        (async () => {
            const res = await getSqlWorker().exec(`
                SELECT PlayerGameNumber, COUNT(DISTINCT Player) AS players
                FROM Games WHERE PlayerGameNumber <= 5 GROUP BY PlayerGameNumber ORDER BY PlayerGameNumber
             `);
            if (!res[0]) return;
            const rows = res[0].values as [number, number][];
            const total = rows[0][1];
            setData(rows.map(([pgn, cnt]) => ({
                game: `${t("TXT_KEY_SUMMARY_GAMES_GAME")} ${pgn}`,
                pct: total > 0 ? Math.round((cnt / total) * 1000) / 10 : 0,
            })));
        })();
    }, [t]);

    const zoom = useChartZoom(data, "game", ["pct"]);

    return (
        <Card title={t("TXT_KEY_SUMMARY_GAMES_TITLE")}>
            <div onDoubleClick={zoom.resetZoom} style={{ cursor: zoom.isZoomed ? "zoom-out" : "crosshair" }}>
                <ResponsiveContainer width="100%" height={234}>
                    <BarChart data={zoom.zoomedData} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}
                              onMouseDown={zoom.onMouseDown} onMouseMove={zoom.onMouseMove} onMouseUp={zoom.onMouseUp}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CIV.grid} />
                        <XAxis dataKey="game" tick={{ fill: CIV.tick, fontSize: 12 }} />
                        <YAxis tick={{ fill: CIV.tick, fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={zoom.yDomain ?? [0, 100]} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val: any) => [`${val}% ${t("TXT_KEY_SUMMARY_GAMES_TOOLTIP")}`, ""]} />
                        <Bar dataKey="pct" fill={CIV.teal} radius={[4, 4, 0, 0]} />
                        {zoom.showRef && <ReferenceArea {...zoom.refAreaProps} />}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function BannedCivsChart() {
    const { t } = useLang();
    const [data, setData] = useState<{ Civ: string; Count: number }[]>([]);

    useEffect(() => {
        (async () => {
            const res = await getSqlWorker().exec(`
                select civkey, count(*) from json_each('['||trim(str,',')||']')
                join replayevents
                left join gameseeds using(gameseed)
                left join games using(gameid, playerid)
                left join Players using(Gameseed, PlayerID)
                left join civkeys on civkeys.civid = value
                where replayeventtype = 103
                group by value
                order by count(*) desc
                limit 20
            `);
            if (!res[0]) return;
            const rows = res[0].values as [string, number][];
            setData(rows.map(([civ, cnt]) => ({ Civ: civ, Count: cnt })));
        })();
    }, [t]);

    const zoom = useChartZoom(data, "Civ", ["Count123"]);
    //console.log('zoom', zoom)

    return (
        (zoom.zoomedData.length > 0) && (
        <Card title={t("TXT_KEY_SUMMARY_BANNED_TITLE")}>
            <div onDoubleClick={zoom.resetZoom} style={{ cursor: zoom.isZoomed ? "zoom-out" : "crosshair" }}>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={zoom.zoomedData} margin={{ top: 8, right: 16, left: -20, bottom: 16 }}
                              onMouseDown={zoom.onMouseDown} onMouseMove={zoom.onMouseMove} onMouseUp={zoom.onMouseUp}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CIV.grid} />
                        <XAxis dataKey="Civ" tick={{ fill: CIV.tick, fontSize: 12 }} angle={45} textAnchor="start"
                               minTickGap={-200}
                               axisLine={false}/>
                        <YAxis tick={{fill: CIV.tick, fontSize: 11}}/>
                        <Tooltip contentStyle={TOOLTIP_STYLE}/>
                        <Bar dataKey="Count" fill={CIV.red} radius={[4, 4, 0, 0]} />
                        {zoom.showRef && <ReferenceArea {...zoom.refAreaProps} />}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
        )
    );
}

export default function SummaryView() {
    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-3/5 flex flex-col">
                <div className="flex-1">
                    <CivStandingsChart />
                </div>
            </div>
            <div className="lg:w-2/5 flex flex-col gap-6">
                <VictoryIdeologyChart />
                <BannedCivsChart />
                <GamesPlayedChart />
            </div>
        </div>
    );
}
