export type HashParams = Partial<{
    DB: string;
    Tab: string;
    GameID: string;
    Dataset: string;
    Player: string;
    Method: string;
    Groups: string;
    Turn: string;
}>;

export const TAB_TO_HASH: Record<string, string> = {
    summary:     "Summary",
    game:        "GameView",
    player:      "PlayerView",
    group:       "GroupAnalysis",
    distribution:"Distribution",
    tables:      "Tables",
    explorer:    "Explorer",
    map:         "Map",
    query:       "Query",
};

export const HASH_TO_TAB: Record<string, string> = Object.fromEntries(
    Object.entries(TAB_TO_HASH).map(([k, v]) => [v.toLowerCase(), k])
);

export function parseHash(hash: string): HashParams {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return {};
    const params: HashParams = {};
    for (const segment of raw.split("/")) {
        const colon = segment.indexOf(":");
        if (colon < 1) continue;
        const key = segment.slice(0, colon).trim();
        const val = decodeURIComponent(segment.slice(colon + 1).trim());
        if (!val) continue;
        // Match key case-insensitively to our canonical keys
        const canonical = Object.keys({
            DB: 1, Tab: 1, GameID: 1, Dataset: 1, Player: 1,
            Method: 1, Groups: 1, Turn: 1,
        } satisfies Record<keyof HashParams, number>).find(
            (k) => k.toLowerCase() === key.toLowerCase()
        ) as keyof HashParams | undefined;
        if (canonical) (params as any)[canonical] = val;
    }
    return params;
}

const TAB_DEPENDENCIES: Record<string, string[]> = {
    Summary: [],
    GameView: ['GameID', 'Dataset'],
    PlayerView: ['Player', 'Dataset'],
    GroupAnalysis: ['Dataset', 'Method', 'Groups'],
    Distribution: [],
    Tables: [],
    Explorer: [],
    Map: ['GameID', 'Turn'],
    Query: [],
    '': [],
}
export function buildHash(params: HashParams): string {
    let deps;
    if (params.Tab) {
        deps = TAB_DEPENDENCIES[params.Tab];
    }
    const parts: string[] = [];
    const order: (keyof HashParams)[] = ["DB", "Tab", "GameID", "Player", "Dataset", "Method", "Groups", "Turn"];
    for (const key of order) {
        const val = params[key];
        if ((deps ? ['DB', 'Tab', ...deps].includes(key) : true) && val !== undefined && val !== "") {
            parts.push(`${key}:${encodeURIComponent(val)}`);
        }
    }
    return parts.length ? "#" + parts.join("/") : "";
}

export function pushHash(params: HashParams): void {
    const h = buildHash(params);
    // Only push if changed
    if (window.location.hash !== h) {
        window.history.pushState(null, "", h || window.location.pathname);
    }
}

export function replaceHash(params: HashParams): void {
    const h = buildHash(params);
    if (window.location.hash !== h) {
        window.history.replaceState(null, "", h || window.location.pathname);
    }
}

export function mergeHash(updates: HashParams): void {
    const current = parseHash(window.location.hash);
    replaceHash({ ...current, ...updates });
}
