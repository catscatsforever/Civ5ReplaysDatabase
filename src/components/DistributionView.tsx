import { useEffect, useState, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceArea,
} from "recharts";
import { getSqlWorker } from "../db";
import { CIV, CHART_COLORS } from "../civPalette";
import { useLang } from "../LangContext";
import { useChartZoom } from "../hooks/useChartZoom";
import { useLegendToggle, InteractiveLegend } from "../hooks/useLegendToggle";
import { CivXTick, CivYTick, CivAxisLabel, CivTooltip } from "./CivSvgText";

type Category = string;
const CHART_HEIGHT = 460;

export default function DistributionView() {
    const { t } = useLang();
    const [category, setCategory] = useState<Category>("beliefs");
    const [rawData,  setRawData]  = useState<any[]>([]);
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
            }
            // New schema: ReplayEventType is text, no JOIN needed with ReplayEventKeys
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

    const legend = useLegendToggle(itemKeys);
    const visibleKeys = useMemo(() => itemKeys.filter((k) => legend.isVisible(k)), [itemKeys, legend.isVisible]);
    const zoom = useChartZoom(rawData, "turn", visibleKeys);
    const legendItems = useMemo(() =>
            itemKeys.map((key, i) => ({ key, color: CHART_COLORS[i % CHART_COLORS.length], label: key })).sort((a,b) => a.label > b.label ? 1 : -1),
        [itemKeys],
    );

    const cats: { id: Category; labelKey: string }[] = [
        { id: "beliefs", labelKey: "TXT_KEY_REPLAY_CAT_BELIEFS" },
        { id: "policies", labelKey: "TXT_KEY_REPLAY_CAT_POLICIES" },
        { id: "techs",    labelKey: "TXT_KEY_REPLAY_CAT_TECHS"    },
        { id: "wonders",  labelKey: "TXT_KEY_REPLAY_CAT_WONDERS"  },
        { id: "nat_wonders",  labelKey: "TXT_KEY_REPLAY_CAT_NAT_WONDERS"  },
        { id: "buildings",  labelKey: "TXT_KEY_REPLAY_CAT_BUILDINGS"  },
        { id: "units",  labelKey: "TXT_KEY_REPLAY_CAT_UNITS"  },
    ];

    return (
        <div className="space-y-4">
            <div className="rounded-xl p-5" style={{background: CIV.surface, border: `2px solid ${CIV.border}`}}>
                <h3 className="text-base tracking-wide mb-0.5" style={{color: CIV.text}}>{t("TXT_KEY_REPLAY_TITLE")}</h3>
                <span className="tracking-widest uppercase text-xs" style={{ color: CIV.muted }}>{t("TXT_KEY_REPLAY_HISTOGRAM")}</span>
                <div className="flex gap-2 flex-wrap">
                    {cats.map((c) => (
                        <button key={c.id} onClick={() => setCategory(c.id)}
                                className={`civ-btn civ-btn-chip ${category === c.id ? "civ-btn-active" : ""}`}>
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
                ) : rawData.length === 0 ? (
                    <div style={{ height: CHART_HEIGHT }} className="flex items-center justify-center">
                        <p style={{ color: CIV.muted }}>{t("TXT_KEY_REPLAY_NO_DATA")}</p>
                    </div>
                ) : (
                    <div onDoubleClick={zoom.resetZoom} style={{ cursor: zoom.isZoomed ? "zoom-out" : "crosshair" }}>
                        <InteractiveLegend items={legendItems} hiddenKeys={legend.hiddenKeys} onClick={legend.handleClick} hint={t("TXT_KEY_LEGEND_HINT")} />
                        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                            <BarChart data={zoom.zoomedData} margin={{ top: 8, right: 24, left: 8, bottom: 24 }}
                                      onMouseDown={zoom.onMouseDown} onMouseMove={zoom.onMouseMove} onMouseUp={zoom.onMouseUp}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CIV.grid} />
                                <XAxis dataKey="turn" tick={<CivXTick />}
                                       label={<CivAxisLabel value={t("TXT_KEY_REPLAY_X_TURN")} fontSize={18} offset0={8} />} />
                                <YAxis tick={<CivYTick />} allowDecimals={false}
                                       domain={zoom.yDomain ?? [0, "auto"]}
                                       label={<CivAxisLabel value={t("TXT_KEY_REPLAY_Y_COUNT")} fontSize={18} offset0={8} angle0={-90} />} />
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
                )}
            </div>
        </div>
    );
}
