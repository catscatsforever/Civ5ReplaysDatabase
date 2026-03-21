import { useState, useEffect, useRef, useCallback } from "react";
import { getSqlWorker } from "../db";
import { CIV } from "../civPalette";
import { useLang } from "../LangContext";
import CivText from "./CivText";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameRow {
    gameId:      number;
    gameSeed:    number;
    winType:     string | null;
    gameName:    string;
}

interface PlayerRow {
    playerId:    number;
    playerName:  string;   // from Teams.LeaderID
    standing:    number;
    civId:       string;   // from Players.CivID
    winType:     string | null; // from Teams.WinType (null if not winner)
}

interface CityInfo {
    cityId:    number;
    label:     string;
    foundTurn: number;
    captured:  boolean;
}

interface EventRow {
    turn:        number;
    description: string;
}

// Cache key helpers
function gameKey(gId: number)                               { return `g:${gId}`; }
function playerKey(gSeed: number, pId: number)              { return `p:${gSeed}:${pId}`; }
function catKey(gSeed: number, pId: number, cat: string)    { return `c:${gSeed}:${pId}:${cat}`; }
function cityKey(gSeed: number, pId: number, cId: number)   { return `city:${gSeed}:${pId}:${cId}`; }

// Event table
function EventTable({ rows, loading }: { rows: EventRow[]; loading: boolean }) {
    const { t } = useLang();
    if (loading) return <div className="py-2 px-4 text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_LOADING")}</div>;
    if (!rows.length) return <div className="py-2 px-4 text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_EXPLORER_NO_EVENTS")}</div>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ borderColor: CIV.border }}>
                <thead>
                <tr style={{ background: CIV.navBg }}>
                    <th className="px-3 py-1.5 text-left w-16" style={{ color: CIV.border, borderBottom: `1px solid ${CIV.border}40` }}>{t("TXT_KEY_EXPLORER_COL_TURN")}</th>
                    <th className="px-3 py-1.5 text-left"       style={{ color: CIV.border, borderBottom: `1px solid ${CIV.border}40` }}>{t("TXT_KEY_EXPLORER_COL_EVENT")}</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? CIV.surface : CIV.surfaceAlt }}>
                        <td className="px-3 py-1 tabular-nums" style={{ color: CIV.tick }}>{r.turn}</td>
                        <td className="px-3 py-1"              style={{ color: CIV.text }}><CivText text={r.description} iconSize={16} /></td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

// Tree node
interface NodeProps {
    label: React.ReactNode; depth: number; onOpen?: () => void;
    children?: React.ReactNode; badge?: string; badgeColor?: string; leaf?: boolean;
}

function TreeNode({ label, depth, onOpen, children, badge, badgeColor, leaf }: NodeProps) {
    const [open, setOpen] = useState(false);
    const didLoad = useRef(false);

    function toggle() {
        if (leaf) return;
        const next = !open;
        setOpen(next);
        if (next && !didLoad.current) { didLoad.current = true; onOpen?.(); }
    }

    return (
        <div>
            <div
                className={`flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${leaf ? "" : "cursor-pointer"}`}
                style={{ paddingLeft: `${depth * 20 + 8}px`, background: open ? CIV.navSel : "transparent" }}
                onMouseEnter={e => { if (!open) (e.currentTarget as HTMLDivElement).style.background = CIV.navBg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = open ? CIV.navSel : "transparent"; }}
                onClick={toggle}
            >
                {!leaf && <span style={{ color: CIV.border, fontSize: 10, minWidth: 10 }}>{open ? "▼" : "▶"}</span>}
                {leaf  && <span style={{ minWidth: 10, display: "inline-block" }} />}
                <span className="text-sm flex-1" style={{ color: CIV.text }}>{label}</span>
                {badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: badgeColor ?? CIV.navBg, color: CIV.border, border: `1px solid ${CIV.border}50` }}>
            {badge}
          </span>
                )}
            </div>
            {open && children && (
                <div style={{ borderLeft: `1px solid ${CIV.border}30`, marginLeft: `${depth * 20 + 16}px` }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// City node
function CityNode({ gameSeed, playerId, city, depth }: { gameSeed: number; playerId: number; city: CityInfo; depth: number }) {
    const { t } = useLang();
    const [rows, setRows] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(false);
    const cache = useRef<EventRow[] | null>(null);

    const load = useCallback(async () => {
        if (cache.current) { setRows(cache.current); return; }
        setLoading(true);
        try {
            const sql = `
				select turn,
				iif(ReplayEventID=62,iif(num5=2,'[ICON_GOLD] ',iif(num5=5,'[ICON_PEACE] ',' '))||UnitKey,
				iif(ReplayEventID=63,iif(num5=2,'[ICON_GOLD] ',iif(num5=5,'[ICON_PEACE] ',' '))||BuildingKey,
				iif(ReplayEventID=77,UnitKey,
				iif(ReplayEventID=78,BuildingKey,
				'???')))) as Event from ReplayEvents
				join ReplayEventKeys on ReplayEventKeys.ReplayEventID = ReplayEvents.ReplayEventType
				join GameSeeds using(GameSeed)
				join Games using(GameID, PlayerID)
				left join BuildingKeys on iif(ReplayEventID=78,BuildingID = num2,BuildingID=num3)
				left join UnitKeys on UnitID = num2
				where ReplayEventID in (62,63,77,78) and GameSeed = ${gameSeed} and PlayerID = ${playerId} and Num1 = ${city.cityId}
				order by Turn, timestamp
            `;
            const res = await getSqlWorker().exec(sql);
            const evts: EventRow[] = res[0]?.values.map(r => ({ turn: Number(r[0]), description: String(r[1]) })) ?? [];
            cache.current = evts;
            setRows(evts);
        } finally { setLoading(false); }
    }, [gameSeed, playerId, city.cityId, t]);

    return (
        <TreeNode label={<CivText text={city.label}/>} depth={depth} onOpen={load}>
            <EventTable rows={rows} loading={loading} />
        </TreeNode>
    );
}

// Category node
function CategoryNode({ gameSeed, playerId, cat, depth }: { gameSeed: number; playerId: number; cat: string; depth: number }) {
    const { t } = useLang();
    const [rows,     setRows]     = useState<EventRow[]>([]);
    const [cityRows, setCityRows] = useState<CityInfo[]>([]);
    const [loading,  setLoading]  = useState(false);
    const cache = useRef<{ rows?: EventRow[]; cities?: CityInfo[] } | null>(null);

    const labelMap: Record<string, string> = {
        cities:        t("TXT_KEY_EXPLORER_CAT_CITIES"),
        policies:      t("TXT_KEY_EXPLORER_CAT_POLICIES"),
        technologies:  t("TXT_KEY_EXPLORER_CAT_TECHNOLOGIES"),
        beliefs:       t("TXT_KEY_EXPLORER_CAT_BELIEFS"),
        goodyHuts:     t("TXT_KEY_EXPLORER_CAT_GOODY_HUTS"),
    };

    const load = useCallback(async () => {
        if (cache.current) {
            if (cache.current.rows)   setRows(cache.current.rows);
            if (cache.current.cities) setCityRows(cache.current.cities);
            return;
        }
        setLoading(true);
        try {
            let sql = "";
            if (cat === "technologies") {
                sql = `
					select Turn,
					iif(ReplayEventID=64,'FREE TECH '||TechnologyKey,
					iif(ReplayEventID=65,'STEALS '||TechnologyKey,
					iif(ReplayEventID=91,TechnologyKey,
					'???'))) as Event from ReplayEvents
					join ReplayEventKeys on ReplayEventKeys.ReplayEventID = ReplayEvents.ReplayEventType
					join GameSeeds using(GameSeed)
					join Games using(GameID, PlayerID)
					join TechnologyKeys on TechnologyId=iif(ReplayEventType=91,num2,num1)
					where ReplayEventID in (91,64,65) and GameSeed = ${gameSeed} and PlayerID = ${playerId}
					order by Turn, timestamp
				`;
            } else if (cat === "policies") {
                sql = `
					select turn,
					PolicyBranch||': '||PolicyKey as Event from ReplayEvents
					join ReplayEventKeys on ReplayEventKeys.ReplayEventID = ReplayEvents.ReplayEventType
					join GameSeeds using(GameSeed)
					join Games using(GameID, PlayerID)
					join PolicyKeys on PolicyID=num2
					join PolicyBranches using(BranchID)
					where ReplayEventID = 61 and GameSeed = ${gameSeed} and PlayerID = ${playerId}
					order by Turn, timestamp
               `;
            } else if (cat === "beliefs") {
                sql = `
					SELECT Turn, BeliefType||': '||BeliefKey AS Event FROM (
    					SELECT Turn, GameSeed, PlayerID, Num1 AS Value FROM ReplayEvents
    					WHERE ReplayEventType = 17
    					UNION
    					SELECT Turn, GameSeed, PlayerID, Num2 FROM ReplayEvents
    					WHERE ReplayEventType = 18
    					UNION
    					SELECT Turn, GameSeed, PlayerID, Num3 FROM ReplayEvents
    					WHERE ReplayEventType = 18
    					UNION
    					SELECT Turn, GameSeed, PlayerID, Num4 FROM ReplayEvents
    					WHERE ReplayEventType = 18
    					UNION
    					SELECT Turn, GameSeed, PlayerID, Num5 FROM ReplayEvents
    					WHERE ReplayEventType = 18
    					UNION
    					SELECT Turn, GameSeed, PlayerID, Num2 FROM ReplayEvents
    					WHERE ReplayEventType = 19
    					UNION
    					SELECT Turn, GameSeed, PlayerID, Num3 FROM ReplayEvents
    					WHERE ReplayEventType = 19
    				)
    				JOIN BeliefKeys ON BeliefID = Value
    				JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
					join GameSeeds using(GameSeed)
					join Games using(GameID, PlayerID)
					where GameSeed = ${gameSeed} and PlayerID = ${playerId}
					order by Turn, BeliefTypes.TypeID
               `;
            } else if (cat === "goodyHuts") {
                sql = `
					select turn,
					column2 as Event from ReplayEvents
					join ReplayEventKeys on ReplayEventKeys.ReplayEventID = ReplayEvents.ReplayEventType
					join GameSeeds using(GameSeed)
					join Games using(GameID, PlayerID)
					join (
						SELECT * FROM (VALUES
						(0, 'Warrior'),
						(1, '[ICON_FOOD] Food'),
						(2, '[ICON_CULTURE] Culture'),
						(3, 'Pantheon [ICON_PEACE] Faith'),
						(4, 'Prophet [ICON_PEACE] Faith'),
						(5, 'Barbarians reveal'),
						(6, '[ICON_GOLD] Gold'),
						(7, 'Map reveal'),
						(8, '[ICON_RESEARCH] Science'),
						(9, 'Resource reveal'),
						(10, 'Unit upgrade'),
						(11, 'Barbarians'),
						(12, 'Barbarians'),
						(13, '[ICON_GOLD] Gold'),
						(14, '[ICON_GOLD] Gold'),
						(15, 'Settler'),
						(16, 'Scout'),
						(17, 'Worker'),
						(18, 'Unit mobility'),
						(19, 'Unit healing'),
						(20, 'City border expansion'))
					) on column1=num1
					where ReplayEventID = 87 and GameSeed = ${gameSeed} and PlayerID = ${playerId}
					order by Turn, timestamp
               `;
            } else if (cat === "cities") {
                const foundSql = `
                  select PlotIndex, CityName, Turn, remark FROM (
                    select GameID, PlayerID, Turn, TimeStamp, num1 as PlotIndex, IFNULL(Text, str) as CityName,
                    iif(str = 'NO_CITY', 'raze', iif(count(*)=1, 'founded', 'conquest')) as remark, row_number() over() as rn, max(ReplayEvents.rowid) from ReplayEvents
                    join ReplayEventKeys on ReplayEventKeys.ReplayEventID = ReplayEvents.ReplayEventType
                    join GameSeeds using(GameSeed)
                    join Games using(GameID, PlayerID)
                    left join CityNames on str = CityName
                    where ReplayEventID in (101) and GameSeed = ${gameSeed} and PlayerID = ${playerId}
                    group by GameID, PlayerID, PlotIndex, Turn
                    order by GameID, PlayerID, Turn, timestamp desc
                  ) where remark != 'raze'
                  group by GameID, PlayerID, PlotIndex
                  order by Turn
                `;
                const res = await getSqlWorker().exec(foundSql);
                const cities: CityInfo[] = (res[0]?.values ?? []).map(r => ({
                    cityId:    Number(r[0]),
                    label:     `${r[1]} (T${r[2]})${r[3] === 'conquest' ? '[ICON_WAR]' : ''}`,
                    foundTurn: Number(r[2]),
                    captured:  r[3] === 'conquest',
                }));
                cache.current = { cities };
                setCityRows(cities);
                setLoading(false);
                return;
            }

            if (sql) {
                const res = await getSqlWorker().exec(sql);
                const evts: EventRow[] = (res[0]?.values ?? []).map(r => ({ turn: Number(r[0]), description: String(r[1]) }));
                cache.current = { rows: evts };
                setRows(evts);
            }
        } finally { setLoading(false); }
    }, [gameSeed, playerId, cat, t]);

    if (cat === "cities") {
        return (
            <TreeNode key={catKey(gameSeed, playerId, cat)} label={labelMap[cat] ?? cat} depth={depth} onOpen={load}>
                {loading && <div className="py-1 px-4 text-xs" style={{ color: CIV.muted }}>{t("TXT_KEY_LOADING")}</div>}
                {cityRows.length > 0 ? cityRows.map(city => (
                    <CityNode key={cityKey(gameSeed, playerId, city.cityId)} gameSeed={gameSeed} playerId={playerId} city={city} depth={depth + 1} />
                )) : !loading &&
                <div className="py-2 px-4 text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_EXPLORER_NO_EVENTS")}</div>}
            </TreeNode>
        );
    }

    return (
        <TreeNode key={catKey(gameSeed, playerId, cat)} label={labelMap[cat] ?? cat} depth={depth} onOpen={load}>
            <EventTable rows={rows} loading={loading} />
        </TreeNode>
    );
}

// Player node
const CATEGORIES = ["cities", "technologies", "policies", "beliefs", "goodyHuts"] as const;

function PlayerNode({ gameSeed, player, depth }: { gameSeed: number; player: PlayerRow; depth: number }) {
    const civShort = player.civId.replace("CIVILIZATION_", "");
    const standing = `#${player.standing}`;
    const badge    = player.winType ? `${standing} - ${player.winType ?? "??"}` : standing;

    return (
        <TreeNode
            label={<span>{player.playerName} <span style={{ color: CIV.muted, fontSize: 11 }}>({civShort})</span></span>}
            depth={depth} badge={badge}
            badgeColor={player.winType ? CIV.tealDk : undefined}>
            {CATEGORIES.map(cat => (
                <CategoryNode key={catKey(gameSeed, player.playerId, cat)}
                              gameSeed={gameSeed} playerId={player.playerId} cat={cat} depth={depth + 1} />
            ))}
        </TreeNode>
    );
}

// Game node
function GameNode({ game, depth }: { game: GameRow; depth: number }) {
    const { t } = useLang();
    const [players, setPlayers] = useState<PlayerRow[]>([]);
    const [loading, setLoading] = useState(false);
    const cache = useRef<PlayerRow[] | null>(null);

    const load = useCallback(async () => {
        if (cache.current) { setPlayers(cache.current); return; }
        setLoading(true);
        try {
            // Join Players + Teams to get PlayerID, name, civ, standing, win info
            const res = await getSqlWorker().exec(`
                SELECT PlayerID, Player, CivKey, Standing, IIF(WinID = 0, NULL, WinType) FROM Games
                JOIN GameSeeds USING(GameID)
                JOIN Players USING(GameSeed, PlayerID)
                JOIN CivKeys USING(CivID)
                Join WinTypes USING(WinID)
                WHERE GameSeed = ${game.gameSeed}
            `);
            const rows: PlayerRow[] = (res[0]?.values ?? []).map(r => ({
                playerId:   Number(r[0]),
                playerName: String(r[1]),
                civId:      String(r[2]),
                standing:   Number(r[3]),
                winType:    r[4] ? String(r[4]) : null,
            }));
            cache.current = rows;
            setPlayers(rows);
        } finally { setLoading(false); }
    }, [game.gameSeed]);

    return (
        <TreeNode label={`${game.gameName}`} depth={depth}
                  badge={game.winType ?? undefined} onOpen={load}>
            {loading && <div className="py-1 px-4 text-xs" style={{ color: CIV.muted }}>{t("TXT_KEY_LOADING")}</div>}
            {players.map(p => (
                <PlayerNode key={playerKey(game.gameSeed, p.playerId)} gameSeed={game.gameSeed} player={p} depth={depth + 1} />
            ))}
        </TreeNode>
    );
}

// Root
export default function EventExplorer() {
    const { t } = useLang();
    const [games,   setGames]   = useState<GameRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded,  setLoaded]  = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                // Load all games with their seeds and winner's WinType
                const res = await getSqlWorker().exec(`
                    SELECT GameID, GameSeed, WinType, GameID||'\t('||GROUP_CONCAT(Player, ', ')||')', MAX(WinID) FROM Games
                    JOIN GameSeeds USING(GameID)
                    JOIN WinTypes USING(WinID)
                    WHERE EndTurn > 0
                    GROUP BY GameID
                    ORDER BY GameID;
                `);
                const rows: GameRow[] = (res[0]?.values ?? []).map(r => ({
                    gameId:   Number(r[0]),
                    gameSeed: Number(r[1]),
                    winType:  r[2] ? String(r[2]) : null,
                    gameName: String(r[3]),
                }));
                setGames(rows);
            } finally { setLoading(false); setLoaded(true); }
        })();
    }, []);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl tracking-wide" style={{ color: CIV.text }}>{t("TXT_KEY_EXPLORER_TITLE")}</h2>
                <p className="text-sm mt-1" style={{ color: CIV.muted }}>{t("TXT_KEY_EXPLORER_SUBTITLE")}</p>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                {loading && <div className="p-6 text-center text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_LOADING")}</div>}
                {loaded && games.length === 0 && <div className="p-6 text-center text-sm" style={{ color: CIV.muted }}>{t("TXT_KEY_EXPLORER_NO_EVENTS")}</div>}
                {games.map(g => (
                    <div key={gameKey(g.gameId)} style={{ borderBottom: `1px solid ${CIV.border}20` }}>
                        <GameNode game={g} depth={0} />
                    </div>
                ))}
            </div>
        </div>
    );
}
