import { useRef, useState, useMemo } from "react";
import { unzipSync } from "fflate";
import { getSqlWorker, QueryResult } from "../db";
import { CIV } from "../civPalette";
import { useLang } from "../LangContext";
import { LangKey } from "../i18n";
import SqlEditor, { SqlSchema } from "./SqlEditor";
import PaginatedTable from "./PaginatedTable";
import CivText from "./CivText";

const EXAMPLE_QUERIES: { labelKey: LangKey; query: string }[] = [
    {
        labelKey: "TXT_KEY_QUERY_EX_ALL_TABLES",
        query: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_GAMES",
        query:
`SELECT GameID, GROUP_CONCAT(IIF(WinID > 0, Player||'🏆', Player), ', ') AS Players, EndTurn from Players
LEFT JOIN GameSeeds USING(GameSeed)
LEFT JOIN Games USING(GameID, PlayerID)
GROUP BY GameID`,
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_STANDINGS",
        query:
`SELECT CivKey AS Civilization, ROUND(AVG(Standing), 2) AS 'Average Place', COUNT(*) AS Games
FROM Games
LEFT JOIN GameSeeds USING(GameID)
LEFT JOIN Players USING(GameSeed, PlayerID)
JOIN CivKeys USING(CivID)
GROUP BY CivID
ORDER BY AVG(Standing)`
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_WINS",
        query:
`SELECT WinType, COUNT(*) AS Wins, (COUNT(*)*100.0/numGames)||'%' AS Percent
FROM Games
JOIN GameSeeds USING(GameID)
JOIN WinTypes USING(WinID)
JOIN (
    SELECT COUNT(*) AS numGames FROM GameSeeds
    WHERE GameSeed NOT NULL
)
WHERE WinID > 0 AND GameSeed NOT NULL
GROUP BY WinType
ORDER BY Wins DESC`
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_DATASETS",
        query: `SELECT ReplayDataSetID, ReplayDataSetKey FROM ReplayDataSetKeys`,
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_GAME_GRAPH",
        query:
`SELECT Turn, PlayerID, Player, Value AS 'Value Change'
FROM ReplayDataSetsChanges
JOIN GameSeeds USING(GameSeed)
JOIN Games USING(GameID, PlayerID)
WHERE GameSeed = (SELECT GameSeed FROM GameSeeds WHERE GameID = 1 LIMIT 1)
AND ReplayDataSetID = 1
ORDER BY Turn`
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_SECTOR_WINRATE",
        query:
`WITH T1 AS (
    SELECT gameseed, playerid, num1 % 66 AS X, num1 / 42 AS Y
    FROM replayevents
    WHERE replayeventtype = 101 AND playerid < 22
    GROUP BY gameseed, playerid HAVING turn = MIN(turn)
)
SELECT Sector, ROUND(AVG(win) * 100.0, 2)||'%' as Winrate FROM (
    SELECT gameid, player, x, y, iif(yrnk <= 3, 'bottom', 'top')||' '||iif(xrnk <= 2, 'left', iif(xrnk >= 5, 'right', 'center')) as Sector, winid > 1 as win
    from replayevents
    JOIN T1 USING(gameseed, playerid)
    JOIN (select gameseed, playerid, ROW_NUMBER() OVER (PARTITION BY gameseed ORDER BY x) AS xrnk, ROW_NUMBER() OVER (PARTITION BY gameseed ORDER BY y) AS yrnk FROM t1) USING(gameseed, playerid)
    JOIN gameseeds USING(gameseed)
    JOIN games USING(gameid, playerid)
    WHERE replayeventtype = 101 AND playerid < 22
    GROUP BY gameseed, playerid
)
GROUP BY Sector`
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_DRAFTS",
        query:
`with t1 as (
    select GameID, PlayerID, Player, civkey,
    group_concat(civkey, ', ') filter (where replayeventtype = 103) as Bans,
    group_concat(civkey, ', ') filter (where replayeventtype = 104) as Drafts
    from json_each('['||trim(str,',')||']')
    join replayevents
    left join gameseeds using(gameseed)
    left join games using(gameid, playerid)
    left join players using(gameseed, playerid)
    left join civkeys on civkeys.civid = value
    where replayeventtype in(103,104)
    group by gameid, playerid
)
select GameID, PlayerID, Player, Bans, Drafts, civkey as Pick from games
left join gameseeds using(gameid)
left join players using(gameseed, playerid)
left join civkeys using(civid)
join (
    select gameid, playerid, Bans from t1
) using(gameid, playerid)
join (
    select gameid, playerid, Drafts from t1
) using(gameid, playerid)
ORDER BY GameID, PlayerID
`
    },
    {
        labelKey: "TXT_KEY_QUERY_EX_AVG_NW_TURN",
        query:
`select player, rn, avg(turn) from
(
select *, ROW_NUMBER() OVER (PARTITION BY Gameid, PlayerID) as rn from replayevents
join gameseeds using(gameseed)
join games using(gameid, playerid)
join players using(gameseed, playerid)
join civkeys using(civid)
where replayeventtype = 88
)
group by player, rn`
    },
];

const DB_EXTENSIONS = [".db", ".sqlite", ".sqlite3"];

function isDbFile(name: string): boolean {
    const lower = name.toLowerCase();
    return DB_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function isZipFile(buffer: ArrayBuffer): boolean {
    const view = new DataView(buffer);
    if (buffer.byteLength < 4) return false;
    return view.getUint8(0) === 0x50 && view.getUint8(1) === 0x4B &&
        view.getUint8(2) === 0x03 && view.getUint8(3) === 0x04;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-xl overflow-hidden ${className}`}
            style={{ background: CIV.surface, border: `2px solid ${CIV.border}`, boxShadow: "0 4px 24px #00000060" }}
        >
            {children}
        </div>
    );
}

function CardHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: `2px solid ${CIV.border}` }}>
            {children}
        </div>
    );
}

interface QueryExplorerProps {
    onDbChanged?: (name?: string) => void;
}

export default function QueryExplorer({ onDbChanged }: QueryExplorerProps) {
    const { t } = useLang();
    const [query,     setQuery]     = useState<string>(EXAMPLE_QUERIES[0].query);
    const [results,   setResults]   = useState<QueryResult[]>([]);
    const [error,     setError]     = useState<string | null>(null);
    const [queryTime, setQueryTime] = useState<number>(0);
    const [running,   setRunning]   = useState(false);
    const [hasRun,    setHasRun]    = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<string | null>(null);
    const [schema,    setSchema]    = useState([{ table: "Games", cols: "GameID, Player, PlayerGameNumber, Standing, PlayerQuitTurn, WinID" }]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Convert schema array to Record<string, string[]> for CodeMirror autocomplete
    const editorSchema: SqlSchema = useMemo(() => {
        const result: SqlSchema = {};
        for (const s of schema) {
            result[s.table] = s.cols.split(",").map((c) => c.trim()).filter(Boolean);
        }
        return result;
    }, [schema]);

    const executeQuery = async () => {
        setRunning(true);
        setError(null);
        try {
            const start = performance.now();
            const res   = await getSqlWorker().exec(query);
            setQueryTime(performance.now() - start);
            setResults(res);
            setHasRun(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
            setResults([]);
            setHasRun(true);
        } finally {
            setRunning(false);
        }
    };

    const handleDownload = async () => {
        try {
            const buffer = await getSqlWorker().exportDb();
            const blob   = new Blob([buffer], { type: "application/x-sqlite3" });
            const url    = URL.createObjectURL(blob);
            const a      = document.createElement("a");
            a.href       = url;
            a.download   = "game_sessions.sqlite";
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Export failed");
        }
    };


    const refreshSchema = async () => {
        const tablesRes = await getSqlWorker().getTables();
        const newSchema = await Promise.all(
            tablesRes.map(async (tbl) => {
                const info = await getSqlWorker().getTableInfo(tbl);
                const cols = info.info[0]?.values.map((r: any[]) => r[1] as string).join(", ") ?? "";
                return { table: tbl, cols };
            })
        );
        setSchema(newSchema);
        return { count: tablesRes.length };
    };

    const loadDbBuffer = async (buffer: ArrayBuffer, fileName: string, originalSize: number) => {
        await getSqlWorker().open(buffer);
        const { count } = await refreshSchema();
        const tblWord = count === 1 ? t("TXT_KEY_QUERY_UPLOAD_TABLE") : t("TXT_KEY_QUERY_UPLOAD_TABLES");
        return `${t("TXT_KEY_QUERY_UPLOAD_MSG")} "${fileName}" (${(originalSize / 1024).toFixed(1)} ${t("TXT_KEY_QUERY_UPLOAD_KB")}) - ${count} ${tblWord} ${t("TXT_KEY_QUERY_UPLOAD_FOUND")}`;
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadMsg(null);
        setError(null);
        setResults([]);
        setHasRun(false);
        try {
            const buffer = await file.arrayBuffer();

            if (isZipFile(buffer)) {
                const unzipped = unzipSync(new Uint8Array(buffer));
                const fileNames = Object.keys(unzipped);
                const dbFileName = fileNames.find(isDbFile);
                if (!dbFileName) {
                    setError(t("TXT_KEY_QUERY_UPLOAD_ZIP_NO_DB"));
                    setUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    return;
                }
                const dbData = unzipped[dbFileName];
                const dbBuffer = dbData.buffer.slice(dbData.byteOffset, dbData.byteOffset + dbData.byteLength) as ArrayBuffer;
                const msg = await loadDbBuffer(dbBuffer, dbFileName, dbData.byteLength);
                setUploadMsg(`${t("TXT_KEY_QUERY_UPLOAD_ZIP_EXTRACTED")} ${msg}`);
            } else {
                const msg = await loadDbBuffer(buffer, file.name, file.size);
                setUploadMsg(msg);
            }

            onDbChanged?.(file.name.replace(/\.zip$/i, ".db"));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const totalRows = results.reduce((sum, r) => sum + r.values.length, 0);
    refreshSchema().then();

    return (
        <div className="space-y-4">

            {/* Query Input Card */}
            <Card>
                <CardHeader>
                    <div>
                        <h3 className="text-base tracking-wide" style={{ color: CIV.text }}>
                            {t("TXT_KEY_QUERY_TITLE")}
                        </h3>
                        <p className="text-sm mt-0.5" style={{ color: CIV.muted }}>
                            {t("TXT_KEY_QUERY_SUBTITLE")}
                        </p>
                    </div>
                </CardHeader>

                <div className="p-5 space-y-4">
                    {/* Example chips */}
                    <div>
                        <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: CIV.muted }}>
                            {t("TXT_KEY_QUERY_EXAMPLES_LABEL")}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {EXAMPLE_QUERIES.map((eq) => (
                                <button
                                    key={eq.labelKey}
                                    onClick={() => setQuery(eq.query)}
                                    className="civ-btn civ-btn-chip"
                                >
                                    {t(eq.labelKey)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* SQL editor (CodeMirror) */}
                    <SqlEditor
                        value={query}
                        onChange={setQuery}
                        onExecute={executeQuery}
                        placeholder={t("TXT_KEY_QUERY_PLACEHOLDER")}
                        minHeight="140px"
                        maxHeight="400px"
                        schema={editorSchema}
                    />

                    {/* Action row */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <button onClick={executeQuery} disabled={running} className="civ-btn civ-btn-primary">
                            {running ? t("TXT_KEY_QUERY_BTN_RUNNING") : t("TXT_KEY_QUERY_BTN_EXECUTE")}
                        </button>
                        <button onClick={handleDownload} className="civ-btn">
                            {t("TXT_KEY_QUERY_BTN_DOWNLOAD")}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".sqlite,.sqlite3,.db,.zip"
                            className="hidden"
                            onChange={handleUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="civ-btn"
                        >
                            {uploading ? t("TXT_KEY_LOADING") : t("TXT_KEY_QUERY_BTN_UPLOAD")}
                        </button>
                    </div>

                    {uploadMsg && (
                        <p className="text-sm" style={{ color: CIV.teal }}>{uploadMsg}</p>
                    )}
                </div>
            </Card>

            {/* Error */}
            {error && (
                <div className="rounded-xl p-4" style={{ background: CIV.body, border: `2px solid ${CIV.red}` }}>
                    <p className="mb-1" style={{ color: CIV.red }}>{t("TXT_KEY_QUERY_ERROR_LABEL")}</p>
                    <p className="text-sm font-mono" style={{ color: CIV.muted }}>{error}</p>
                </div>
            )}

            {/* Results */}
            {hasRun && results.length === 0 && !error && (
                <Card>
                    <div className="px-5 py-4">
                        <p className="text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_QUERY_EMPTY_RESULT")}</p>
                    </div>
                </Card>
            )}

            {results.length > 0 && (
                <div className="space-y-4">
                    {/* Summary bar when multiple results */}
                    {results.length > 1 && (
                        <div className="flex items-center gap-3 px-1">
                            <span className="text-sm" style={{ color: CIV.teal }}>
                              {results.length} {t("TXT_KEY_QUERY_RESULT_SETS_RETURNED")}
                            </span>
                            <span className="text-sm" style={{ color: CIV.muted }}>
                              ({totalRows} {totalRows === 1 ? t("TXT_KEY_QUERY_RESULTS_ROW") : t("TXT_KEY_QUERY_RESULTS_ROWS")} {t("TXT_KEY_TOTAL").toLowerCase()})
                            </span>
                            <span className="text-xs font-mono ml-auto" style={{ color: CIV.muted }}>
                              {queryTime.toFixed()}ms
                            </span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-0 lg:gap-6" style={{ justifyContent: 'center' }}>
                    {results.map((rs, idx) => (
                        <Card key={idx}>
                            <div className="px-5 py-3 flex items-center justify-between" style={{ background: `linear-gradient(180deg, var(--civ-glow) 0%, var(--civ-bkg-color-alt) 40%, var(--civ-bg-alt) 100%)`, borderBottom: `2px solid ${CIV.border}` }}>
                                <div className="flex items-center gap-3 items-end">
                                    <h4 className="tracking-wide" style={{ color: CIV.text }}>
                                        {results.length > 1
                                            ? `${t("TXT_KEY_QUERY_RESULT_SET")} ${idx + 1} ${t("TXT_KEY_QUERY_RESULT_OF")} ${results.length}`
                                            : t("TXT_KEY_QUERY_RESULTS_TITLE")
                                        }
                                    </h4>
                                    <span className="text-sm" style={{ color: CIV.teal }}>
                                        {rs.values.length}{" "}
                                        {rs.values.length === 1 ? t("TXT_KEY_QUERY_RESULTS_ROW") : t("TXT_KEY_QUERY_RESULTS_ROWS")}
                                    </span>
                                    {/* Show time only on single result or first result */}
                                    {(results.length === 1 || idx === 0) && (
                                        <span className="text-xs font-mono" style={{ color: CIV.muted }}>
                                        {results.length === 1 ? `${queryTime.toFixed()}ms` : ""}
                                    </span>
                                    )}
                                </div>
                            </div>
                            {rs.values.length > 0 ? (
                                <PaginatedTable columns={rs.columns} values={rs.values} />
                            ) : (
                                <div className="px-5 py-4">
                                    <p className="text-sm" style={{ color: CIV.muted }}>
                                        {t("TXT_KEY_QUERY_EMPTY_RESULT")}
                                    </p>
                                </div>
                            )}
                        </Card>
                    ))}
                    </div>
                </div>
            )}

            {/* Schema Reference */}
            <Card>
                <CardHeader>
                    <div>
                        <h4 className="tracking-wide" style={{ color: CIV.text }}>{t("TXT_KEY_QUERY_SCHEMA_TITLE")}</h4>
                    </div>
                </CardHeader>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {schema.map((s) => (
                        <div key={s.table} className="rounded-lg p-3" style={{ background: CIV.body, border: `2px solid ${CIV.border}` }}>
                            <p className="font-mono text-sm mb-1" style={{ color: CIV.teal }}><CivText text={s.table} iconSize={14} /></p>
                            <p className="font-mono text-xs leading-relaxed" style={{ color: CIV.muted }}><CivText text={s.cols} iconSize={14} /></p>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
