import { useState, useEffect } from "react";
import { getSqlWorker, QueryResult } from "../db";
import { CIV } from "../civPalette";
import { useLang } from "../LangContext";
import PaginatedTable from "./PaginatedTable";

type Category = "hof" | "belief" | "policy" | "tech" | "wonder";
interface TableBlock { titleKey: string; sql: string; }

// ── New schema: ReplayEvents uses ReplayEventType (TEXT) and GameSeed ─────────

const hallOfFameBlocks: TableBlock[] = [
    { titleKey: "TXT_KEY_TABLES_HOF_GWB_TITLE", sql: `SELECT * FROM _cached_HoF_GWB;` },
    { titleKey: "TXT_KEY_TABLES_HOF_DSL_TITLE", sql: `SELECT * FROM _cached_HoF_DSL;` },
    { titleKey: "TXT_KEY_TABLES_HOF_PCG_TITLE", sql: `SELECT * FROM _cached_HoF_PCG;` },
    { titleKey: "TXT_KEY_TABLES_HOF_TTSIG_TITLE", sql: `SELECT * FROM _cached_HoF_TTSIG;` },
    { titleKey: "TXT_KEY_TABLES_HOF_GRR_TITLE", sql: `SELECT * FROM _cached_HoF_GRR;` },
    { titleKey: "TXT_KEY_TABLES_HOF_STRR_TITLE", sql: `SELECT * FROM _cached_HoF_STRR;` },
];
const beliefBlocks: TableBlock[] = [
    { titleKey: "TXT_KEY_TABLES_BELIEF_BW_TITLE", sql: `SELECT * FROM _cached_BA_BW;` },
    { titleKey: "TXT_KEY_TABLES_BELIEF_ATOBA_TITLE", sql: `SELECT * FROM _cached_BA_AToBA;` },
    { titleKey: "TXT_KEY_TABLES_BELIEF_MEDTOBA_TITLE", sql: `SELECT * FROM _cached_BA_MedToBA;` },
    { titleKey: "TXT_KEY_TABLES_BELIEF_MINTOBA_TITLE", sql: `SELECT * FROM _cached_BA_MinToBA;` },
    { titleKey: "TXT_KEY_TABLES_BELIEF_NTOBA_TITLE", sql: `SELECT * FROM _cached_BA_NToBA;` },
];
const policyBlocks: TableBlock[] = [
    { titleKey: "TXT_KEY_TABLES_POLICY_ATOPA_TITLE", sql: `SELECT * FROM _cached_PA_AToPA;` },
    { titleKey: "TXT_KEY_TABLES_POLICY_MEDTOPA_TITLE", sql: `SELECT * FROM _cached_PA_MedToPA;` },
    { titleKey: "TXT_KEY_TABLES_POLICY_MINTOPA_TITLE", sql: `SELECT * FROM _cached_PA_MinToPA;` },
    { titleKey: "TXT_KEY_TABLES_POLICY_NTOPA_TITLE", sql: `SELECT * FROM _cached_PA_NToPA;` },
];
const techBlocks: TableBlock[] = [
    { titleKey: "TXT_KEY_TABLES_TECH_ATOTR_TITLE", sql: `SELECT * FROM _cached_TR_AToTR;` },
    { titleKey: "TXT_KEY_TABLES_TECH_MEDTOTR_TITLE", sql: `SELECT * FROM _cached_TR_MedToTR;` },
    { titleKey: "TXT_KEY_TABLES_TECH_MINTOTR_TITLE", sql: `SELECT * FROM _cached_TR_MinToTR;` },
    { titleKey: "TXT_KEY_TABLES_TECH_NTOTR_TITLE", sql: `SELECT * FROM _cached_TR_NToTR;` },
];
const wonderBlocks: TableBlock[] = [
    { titleKey: "TXT_KEY_TABLES_WONDER_WW_TITLE", sql: `SELECT * FROM _cached_WC_WW;` },
    { titleKey: "TXT_KEY_TABLES_WONDER_ATOWC_TITLE", sql: `SELECT * FROM _cached_WC_AToWC;` },
    { titleKey: "TXT_KEY_TABLES_WONDER_MEDTOWC_TITLE", sql: `SELECT * FROM _cached_WC_MedToWC;` },
    { titleKey: "TXT_KEY_TABLES_WONDER_MINTOWC_TITLE", sql: `SELECT * FROM _cached_WC_MinToWC;` },
    { titleKey: "TXT_KEY_TABLES_WONDER_NTOWC_TITLE", sql: `SELECT * FROM _cached_WC_NToWC;` },
];

const CATEGORY_BLOCKS: Record<Category, TableBlock[]> = {
    hof: hallOfFameBlocks, belief: beliefBlocks, policy: policyBlocks, tech: techBlocks, wonder: wonderBlocks,
};

function SummaryCard({ titleKey, sql }: { titleKey: string; sql: string }) {
    const { t } = useLang();
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getSqlWorker().exec(sql.trim())
            .then((rows) => { setResult(rows[0] ?? null); setLoading(false); })
            .catch(() => { setResult(null); setLoading(false); });
    }, [sql]);

    return (
        <div className="rounded-xl overflow-hidden mb-6" style={{ border: `2px solid ${CIV.border}`, background: CIV.surface }}>
            <div className="px-5 py-3" style={{ background: CIV.navBg, borderBottom: `2px solid ${CIV.border}` }}>
                <h3 className="tracking-wide text-2xl" style={{ color: CIV.text }}>{t(titleKey as any)}</h3>
            </div>
            {loading ? (
                <div className="p-6 text-center text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_LOADING")}</div>
            ) : !result || result.values.length === 0 ? (
                <div className="p-6 text-center text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_TABLES_NO_DATA")}</div>
            ) : (
                <PaginatedTable
                    columns={result.columns}
                    values={result.values.map((row) => row.map((cell) => String(cell)))}
                />
            )}
        </div>
    );
}

export default function TablesView() {
    const { t } = useLang();
    const [category, setCategory] = useState<Category>("hof");

    const categories: { id: Category; labelKey: string }[] = [
        { id: "hof", labelKey: "TXT_KEY_TABLES_CAT_HOF" },
        { id: "belief", labelKey: "TXT_KEY_TABLES_CAT_BELIEF" },
        { id: "policy", labelKey: "TXT_KEY_TABLES_CAT_POLICY" },
        { id: "tech", labelKey: "TXT_KEY_TABLES_CAT_TECH" },
        { id: "wonder", labelKey: "TXT_KEY_TABLES_CAT_WONDER" },
    ];

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl tracking-wide" style={{ color: CIV.text }}>{t("TXT_KEY_TABLES_TITLE")}</h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-6 p-3 rounded-xl" style={{ background: CIV.navBg, border: `2px solid ${CIV.border}` }}>
                {categories.map(({ id, labelKey }) => (
                    <button key={id} onClick={() => setCategory(id)}
                            className={`civ-btn civ-btn-chip ${category === id ? "civ-btn-active" : ""}`}>
                        {t(labelKey as any)}
                    </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-0 lg:gap-6" style={{ justifyContent: 'center' }}>
                {CATEGORY_BLOCKS[category].map((block, i) => (
                    <SummaryCard key={`${category}-${i}`} titleKey={block.titleKey} sql={block.sql} />
                ))}
            </div>
        </div>
    );
}
