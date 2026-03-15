import { useState, useEffect, useCallback, useRef } from "react";
import { getSqlWorker } from "./db";
import { unzipSync } from "fflate";
import SummaryView from "./components/SummaryView.tsx";
import GameView from "./components/GameView";
import PlayerView from "./components/PlayerView";
import GroupView from "./components/GroupView.tsx";
import TablesView from "./components/TablesView";
import DistributionView from "./components/DistributionView.tsx";
import EventExplorer from "./components/EventExplorer.tsx";
import MapReplay from "./components/MapReplay.tsx";
import QueryExplorer from "./components/QueryExplorer";
import { CIV } from "./civPalette";
import { LangProvider, useLang } from "./LangContext";
import { Lang } from "./i18n";
import {
    parseHash, mergeHash, replaceHash,
    TAB_TO_HASH, HASH_TO_TAB, HashParams,
} from "./routing";

function formatMB(bytes: number): string {
    return `${(bytes/Math.pow(1024,~~(Math.log2(bytes)/10))).toFixed(2)}\
    ${("KMGTPEZY"[~~(Math.log2(bytes)/10)-1]||"") + "B"}`
}

type SampleDB = { file: string; label: string; };
const DB_EXTENSIONS = [".db", ".sqlite", ".sqlite3"];
function isDbFile(name: string): boolean {
    return DB_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}
function isZipBuffer(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 4) return false;
    const v = new DataView(buffer);
    return (
        v.getUint8(0) === 0x50 && v.getUint8(1) === 0x4b &&
        v.getUint8(2) === 0x03 && v.getUint8(3) === 0x04
    );
}

const DB_CUSTOM = "__custom__";

function AppInner() {
    const { lang, setLang, t } = useLang();

    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [dbReady,     setDbReady]     = useState(false);
    const [activeTab,   setActiveTab]   = useState("summary");
    const [dbSizeRaw,   setDbSizeRaw]   = useState(0);
    const [dbSizeGz,    setDbSizeGz]    = useState(0);
    const [dbVersion,   setDbVersion]   = useState(0);
    const [sampleList,  setSampleList]  = useState<SampleDB[]>([]);
    const [currentDb,   setCurrentDb]   = useState<string>('sampleTEST.db');
    const [dbSwitching, setDbSwitching] = useState(false);
    const [loadingDatabase,     setLoadingDatabase]     = useState(false);
    const [initialHash, setInitialHash] = useState<HashParams>({});

    const initDone = useRef(false);
    const refreshDbSize = useCallback(async () => {
        try {
            const buffer = await getSqlWorker().exportDb();
            const raw = buffer.byteLength;
            //const compressed = gzipSync(new Uint8Array(buffer));
            setDbSizeRaw(raw);
            //setDbSizeGz(compressed.byteLength);
        } catch {
            // not critical
        }
    }, []);

    const loadDbByName = useCallback(async (name: string) => {
        setLoadingDatabase(true);
        const worker = getSqlWorker();
        const resp = await fetch(`./samples/${name}`);
        if (!resp.ok) throw new Error(`Could not load ${name} (HTTP ${resp.status})`);
        let buf = await resp.arrayBuffer();
        if (name.toLowerCase().endsWith(".zip") || isZipBuffer(buf)) {
            const u = unzipSync(new Uint8Array(buf));
            setDbSizeGz(buf.byteLength);
            const f = Object.keys(u).find(isDbFile);
            if (!f) throw new Error(`No .db file found inside ${name}`);
            const d = u[f]; buf = d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) as ArrayBuffer;
        } else {
            setDbSizeGz(0);
        }
        await worker.open(buf);
        setLoadingDatabase(false);
    }, [loadingDatabase]);

    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        (async () => {
            try {
                const hash = parseHash(window.location.hash);
                setInitialHash(hash);

                if (hash.Tab) {
                    const tabId = HASH_TO_TAB[hash.Tab.toLowerCase()];
                    if (tabId) setActiveTab(tabId);
                }

                let manifest: SampleDB[] = [];
                try {
                    const resp = await fetch("./samples/manifest.json");
                    if (resp.ok) {
                        const data = await resp.json();
                        if (Array.isArray(data)) manifest = data;
                    }
                } catch { console.log('WARN no manifest') }
                setSampleList(manifest);

                let target = 'sampleTEST.db';
                if (hash.DB) {
                    const dbFromHash = hash.DB.toLowerCase();
                    target = manifest.find((n) => n.file.toLowerCase() === dbFromHash)?.file ?? hash.DB;
                } else if (manifest.length > 0) {
                    target = manifest[manifest.length - 1].file;
                }
                setCurrentDb(target);

                await loadDbByName(target);

                setDbReady(true);
                setLoading(false);
                setTimeout(() => refreshDbSize(), 100);

                const dbKey = target;
                const tabKey = TAB_TO_HASH[hash.Tab ? (HASH_TO_TAB[hash.Tab.toLowerCase()] ?? "summary") : "summary"] ?? "Summary";
                replaceHash({ ...hash, DB: dbKey, Tab: tabKey });
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Unknown error");
                setLoading(false);
            }
        })();
    }, [loadDbByName, refreshDbSize]);

    useEffect(() => {
        const userLang = (new Intl.Locale(navigator.language)).language
        const current_language = localStorage.getItem("locale") ?? (['en', 'ru'].includes(userLang) ? userLang : 'en');
        console.log(userLang, current_language)
        setLang(current_language === 'en' ? 'en' : 'ru');

        const onHashChange = () => {
            const hash = parseHash(window.location.hash);
            if (hash.Tab) {
                const tabId = HASH_TO_TAB[hash.Tab.toLowerCase()];
                if (tabId) setActiveTab(tabId);
            }
        };
        window.addEventListener("hashchange", onHashChange);
        return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const handleTabChange = useCallback((tabId: string) => {
        setActiveTab(tabId);
        mergeHash({ Tab: TAB_TO_HASH[tabId] ?? tabId });
    }, []);

    const handleDbSelect = useCallback(async (name: string) => {
        if (name === currentDb || dbSwitching) return;
        setDbSwitching(true);
        setCurrentDb(name);
        try {
            await loadDbByName(name);
            setDbVersion((v) => v + 1);
            await refreshDbSize();
            mergeHash({ DB: name });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load database");
        } finally {
            setDbSwitching(false);
        }
    }, [currentDb, dbSwitching, loadDbByName, refreshDbSize]);

    const handleExternalDbChange = useCallback(async (newName?: string) => {
        const dbVal = newName ?? DB_CUSTOM;
        setCurrentDb(dbVal);
        setDbVersion((v) => v + 1);
        await refreshDbSize();
        mergeHash({ DB: newName ?? "custom" });
    }, [refreshDbSize]);

    const tabs = [
        { id: "summary",      label: t("TXT_KEY_NAV_SUMMARY") },
        { id: "game",         label: t("TXT_KEY_NAV_GAME") },
        { id: "player",       label: t("TXT_KEY_NAV_PLAYER") },
        { id: "group",        label: t("TXT_KEY_NAV_GROUP_ANALYSIS") },
        { id: "distribution", label: t("TXT_KEY_NAV_DISTRIBUTION") },
        { id: "tables",       label: t("TXT_KEY_NAV_TABLES") },
        { id: "explorer",     label: t("TXT_KEY_NAV_EXPLORER") },
        { id: "map",          label: t("TXT_KEY_NAV_MAP") },
        { id: "query",        label: t("TXT_KEY_NAV_QUERY") },
    ];

    const LANGS: Lang[] = ["en", "ru"];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: CIV.body }}>
                <div className="text-center">
                    <div
                        className="inline-block w-16 h-16 rounded-full animate-spin mb-6"
                        style={{ border: `4px solid ${CIV.navBg}`, borderTopColor: CIV.border }}
                    />
                    <p style={{ color: CIV.text }} className="text-xl tracking-wide">{t("TXT_KEY_LOADING")}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: CIV.body }}>
                <div className="rounded-xl p-8 max-w-md" style={{ background: CIV.surface, border: `2px solid ${CIV.red}` }}>
                    <h2 className="text-xl mb-2" style={{ color: CIV.red }}>{t("TXT_KEY_APP_ERROR_TITLE")}</h2>
                    <p style={{ color: CIV.text }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: CIV.body }}>

            {/* Header */}
            <header
                className="sticky top-0 z-50"
                style={{ background: CIV.navBg, borderBottom: `2px solid ${CIV.border}`, backdropFilter: "blur(8px)" }}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-5xl tracking-wider" style={{ color: CIV.text }}>{t("TXT_KEY_APP_TITLE")}</h1>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <div
                            className="flex items-center gap-1 rounded-lg p-1"
                            style={{ background: CIV.navSel, border: `2px solid ${CIV.border}` }}
                            title={t("TXT_KEY_LANG_LABEL")}
                        >
                            {LANGS.map((l) => (
                                <button
                                    key={l}
                                    onClick={() => {localStorage.setItem("locale", lang); setLang(l)}}
                                    className="px-3 py-1 rounded text-xs tracking-widest uppercase transition-all"
                                    style={lang === l
                                        ? { background: CIV.border, color: CIV.body }
                                        : { background: "transparent", color: CIV.muted }}
                                >
                                    {t(l === "en" ? "TXT_KEY_LANG_EN" : "TXT_KEY_LANG_RU")}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Nav tabs */}
            <nav style={{ background: CIV.navBg, borderBottom: `2px solid ${CIV.border}` }}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1 overflow-x-auto py-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className="px-4 py-2 rounded text-sm whitespace-nowrap transition-all tracking-wide"
                                style={
                                    activeTab === tab.id
                                        ? { background: CIV.navSel, color: CIV.text,  border: `2px solid ${CIV.border}` }
                                        : { background: "transparent", color: CIV.muted, border: "2px solid transparent" }
                                }
                                onMouseEnter={(e) => {
                                    if (activeTab !== tab.id) {
                                        (e.currentTarget as HTMLButtonElement).style.color = CIV.text;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = CIV.border;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeTab !== tab.id) {
                                        (e.currentTarget as HTMLButtonElement).style.color = CIV.muted;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                                    }
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* DB-switching overlay */}
            {dbSwitching && (
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div
                        className="flex items-center gap-3 rounded-lg px-4 py-2"
                        style={{ background: CIV.navSel, border: `2px solid ${CIV.border}` }}
                    >
                        <div
                            className="w-4 h-4 rounded-full animate-spin"
                            style={{ border: `2px solid ${CIV.muted}`, borderTopColor: CIV.border }}
                        />
                        <span className="text-sm tracking-wide" style={{ color: CIV.text }}>
                          {t("TXT_KEY_LOADING")}
                        </span>
                    </div>
                </div>
            )}

            {/* Main content */}
            <main className="container mx-auto px-4 py-6">
                {dbReady && !dbSwitching && (
                    <>
                        {activeTab === "summary"      && <SummaryView key={dbVersion} />}
                        {activeTab === "game"         && <GameView    key={dbVersion} initialHash={initialHash} />}
                        {activeTab === "player"       && <PlayerView  key={dbVersion} initialHash={initialHash} />}
                        {activeTab === "group"        && <GroupView key={dbVersion} initialHash={initialHash} />}
                        {activeTab === "distribution" && <DistributionView key={dbVersion} />}
                        {activeTab === "tables"       && <TablesView  key={dbVersion} />}
                        {activeTab === "explorer"     && <EventExplorer key={dbVersion} />}
                        {activeTab === "map"          && <MapReplay key={dbVersion} initialHash={initialHash} />}
                        {activeTab === "query"        && (<QueryExplorer key={dbVersion} onDbChanged={handleExternalDbChange} />)}
                    </>
                )}
            </main>

            {/* Footer */}
            <div className="h-px mt-8" style={{ background: `linear-gradient(to right, transparent, ${CIV.border}, transparent)` }} />
            <footer className="py-5 text-center text-xs tracking-wider" style={{ color: CIV.muted }}>
                <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
                    <label className="text-xs tracking-widest uppercase" style={{color: CIV.muted}}>
                        {t("TXT_KEY_FOOTER_DB_SELECT")}:
                    </label>
                    <select
                        value={currentDb}
                        onChange={(e) => handleDbSelect(e.target.value)}
                        disabled={dbSwitching}
                        className="text-sm rounded-md px-3 py-1.5 cursor-pointer outline-none"
                        style={{
                            background: CIV.navBg,
                            color: CIV.text,
                            border: `2px solid ${CIV.border}`,
                            minWidth: "200px"
                        }}
                    >
                        {sampleList.map((sample) => (
                            <option key={sample.label} value={sample.file}>{sample.label}</option>
                        ))}
                        {currentDb === DB_CUSTOM && (
                            <option value={DB_CUSTOM}>{t("TXT_KEY_FOOTER_DB_CUSTOM")}</option>
                        )}
                    </select>
                    {!loadingDatabase ? dbSizeRaw > 0 && (
                        <span style={{color: CIV.tick}}>
                            {t("TXT_KEY_FOOTER_DB_SIZE")} {formatMB(dbSizeRaw)}
                            {dbSizeGz > 0 && (
                                <span> ({formatMB(dbSizeGz)} {t("TXT_KEY_FOOTER_DB_COMPRESSED")})</span>
                            )}
                        </span>
                    ) : (
                        <span style={{color: CIV.tick}}>
                            {t("TXT_KEY_LOADING")}
                        </span>
                    )}
                    <span style={{color: CIV.tick}}>

                    </span>
                    <a className="text-xs tracking-widest uppercase" style={{color: CIV.muted}}
                       href='https://catscatsforever.github.io/Civ5ReplaysDatabase/Legacy/index.html'>
                        {t("TXT_KEY_FOOTER_LEGACY")}
                    </a>
                    <span style={{color: CIV.tick}}>

                    </span>
                    <a className="text-xs tracking-widest uppercase" style={{color: CIV.muted}}
                       href='https://github.com/catscatsforever/Civ5ReplaysDatabase'>
                        {t("TXT_KEY_FOOTER_REPOSITORY")}
                    </a>
                </div>
            </footer>
        </div>
    );
}

export default function App() {
    return (
        <LangProvider>
            <AppInner/>
        </LangProvider>
    );
}
