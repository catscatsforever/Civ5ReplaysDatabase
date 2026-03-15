import { useEffect, useState, useMemo, useRef } from "react";
import { expandDeltas } from "../utils/expandDeltas";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceArea,
} from "recharts";
import { getSqlWorker } from "../db";
import { CIV, CHART_COLORS } from "../civPalette";
import { useLang } from "../LangContext";
import { useChartZoom } from "../hooks/useChartZoom";
import { useLegendToggle, InteractiveLegend } from "../hooks/useLegendToggle";
import { HashParams, mergeHash } from "../routing";
import CivSelect from "@/components/CivSelect.tsx";
import {CivAxisLabel, CivTooltip, CivXTick, CivYTick} from "@/components/CivSvgText.tsx";

interface Dataset { id: number; key: string }
interface GamePlayerRow {
    GameSeed:     number;
    PlayerID:     number;
    Player:       string;
    Standing:     number;
    CivID:        string;
    WinType:      string | null;
    PolicyBranch: string[];
    Wonders:      string[];
}
interface GroupDef {
    id: string;
    labelKey: string;
    fallbackLabel: string;
    category: "generic" | "civilization" | "player" | "policyBranch" | "wonder";
    filter: (g: GamePlayerRow) => boolean;
}

type AvgMethod = "arithmetic" | "winsorized" | "median";

interface MatchGroup {
    id: number;
    name: string;
    selected: Set<string>;
    expanded: boolean;
    catTab: "generic" | "civilization" | "player" | "policyBranch" | "wonder";
}

function arithmeticMean(v: number[]) { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function winsorizedMean(v: number[], pct = 0.2) {
    if (!v.length) return 0;
    const s = [...v].sort((a, b) => a - b), n = s.length, k = Math.floor(n * pct);
    for (let i = 0; i < k; i++) s[i] = s[k];
    for (let i = n - k; i < n; i++) s[i] = s[n - k - 1];
    return s.reduce((a, b) => a + b, 0) / n;
}
function median(v: number[]) {
    if (!v.length) return 0;
    const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function computeAvg(v: number[], m: AvgMethod) {
    return m === "arithmetic" ? arithmeticMean(v) : m === "winsorized" ? winsorizedMean(v) : median(v);
}

const LINE_MATCHING     = "#DCBD88";
const LINE_NON_MATCHING = "#3ECFB2";
const LINE_OVERALL      = "#8BA89E";
const CHART_HEIGHT      = 460;
const SINGLE_LINE_KEYS  = ["matching", "nonMatching", "overall"];

function GroupChipSelector({ groups, catTab, setCatTab, selected, onToggle, onClear, t }: {
    groups: GroupDef[];
    catTab: "generic" | "civilization" | "player" | "policyBranch" | "wonder";
    setCatTab: (v: "generic" | "civilization" | "player" | "policyBranch" | "wonder") => void;
    selected: Set<string>;
    onToggle: (id: string) => void;
    onClear: () => void;
    t: (k: any) => string;
}) {
    const catTabs: { id: "generic" | "civilization" | "player" | "policyBranch" | "wonder"; labelKey: string }[] = [
        { id: "generic",      labelKey: "TXT_KEY_GROUP_CAT_GENERIC" },
        { id: "civilization", labelKey: "TXT_KEY_GROUP_CAT_CIVILIZATION" },
        { id: "player",       labelKey: "TXT_KEY_GROUP_CAT_PLAYER" },
        { id: "policyBranch", labelKey: "TXT_KEY_GROUP_CAT_POLICY_BRANCH" },
        { id: "wonder",       labelKey: "TXT_KEY_GROUP_CAT_WONDER" },
    ];
    const visibleGroups = groups.filter(g => g.category === catTab);
    const selectedGroupDefs = groups.filter(g => selected.has(g.id));
    const getLabel = (g: GroupDef) => g.labelKey ? t(g.labelKey as any) : g.fallbackLabel;

    return (
        <>
            <div className="flex gap-2 mb-3">
                {catTabs.map(ct => (
                    <button key={ct.id} onClick={() => setCatTab(ct.id)}
                            className={`civ-btn civ-btn-chip ${catTab === ct.id ? "civ-btn-active" : ""}`}>
                        {t(ct.labelKey as any)}
                    </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
                {visibleGroups.map(g => (
                    <button key={g.id} onClick={() => onToggle(g.id)}
                            className={`civ-btn civ-btn-chip ${selected.has(g.id) ? "civ-btn-active" : ""}`}>
                        {getLabel(g)}
                    </button>
                ))}
            </div>
            <div className="flex items-center flex-wrap gap-2">
        <span className="text-xs tracking-widest uppercase" style={{ color: CIV.muted }}>
          {t("TXT_KEY_GROUP_SELECTED_GROUPS" as any)}:
        </span>
                {selectedGroupDefs.length === 0 ? (
                    <span className="text-xs italic" style={{ color: CIV.muted }}>{t("TXT_KEY_GROUP_NO_GROUPS" as any)}</span>
                ) : (
                    <>
                        {selectedGroupDefs.map(g => (
                            <span key={g.id} className="civ-btn civ-btn-tag civ-btn-active" style={{ cursor: "default" }}>
                {getLabel(g)}
                                <button onClick={() => onToggle(g.id)} className="ml-1 hover:opacity-70 text-sm leading-none" style={{ color: CIV.red }}>×</button>
              </span>
                        ))}
                        <button onClick={onClear} className="civ-btn civ-btn-chip civ-btn-danger">{t("TXT_KEY_GROUP_CLEAR_ALL" as any)}</button>
                    </>
                )}
            </div>
        </>
    );
}

interface Props { initialHash?: HashParams }

export default function GroupView({ initialHash = {} }: Props) {
    const { t } = useLang();

    const [datasets,    setDatasets]    = useState<Dataset[]>([]);
    const [allRows,     setAllRows]    = useState<GamePlayerRow[]>([]);
    const [civs,        setCivs]       = useState<string[]>([]);
    const [playerNames, setPlayerNames] = useState<string[]>([]);
    const [policyBranches, setPolicyBranches] = useState<string[]>([]);
    const [wonders, setWonders] = useState<string[]>([]);
    const [selDs,       setSelDs]      = useState("");
    const [avgMethod,   setAvgMethod]  = useState<AvgMethod>("arithmetic");
    const [mode, setMode] = useState<"single" | "multi">("single");
    const [singleCatTab, setSingleCatTab] = useState<"generic" | "civilization" | "player" | "policyBranch" | "wonder">("generic");
    const [singleSelected, setSingleSelected] = useState<Set<string>>(new Set());
    const nextGroupId = useRef(1);
    const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([
        { id: 0, name: `${t("TXT_KEY_GROUP_GROUP_LABEL" as any)} 1`, selected: new Set(), expanded: true, catTab: "generic" },
    ]);
    const [chartData,   setChartData] = useState<any[]>([]);
    const [loading,     setLoading]   = useState(false);
    const prevDataRef = useRef<any[]>([]);

    useEffect(() => {
        (async () => {
            const [dRes, rowRes, polRes, wnRes] = await Promise.all([
                getSqlWorker().exec("SELECT ReplayDataSetID, ReplayDataSetKey FROM ReplayDataSetKeys ORDER BY ReplayDataSetKey"),
                getSqlWorker().exec(`
                     SELECT GameSeed, Games.PlayerID, Player, Standing, CivKey, WinType, IFNULL(pb, ''), IFNULL(wonders,'')
                    FROM Games
                    JOIN GameSeeds USING(GameID)
                    JOIN Players USING(GameSeed, PlayerID)
                    JOIN CivKeys USING(CivID)
                    JOIN WinTypes USING(WinID)
                    JOIN (
                        SELECT GameSeed, PlayerID, GROUP_CONCAT(PolicyBranch) as pb
  						FROM (
  							SELECT * FROM (
								SELECT *, COUNT(Num2) AS "Cnt_2", MAX(Turn)
								FROM (
    								SELECT *, ROW_NUMBER() OVER (PARTITION BY Value ORDER BY Turn) AS Rnk,
        							COUNT(*) OVER (PARTITION BY PolicyID) AS Cnt
        							FROM (
        							    SELECT *, Num2 AS Value FROM ReplayEvents
        							    WHERE ReplayEventType = 61
        							) AS T1
        							JOIN PolicyKeys ON PolicyID = Value
        							JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
        							JOIN GameSeeds ON GameSeeds.GameSeed = T1.GameSeed
        							JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = T1.PlayerID
        							JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = T1.PlayerID
        							JOIN CivKeys ON CivKeys.CivID = Players.CivID
  								)
								GROUP BY GameSeed, PlayerID, BranchID
							)
  							WHERE Cnt_2 = 5 AND BranchID < 9
  						) 
                        GROUP BY GameID, PlayerID
                    ) USING(GameSeed, PlayerID)
                    LEFT JOIN (
					    SELECT GameSeed, PlayerID, GROUP_CONCAT(BuildingKey) AS wonders FROM ReplayEvents
					    JOIN BuildingKeys ON BuildingID = Num2
					    JOIN BuildingClassKeys USING(BuildingClassID)
					    JOIN GameSeeds USING(GameSeed)
					    WHERE ReplayEventType = 78 AND BuildingClassKeys.TypeID = 2
                        GROUP BY GameID, PlayerID
				    ) USING(GameSeed, PlayerID)
                `),
                getSqlWorker().exec("SELECT PolicyBranch FROM PolicyBranches WHERE BranchID < 9"),
                getSqlWorker().exec("SELECT BuildingKey FROM BuildingKeys WHERE TypeID = 2"),
            ]);
            const ds: Dataset[] = (dRes[0]?.values ?? []).map((r: any[]) => ({
                id: r[0] as number, key: r[1] as string
            }));
            const rows: GamePlayerRow[] = (rowRes[0]?.values ?? []).map((r: any[]) => ({
                GameSeed: r[0] as number, PlayerID: r[1] as number, Player: r[2] as string,
                Standing: r[3] as number, CivID: r[4] as string, WinType: r[5] as string,
                PolicyBranch: r[6].split(',') as string[], Wonders: r[7].split(',') as string[],
            }));
            setDatasets(ds);
            setAllRows(rows);
            setCivs([...new Set(rows.map(r => r.CivID))].sort());
            setPlayerNames([...new Set(rows.map(r => r.Player))].sort());
            setPolicyBranches(polRes[0]?.values.map(r => r[0]));
            setWonders(wnRes[0]?.values.map(r => r[0]).sort());

            if (initialHash.Dataset && ds.length) {
                const match = ds.find(
                    (d) => d.key.toLowerCase() === initialHash.Dataset!.toLowerCase() || String(d.id) === initialHash.Dataset
                );
                setSelDs(match ? String(match.id) : String(ds[0].id));
            } else if (ds.length) {
                setSelDs(String(ds[0].id));
            }
            if (initialHash.Method) {
                const m = initialHash.Method.toLowerCase();
                if (m === "winsorized" || m === "median" || m === "arithmetic") setAvgMethod(m as AvgMethod);
            }
            if (initialHash.Groups) {
                const ids = initialHash.Groups.split(",").map(s => s.trim()).filter(Boolean);
                setSingleSelected(new Set(ids));
            }
        })();
    }, []);

    useEffect(() => {
        if (!selDs || !datasets.length) return;
        const dsKey = datasets.find((d) => String(d.id) === selDs)?.key ?? selDs;
        const groupsStr = mode === "single"
            ? Array.from(singleSelected).join(",")
            : matchGroups.map(mg => `mg${mg.id}:${Array.from(mg.selected).join("+")}`).join(",");
        mergeHash({ Dataset: dsKey, Method: avgMethod, Groups: groupsStr });
    }, [selDs, avgMethod, singleSelected, matchGroups, datasets, mode]);

    const groups: GroupDef[] = useMemo(() => {
        const gen: GroupDef[] = [
            { id: "g_all_winners", labelKey: "TXT_KEY_GROUP_GRP_ALL_WINNERS",  fallbackLabel: "", category: "generic", filter: g => g.Standing === 1 },
            { id: "g_sci_winners", labelKey: "TXT_KEY_GROUP_GRP_SCI_WINNERS",  fallbackLabel: "", category: "generic", filter: g => g.Standing === 1 && g.WinType === "Science" },
            { id: "g_dom_winners", labelKey: "TXT_KEY_GROUP_GRP_DOM_WINNERS",  fallbackLabel: "", category: "generic", filter: g => g.Standing === 1 && g.WinType === "Domination" },
            { id: "g_cul_winners", labelKey: "TXT_KEY_GROUP_GRP_CUL_WINNERS",  fallbackLabel: "", category: "generic", filter: g => g.Standing === 1 && g.WinType === "Cultural" },
            { id: "g_dip_winners", labelKey: "TXT_KEY_GROUP_GRP_DIP_WINNERS",  fallbackLabel: "", category: "generic", filter: g => g.Standing === 1 && g.WinType === "Diplomatic" },
            { id: "g_tim_winners", labelKey: "TXT_KEY_GROUP_GRP_TIM_WINNERS",  fallbackLabel: "", category: "generic", filter: g => g.Standing === 1 && g.WinType === "Time" },
        ];
        const civG: GroupDef[] = civs.map(c => ({
            id: `civ_${c}`, labelKey: "", fallbackLabel: c.replace("CIVILIZATION_", ""),
            category: "civilization" as const, filter: (g: GamePlayerRow) => g.CivID === c,
        }));
        const plG: GroupDef[] = playerNames.map(n => ({
            id: `player_${n}`, labelKey: "", fallbackLabel: n,
            category: "player" as const, filter: (g: GamePlayerRow) => g.Player === n,
        }));
        const polG: GroupDef[] = policyBranches.map(n => ({
            id: `policy_${n}`, labelKey: "", fallbackLabel: n,
            category: "policyBranch" as const, filter: (g: GamePlayerRow) => g.PolicyBranch.includes(n),
        }));
        const wnG: GroupDef[] = wonders.map(n => ({
            id: `policy_${n}`, labelKey: "", fallbackLabel: n,
            category: "wonder" as const, filter: (g: GamePlayerRow) => g.Wonders.includes(n),
        }));
        return [...gen, ...civG, ...plG, ...polG, ...wnG];
    }, [civs, playerNames]);

    const toggleSingle = (id: string) => setSingleSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const clearSingle  = () => setSingleSelected(new Set());

    const addMatchGroup = () => {
        const id = nextGroupId.current++;
        setMatchGroups(prev => [...prev, {
            id, name: `${t("TXT_KEY_GROUP_GROUP_LABEL" as any)} ${prev.length + 1}`,
            selected: new Set(), expanded: true, catTab: "generic",
        }]);
    };
    const removeMatchGroup = (mgId: number) => {
        setMatchGroups(prev => prev.length <= 1 ? prev : prev.filter(mg => mg.id !== mgId));
    };
    const toggleMatchGroupExpanded = (mgId: number) => {
        setMatchGroups(prev => prev.map(mg => mg.id === mgId ? { ...mg, expanded: !mg.expanded } : mg));
    };
    const setMatchGroupCatTab = (mgId: number, catTab: "generic" | "civilization" | "player" | "policyBranch" | "wonder") => {
        setMatchGroups(prev => prev.map(mg => mg.id === mgId ? { ...mg, catTab } : mg));
    };
    const toggleMatchGroupSelection = (mgId: number, groupId: string) => {
        setMatchGroups(prev => prev.map(mg => {
            if (mg.id !== mgId) return mg;
            const n = new Set(mg.selected);
            n.has(groupId) ? n.delete(groupId) : n.add(groupId);
            return { ...mg, selected: n };
        }));
    };
    const clearMatchGroupSelection = (mgId: number) => {
        setMatchGroups(prev => prev.map(mg => mg.id === mgId ? { ...mg, selected: new Set() } : mg));
    };

    const lineKeys = useMemo(() => {
        if (mode === "single") return SINGLE_LINE_KEYS;
        return [...matchGroups.map(mg => `group_${mg.id}`), "overall"];
    }, [mode, matchGroups]);

    useEffect(() => {
        const hasSelection = mode === "single"
            ? singleSelected.size > 0
            : matchGroups.some(mg => mg.selected.size > 0);

        if (!selDs || allRows.length === 0 || !hasSelection) {
            setChartData([]);
            prevDataRef.current = [];
            return;
        }

        setLoading(true);
        (async () => {
            const gRes = await getSqlWorker().exec(`
                SELECT GameSeed, PlayerID, IFNULL(PlayerQuitTurn, EndTurn) as PlayerQuitTurn
                FROM Games
                JOIN GameSeeds USING(GameID)
                JOIN Players USING(GameSeed, PlayerID)
            `);
            const playerQuitTurns: {[key: string]: number} = {};
            for (const [gs, pid, playerQuitTurn] of gRes[0]?.values) {
                playerQuitTurns[`${gs}_${pid}`] = playerQuitTurn;
            }
            const res = await getSqlWorker().exec(
                `SELECT GameSeed, PlayerID, Turn, Value FROM ReplayDataSetsChanges WHERE ReplayDataSetID = ${selDs} ORDER BY GameSeed, PlayerID, Turn`
            );
            if (!res[0]) { setChartData([]); prevDataRef.current = []; setLoading(false); return; }

            const selectedGroups = groups.filter(g => singleSelected.has(g.id));
            const matchingKeys   = new Set<string>();
            const allKeys        = new Set<string>();
            allRows.forEach(row => {
                const key = `${row.GameSeed}_${row.PlayerID}`;
                allKeys.add(key);
                if (selectedGroups.some(grp => grp.filter(row))) matchingKeys.add(key);
            });

            const deltaRows: [number, string, number][] = [];
            (res[0].values as [number, number, number, number][]).forEach(([gs, pid, turn, delta]) => {
                const key = `${gs}_${pid}`;
                if (allKeys.has(key)) deltaRows.push([turn, key, delta]);
            });
            const expanded = expandDeltas(deltaRows, playerQuitTurns);

            if (mode === "single") {
                // For each turn, bucket absolute values into matching / nonMatching / overall
                const data = expanded.map(row => {
                    const turn = row["turn"] as number;
                    const matching: number[] = [];
                    const nonMatching: number[] = [];
                    const overall: number[] = [];
                    for (const key of allKeys) {
                        const val = row[key];
                        if (val === null || val === undefined) continue;
                        overall.push(val as number);
                        (matchingKeys.has(key) ? matching : nonMatching).push(val as number);
                    }
                    return {
                        turn,
                        matching:    matching.length    ? Math.round(computeAvg(matching, avgMethod) * 100) / 100    : null,
                        nonMatching: nonMatching.length ? Math.round(computeAvg(nonMatching, avgMethod) * 100) / 100 : null,
                        overall:     overall.length     ? Math.round(computeAvg(overall, avgMethod) * 100) / 100     : null,
                    };
                });

                prevDataRef.current = data;
                setChartData(data);
                setLoading(false);
            } else {
                // For each match group, determine which composite keys match
                const groupMatches: Map<number, Set<string>> = new Map();
                for (const mg of matchGroups) {
                    const selGroupDefs = groups.filter(g => mg.selected.has(g.id));
                    const keys = new Set<string>();
                    if (selGroupDefs.length > 0) {
                        allRows.forEach(row => {
                            const key = `${row.GameSeed}_${row.PlayerID}`;
                            if (selGroupDefs.some(grp => grp.filter(row))) keys.add(key);
                        });
                    }
                    groupMatches.set(mg.id, keys);
                }
                const data = expanded.map(row => {
                    const turn = row["turn"] as number;
                    const turnData: any = { turn };
                    let blob: number[][] = [];
                    const overall: number[] = [];
                    for (const key of allKeys) {
                        const val = row[key];
                        if (val === null || val === undefined) continue;
                        for (const [id, gm] of groupMatches) {
                            if (gm.has(key)) {
                                if (blob[id] ??= []) blob[id].push(val as number);
                            }
                        }
                        overall.push(val as number);
                    }
                    blob.forEach((vals, i) => {
                        turnData[`group_${i}`] = vals && vals.length ? Math.round(computeAvg(vals, avgMethod) * 100) / 100 : null;
                    })
                    turnData.overall = overall.length ? Math.round(computeAvg(overall, avgMethod) * 100) / 100 : null
                    return turnData;
                });
                prevDataRef.current = data;
                setChartData(data);
            }
            setLoading(false);
        })();
    }, [selDs, singleSelected, matchGroups, avgMethod, allRows, groups, mode]);

    const legend = useLegendToggle(lineKeys);
    const visibleLineKeys = useMemo(() => lineKeys.filter(k => legend.isVisible(k)), [legend.isVisible, lineKeys]);

    const legendItems = useMemo(() => {
        if (mode === "single") {
            return [
                { key: "matching",    color: LINE_MATCHING,     label: t("TXT_KEY_GROUP_LINE_MATCHING" as any) },
                { key: "nonMatching", color: LINE_NON_MATCHING, label: t("TXT_KEY_GROUP_LINE_NON_MATCHING" as any) },
                { key: "overall",     color: LINE_OVERALL,      label: t("TXT_KEY_GROUP_LINE_OVERALL" as any), dashed: true },
            ];
        }
        return [
            ...matchGroups.map((mg, i) => ({
                key: `group_${mg.id}`,
                color: CHART_COLORS[i % CHART_COLORS.length],
                label: mg.name,
            })),
            { key: "overall", color: LINE_OVERALL, label: t("TXT_KEY_GROUP_LINE_OVERALL" as any), dashed: true },
        ];
    }, [mode, matchGroups, t]);

    const displayData = chartData.length > 0 ? chartData : prevDataRef.current;
    const zoom = useChartZoom(displayData, "turn", visibleLineKeys);
    const datasetName = datasets.find(ds => String(ds.id) === selDs)?.key ?? "";

    const hasSelection = mode === "single"
        ? singleSelected.size > 0
        : matchGroups.some(mg => mg.selected.size > 0);
    const hasData = displayData.length > 0;

    return (
        <div className="space-y-4">
            {/* controls card */}
            <div className="rounded-xl p-5" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                <h3 className="text-base tracking-wide mb-0.5" style={{ color: CIV.text }}>{t("TXT_KEY_GROUP_TITLE" as any)}</h3>
                <p className="text-sm mb-4" style={{ color: CIV.muted }}>{t("TXT_KEY_GROUP_SUBTITLE" as any)}</p>
                <div className="flex flex-wrap gap-4 items-end">
                    <CivSelect
                        label={t("TXT_KEY_GROUP_DATASET")}
                        value={selDs}
                        onChange={setSelDs}
                        options={datasets.map(ds => ({ value: String(ds.id), label: `${ds.key}` }))}
                        minWidth={300}
                    />
                    <CivSelect
                        label={t("TXT_KEY_GROUP_AVG_METHOD")}
                        value={avgMethod}
                        onChange={(v) => setAvgMethod(v as AvgMethod)}
                        options={[
                            { value: "arithmetic", label: t("TXT_KEY_GROUP_AVG_ARITHMETIC" as any) },
                            { value: "winsorized", label: t("TXT_KEY_GROUP_AVG_WINSORIZED" as any) },
                            { value: "median",     label: t("TXT_KEY_GROUP_AVG_MEDIAN" as any) },
                        ]}
                        minWidth={100}
                    />
                    {/* mode toggle */}
                    <div className="flex flex-col gap-1">
                        <span className="text-xs tracking-widest uppercase" style={{ color: CIV.muted }}>Mode</span>
                        <div className="flex gap-1">
                            <button
                                className={`civ-btn civ-btn-chip ${mode === "single" ? "civ-btn-active" : ""}`}
                                onClick={() => setMode("single")}
                            >
                                {t("TXT_KEY_GROUP_MODE_SINGLE" as any)}
                            </button>
                            <button
                                className={`civ-btn civ-btn-chip ${mode === "multi" ? "civ-btn-active" : ""}`}
                                onClick={() => setMode("multi")}
                            >
                                {t("TXT_KEY_GROUP_MODE_MULTI" as any)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {mode === "single" ? (
                /* SINGLE MATCH */
                <div className="rounded-xl p-5" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                    <GroupChipSelector
                        groups={groups}
                        catTab={singleCatTab}
                        setCatTab={setSingleCatTab}
                        selected={singleSelected}
                        onToggle={toggleSingle}
                        onClear={clearSingle}
                        t={t}
                    />
                </div>
            ) : (
                /* MULTI MATCH */
                <div className="space-y-3">
                    {matchGroups.map((mg, idx) => {
                        const color = CHART_COLORS[idx % CHART_COLORS.length];
                        return (
                            <div key={mg.id} className="rounded-xl overflow-hidden"
                                 style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                                {/* card header */}
                                <div className="flex items-center gap-3 px-5 py-3"
                                     style={{ borderBottom: mg.expanded ? `1px solid ${CIV.border}40` : "none" }}>
                                    {/* color indicator */}
                                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
                                    {/* group name */}
                                    <span className="text-sm" style={{ color: CIV.text }}>{mg.name}</span>
                                    {/* chip count */}
                                    <span className="text-xs px-2 py-0.5 rounded-full"
                                          style={{ background: CIV.navSel, color: mg.selected.size > 0 ? CIV.gold : CIV.muted }}>
                                        {mg.selected.size}
                                    </span>
                                    <div className="flex-1" />
                                    {/* collapse/expand */}
                                    <button
                                        className="civ-btn civ-btn-chip"
                                        onClick={() => toggleMatchGroupExpanded(mg.id)}
                                        style={{ fontSize: 11 }}
                                    >
                                        {mg.expanded ? t("TXT_KEY_GROUP_GROUP_COLLAPSE" as any) : t("TXT_KEY_GROUP_GROUP_EXPAND" as any)}
                                    </button>
                                    {/* remove (disabled if last group) */}
                                    {matchGroups.length > 1 && (
                                        <button
                                            className="civ-btn civ-btn-chip civ-btn-danger"
                                            onClick={() => removeMatchGroup(mg.id)}
                                            style={{ fontSize: 11 }}
                                        >
                                            {t("TXT_KEY_GROUP_REMOVE_GROUP" as any)}
                                        </button>
                                    )}
                                </div>
                                {/* card body */}
                                {mg.expanded && (
                                    <div className="px-5 py-4">
                                        {mg.selected.size === 0 && (
                                            <p className="text-xs italic mb-3" style={{ color: CIV.muted }}>
                                                {t("TXT_KEY_GROUP_GROUP_EMPTY" as any)}
                                            </p>
                                        )}
                                        <GroupChipSelector
                                            groups={groups}
                                            catTab={mg.catTab}
                                            setCatTab={(v) => setMatchGroupCatTab(mg.id, v)}
                                            selected={mg.selected}
                                            onToggle={(id) => toggleMatchGroupSelection(mg.id, id)}
                                            onClear={() => clearMatchGroupSelection(mg.id)}
                                            t={t}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {/* Add Group button */}
                    <button className="civ-btn civ-btn-chip" onClick={addMatchGroup}>
                        + {t("TXT_KEY_GROUP_ADD_GROUP" as any)}
                    </button>
                </div>
            )}

            {/* chart card */}
            <div className="rounded-xl p-5" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                {!hasSelection ? (
                    <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center">
                        <p style={{ color: CIV.muted }}>{t("TXT_KEY_GROUP_SELECT_HINT" as any)}</p>
                    </div>
                ) : !hasData && loading ? (
                    <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center">
                        <p style={{ color: CIV.muted }}>{t("TXT_KEY_LOADING")}</p>
                    </div>
                ) : !hasData && !loading ? (
                    <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center">
                        <p style={{ color: CIV.muted }}>{t("TXT_KEY_NO_DATA" as any)}</p>
                    </div>
                ) : (
                    <div onDoubleClick={zoom.resetZoom} style={{ cursor: zoom.isZoomed ? "zoom-out" : "crosshair" }}>
                        <div style={{ position: "relative" }}>
                            {loading && (
                                <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(5,8,11,0.5)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                                    <div className="w-6 h-6 rounded-full animate-spin" style={{ border: `2px solid ${CIV.muted}`, borderTopColor: CIV.border }} />
                                </div>
                            )}
                            <InteractiveLegend items={legendItems} hiddenKeys={legend.hiddenKeys} onClick={legend.handleClick} hint={t("TXT_KEY_LEGEND_HINT" as any)} />
                            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                                <LineChart data={zoom.zoomedData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                                           onMouseDown={zoom.onMouseDown} onMouseMove={zoom.onMouseMove} onMouseUp={zoom.onMouseUp}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CIV.grid} />
                                    <XAxis dataKey="turn" tick={<CivXTick />}
                                           label={<CivAxisLabel value={t("TXT_KEY_TURN")} fontSize={18} offset0={8} />}
                                           domain={zoom.isZoomed ? ["dataMin", "dataMax"] : undefined} />
                                    <YAxis tick={<CivYTick />} domain={zoom.yDomain ?? ["auto", "auto"]}
                                           label={<CivAxisLabel value={datasetName} fontSize={18} offset0={8} angle0={-90} />} />
                                    <Tooltip content={<CivTooltip labelStyle={{ color: CIV.gold }} label0={t('TXT_KEY_MAP_TURN_LABEL')} />} />

                                    {mode === "single" ? (
                                        <>
                                            {legend.isVisible("matching") && (
                                                <Line type="monotone" dataKey="matching" name={t("TXT_KEY_GROUP_LINE_MATCHING" as any)} stroke={LINE_MATCHING} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                                            )}
                                            {legend.isVisible("nonMatching") && (
                                                <Line type="monotone" dataKey="nonMatching" name={t("TXT_KEY_GROUP_LINE_NON_MATCHING" as any)} stroke={LINE_NON_MATCHING} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                                            )}
                                            {legend.isVisible("overall") && (
                                                <Line type="monotone" dataKey="overall" name={t("TXT_KEY_GROUP_LINE_OVERALL" as any)} stroke={LINE_OVERALL} strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {matchGroups.map((mg, idx) => {
                                                const key = `group_${mg.id}`;
                                                if (!legend.isVisible(key)) return null;
                                                return (
                                                    <Line key={key} type="monotone" dataKey={key} name={mg.name}
                                                          stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={2.5}
                                                          dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                                                );
                                            })}
                                            {legend.isVisible("overall") && (
                                                <Line type="monotone" dataKey="overall" name={t("TXT_KEY_GROUP_LINE_OVERALL" as any)} stroke={LINE_OVERALL} strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
                                            )}
                                        </>
                                    )}

                                    {zoom.showRef && <ReferenceArea {...zoom.refAreaProps} />}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-right text-[10px] mt-1 select-none"
                           style={{ color: zoom.isZoomed ? CIV.teal : CIV.muted, opacity: zoom.isZoomed ? 1 : 0.6 }}>
                            {zoom.isZoomed ? t("TXT_KEY_ZOOM_ACTIVE" as any) : t("TXT_KEY_ZOOM_HINT" as any)}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
