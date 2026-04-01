import { useEffect, useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, useChartWidth,
    ResponsiveContainer, ReferenceArea, Sankey, Layer, Rectangle, SankeyNodeProps, SankeyLinkProps
} from "recharts";
import { getSqlWorker } from "../db";
import {CIV, CHART_COLORS, WIN_COLORS} from "../civPalette";
import { useLang } from "../LangContext";
import { useChartZoom } from "../hooks/useChartZoom";
import { useLegendToggle, InteractiveLegend } from "../hooks/useLegendToggle";
import { CivXTick, CivYTick, CivAxisLabel, CivTooltip } from "./CivSvgText";
import {SankeyData} from "recharts/types/chart/Sankey";

const CHART_HEIGHT = 460;

export default function DistributionView() {
    const { t } = useLang();
    const [category, setCategory] = useState<string>("beliefs");
    const [sankeyCategory, setSankeyCategory] = useState<string>("sankey_units");
    const [sankeyNumGroups, setSankeyNumGroups] = useState<number>(1);
    const [sankeyLinkColors, setSankeyLinkColors] = useState<string[]>([]);
    const [sankeyNodeColors, setSankeyNodeColors] = useState<string[]>([]);
    const [linkHighlight, setLinkHighlight] = useState<number[]>([]);
    const [rawData,  setRawData]  = useState<any[]>([]);
    const [rawSankeyData,  setRawSankeyData]  = useState<SankeyData>();
    const [itemKeys, setItemKeys] = useState<string[]>([]);
    const [loading,  setLoading]  = useState(false);

    useEffect(() => {
        setLoading(true);
        (async () => {
            let query = '';
            switch (category) {
                case "beliefs":
                    query = `
                        SELECT BeliefType, Turn, COUNT(*) FROM (
                        	SELECT Turn, ReplayEventType, Num1 AS Value FROM ReplayEvents
                        	WHERE ReplayEventType = 17
                        	UNION
                        	SELECT Turn, ReplayEventType, Num2 FROM ReplayEvents
                        	WHERE ReplayEventType = 18
                        	UNION
                        	SELECT Turn, ReplayEventType, Num3 FROM ReplayEvents
                        	WHERE ReplayEventType = 18
                        	UNION
                        	SELECT Turn, ReplayEventType, Num4 FROM ReplayEvents
                        	WHERE ReplayEventType = 18
                        	UNION
                        	SELECT Turn, ReplayEventType, Num5 FROM ReplayEvents
                        	WHERE ReplayEventType = 18
                        	UNION
                        	SELECT Turn, ReplayEventType, Num2 FROM ReplayEvents
                        	WHERE ReplayEventType = 19
                        	UNION
                        	SELECT Turn, ReplayEventType, Num3 FROM ReplayEvents
                        	WHERE ReplayEventType = 19
                        )
                        JOIN BeliefKeys ON BeliefID = Value
                        JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
                        GROUP BY Turn, BeliefKeys.TypeID
                    `;
                    break;
                case "policies":
                    query = `
                        SELECT PolicyBranch, Turn, COUNT(*) FROM (
	                    SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
	                    WHERE ReplayEventType = 61
	                    )
                        JOIN PolicyKeys ON PolicyID = Value
                        JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
                        GROUP BY Turn, PolicyBranches.BranchID
                    `;
                    break;
                case "techs":
                    query = `
                        SELECT TechnologyKey, Turn, COUNT(*) FROM (
	                    SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
	                    WHERE ReplayEventType = 91
	                    )
	                    JOIN TechnologyKeys ON TechnologyID = Value
	                    GROUP BY Turn, TechnologyKeys.TechnologyID
                    `;
                    break;
                case "wonders":
                    query = `
                        SELECT BuildingKey, Turn, COUNT(*) FROM (
                        SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
                        WHERE ReplayEventType = 78
                        )
                        JOIN BuildingKeys ON BuildingID = Value
                        WHERE TypeID = 2
                        GROUP BY Turn, BuildingKeys.BuildingID
                    `;
                    break;
                case "nat_wonders":
                    query = `
                        SELECT BuildingKey, Turn, COUNT(*) FROM (
                        SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
                        WHERE ReplayEventType = 78
                        )
                        JOIN BuildingKeys ON BuildingID = Value
                        WHERE TypeID = 1
                        GROUP BY Turn, BuildingKeys.BuildingID
                    `;
                    break;
                case "buildings":
                    query = `
                        SELECT BuildingKey, Turn, COUNT(*) FROM (
                        SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
                        WHERE ReplayEventType = 78
                        UNION ALL
                        SELECT Turn, ReplayEventType, Num3 AS Value FROM ReplayEvents
                        WHERE ReplayEventType = 63
                        )
                        JOIN BuildingKeys ON BuildingID = Value
                        WHERE TypeID = 0
                        GROUP BY Turn, BuildingKeys.BuildingID
                    `;
                    break;
                case "units":
                    query = `
                        SELECT UnitKey, Turn, COUNT(*) FROM (
                        SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
                        WHERE ReplayEventType = 77
                        UNION ALL
                        SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
                        WHERE ReplayEventType = 62
                        )
                        JOIN UnitKeys ON UnitID = Value
                        GROUP BY Turn, UnitKeys.UnitID
                    `;
                    break;
                default:
                    return;
            }
            const res = await getSqlWorker().exec(query);

            if (!res[0] || res[0].values.length === 0) {
                setRawData([]); setItemKeys([]); setLoading(false); return;
            }

            const rows = res[0].values as [number, number, number][];
            const allItems = new Set<number>();
            const turnMap  = new Map<number, Record<string, number>>();

            rows.forEach(([itemId, bin, cnt]) => {
                allItems.add(itemId);
                if (!turnMap.has(bin)) turnMap.set(bin, { turn: bin });
                const label = `${itemId}`;
                turnMap.get(bin)![label] = (turnMap.get(bin)![label] || 0) + cnt;
            });

            const sortedItems = Array.from(allItems).sort((a, b) => a - b);
            const keys = sortedItems.map((id) => `${id}`);
            const data = Array.from(turnMap.entries()).sort(([a], [b]) => a - b).map(([, row]) => row);

            setItemKeys(keys);
            setRawData(data);
            setLoading(false);
        })();
    }, [category]);

    useEffect(() => {
        setLoading(true);
        (async () => {
            let query = '';
            let pols, numEntries = 7;
            let groupSelector = sankeyNumGroups == 1 ? '0' : (sankeyNumGroups == 2 ? 'WinID > 0' : 'WinID');
            if (sankeyCategory === 'sankey_PolicyBranches') {
                numEntries = 9;
                query = `
		        	SELECT * FROM PolicyBranches
		        	;
                    SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
                        SELECT *, GROUP_CONCAT(BranchID)
                        OVER (PARTITION BY GameSeed, PlayerID ORDER BY Turn, TimeStamp ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
                        FROM (
                            SELECT *
                            FROM ReplayEvents
                            JOIN PolicyKeys ON PolicyID = Num2
                            JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
                            JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = ReplayEvents.PlayerID
                            JOIN CivKeys ON CivKeys.CivID = Players.CivID
                            JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
                            WHERE ReplayEventType = 61
                            GROUP BY ReplayEvents.GameSeed, Players.PlayerID, BranchID
                        )
                    )
                    GROUP BY GameSeed, CivID
                    HAVING COUNT(*) > 1
		        `;
            }
            else if (sankeyCategory === 'sankey_Technologies') {
                numEntries = 13;
                query = `
		        	SELECT * FROM TechnologyKeys
		        	;
		        	SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
                        SELECT *, GROUP_CONCAT(Num2)
                        OVER (PARTITION BY GameSeed, PlayerID ORDER BY Turn, TimeStamp ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
                        FROM (
                            SELECT *
                            FROM ReplayEvents
                            JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
                            JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = ReplayEvents.PlayerID
                            JOIN CivKeys ON CivKeys.CivID = Players.CivID
                            JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
                            WHERE ReplayEventType = 91 AND Num2 IN (0,24,26,32,33,34,42,43,45,47,53,54,62)
                        )
                    )
                    GROUP BY GameSeed, CivID
                    HAVING COUNT(*) > 1
		        `;
            }
            else {
                if (sankeyCategory === 'sankey_Tradition') {
                    pols = '6,7,8,9,10,11,42'
                } else if (sankeyCategory === 'sankey_Liberty') {
                    pols = '0,1,2,3,4,5,43'
                } else if (sankeyCategory === 'sankey_Honor') {
                    pols = '12,13,14,15,16,17,44'
                } else if (sankeyCategory === 'sankey_Piety') {
                    pols = '18,19,20,21,22,23,45'
                } else if (sankeyCategory === 'sankey_Patronage') {
                    pols = '24,25,26,27,28,29,46'
                } else if (sankeyCategory === 'sankey_Aesthetics') {
                    pols = '49,50,51,52,53,54,55'
                } else if (sankeyCategory === 'sankey_Commerce') {
                    pols = '30,31,32,33,34,35,47'
                } else if (sankeyCategory === 'sankey_Exploration') {
                    pols = '56,57,58,59,60,61,62'
                } else if (sankeyCategory === 'sankey_Rationalism') {
                    pols = '36,37,38,39,40,41,48'
                } else if (sankeyCategory === 'sankey_Freedom') {
                    pols = '63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,108';
                    numEntries = 16;
                } else if (sankeyCategory === 'sankey_Order') {
                    pols = '78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,109';
                    numEntries = 15;
                } else if (sankeyCategory === 'sankey_Autocracy') {
                    pols = '93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,110';
                    numEntries = 15;
                }
                query = `
	            	SELECT * FROM PolicyKeys
	            	;
	            	SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
                        SELECT *, GROUP_CONCAT(PolicyID)
                        OVER (PARTITION BY GameSeed, PlayerID ORDER BY Turn, TimeStamp ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
                        FROM (
                            SELECT *
                            FROM ReplayEvents
                            JOIN PolicyKeys ON PolicyID = Num2
                            JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
                            JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = ReplayEvents.PlayerID
                            JOIN CivKeys ON CivKeys.CivID = Players.CivID
                            JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
                            WHERE ReplayEventType = 61 AND PolicyID IN (${pols})
                            GROUP BY ReplayEvents.GameSeed, Players.PlayerID, PolicyID
                        )
                    )
                    GROUP BY GameSeed, CivID
                    HAVING COUNT(*) > 1
	            `;
            }
            const res = await getSqlWorker().exec(query);

            if (!res[1] || res[1].values.length === 0) {
                setRawData([]); setItemKeys([]); setLoading(false); return;
            }

            let keysData = res[0].values.map(k => k[1]),
                blob: { s: {[key: string]: number[][]}, t: {[key: string]: number[][]}, v: {[key: string]: number[][]} } = { s: {}, t: {}, v: {} },
                arrL: string[] = [], mask = new Array(numEntries - 1),
                nextId = 0;
            res[1].values.forEach((el) => {
                let arr = JSON.parse(el[0]);
                let winID = (sankeyNumGroups > 1) ? el[1] : 0;
                for (let i = 0; i < arr.length; i++) {
                    if (mask[i] === undefined) mask[i] = {};
                    if (i === arr.length - 1) {
                        if (!mask[i][arr[i]]) {
                            mask[i][arr[i]] = nextId++;
                            arrL.push(String(keysData[arr[i]]));
                        }
                        continue;
                    }
                    if (blob.s[i] === undefined) {
                        blob.s[i] = Array.from({length: sankeyNumGroups}, _=>[]);
                        blob.t[i] = Array.from({length: sankeyNumGroups}, _=>[]);
                        blob.v[i] = Array.from({length: sankeyNumGroups}, _=>[]);
                    }
                    let fg = false;
                    for (let j = 0; j < blob.s[i][winID].length; j++) {
                        if (blob.s[i][winID][j] === arr[i] && blob.t[i][winID][j] === arr[i + 1]) {
                            fg = true;
                            blob.v[i][winID][j]++;
                            break;
                        }
                    }
                    if (!fg) {
                        if (mask[i][arr[i]] === undefined) {
                            mask[i][arr[i]] = nextId++;
                            arrL.push(String(keysData[arr[i]]));
                        }
                        blob.s[i][winID].push(arr[i]);
                        blob.t[i][winID].push(arr[i + 1]);
                        blob.v[i][winID].push(1);
                    }
                }
            });
            let arrS: number[] = [], arrT: number[] = [], arrV: number[] = [], arrCl: string[] = [];
            for (let k in blob.s) {
                Object.keys(blob.v[k]).forEach((el) => {
                    blob.s[k][Number(el)].forEach((el2, i2) => {blob.s[k][Number(el)][i2] = mask[Number(k)][el2]});
                    blob.t[k][Number(el)].forEach((el2, i2) => {blob.t[k][Number(el)][i2] = mask[Number(k) + 1][el2]});
                    arrS.push(...blob.s[k][Number(el)]);
                    arrT.push(...blob.t[k][Number(el)]);
                    arrV.push(...blob.v[k][Number(el)]);
                    blob.v[k][Number(el)].forEach((_) => {
                        arrCl.push(sankeyNumGroups === 2 ? (Number(el) > 0 ? WIN_COLORS.anyWin : (WIN_COLORS as any)[el]) : (WIN_COLORS as any)[el]);
                    });
                });
            }
            // fix wrong x node coords for incomplete branches
            // ref. https://community.plotly.com/t/sankey-avoid-placing-incomplete-branches-to-the-right/44873
            let dummyId = nextId++;
            for (let k in blob.t) {
                if (!blob.s[(parseInt(k) + 1).toString()]) continue;
                let a = new Set(Object.values(blob.s[(parseInt(k) + 1).toString()]).flat());
                let b = new Set(Object.values(blob.t[k]).flat());
                // select nodes with no outgoing links
                let res = [...new Set([...b].filter(x => !a.has(x)))];
                // create a dummy node that continues all incomplete branches and make it invisible
                arrS.push(...res);
                arrT.push(...res.map(_ => dummyId));
                arrV.push(...res.map(_ => 0.001));
                arrCl.push(...res.map(_ => 'rgba(0,0,0,0)'));
            }

            const data = {
                nodes: arrL.map(x => {return { name: x }}),
                links: arrS.map((x, i) => {return { source: x, target: arrT[i], value: arrV[i] }}),
            }
            console.log('keys data', keysData)
            console.log('sankey data', data)
            console.log('arrCl', arrCl)
            setSankeyLinkColors(arrCl);
            setSankeyNodeColors(arrL.map(x => {const i = keysData.indexOf(x); return CHART_COLORS[i % CHART_COLORS.length] ?? CIV.muted}));
            setRawSankeyData(data);
            setLoading(false);
        })();
    }, [sankeyCategory, sankeyNumGroups]);

    const legend = useLegendToggle(itemKeys);
    const visibleKeys = useMemo(() => itemKeys.filter((k) => legend.isVisible(k)), [itemKeys, legend.isVisible]);
    const zoom = useChartZoom(rawData, "turn", visibleKeys);
    const legendItems = useMemo(() =>
            itemKeys.map((key, i) => ({ key, color: CHART_COLORS[i % CHART_COLORS.length], label: key })).sort((a,b) => a.label > b.label ? 1 : -1),
        [itemKeys],
    );

    const cats: { id: string; labelKey: string }[] = [
        { id: "beliefs", labelKey: "TXT_KEY_DIST_CAT_BELIEFS" },
        { id: "policies", labelKey: "TXT_KEY_DIST_CAT_POLICIES" },
        { id: "techs", labelKey: "TXT_KEY_DIST_CAT_TECHS" },
        { id: "wonders", labelKey: "TXT_KEY_DIST_CAT_WONDERS" },
        { id: "nat_wonders", labelKey: "TXT_KEY_DIST_CAT_NAT_WONDERS" },
        { id: "buildings", labelKey: "TXT_KEY_DIST_CAT_BUILDINGS" },
        { id: "units", labelKey: "TXT_KEY_DIST_CAT_UNITS" },
    ];
    const sankey_cats: { id: string; labelKey: string }[] = [
        { id: "sankey_PolicyBranches", labelKey: "TXT_KEY_DIST_CAT_S_POL_BRANCHES" },
        { id: "sankey_Tradition", labelKey: "TXT_KEY_DIST_CAT_S_TRADITION" },
        { id: "sankey_Liberty", labelKey: "TXT_KEY_DIST_CAT_S_LIBERTY" },
        { id: "sankey_Honor", labelKey: "TXT_KEY_DIST_CAT_S_HONOR" },
        { id: "sankey_Piety", labelKey: "TXT_KEY_DIST_CAT_S_PIETY" },
        { id: "sankey_Patronage", labelKey: "TXT_KEY_DIST_CAT_S_PATRONAGE" },
        { id: "sankey_Aesthetics", labelKey: "TXT_KEY_DIST_CAT_S_AESTHETICS" },
        { id: "sankey_Commerce", labelKey: "TXT_KEY_DIST_CAT_S_COMMERCE" },
        { id: "sankey_Exploration", labelKey: "TXT_KEY_DIST_CAT_S_EXPLORATION" },
        { id: "sankey_Rationalism", labelKey: "TXT_KEY_DIST_CAT_S_RATIONALISM" },
        { id: "sankey_Freedom", labelKey: "TXT_KEY_DIST_CAT_S_FREEDOM" },
        { id: "sankey_Order", labelKey: "TXT_KEY_DIST_CAT_S_ORDER" },
        { id: "sankey_Autocracy", labelKey: "TXT_KEY_DIST_CAT_S_AUTOCRACY" },
        { id: "sankey_Technologies", labelKey: "TXT_KEY_DIST_CAT_S_TECHS" },
    ];
    const SankeyLink = (props: SankeyLinkProps) => {
        //console.log('props',props)
        return <path
            d={`M${props.sourceX},${props.sourceY}C${props.sourceControlX},${props.sourceY} ${props.targetControlX},${props.targetY} ${props.targetX},${props.targetY}`}
            stroke={sankeyLinkColors[props.index] ?? CIV.muted}
            strokeOpacity={linkHighlight.includes(props.index) ? 0.5 : 0.8}
            strokeWidth={props.linkWidth}
            fill="none"
            onMouseEnter={() => setLinkHighlight([props.index])}
            onMouseLeave={() => setLinkHighlight([])}
        />
    }
    function SankeyNode({ x, y, width, height, index, payload }: SankeyNodeProps) {
        //console.log('payload',payload)
        const containerWidth = useChartWidth();
        if (containerWidth == null) {
            return null; // Return null if used outside a chart context
        }
        const isOut = x + width + 6 > containerWidth;
        return (
            <Layer key={`CustomNode${index}`}>
                <Rectangle x={x} y={y} width={width} height={height} fill={sankeyNodeColors[index] ?? CIV.muted} fillOpacity="1"
                           onMouseEnter={() => setLinkHighlight([...payload.sourceLinks, ...payload.targetLinks])} onMouseLeave={() => setLinkHighlight([])} />
                <text
                    textAnchor={isOut ? 'end' : 'start'}
                    x={isOut ? x - 6 : x + width + 6}
                    y={y + height / 2}
                    fontSize="14"
                    fill={CIV.text}
                >
                    {payload.name}
                </text>
                <text
                    textAnchor={isOut ? 'end' : 'start'}
                    x={isOut ? x - 6 : x + width + 6}
                    y={y + height / 2 + 13}
                    fontSize="12"
                    fill={CIV.text}
                    strokeOpacity="0.5"
                >
                    {payload.value}
                </text>
            </Layer>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl p-5" style={{background: CIV.surface, border: `2px solid ${CIV.border}`}}>
                <h3 className="text-base tracking-wide mb-0.5" style={{color: CIV.text}}>{t("TXT_KEY_DIST_TITLE")}</h3>
                <span className="tracking-widest uppercase text-xs" style={{ color: CIV.muted }}>{t("TXT_KEY_DIST_HISTOGRAM")}</span>
                <div className="flex gap-2 flex-wrap">
                    {cats.map((c) => (
                        <button key={c.id} onClick={() => {setSankeyCategory(''); setCategory(c.id);}}
                                className={`civ-btn civ-btn-chip ${category === c.id ? "civ-btn-active" : ""}`}>
                            {t(c.labelKey as any)}
                        </button>
                    ))}
                </div>
                <br/>
                <span className="tracking-widest uppercase text-xs" style={{ color: CIV.muted }}>{t("TXT_KEY_DIST_SANKEY")}</span>
                {sankeyCategory !== '' && (
                    <div className="flex gap-5 flex-wrap m-5" style={{alignItems: "center"}}>
                        <span className="tracking-widest uppercase text-[12px]"
                              style={{color: CIV.muted}}>{t("TXT_KEY_DIST_SANKEY_GROUP")}</span>
                        <label>
                            <input type="radio" name="sankeyGroups" value={1} onChange={() => setSankeyNumGroups(1)}
                                   className="w-4 h-4 mx-1 text-neutral-primary border-default-medium rounded-full ring-inset checked:ring-3 focus:outline-none focus:ring-brand-subtle border border-default appearance-none"
                                   defaultChecked={true} />
                            {t("TXT_KEY_DIST_SANKEY_GROUP_1")}
                        </label>
                        <label>
                            <input type="radio" name="sankeyGroups" value={2} onChange={() => setSankeyNumGroups(2)}
                                   className="w-4 h-4 mx-1 text-neutral-primary border-default-medium rounded-full ring-inset checked:ring-3 focus:outline-none focus:ring-brand-subtle border border-default appearance-none" />
                            {t("TXT_KEY_DIST_SANKEY_GROUP_2")}
                        </label>
                        <label>
                            <input type="radio" name="sankeyGroups" value={3} onChange={() => setSankeyNumGroups(6)}
                                   className="w-4 h-4 mx-1 text-neutral-primary border-default-medium rounded-full ring-inset checked:ring-3 focus:outline-none focus:ring-brand-subtle border border-default appearance-none" />
                            {t("TXT_KEY_DIST_SANKEY_GROUP_3")}
                        </label>
                    </div>
                )}
                <div className="flex gap-2 flex-wrap">
                    {sankey_cats.map((c) => (
                        <button key={c.id} onClick={() => {setCategory(''); setSankeyCategory(c.id);}}
                                className={`civ-btn civ-btn-chip ${sankeyCategory === c.id ? "civ-btn-active" : ""}`}>
                            {t(c.labelKey as any)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-xl p-5" style={{background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                {loading ? (
                    <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center">
                        <p style={{ color: CIV.muted }}>{t("TXT_KEY_LOADING")}</p>
                    </div>
                ) : rawData.length === 0 && rawSankeyData === undefined ? (
                    <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center">
                        <p style={{ color: CIV.muted }}>{t("TXT_KEY_DIST_NO_DATA")}</p>
                    </div>
                ) : (
                    cats.some(x => x.id === category) ? (
                    <div onDoubleClick={zoom.resetZoom} style={{ cursor: zoom.isZoomed ? "zoom-out" : "crosshair" }}>
                        <InteractiveLegend items={legendItems} hiddenKeys={legend.hiddenKeys} onClick={legend.handleClick} hint={t("TXT_KEY_LEGEND_HINT")} />
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                                <BarChart data={zoom.zoomedData} margin={{ top: 8, right: 24, left: 8, bottom: 24 }}
                                          onMouseDown={zoom.onMouseDown} onMouseMove={zoom.onMouseMove} onMouseUp={zoom.onMouseUp}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CIV.grid} />
                                    <XAxis dataKey="turn" tick={<CivXTick />}
                                           label={<CivAxisLabel value={t("TXT_KEY_DIST_X_TURN")} fontSize={18} offset0={8} />} />
                                    <YAxis tick={<CivYTick />} allowDecimals={false}
                                           domain={zoom.yDomain ?? [0, "auto"]}
                                           label={<CivAxisLabel value={t("TXT_KEY_DIST_Y_COUNT")} fontSize={18} offset0={8} angle0={-90} />} />
                                    <Tooltip content={<CivTooltip labelStyle={{ color: CIV.gold }} label0={t('TXT_KEY_MAP_TURN_LABEL')} />} />
                                    {itemKeys.map((key, i) =>
                                        legend.isVisible(key) ? (
                                            <Bar key={key} dataKey={key} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} isAnimationActive={false} />
                                        ) : null,
                                    )}
                                    {zoom.showRef && <ReferenceArea {...zoom.refAreaProps} />}
                                </BarChart>
                        </ResponsiveContainer>
                        <p className="text-right text-[10px] mt-1 select-none"
                           style={{ color: zoom.isZoomed ? CIV.teal : CIV.muted, opacity: zoom.isZoomed ? 1 : 0.6 }}>
                            {zoom.isZoomed ? t("TXT_KEY_ZOOM_ACTIVE") : t("TXT_KEY_ZOOM_HINT")}
                        </p>
                    </div>
                        ) : (
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT +45}>
                            <Sankey
                                data={rawSankeyData!}
                                link={SankeyLink}
                                node={SankeyNode}
                                nodeWidth={20}
                                nodePadding={30}
                                margin={{ bottom: 30 }}
                            >
                                <Tooltip content={<CivTooltip labelStyle={{ color: CIV.gold }} />} />
                            </Sankey>
                        </ResponsiveContainer>
                        )
                )}
            </div>
        </div>
    );
}
