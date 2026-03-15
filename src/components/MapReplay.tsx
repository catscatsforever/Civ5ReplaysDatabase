import { useEffect, useRef, useState, useCallback } from "react";
import { getSqlWorker } from "../db";
import { CIV, CHART_COLORS } from "../civPalette";
import { useLang } from "../LangContext";
import { HashParams, mergeHash } from "../routing";
import { CIVILIZATION_DEFINES, CivDef } from "../icons";

const COLS = 66;
const ROWS = 42;
const MAX_TURN = 330;
const MIN_SCALE = 0.8;
const MAX_SCALE = 8.0;
const MAX_RENDER_R = 64;
const MIN_RENDER_R = 4;
const RERENDER_RATIO = 1.6;  // re-render terrain when zoom drifts >60%
const RERENDER_DEBOUNCE_MS = 120;  // ms to wait after last zoom before re-render

function cityNameToCiv(name: string): CivDef {
    for (const key of Object.keys(CIVILIZATION_DEFINES)) {
        if (CIVILIZATION_DEFINES[key].CityName === name) {
            return CIVILIZATION_DEFINES[key];
        }
    }
    return CIVILIZATION_DEFINES.CIVILIZATION_BARBARIAN;
}

function hexCorners(cx: number, cy: number, r: number): [number, number][] {
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 180) * (60 * i - 90);
        pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
    return pts;
}

function hexCenter(x: number, y: number, r: number): [number, number] {
    y = ROWS - y - 1
    const sq3 = Math.sqrt(3);
    const cx = (x + (y % 2 === 0 ? 0.5 : 0)) * sq3 * r + (sq3 * r) / 2;
    const cy = y * 1.5 * r + r;
    return [cx, cy];
}

const ODD_NEIGHBORS: [number, number][] = [
    [1, 1], // NE
    [1, 0], // E
    [1, -1], // SE
    [0, -1], // SW
    [-1, 0], // W
    [0, 1], // NW
];
const EVEN_NEIGHBORS: [number, number][] = [
    [0, 1], // NE
    [1, 0], // E
    [0, -1], // SE
    [-1, -1], // SW
    [-1, 0], // W
    [-1, 1], // NW
];

function hexNeighbor(x: number, y: number, edge: number): [number, number] {
    const d = y % 2 === 0 ? EVEN_NEIGHBORS[edge] : ODD_NEIGHBORS[edge];
    return [x + d[0], y + d[1]];
}

function pixelToHex(wx: number, wy: number, r: number): [number, number] | null {
    const sq3 = Math.sqrt(3);
    const rowApprox = (wy - r) / (1.5 * r);
    let bestDist = Infinity;
    let bestX = -1;
    let bestY = -1;

    for (let dy = -1; dy <= 1; dy++) {
        const row = ROWS - 1 - (Math.round(rowApprox) + dy);
        if (row < 0 || row >= ROWS) continue;
        const shift = row % 2 === 1 ? 0.5 : 0;
        const colApprox = (wx - (sq3 * r) / 2) / (sq3 * r) - shift;
        for (let dx = -1; dx <= 1; dx++) {
            const col = Math.round(colApprox) + dx;
            if (col < 0 || col >= COLS) continue;
            const [hx, hy] = hexCenter(col, row, r);
            const d = (wx - hx) ** 2 + (wy - hy) ** 2;
            if (d < bestDist) { bestDist = d; bestX = col; bestY = row; }
        }
    }
    return bestX >= 0 && bestDist <= r * r ? [bestX, bestY] : null;
}

// PLOT_MOUNTAIN
// PLOT_HILLS
// PLOT_LAND
// PLOT_OCEAN

// TERRAIN_GRASS 6aaa4a
// TERRAIN_PLAINS cdba57
// TERRAIN_DESERT f6e1af
// TERRAIN_TUNDRA 7b7162
// TERRAIN_SNOW e6f5ff
// TERRAIN_COAST 1e5078
// TERRAIN_OCEAN 1a3a5c
// TERRAIN_MOUNTAIN 7a7a80

function tileColor(plotType: number, terrain: number): string {
    if (plotType === 0 || terrain === 7) {  // PLOT_MOUNTAIN / TERRAIN_MOUNTAIN
        return "#7a7a80";
    }
    if (plotType === 1) {  // PLOT_HILLS
        if (terrain === 0) return "#6aaa4a"; // TERRAIN_GRASS
        if (terrain === 1) return "#cdba57"; // TERRAIN_PLAINS
        if (terrain === 2) return "#f6e1af"; // TERRAIN_DESERT
        if (terrain === 3) return "#7b7162"; // TERRAIN_TUNDRA
        if (terrain === 4) return "#e6f5ff"; // TERRAIN_SNOW
    }
    if (plotType === 2) {  // PLOT_LAND
        if (terrain === 0) return "#6aaa4a"; // TERRAIN_GRASS
        if (terrain === 1) return "#cdba57"; // TERRAIN_PLAINS
        if (terrain === 2) return "#f6e1af"; // TERRAIN_DESERT
        if (terrain === 3) return "#7b7162"; // TERRAIN_TUNDRA
        if (terrain === 4) return "#e6f5ff"; // TERRAIN_SNOW
    }
    if (plotType === 3) {  // PLOT_OCEAN
        if (terrain === 5) return "#1e5078"; // TERRAIN_COAST
        if (terrain === 6) return "#1a3a5c"; // TERRAIN_OCEAN
    }
    return "#555";
}

interface TerrainTile { plotType: number; terrain: number; }
interface BorderEvent  { turn: number; tileIdx: number; owner: number; }
interface CityEvent    { turn: number; razedTurn: number; x: number; y: number; owner: number; name: string; }
interface Camera { x: number; y: number; scale: number; }
interface TooltipData {
    screenX: number; screenY: number;
    col: number; row: number;
    tile: TerrainTile;
    owner: number;
    cityName: string | null; cityOwner: number;
}
interface Props { initialHash?: HashParams; }

export default function MapReplay({ initialHash = {} }: Props) {
    const { t } = useLang();

    const [games, setGames]       = useState<number[]>([]);
    const [selGame, setSelGame]   = useState<number>(1);
    const [turn, setTurn]         = useState(0);
    const [endTurn, setEndTurn]           = useState(MAX_TURN);
    const [playing, setPlaying]   = useState(false);
    const [loading, setLoading]   = useState(false);
    const [noData, setNoData]     = useState(false);
    const [tooltip, setTooltip]   = useState<TooltipData | null>(null);
    const [cursor, setCursor]     = useState<string>("grab");

    const terrainRef    = useRef<Map<number, TerrainTile>>(new Map());
    const bordersRef    = useRef<BorderEvent[]>([]);
    const citiesRef = useRef<CityEvent[]>([]);
    const playerCivsRef= useRef<CivDef[]>([]);
    const playerNamesRef = useRef<string[]>([]);
    const ownershipRef  = useRef<Uint8Array>(new Uint8Array(COLS * ROWS).fill(255));
    const containerRef      = useRef<HTMLDivElement>(null);
    const canvasRef         = useRef<HTMLCanvasElement>(null);
    const terrainCanvasRef  = useRef<HTMLCanvasElement | null>(null);
    const hexSizeRef        = useRef(12);
    const rafRef            = useRef<number>(0);
    const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
    const dragRef   = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });
    const turnRef = useRef(0);
    const terrainRRef = useRef(12);
    const terrainRerenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const setTurnSynced = useCallback((v: number | ((p: number) => number)) => {
        setTurn(prev => {
            const next = typeof v === "function" ? v(prev) : v;
            turnRef.current = next;
            return next;
        });
    }, []);

    const resetCamera = useCallback(() => {
        const container = containerRef.current;
        const terrainCanvas = terrainCanvasRef.current;
        if (!container || !terrainCanvas) return;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const baseR = hexSizeRef.current;
        const tR    = terrainRRef.current;
        const tW = terrainCanvas.width;
        const tH = terrainCanvas.height;
        const scale = Math.min(cw * tR / (tW * baseR), ch * tR / (tH * baseR), 1);
        const visW = tW * baseR * scale / tR;
        const visH = tH * baseR * scale / tR;
        cameraRef.current = {
            x: (cw - visW) / 2,
            y: (ch - visH) / 2,
            scale,
        };
    }, []);

    const computeLayout = useCallback(() => {
        if (!containerRef.current) return;
        const w  = containerRef.current.clientWidth;
        const rW = w / ((COLS + 0.5) * Math.sqrt(3));
        const maxH = window.innerHeight * 0.65;
        const rH = maxH / (ROWS * 1.5 + 0.5);
        hexSizeRef.current = Math.max(4, Math.floor(Math.min(rW, rH)));
    }, []);

    const drawTerrain = useCallback((renderR: number) => {
        const r = Math.max(MIN_RENDER_R, Math.min(renderR, MAX_RENDER_R));
        const sq3 = Math.sqrt(3);
        const W   = Math.ceil((COLS + 0.5) * sq3 * r);
        const H   = Math.ceil((ROWS * 1.5 + 0.5) * r);

        const off = document.createElement("canvas");
        off.width  = W;
        off.height = H;
        const ctx  = off.getContext("2d")!;
        ctx.fillStyle = "#0a1a2a";
        ctx.fillRect(0, 0, W, H);

        //console.log('terrain tile0', hexCenter(0, 0, r))
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const tile = terrainRef.current.get(x + y * COLS);
                if (!tile) continue;
                const [cx, cy] = hexCenter(x, y, r);
                const corners  = hexCorners(cx, cy, r - 0.5);
                ctx.beginPath();
                ctx.moveTo(corners[0][0], corners[0][1]);
                for (let i = 1; i < 6; i++) ctx.lineTo(corners[i][0], corners[i][1]);
                ctx.closePath();
                ctx.fillStyle = tileColor(tile.plotType, tile.terrain);
                ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0)";
                ctx.lineWidth   = 0.5;
                ctx.stroke();

                if (tile.plotType === 0 || tile.plotType === 1) {
                    ctx.fillStyle   = "rgb(255,255,255)";
                    ctx.font        = `${Math.max(6, r - 2)}px sans-serif`;
                    ctx.textAlign   = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(tile.plotType === 0 ? "▲" : "△", cx, cy);
                }
            }
        }
        terrainCanvasRef.current = off;
        terrainRRef.current = r;
    }, []);


    const drawFrame = useCallback((currentTurn: number) => {
        const canvas        = canvasRef.current;
        const terrainCanvas = terrainCanvasRef.current;
        const container     = containerRef.current;
        if (!canvas || !terrainCanvas || !container) return;

        const baseR   = hexSizeRef.current;
        const cam = cameraRef.current;
        const tR    = terrainRRef.current;

        const displayScale = (baseR * cam.scale) / tR;  // scale from canvas coords to screen coords
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width  = cw;
            canvas.height = ch;
        }

        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, cw, ch);

        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.scale(displayScale, displayScale);

        // terrain
        ctx.drawImage(terrainCanvas, 0, 0);

        // ownership
        const ownership = new Uint8Array(COLS * ROWS).fill(255);
        for (const ev of bordersRef.current) {
            if (ev.turn > currentTurn) break;
            ownership[ev.tileIdx] = ev.owner;
        }
        ownershipRef.current = ownership;

        for (let tileIdx = 0; tileIdx < COLS * ROWS; tileIdx++) {
            if (terrainRef.current.get(tileIdx)?.plotType == 3) continue;  // skip water
            const owner = ownership[tileIdx];
            if (owner === 255) continue;
            const x = tileIdx % COLS;
            const y = Math.floor(tileIdx / COLS);
            const [cx, cy] = hexCenter(x, y, tR);
            const corners = hexCorners(cx, cy, tR);
            const corners2 = hexCorners(cx, cy, tR * 0.95);

            ctx.beginPath();
            ctx.moveTo(corners[0][0], corners[0][1]);
            for (let i = 1; i < 6; i++) ctx.lineTo(corners[i][0], corners[i][1]);
            ctx.closePath();
            const prim = playerCivsRef.current[owner]?.PrimaryColor + "CC"
            const sec = playerCivsRef.current[owner]?.SecondaryColor + "BB"
            const col = CHART_COLORS[owner % CHART_COLORS.length];
            ctx.fillStyle = sec ?? col + 'BB'
            ctx.fill();
            ctx.strokeStyle = prim ?? col + 'CC'
            ctx.lineWidth   = Math.max(1, tR * 0.1);
            ctx.lineCap     = "round";
            for (let edge = 0; edge < 6; edge++) {
                const [nx, ny] = hexNeighbor(x, y, edge);
                // Draw border if neighbor is out of bounds, unowned, or different owner
                const neighborOwner = (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS)
                    ? ownership[nx + ny * COLS]
                    : 255;
                if (neighborOwner !== owner) {
                    ctx.beginPath();
                    ctx.moveTo(corners2[edge][0], corners2[edge][1]);
                    ctx.lineTo(corners2[(edge + 1) % 6][0], corners2[(edge + 1) % 6][1]);
                    ctx.stroke();
                }
            }
        }

        // city markers
        for (const city of citiesRef.current) {
            if (city.turn > currentTurn || city.razedTurn <= currentTurn) continue;
            const [cx, cy] = hexCenter(city.x, city.y, tR);
            const col = CHART_COLORS[city.owner % CHART_COLORS.length];

            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(3, tR * 0.45), 0, Math.PI * 2);
            ctx.fillStyle = playerCivsRef.current[city.owner]?.PrimaryColor ?? col;
            ctx.fill();
            ctx.strokeStyle = playerCivsRef.current[city.owner]?.TextColor ?? "#FFFFC8";
            ctx.lineWidth   = Math.max(1, tR * 0.08);
            ctx.stroke();

            // city name label for larger hex sizes
            if (tR >= 8 && city.name) {
                ctx.fillStyle = playerCivsRef.current[city.owner]?.TextColor ?? "#FFFFC8";
                ctx.font = `${2*Math.max(6, tR * 0.35)}px Futura PT`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillText(city.name, cx, cy + tR * 0.5);
            }
        }

        ctx.restore();
    }, []);
    const scheduleTerrainRerender = useCallback(() => {
        if (terrainRerenderTimerRef.current) clearTimeout(terrainRerenderTimerRef.current);
        terrainRerenderTimerRef.current = setTimeout(() => {
            const cam = cameraRef.current;
            const effectiveR = hexSizeRef.current * cam.scale;
            const clampedR = Math.max(MIN_RENDER_R, Math.min(effectiveR, MAX_RENDER_R));
            const ratio = clampedR / terrainRRef.current;
            if (ratio > 1.3 || ratio < 0.7) {
                drawTerrain(clampedR);
                // Redraw frame with new terrain
                const canvas = canvasRef.current;
                const container = containerRef.current;
                if (canvas && container) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = requestAnimationFrame(() => drawFrame(turnRef.current));
                }
            }
        }, RERENDER_DEBOUNCE_MS);
    }, [drawTerrain, drawFrame]);

    const fullRedraw = useCallback(() => {
        computeLayout();
        drawTerrain(hexSizeRef.current);
        resetCamera();
        drawFrame(turnRef.current);
    }, [computeLayout, drawTerrain, resetCamera, drawFrame]);

    const renderFrame = useCallback((t: number) => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => drawFrame(t));
    }, [drawFrame]);

    // game list load
    useEffect(() => {
        getSqlWorker().exec("SELECT DISTINCT GameID FROM GameSeeds WHERE GameSeed NOT NULL ORDER BY GameID")
            .then(r => {
                if (!r.length) return;
                const ids = r[0].values.map(v => Number(v[0]));
                setGames(ids);
                if (initialHash.GameID) {
                    const fromHash = Number(initialHash.GameID);
                    if (ids.includes(fromHash)) setSelGame(fromHash);
                }
                if (initialHash.Turn) {
                    const t = Math.max(0, Math.min(MAX_TURN, Number(initialHash.Turn)));
                    if (!isNaN(t)) setTurnSynced(t);
                }
            }).catch(() => {});
    }, []);

    useEffect(() => {
        try {
            mergeHash({ GameID: String(selGame), Turn: String(turn) });
        }
        catch(e) {
            //console.log('WARN mergeHash', e)
        }
    }, [selGame, turn]);

    // load map data
    useEffect(() => {
        setLoading(true);
        setNoData(false);
        setTurnSynced(0);
        setPlaying(false);
        terrainRef.current.clear();
        bordersRef.current  = [];
        citiesRef.current   = [];
        terrainCanvasRef.current = null;

        const w = getSqlWorker();
        w.exec(`SELECT GameSeed, EndTurn FROM GameSeeds WHERE GameID=${selGame} LIMIT 1`)
            .then(seedRes => {
                if (!seedRes[0]?.values.length) { setNoData(true); setLoading(false); return; }
                const gameSeed = seedRes[0].values[0][0] as number;
                setEndTurn(seedRes[0].values[0][1]);
                Promise.all([
                    w.exec(`
                        SELECT Num1, Num2, Num3, Num4
                        FROM ReplayEvents
                        WHERE GameSeed=${gameSeed} AND ReplayEventType=105 AND Turn=0
                    `),
                    w.exec(`
                        SELECT Turn, Num1, Num2, Num3
                        FROM ReplayEvents
                        WHERE GameSeed=${gameSeed} AND ReplayEventType=110
                    `),
                    w.exec(`
                        select Turn, PlotIndex, PlayerID, CityName FROM (
                          select GameID, PlayerID, Turn, TimeStamp, num1 as PlotIndex, IFNULL(Text, str) as CityName,
                          iif(str = 'NO_CITY', 'raze', iif(count(*)=1, 'founded', 'conquest')) as remark, row_number() over() as rn, max(ReplayEvents.rowid) from ReplayEvents
                          left join ReplayEventKeys on ReplayEventKeys.ReplayEventID = ReplayEvents.ReplayEventType
                          left join GameSeeds using(GameSeed)
                          left join Games using(GameID, PlayerID)
                          left join CityNames on str = CityName
                          where ReplayEventID in (101) and GameSeed = ${gameSeed}
                          group by GameID, PlayerID, PlotIndex, Turn
                          order by GameID, PlayerID, Turn, timestamp desc
                        ) where remark != 'raze'
                        group by GameID, PlayerID, PlotIndex
                        order by Turn
                    `),
                    w.exec(`
                        SELECT PlayerID, Player
                        FROM Players
                        JOIN GameSeeds USING(GameSeed)
                        JOIN Games USING(GameID, PlayerID)
                        WHERE GameSeed=${gameSeed}
                        ORDER BY PlayerID
                    `),
                        w.exec(`
                        SELECT PlayerID, str FROM ReplayEvents
                        WHERE ReplayEventType IN (101) AND GameSeed=${gameSeed}
                        GROUP BY PlayerID
                    `),
                ]).then(([terrRows, borderRows, cityRows, nameRows, capitalRows]) => {
                    if (!terrRows.length || !terrRows[0].values.length) {
                        setNoData(true);
                        setLoading(false);
                        return;
                    }
                    const tmap = new Map<number, TerrainTile>();
                    for (const [x, y, tr, pt] of terrRows[0].values) {
                        tmap.set(Number(y * COLS + x), {
                            plotType: Number(pt),
                            terrain:  Number(tr),
                        });
                    }
                    terrainRef.current = tmap;

                    bordersRef.current = (borderRows[0]?.values ?? []).map(v => ({
                        turn:    Number(v[0]),
                        tileIdx: Number(v[2] * COLS + v[1]),
                        owner:   Number(v[3]),
                    }));

                    const razes: number[][] = new Array(64).fill([]);
                    citiesRef.current = (cityRows[0]?.values ?? []).map(v => {
                        const cx = Number(v[1]) % COLS;
                        const cy = Math.floor(Number(v[1]) / COLS);
                        const rx = ((cx % COLS) + COLS) % COLS;
                        const ry = ((cy % ROWS) + ROWS) % ROWS;
                        let raze = MAX_TURN;  // check city raze
                        for (const w of borderRows[0]?.values ?? []) {
                            if (Number(w[1]) === cx && Number(w[2]) === cy) {
                                if (Number(w[0]) > Number(v[0]) && Number(w[3]) === -1 && razes[Number(v[2])][cy * COLS + cx] === undefined) {
                                    raze = Number(w[0]);
                                    razes[Number(v[2])][cy * ROWS + cx] = raze;
                                }
                            }
                        }
                        return { turn: Number(v[0]), razedTurn: raze, x: rx, y: ry, owner: Number(v[2]), name: String(v[3]) };
                    });

                    const names: string[] = Array(6).fill("").map((_, i) => `P${i}`);
                    for (const v of (nameRows[0]?.values ?? [])) {
                        const pid = Number(v[0]);
                        if (pid >= 0 && pid < 6) names[pid] = String(v[1]);
                    }
                    playerNamesRef.current = names;

                    const civs: CivDef[] = [];
                    for (const v of (capitalRows[0]?.values ?? [])) {
                        const pid = Number(v[0]);
                        civs[pid] = cityNameToCiv(String(v[1]));
                        console.log('pid cn civ', pid, v[1], cityNameToCiv(String(v[1])))
                    }
                    playerCivsRef.current = civs;
                    setLoading(false);
                    fullRedraw();
                }).catch(() => { setLoading(false); setNoData(true); });
            }).catch(() => { setLoading(false); setNoData(true); });
    }, [selGame]);

    useEffect(() => {
        if (loading || noData) return;
        fullRedraw();
    }, [loading, noData, selGame]);
    useEffect(() => {
        if (loading || noData || !terrainCanvasRef.current) return;
        renderFrame(turn);
    }, [turn, loading, noData, renderFrame]);
    useEffect(() => {
        if (loading || noData || !terrainCanvasRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => {
            fullRedraw()
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [fullRedraw]);
    useEffect(() => {
        return () => {
            if (terrainRerenderTimerRef.current) clearTimeout(terrainRerenderTimerRef.current);
        };
    }, []);
    useEffect(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        if (playing) {
            const ms = Math.round(200);
            intervalRef.current = setInterval(() => {
                setTurnSynced(prev => {
                    if (prev >= endTurn) { setPlaying(false); return endTurn; }
                    return prev + 1;
                });
            }, ms);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [playing]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect   = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const cam    = cameraRef.current;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * factor));
        const baseR = hexSizeRef.current;
        const tR    = terrainRRef.current;
        const oldDS = (baseR * cam.scale) / tR;
        const newDS = (baseR * newScale)  / tR;
        const worldX = (mouseX - cam.x) / oldDS;
        const worldY = (mouseY - cam.y) / oldDS;
        cameraRef.current = {
            scale: newScale,
            x: mouseX - worldX * newDS,
            y: mouseY - worldY * newDS,
        };
        renderFrame(turnRef.current);
        const effectiveR = baseR * newScale;
        const clampedEffective = Math.max(MIN_RENDER_R, Math.min(effectiveR, MAX_RENDER_R));
        const ratio = clampedEffective / tR;
        if (ratio > RERENDER_RATIO || ratio < 1 / RERENDER_RATIO) {
            scheduleTerrainRerender();
        }
    }, [renderFrame, scheduleTerrainRerender]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return;
        dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
        setCursor("grabbing");
    }, []);

    const handleMouseUp = useCallback(() => {
        dragRef.current.active = false;
        setCursor("grab");
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (dragRef.current.active) {
            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
            cameraRef.current = {
                ...cameraRef.current,
                x: cameraRef.current.x + dx,
                y: cameraRef.current.y + dy,
            };
            renderFrame(turnRef.current);
            setTooltip(null);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect  = canvas.getBoundingClientRect();
        const sx    = e.clientX - rect.left;
        const sy    = e.clientY - rect.top;
        const cam   = cameraRef.current;
        const baseR = hexSizeRef.current;
        const tR    = terrainRRef.current;
        const ds    = (baseR * cam.scale) / tR;
        // Convert screen coords → terrain-canvas coords
        const wx    = (sx - cam.x) / ds;
        const wy    = (sy - cam.y) / ds;


        const hex = pixelToHex(wx, wy, tR);
        if (!hex) { setTooltip(null); return; }

        const [col, row] = hex;
        const tileIdx    = col + row * COLS;
        const tile       = terrainRef.current.get(tileIdx);
        if (!tile) { setTooltip(null); return; }

        const owner = ownershipRef.current[tileIdx];
        let cityName: string | null = null;
        let cityOwner = -1;
        const ct = turnRef.current;
        for (const city of citiesRef.current) {
            if (city.turn > ct || city.razedTurn <= ct) break;
            if (city.x === col && city.y === row) { cityName = city.name || `City#${col + COLS * row}`; cityOwner = city.owner; }
        }

        const containerRect = containerRef.current?.getBoundingClientRect();
        const screenX = e.clientX - (containerRect?.left ?? rect.left) + 16;
        const screenY = e.clientY - (containerRect?.top  ?? rect.top)  - 10;
        setTooltip({ screenX, screenY, col, row, tile, owner, cityName, cityOwner });
    }, [renderFrame]);

    const handleMouseLeave = useCallback(() => {
        dragRef.current.active = false;
        setCursor("grab");
        setTooltip(null);
    }, []);

    const plotTypeLabel = useCallback((pt: number) => {
        switch (pt) {
            case 0: return t("TXT_KEY_MAP_TT_MOUNTAIN");
            case 1: return t("TXT_KEY_MAP_TT_HILLS");
            case 2: return t("TXT_KEY_MAP_TT_LAND");
            case 3: return t("TXT_KEY_MAP_TT_OCEAN");
            default: return "?";
        }
    }, [t]);

    const terrainLabel = useCallback((tr: number) => {
        switch (tr) {
            case 0: return t("TXT_KEY_MAP_TERRAIN_GRASS");
            case 1: return t("TXT_KEY_MAP_TERRAIN_PLAINS");
            case 2: return t("TXT_KEY_MAP_TERRAIN_DESERT");
            case 3: return t("TXT_KEY_MAP_TERRAIN_TUNDRA");
            case 4: return t("TXT_KEY_MAP_TERRAIN_SNOW");
            case 5: return t("TXT_KEY_MAP_TERRAIN_COAST");
            case 6: return t("TXT_KEY_MAP_TERRAIN_OCEAN");
            case 7: return t("TXT_KEY_MAP_TERRAIN_MOUNTAIN");
            default: return "?";
        }
    }, [t]);

    const terrainLegend = [
        { color: "#6aaa4a", label: t("TXT_KEY_MAP_TERRAIN_GRASS") },
        { color: "#cdba57", label: t("TXT_KEY_MAP_TERRAIN_PLAINS") },
        { color: "#f6e1af", label: t("TXT_KEY_MAP_TERRAIN_DESERT") },
        { color: "#7b7162", label: t("TXT_KEY_MAP_TERRAIN_TUNDRA") },
        { color: "#e6f5ff", label: t("TXT_KEY_MAP_TERRAIN_SNOW") },
        { color: "#1e5078", label: t("TXT_KEY_MAP_TERRAIN_COAST") },
        { color: "#1a3a5c", label: t("TXT_KEY_MAP_TERRAIN_OCEAN") },
        { color: "#7a7a80", label: t("TXT_KEY_MAP_TERRAIN_MOUNTAIN") },
    ];

    const selStyle: React.CSSProperties = {
        background: CIV.navBg, color: CIV.text,
        border: `2px solid ${CIV.border}`, borderRadius: 6,
        padding: "4px 10px", fontSize: 13,
    };

    return (
        <div style={{ color: CIV.text }}>
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-xl tracking-wide" style={{ color: CIV.text }}>{t("TXT_KEY_MAP_TITLE")}</h2>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* Game selector */}
                <div className="flex items-center gap-2">
                    <label className="text-xs tracking-wide" style={{ color: CIV.muted }}>{t("TXT_KEY_MAP_SELECT_GAME")}</label>
                    <select style={selStyle} value={selGame} onChange={e => { setSelGame(Number(e.target.value)); setPlaying(false); }}>
                        {games.map(g => <option key={g} value={g}>#{g}</option>)}
                    </select>
                </div>

                {/* Play/Pause */}
                <button
                    className="civ-btn civ-btn-chip"
                    onClick={() => {
                        if (turn >= endTurn) { setTurnSynced(0); setPlaying(true); }
                        else setPlaying(p => !p);
                    }}
                    style={{ minWidth: 72 }}
                >
                    {playing ? `⏸ ${t("TXT_KEY_MAP_PAUSE")}` : `▶ ${t("TXT_KEY_MAP_PLAY")}`}
                </button>

                {/* Reset view */}
                <button className="civ-btn civ-btn-chip" onClick={() => { resetCamera(); renderFrame(turnRef.current); }}>
                    {t("TXT_KEY_MAP_RESET_VIEW")}
                </button>

                {/* Turn slider */}
                <div className="flex items-center gap-3 flex-1 min-w-48">
                    <label className="text-xs tracking-wide whitespace-nowrap" style={{ color: CIV.muted }}>
                        {t("TXT_KEY_MAP_TURN_LABEL")} {turn}
                    </label>
                    <input
                        type="range" min={0} max={endTurn} step={1} value={turn}
                        onChange={e => { setTurnSynced(Number(e.target.value)); setPlaying(false); }}
                        className="flex-1"
                        style={{ accentColor: CIV.border }}
                    />
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-24" style={{ color: CIV.muted }}>
                    <div className="text-center">
                        <div className="inline-block w-10 h-10 rounded-full animate-spin mb-3"
                             style={{ border: `3px solid ${CIV.navBg}`, borderTopColor: CIV.border }}/>
                        <p className="text-sm">{t("TXT_KEY_MAP_LOADING")}</p>
                    </div>
                </div>
            )}

            {!loading && noData && (
                <div className="py-16 text-center text-sm" style={{ color: CIV.muted }}>
                    {t("TXT_KEY_MAP_NO_DATA")}
                </div>
            )}

            {!loading && !noData && (
                <div className="flex gap-4">
                    {/* Canvas container */}
                    <div
                        ref={containerRef}
                        className="flex-1 rounded-lg overflow-hidden relative"
                        style={{
                            border: `2px solid ${CIV.border}`,
                            background: "#0a1a2a",
                            minHeight: 300,
                            height: `${Math.ceil((ROWS * 1.5 + 0.5) * hexSizeRef.current)}px`,
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onWheel={handleWheel}
                            style={{
                                display: "block",
                                width: "100%",
                                height: "100%",
                                cursor,
                                userSelect: "none",
                                touchAction: "none",
                            }}
                        />

                        {/* Tooltip */}
                        {tooltip && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: tooltip.screenX,
                                    top: tooltip.screenY,
                                    pointerEvents: "none",
                                    zIndex: 50,
                                    background: CIV.surface,
                                    border: `2px solid ${CIV.border}`,
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    color: CIV.text,
                                    fontSize: 12,
                                    lineHeight: "1.6",
                                    whiteSpace: "nowrap",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                                }}
                            >
                                <div style={{ color: CIV.gold, marginBottom: 2 }}>({tooltip.col}, {tooltip.row})</div>
                                <div><span style={{ color: CIV.muted }}>{t("TXT_KEY_MAP_TT_PLOT")}:</span> {plotTypeLabel(tooltip.tile.plotType)}</div>
                                <div><span style={{ color: CIV.muted }}>{t("TXT_KEY_MAP_TT_TERRAIN")}:</span> {terrainLabel(tooltip.tile.terrain)}</div>
                                <div>
                                    <span style={{ color: CIV.muted }}>{t("TXT_KEY_MAP_TT_OWNER")}:</span>{" "}
                                    {tooltip.owner === 255
                                        ? <span style={{ color: CIV.muted, fontStyle: "italic" }}>{t("TXT_KEY_MAP_TT_UNOWNED")}</span>
                                        : <span style={{ color: playerCivsRef.current[tooltip.owner]?.SecondaryColor ?? CHART_COLORS[tooltip.cityOwner % CHART_COLORS.length]}}>
                                          {`# `}
                                        </span>
                                    }
                                    {tooltip.owner !== 255 && (playerNamesRef.current[tooltip.owner] || t(playerCivsRef.current[tooltip.owner].CityName) || `P${tooltip.owner}`)}
                                </div>
                                {tooltip.cityName && (
                                    <div>
                                        <span style={{ color: CIV.muted }}>{t("TXT_KEY_MAP_TT_CITY")}:</span>{" "}
                                        <span style={{ color: playerCivsRef.current[tooltip.owner]?.TextColor ?? CHART_COLORS[tooltip.cityOwner % CHART_COLORS.length] }}>
                                          {tooltip.cityName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Legend sidebar */}
                    <div className="flex flex-col gap-4 shrink-0 w-36">
                        <div className="rounded-lg p-3" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                            <p className="text-xs tracking-widest mb-2" style={{ color: CIV.gold }}>{t("TXT_KEY_MAP_LEGEND_TERRAIN")}</p>
                            {terrainLegend.map(item => (
                                <div key={item.label} className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color, border: `1px solid ${CIV.border}44` }} />
                                    <span className="text-xs" style={{ color: CIV.muted }}>{item.label}</span>
                                </div>
                            ))}
                        </div>

                        {playerNamesRef.current.length > 0 && (
                            <div className="rounded-lg p-3" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                                <p className="text-xs tracking-widest mb-2" style={{ color: CIV.gold }}>{t("TXT_KEY_MAP_LEGEND_PLAYERS")}</p>
                                {playerNamesRef.current.map((name, i) => (
                                    <div key={i} className="flex items-center gap-2 mb-1">
                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: playerCivsRef.current[i]?.SecondaryColor ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                                        <span className="text-xs truncate" style={{ color: CIV.muted }}>{name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
