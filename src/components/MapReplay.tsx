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

const PlotTypes = {
    NO_PLOT: -1,

    PLOT_MOUNTAIN: 0,
    PLOT_HILLS: 1,
    PLOT_LAND: 2,
    PLOT_OCEAN: 3,

    NUM_PLOT_TYPES: 4
}

const TerrainTypes = {
    NO_TERRAIN: -1,

    TERRAIN_GRASS: 0,
    TERRAIN_PLAINS: 1,
    TERRAIN_DESERT: 2,
    TERRAIN_TUNDRA: 3,
    TERRAIN_SNOW: 4,
    TERRAIN_COAST: 5,
    TERRAIN_OCEAN: 6,
    TERRAIN_MOUNTAIN: 7,
    TERRAIN_HILL: 8,

    NUM_TERRAIN_TYPES: 9
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
    if (plotType === PlotTypes.PLOT_MOUNTAIN || terrain === TerrainTypes.TERRAIN_MOUNTAIN) {
        return "#7a7a80";
    }
    if (plotType === PlotTypes.PLOT_HILLS) {
        if (terrain === TerrainTypes.TERRAIN_GRASS) return "#6aaa4a";
        if (terrain === TerrainTypes.TERRAIN_PLAINS) return "#cdba57";
        if (terrain === TerrainTypes.TERRAIN_DESERT) return "#f6e1af";
        if (terrain === TerrainTypes.TERRAIN_TUNDRA) return "#7b7162";
        if (terrain === TerrainTypes.TERRAIN_SNOW) return "#e6f5ff";
    }
    if (plotType === PlotTypes.PLOT_LAND) {
        if (terrain === TerrainTypes.TERRAIN_GRASS) return "#6aaa4a";
        if (terrain === TerrainTypes.TERRAIN_PLAINS) return "#cdba57";
        if (terrain === TerrainTypes.TERRAIN_DESERT) return "#f6e1af";
        if (terrain === TerrainTypes.TERRAIN_TUNDRA) return "#7b7162";
        if (terrain === TerrainTypes.TERRAIN_SNOW) return "#e6f5ff";
    }
    if (plotType === PlotTypes.PLOT_OCEAN) {
        if (terrain === TerrainTypes.TERRAIN_COAST) return "#1e5078";
        if (terrain === TerrainTypes.TERRAIN_OCEAN) return "#1a3a5c";
    }
    return "#555";
}

interface TerrainTile { plotType: number; terrain: number; }
interface RoadEvent    { turn: number; x: number; y: number; routeType: number; bPillaged: boolean; }
interface FeatureEvent { turn: number; x: number; y: number; feature: number; }
interface BorderEvent  { turn: number; tileIdx: number; owner: number; }
interface CityEvent    { turn: number; razedTurn: number; x: number; y: number; owner: number; name: string; }
interface Camera { x: number; y: number; scale: number; }
interface TooltipData {
    screenX: number; screenY: number;
    col: number; row: number;
    tile: TerrainTile;
    feature: number;
    owner: number;
    cityName: string | null; cityOwner: number;
}
interface Props { initialHash?: HashParams; }

export default function MapReplay({ initialHash = {} }: Props) {
    const { t } = useLang();

    const [games, setGames]       = useState<string[]>([]);
    const [selGame, setSelGame]   = useState<number>(Number(initialHash.GameID) ?? 1);
    const [turn, setTurn]         = useState(Number(initialHash.Turn) ?? 0);
    const [endTurn, setEndTurn]           = useState(MAX_TURN);
    const [playing, setPlaying]   = useState(false);
    const [loading, setLoading]   = useState(false);
    const [noData, setNoData]     = useState(false);
    const [tooltip, setTooltip]   = useState<TooltipData | null>(null);
    const [cursor, setCursor]     = useState<string>("grab");

    const terrainRef    = useRef<Map<number, TerrainTile>>(new Map());
    const roadsRef      = useRef<RoadEvent[]>([]);
    const featureEventsRef    = useRef<FeatureEvent[]>([]);
    const bordersRef    = useRef<BorderEvent[]>([]);
    const citiesRef = useRef<CityEvent[]>([]);
    const playerCivsRef= useRef<CivDef[]>([]);
    const playerNamesRef = useRef<string[]>([]);
    const featureRef  = useRef<Uint8Array>(new Uint8Array(COLS * ROWS).fill(255));
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

                if (tile.plotType === PlotTypes.PLOT_MOUNTAIN || tile.plotType === PlotTypes.PLOT_HILLS) {
                    ctx.fillStyle   = "rgb(255,255,255)";
                    ctx.font        = `${Math.max(6, r - 2)}px sans-serif`;
                    ctx.textAlign   = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(tile.plotType === PlotTypes.PLOT_MOUNTAIN ? "▲" : "△", cx, cy);
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

        // roads
        drawRoads(ctx, currentTurn, tR);

        // features
        const features = new Uint8Array(COLS * ROWS).fill(255);
        for (const ev of featureEventsRef.current) {
            if (ev.turn > currentTurn) break;
            features[ev.y * COLS + ev.x] = ev.feature;
        }
        featureRef.current = features;

        for (let tileIdx = 0; tileIdx < COLS * ROWS; tileIdx++) {
            const feature = features[tileIdx];
            if (feature === 255) continue;
            const x = tileIdx % COLS;
            const y = Math.floor(tileIdx / COLS);
            const [cx, cy] = hexCenter(x, y, tR);
            const corners = hexCorners(cx, cy, tR / 2);
            let s = tR/50  // adjusted base scale
            switch (feature) {
                case 0:  // ice
                    ctx.strokeStyle = '#d8e6ff'
                    ctx.lineWidth = s * 35
                    ctx.lineJoin = 'round'
                    s *= 2
                    const p = new Path2D(`M${cx+s*0} ${cy+s*-7.85}L${cx+s*-7} ${cy+s*-3.91}v${s*7.82}l${s*7} ${s*3.94}l${s*7} ${s*-3.94}V${cy+s*-3.91}z`);
                    ctx.stroke(p);
                    break;
                case 1:  // jungle
                    ctx.fillStyle = '#3a912a'
                    s /= 20
                    for (let i = 0; i < 6; i++) {
                        const px = corners[i][0];
                        const py = corners[i][1];
                        const p = new Path2D(`M${px+s*-20.875} ${py+s*-179.375}c${s*-28.052}${s*.12}${s*-54.046} ${s*5.813}${s*-66.72} ${s*9.78}c${s*0} ${s*0} ${s*114.968} ${s*19.51} ${s*124.532} ${s*98.876}C${px+s*-50.427} ${py+s*-196.68} ${px+s*-145.72} ${py+s*-44.343} ${px+s*-145.72} ${py+s*-44.343}c${s*19.868}${s*-5.212} ${s*76.76}${s*-20.682} ${s*114.75}${s*-14.156}c${s*25.992} ${s*4.465} ${s*51.33} ${s*28.03} ${s*50.236} ${s*27.733}c${s*-61.943} ${s*15.24}${s*-160.35} ${s*290.92}${s*-143.64} ${s*313.308}c${s*14.9} ${s*17.12} ${s*29.816} ${s*11.28} ${s*44.718} ${s*2.595}c${s*7.376}${s*-58.425} ${s*64.938}${s*-314.765} ${s*135.375}${s*-294.072}c${s*.01}${s*.003}${s*.02}${s*-.003}${s*.03} ${s*0}c${s*5.93} ${s*2.03} ${s*11.54} ${s*5.59} ${s*11.844} ${s*11.03}c${s*.58} ${s*10.363}${s*-6.11} ${s*27.3}${s*-4.53} ${s*39.063}c${s*3.662} ${s*27.296} ${s*9.007} ${s*36.79} ${s*16.78} ${s*46.313}c${s*18.564}${s*-10.435} ${s*36.326}${s*-48.057} ${s*40}${s*-67.564}c${s*16.634} ${s*7.284} ${s*43.373} ${s*24.155} ${s*65.187} ${s*86.813}c${s*11.404}${s*-58.716}${s*-5.042}${s*-105.03}${s*-59.03}${s*-125.595}c${s*23.38}${s*-10.105} ${s*125.142} ${s*41.03} ${s*137.563} ${s*69.53}C${px+s*275.648} ${py+s*-0.736} ${px+s*190.167} ${py+s*-63.622} ${px+s*119} ${py+s*-63.622}c${s*13.644}${s*-3.56} ${s*28.638}${s*.6} ${s*42.906}${s*-9.907}c${s*19.146}${s*-14.098} ${s*41.474}${s*-26.24} ${s*62.28}${s*-39.282}c${s*-69.972}${s*-30.435}${s*-134.545}${s*-15.407}${s*-139.092} ${s*16.095}c${s*-3.573}${s*-69.916}${s*-57.83}${s*-86.204}${s*-105.97}${s*-86}z`);
                        ctx.fill(p);
                    }
                    break;
                case 2:  // marsh
                    ctx.fillStyle = '#516c47'
                    s /= 10
                    const p2 = new Path2D(`M${cx+s*-50.812} ${cy+s*-280.03}a${s*9.5} ${s*9.5} 0 0 0${s*-8.407} ${s*4.843}a${s*907} ${s*907} 0 0 0${s*-10.843} ${s*19.156}c${s*-6.34}${s*-1.118}${s*-12.595}${s*-.258}${s*-16.406} ${s*3.53}c${s*-24.12} ${s*23.98}${s*-59.702} ${s*101.133}${s*-45.31} ${s*111.688}c${s*1.968} ${s*1.444} ${s*4.086} ${s*2.64} ${s*6.31} ${s*3.656}c${s*-16.64} ${s*42.836}${s*-30.184} ${s*86.292}${s*-40.124} ${s*128.562}c${s*-1.928}${s*-65.01}${s*-14.337}${s*-127.164}${s*-62.22}${s*-162.937}c${s*44.087} ${s*58.265} ${s*48.88} ${s*155.865} ${s*41.877} ${s*236.405}c${s*-11.69}${s*.81}${s*-23.34} ${s*1.66}${s*-34.97} ${s*2.53}l${s*1.407} ${s*18.94}a${s*6142} ${s*6142} 0 0 1 ${s*31.656}${s*-2.283}c${s*-5.404} ${s*47.895}${s*-14.473} ${s*87.508}${s*-20.718} ${s*105.47}l${s*28.28}${s*-7.782}l${s*19.844} ${s*3.906}c${s*3.195}${s*-33.745} ${s*7.683}${s*-68.574} ${s*16.47}${s*-104.437}c${s*104.756}${s*-6.35} ${s*212.06}${s*-8.943} ${s*325.124}${s*-.814}c${s*9.21} ${s*20.087} ${s*7.668} ${s*38.25} ${s*2.563} ${s*64.156}c${s*-.69}${s*-30.596}${s*-32.682}${s*-59.164}${s*-127.25}${s*-57.718}c${s*-37.285}${s*.583}${s*-99.973} ${s*24.92}${s*-93.345} ${s*61.594}c${s*10.04} ${s*55.48} ${s*93.935} ${s*63.74} ${s*164.875} ${s*37.75}l${s*-32.78}${s*-43.72}l${s*76.467} ${s*37.75}c${s*7.045}${s*-10.18} ${s*11.56}${s*-21.598} ${s*12}${s*-32.843}c${s*14.556} ${s*1.83} ${s*29.126} ${s*3.61} ${s*43.625} ${s*5.875}c${s*20.6}${s*-36.8} ${s*25.25}${s*-154.36}${s*-88}${s*-314.47}c${s*39.61} ${s*88.105} ${s*71.88} ${s*190.382} ${s*63.157} ${s*224.22}c${s*-2.253}${s*-.186}${s*-4.504}${s*-.385}${s*-6.75}${s*-.563}c${s*-28.424}${s*-38.034}${s*-94.285}${s*-80.812}${s*-127.814}${s*-97.562}C${cx+s*120.742} ${cy+s*9.23} ${cx+s*151.776} ${cy+s*37.56} ${cx+s*169} ${cy+s*60.53}c${s*-38.743}${s*-2.512}${s*-76.81}${s*-3.813}${s*-114.313}${s*-4.155}c${s*-66.03}${s*-.6}${s*-130.31} ${s*1.732}${s*-193.5} ${s*5.47}c${s*14.246}${s*-49.464} ${s*37.544}${s*-100.834} ${s*77.75}${s*-153.97}c${s*-51.342} ${s*38.358}${s*-77.508} ${s*85.502}${s*-95.406} ${s*134.72}c${s*9.764}${s*-55.987} ${s*26.784}${s*-116.065} ${s*49.69}${s*-174.908}c${s*1.743}${s*.234} ${s*3.47}${s*.45} ${s*5.186}${s*.625}c${s*23.065} ${s*2.38} ${s*49.024}${s*-68.143} ${s*52.688}${s*-105.343}c${s*.375}${s*-3.812}${s*-1.312}${s*-7.414}${s*-4.188}${s*-10.44}c${s*3.37}${s*-6.11} ${s*6.79}${s*-12.172} ${s*10.28}${s*-18.155}a${s*9.5} ${s*9.5} 0 0 0${s*-8}${s*-14.406}z`);
                    ctx.fill(p2);
                    break;
                case 3:  // oasis
                    ctx.fillStyle = '#1f84b0'
                    s /= 10
                    const p3 = new Path2D(`M${cx+s*57.4} ${cy+s*-179.03}c${s*-21.7}${s*-.15}${s*-43.9} ${s*3.68}${s*-64.9} ${s*9.72}C${cx+s*46.7} ${cy+s*-160.9} ${cx+s*94.7} ${cy+s*-145} ${cx+s*114.3} ${cy+s*-119.29}c${s*-39.8}${s*-9.4}${s*-74.5} ${s*34.19}${s*-75.7} ${s*69.09}c${s*23.4}${s*-24.2} ${s*47.8}${s*-41.4} ${s*87.4}${s*-43.7}c${s*27.9} ${s*56.7} ${s*5.1} ${s*141.1} ${s*7.6} ${s*199.7}c${s*.6} ${s*15.3} ${s*47.8} ${s*24.6} ${s*47.2} ${s*10.1}c${s*-.2}${s*-51.5}${s*-4}${s*-145}${s*-25.8}${s*-208.1}c${s*38.8} ${s*7.3} ${s*74.1} ${s*33} ${s*74.1} ${s*33}c${s*-1.1}${s*-23}${s*-26.9}${s*-48.99}${s*-58.6}${s*-53.59}c${s*7.7}${s*-9.6} ${s*27}${s*-24.9} ${s*71.1}${s*-26.71}c${s*-23.4}${s*-18.4}${s*-59.9}${s*-17.7}${s*-88.3} ${s*2.31}c${s*-25.1}${s*-30.36}${s*-59.8}${s*-41.61}${s*-95.9}${s*-41.84}m${s*-153} ${s*35.84}c${s*-18.3}${s*.1}${s*-36.9} ${s*6.89}${s*-56.35} ${s*21.82}c${s*-25.99}${s*-18.58}${s*-56.2}${s*-25.59}${s*-77.61}${s*-8.5}c${s*40.35} ${s*1.68} ${s*49.53} ${s*21.74} ${s*56.57} ${s*30.57}c${s*-29} ${s*4.3}${s*-50.49} ${s*25.9}${s*-51.49} ${s*47.1}c${s*0} ${s*0} ${s*34.94}${s*-13.1} ${s*70.44}${s*-19.9}c${s*-19.94} ${s*58.5}${s*-20.49} ${s*91.1}${s*-20.68} ${s*139}c${s*.57} ${s*11.5} ${s*41.52} ${s*17.8} ${s*42.22} ${s*1.5}c${s*2.3}${s*-54.5}${s*-13.6}${s*-79.4} ${s*2.4}${s*-134.1}c${s*11.5}${s*-5.9} ${s*52.2}${s*.5} ${s*73.6} ${s*23}c${s*-1.1}${s*-32.3}${s*-19}${s*-64.41}${s*-55.4}${s*-55.7}c${s*9.4}${s*-18.03} ${s*26.8}${s*-21.13} ${s*78}${s*-20.99}c${s*-20.7}${s*-15.28}${s*-41}${s*-23.87}${s*-61.7}${s*-23.8}m${s*50.4} ${s*227.69}c${s*-22.3}${s*-.1}${s*-44.3} ${s*3.4}${s*-65.2} ${s*12.2}c${s*-57.09} ${s*24.2}${s*-85.37} ${s*48.5}${s*-90.55} ${s*75.7}c${s*-2.58} ${s*13.6} ${s*1.58} ${s*26.9} ${s*9.74} ${s*38.2}s${s*20.17} ${s*21.1} ${s*34.67} ${s*29.9}c${s*58.04} ${s*35.1} ${s*156.94} ${s*55.3} ${s*222.24} ${s*49.6}c${s*26.6}${s*-2.3} ${s*62.7}${s*-7} ${s*93.7}${s*-18.4}c${s*15.4}${s*-5.8} ${s*29.7}${s*-13.2} ${s*40.8}${s*-23.4}c${s*11}${s*-10.3} ${s*18.8}${s*-23.7} ${s*20}${s*-39.7}v${s*-.1}c${s*1}${s*-14.1}${s*-4.2}${s*-26.7}${s*-12.6}${s*-36.5}s${s*-19.8}${s*-17.4}${s*-32.3}${s*-23.8}c${s*-25.1}${s*-12.9}${s*-55.1}${s*-21.3}${s*-76.5}${s*-29.3}c${s*-44}${s*-16.5}${s*-94.8}${s*-34.2}${s*-144}${s*-34.4}m${s*11.2} ${s*18.7}c${s*12.3}${s*.8} ${s*24.9} ${s*2.6} ${s*37.4} ${s*5.2}c${s*-70.8} ${s*23.9}${s*-127.7} ${s*59.7}${s*-171.65} ${s*101}c${s*-4.55}${s*-4.4}${s*-8.4}${s*-8.9}${s*-11.35}${s*-14}c${s*39}${s*-36.4} ${s*87.3}${s*-68.4} ${s*145.6}${s*-92.2}m${s*58.3} ${s*10.1}c${s*17.4} ${s*4.6} ${s*34.7} ${s*10.3} ${s*51.4} ${s*16.3}c${s*-71.7} ${s*31.2}${s*-138.6} ${s*65.8}${s*-192.3} ${s*110.7}c${s*-12.8}${s*-5.3}${s*-24}${s*-11.3}${s*-34.64}${s*-17.7}c${s*50.54}${s*-45} ${s*111.14}${s*-79.4} ${s*175.54}${s*-109.3}`);
                    ctx.fill(p3);
                    break;
                case 4:  // flood plains
                    ctx.fillStyle = '#1f84b0'
                    s /= 1.2
                    const p4 = new Path2D(`M${cx+s*-12.123} ${cy+s*-14.5}c${s*-1.054} ${s*0}${s*-1.91}${s*.86}${s*-1.91} ${s*1.924}V${cy+s*22.5}h${s*8.554}l${s*-.006}${s*-.094}c${s*-.132}${s*-2.268}${s*-5.408}${s*-15.184}${s*-5.78}${s*-20.383}c${s*-.39}${s*-5.454} ${s*10.382}${s*-6.472} ${s*8.787}${s*-9.086}c${s*-1.686}${s*-2.764}${s*-4.253}${s*-.644}${s*-6.015}${s*-4.237}c${s*-.364}${s*-.743}${s*.908}${s*-1.934} ${s*2.45}${s*-3.2}zm${s*12.655} ${s*0}c${s*-.918}${s*.477}${s*-1.608} ${s*1.076}${s*-1.317} ${s*2.118}c${s*.942} ${s*3.372} ${s*7.09} ${s*2.18} ${s*8.129} ${s*6.401}c${s*.742} ${s*3.012}${s*-7.631} ${s*3.739}${s*-7.566} ${s*7.157}c${s*.09} ${s*4.696} ${s*3.411} ${s*7.192} ${s*12.395} ${s*21.324}h${s*5.369}v${s*-1.365}l${s*-8.036}${s*-11.768}q${s*7.026}${s*-2.936} ${s*8.036}${s*-11.707}c${s*0}${s*-6.715}${s*-5.397}${s*-12.159}${s*-12.055}${s*-12.16}z`);
                    ctx.fill(p4);
                    break;
                case 5:  // forest
                    ctx.fillStyle = '#25461f'
                    for (let i = 0; i < 6; i++) {
                        const px = corners[i][0];
                        const py = corners[i][1];
                        const p = new Path2D(`M${px-s*5} ${py-s*9.786}l${s*5.001} ${s*13}l${s*5} ${s*-13}L${px+s*11.457} ${py+s*7}h${s*-5.456}v${s*5}h${s*-2}v${s*-5}h${s*-8}v${s*5}h${s*-2}v${s*-5}H${px-s*11.455}z`);
                        ctx.fill(p);
                    }
                    break;
                case 6:  // fallout
                    ctx.fillStyle = '#f3ac1a'
                    s /= 8
                    const p5 = new Path2D(`M${cx+s*3.78} ${cy+s*-232.812}c${s*-130.728} ${s*0}${s*-236.905} ${s*106.177}${s*-236.905} ${s*236.906}C${cx+s*-233.125} ${cy+s*134.824} ${cx+s*-126.948} ${cy+s*241} ${cx+s*3.78} ${cy+s*241}c${s*130.73} ${s*0} ${s*236.907}${s*-106.18} ${s*236.907}${s*-236.906}c${s*0}${s*-130.73}${s*-106.177}${s*-236.906}${s*-236.906}${s*-236.906}zm${s*0} ${s*18.687}c${s*120.63} ${s*0} ${s*218.22} ${s*97.59} ${s*218.22} ${s*218.22}c${s*0} ${s*120.626}${s*-97.59} ${s*218.218}${s*-218.22} ${s*218.218}c${s*-120.628} ${s*0}${s*-218.218}${s*-97.59}${s*-218.218}${s*-218.22}s${s*97.59}${s*-218.218} ${s*218.22}${s*-218.218}zm${s*101.19} ${s*46.313}l${s*-76.41} ${s*132.875}c${s*15.916} ${s*9.635} ${s*25.177} ${s*26.33} ${s*26.125} ${s*43.78}h${s*148.407}c${s*1.644}${s*-70.01}${s*-33.49}${s*-138.867}${s*-98.125}${s*-176.656}zm${s*-205.126} ${s*2.468}c${s*-27.1} ${s*16.725}${s*-50.68} ${s*40.147}${s*-67.72} ${s*69.656}c${s*-19.01} ${s*32.928}${s*-26.926} ${s*69.12}${s*-26} ${s*104.532}H${cx+s*-54}a${s*54.04} ${s*54.04} 0 0 1 ${s*7.188}${s*-24.438}c${s*5.21}${s*-9.024} ${s*12.64}${s*-16} ${s*21.218}${s*-20.625}zm${s*100.594} ${s*141.156}a${s*37} ${s*37} 0 0 0${s*-2.594}${s*.094}c${s*-11.446}${s*.793}${s*-22.288} ${s*7.084}${s*-28.5} ${s*17.844}c${s*-9.94} ${s*17.216}${s*-4.09} ${s*38.967} ${s*13.125} ${s*48.906}c${s*17.213} ${s*9.94} ${s*38.935} ${s*4.12} ${s*48.874}${s*-13.094}c${s*9.94}${s*-17.215} ${s*4.12}${s*-38.967}${s*-13.094}${s*-48.906}c${s*-5.648}${s*-3.26}${s*-11.768}${s*-4.824}${s*-17.813}${s*-4.844}zm${s*28.218} ${s*82.375}c${s*-16.127} ${s*9.75}${s*-36.864} ${s*10.846}${s*-54.406} ${s*1.25}l${s*-68.03} ${s*117.22}c${s*29.454} ${s*16.785} ${s*61.044} ${s*25.177} ${s*92.75} ${s*26}c${s*34.567}${s*.898} ${s*68.72}${s*-7.786} ${s*99.124}${s*-24.032}z`);
                    ctx.fill(p5);
                    break;
                case 17:  // atoll
                    ctx.lineWidth = s*12;
                    ctx.lineCap     = 'round';
                    ctx.strokeStyle = '#f6e1af'
                    s *= 2
                    const p6 = new Path2D(`M${cx+s*7.5} ${cy+s*7}a${s*10} ${s*10} 0 1 1 ${s*0}${s*-14}`);
                    ctx.stroke(p6);
                    break;
                case 7:  // TODO wonders
                case 8:
                case 9:
                case 10:
                case 11:
                case 12:
                case 13:
                case 14:
                case 15:
                case 16:
                case 18:
                case 19:
                case 20:
                case 21:
                case 22:
                case 23:
                case 24:
                    ctx.fillStyle   = "rgb(255,255,255)";
                    ctx.font        = `${Math.max(6, tR - 2)}px sans-serif`;
                    ctx.textAlign   = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("▲", cx, cy);
                    ctx.strokeStyle = "rgb(255,230,108)"
                    ctx.lineWidth = s*4;
                    ctx.strokeText("▲", cx, cy);
                    break;
                default:
                    break;
            }
        }

        // ownership
        const ownership = new Uint8Array(COLS * ROWS).fill(255);
        for (const ev of bordersRef.current) {
            if (ev.turn > currentTurn) break;
            ownership[ev.tileIdx] = ev.owner;
        }
        ownershipRef.current = ownership;

        for (let tileIdx = 0; tileIdx < COLS * ROWS; tileIdx++) {
            if (terrainRef.current.get(tileIdx)?.plotType == PlotTypes.PLOT_OCEAN) continue;
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

    const getEdgeMidpoint = useCallback((cx: number, cy: number, r: number, edge: number): [number,number] => {
        const a0 = (Math.PI / 180) * (60 * edge       - 30);
        const a1 = (Math.PI / 180) * (60 * (edge + 1) - 30);
        return [
            cx + r * (Math.cos(a0) + Math.cos(a1)) / 2,
            cy + r * (Math.sin(a0) + Math.sin(a1)) / 2,
        ];
    }, []);

    const drawRoads = useCallback((ctx: CanvasRenderingContext2D, currentTurn: number, tR: number) => {
        const roadMap = new Map<number, number>();
        for (const ev of roadsRef.current) {
            if (ev.turn > currentTurn) continue;
            const idx = ev.x + ev.y * COLS;
            if (ev.routeType === -1) {
                roadMap.delete(idx);
            } else {
                roadMap.set(idx, ev.routeType + (ev.bPillaged ? 1000 : 0));
            }
        }

        if (roadMap.size === 0) return;

        ctx.save();
        ctx.lineWidth   = Math.max(0.8, tR * 0.20);
        ctx.lineCap     = "round";
        ctx.lineJoin    = "round";

        for (const [tileIdx, routeType] of roadMap) {
            if (routeType % 1000 === 0) {
                ctx.setLineDash([]);
                ctx.strokeStyle = routeType >= 1000 ? "rgb(136,40,40)" : "rgb(49,49,49)";
            } else {
                ctx.setLineDash([tR / 6, tR / 3]);
                ctx.strokeStyle = routeType >= 1000 ? "rgb(136,40,40)" : "rgb(49,49,49)";
            }
            const tx = tileIdx % COLS;
            const ty = Math.floor(tileIdx / COLS);
            const [cx, cy] = hexCenter(tx, ty, tR);

            const connectedEdges: number[] = [];
            for (let edge = 0; edge < 6; edge++) {
                const [nx, ny] = hexNeighbor(tx, ty, edge);
                if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
                if (roadMap.has(nx + ny * COLS)) connectedEdges.push((edge + 5) % 6);
            }

            if (connectedEdges.length === 0) {  // isolated road
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(1, tR * 0.08), 0, Math.PI * 2);
                ctx.fillStyle = "rgb(49,49,49)";
                ctx.fill();
                continue;
            }

            if (connectedEdges.length === 1) {  // dead end
                const [mx, my] = getEdgeMidpoint(cx, cy, tR, connectedEdges[0]);
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(cx + (mx - cx) * 0.30, cy + (my - cy) * 0.30);
                ctx.stroke();
                continue;
            }

            if (connectedEdges.length === 3) {  // special case: source non-even triple joint roads from the farthest edge
                const a = connectedEdges[0];
                const b = connectedEdges[1];
                const c = connectedEdges[2];
                let source = -1;
                let d1, d2 = -1;
                if ([1, 5].includes(Math.abs(a - b))) {
                    source = c; d1 = a; d2 = b;
                }
                else if ([1, 5].includes(Math.abs(b - c))) {
                    source = a; d1 = b; d2 = c;
                }
                else if ([1, 5].includes(Math.abs(a - c))) {
                    source = b; d1 = a; d2 = c;
                }
                if (source !== -1) {
                    const [x0, y0] = getEdgeMidpoint(cx, cy, tR, source as number);
                    const [x1, y1] = getEdgeMidpoint(cx, cy, tR, d1 as number);
                    const [x2, y2] = getEdgeMidpoint(cx, cy, tR, d2 as number);
                    const PULL = 0.85;
                    const cp01x = x0 + (cx - x0) * PULL;
                    const cp01y = y0 + (cy - y0) * PULL;
                    const cp12x = x1 + (cx - x1) * PULL;
                    const cp12y = y1 + (cy - y1) * PULL;
                    const cp22x = x2 + (cx - x2) * PULL;
                    const cp22y = y2 + (cy - y2) * PULL;
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.bezierCurveTo(cp01x, cp01y, cp12x, cp12y, x1, y1);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x0, y0);
                    ctx.bezierCurveTo(cp01x, cp01y, cp22x, cp22y, x2, y2);
                    ctx.stroke();
                    continue;
                }
            }

            if (connectedEdges.length === 4) {  // special case: X crossroad
                const [a, b] = [0,1,2,3,4,5].filter(x => !connectedEdges.includes(x));
                if (Math.abs(a - b) === 3) {
                    connectedEdges.sort();
                    ctx.beginPath();
                    ctx.moveTo(...getEdgeMidpoint(cx, cy, tR, connectedEdges[0]));
                    ctx.lineTo(...getEdgeMidpoint(cx, cy, tR, connectedEdges[2]));
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(...getEdgeMidpoint(cx, cy, tR, connectedEdges[1]));
                    ctx.lineTo(...getEdgeMidpoint(cx, cy, tR, connectedEdges[3]));
                    ctx.stroke();
                    continue;
                }
            }

            if (connectedEdges.length === 6) {  // special case: * crossroad
                for (let a = 0; a < 3; a++) {
                    const b = a + 3;
                    const [ax, ay] = getEdgeMidpoint(cx, cy, tR, connectedEdges[a]);
                    const [bx, by] = getEdgeMidpoint(cx, cy, tR, connectedEdges[b]);
                    const PULL = 0.55;
                    const cp1x = ax + (cx - ax) * PULL;
                    const cp1y = ay + (cy - ay) * PULL;
                    const cp2x = bx + (cx - bx) * PULL;
                    const cp2y = by + (cy - by) * PULL;
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, bx, by);
                    ctx.stroke();
                }
                continue;
            }

            let connected: number[][] = new Array(6).fill([]);  // track joints to prevent inner loops
            for (let a = 0; a < connectedEdges.length; a++) {
                for (let b = a + 1; b < connectedEdges.length; b++) {
                    if (connected[connectedEdges[a]].includes(connectedEdges[b]) && connected[connectedEdges[b]].includes(connectedEdges[a])) continue;
                    let a0 = a;
                    const [ax, ay] = getEdgeMidpoint(cx, cy, tR, connectedEdges[a0]);
                    const [bx, by] = getEdgeMidpoint(cx, cy, tR, connectedEdges[b]);
                    const PULL = 0.65;
                    const cp1x = ax + (cx - ax) * PULL;
                    const cp1y = ay + (cy - ay) * PULL;
                    const cp2x = bx + (cx - bx) * PULL;
                    const cp2y = by + (cy - by) * PULL;
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, bx, by);
                    ctx.stroke();
                    connected[connectedEdges[a0]].push(connectedEdges[b]);
                    connected[connectedEdges[b]].push(connectedEdges[a0]);
                    connected[connectedEdges[a0]].forEach(x => connected[x].push(connectedEdges[b]));
                    connected[connectedEdges[b]].forEach(x => connected[x].push(connectedEdges[a0]));
                }
            }
        }

        ctx.restore();
    }, [getEdgeMidpoint]);

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
        getSqlWorker().exec(`
            SELECT DISTINCT GameID, REPLACE(GROUP_CONCAT(Player ORDER BY PlayerID),',',', ') FROM Games
            LEFT JOIN GameSeeds USING(GameID)
            WHERE GameSeed NOT NULL
            GROUP BY GameID
            ORDER BY GameID
        `)
        .then(r => {
            if (!r.length) return;
            const ids: string[] = [];
            r[0].values.forEach((v) => ids[v[0]] = String(v[1]));
            setGames(ids);
            if (initialHash.GameID) {
                const fromHash = Number(initialHash.GameID);
                if (ids[fromHash]) setSelGame(fromHash);
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
        setTurn(0);
        setPlaying(false);
        terrainRef.current.clear();
        featureEventsRef.current  = [];
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
                        WHERE GameSeed=${gameSeed} AND ReplayEventType=107
                    `),
                    w.exec(`
                        SELECT Turn, Num1, Num2, Num3, Num4
                        FROM ReplayEvents
                        WHERE GameSeed=${gameSeed} AND ReplayEventType=109
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
                ]).then(([terrRows, featureRows, roadRows, borderRows, cityRows, nameRows, capitalRows]) => {
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

                    featureEventsRef.current = (featureRows[0]?.values ?? []).map(v => ({
                        turn:    Number(v[0]),
                        x: Number(v[1]),
                        y: Number(v[2]),
                        feature:   Number(v[3]),
                    }));

                    bordersRef.current = (borderRows[0]?.values ?? []).map(v => ({
                        turn:    Number(v[0]),
                        tileIdx: Number(v[2] * COLS + v[1]),
                        owner:   Number(v[3]),
                    }));

                    roadsRef.current = (roadRows[0]?.values ?? []).map(v => ({
                        turn:      Number(v[0]),
                        x:         Number(v[1]),
                        y:         Number(v[2]),
                        routeType: Number(v[3]),
                        bPillaged: Number(v[4]) === 1,
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
                        //console.log('pid cn civ', pid, v[1], cityNameToCiv(String(v[1])))
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
        // Convert screen coords -> terrain-canvas coords
        const wx    = (sx - cam.x) / ds;
        const wy    = (sy - cam.y) / ds;


        const hex = pixelToHex(wx, wy, tR);
        if (!hex) { setTooltip(null); return; }

        const [col, row] = hex;
        const tileIdx    = col + row * COLS;
        const tile       = terrainRef.current.get(tileIdx);
        if (!tile) { setTooltip(null); return; }

        const feature = featureRef.current[tileIdx];
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
        setTooltip({ screenX, screenY, col, row, tile, feature, owner, cityName, cityOwner });
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

    const featureLabel = useCallback((ft: number) => {
        switch (ft) {
            case 0: return t('TXT_KEY_FEATURE_ICE');
            case 1: return t('TXT_KEY_FEATURE_JUNGLE');
            case 2: return t('TXT_KEY_FEATURE_MARSH');
            case 3: return t('TXT_KEY_FEATURE_OASIS');
            case 4: return t('TXT_KEY_FEATURE_FLOOD_PLAINS');
            case 5: return t('TXT_KEY_FEATURE_FOREST');
            case 6: return t('TXT_KEY_FEATURE_FALLOUT');
            case 7: return t('TXT_KEY_FEATURE_CRATER');
            case 8: return t('TXT_KEY_FEATURE_MT_FUJI');
            case 9: return t('TXT_KEY_FEATURE_MESA');
            case 10: return t('TXT_KEY_FEATURE_REEF');
            case 11: return t('TXT_KEY_FEATURE_VOLCANO');
            case 12: return t('TXT_KEY_FEATURE_GIBRALTAR');
            case 13: return t('TXT_KEY_FEATURE_GEYSER');
            case 14: return t('TXT_KEY_FEATURE_FOUNTAIN_YOUTH');
            case 15: return t('TXT_KEY_FEATURE_POTOSI');
            case 16: return t('TXT_KEY_FEATURE_EL_DORADO');
            case 17: return t('TXT_KEY_FEATURE_ATOLL');
            case 18: return t('TXT_KEY_FEATURE_SRI_PADA');
            case 19: return t('TXT_KEY_FEATURE_MT_SINAI');
            case 20: return t('TXT_KEY_FEATURE_MT_KAILASH');
            case 21: return t('TXT_KEY_FEATURE_ULURU');
            case 22: return t('TXT_KEY_FEATURE_LAKE_VICTORIA');
            case 23: return t('TXT_KEY_FEATURE_KILIMANJARO');
            case 24: return t('TXT_KEY_FEATURE_SOLOMONS_MINES');

            default: return '?';
        }
    }, [t]);

    const selStyle: React.CSSProperties = {
        background: CIV.navBg, color: CIV.text,
        border: `2px solid ${CIV.border}`, borderRadius: 6,
        padding: "4px 10px", fontSize: 13,
    };

    return (
        <div style={{ color: CIV.text }}>
            {/* Header */}
            <div className="mb-4">
                <h2 className="text-xl tracking-wide" style={{color: CIV.text}}>{t("TXT_KEY_MAP_TITLE")}</h2>
                <p className="text-sm mt-1" style={{color: CIV.muted}}>{t("TXT_KEY_MAP_SUBTITLE")}</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* Game selector */}
                <div className="flex items-center gap-2">
                    <label className="text-xs tracking-wide" style={{ color: CIV.muted }}>{t("TXT_KEY_MAP_SELECT_GAME")}</label>
                    <select style={selStyle} value={selGame} onChange={e => { setSelGame(Number(e.target.value)); setPlaying(false); }}>
                        {games.map((g, i) => <option key={i} value={i}>#{`${i} (${g})`}</option>)}
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
                                {tooltip.feature !== 255 && (
                                    <div><span style={{ color: CIV.muted }}>{t("TXT_KEY_MAP_TT_FEATURE")}:</span> {featureLabel(tooltip.feature)}</div>
                                )}
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

                        <div className="rounded-lg p-3" style={{ background: CIV.surface, border: `2px solid ${CIV.border}` }}>
                            <p className="text-xs tracking-widest mb-2" style={{ color: CIV.gold }}>{t("TXT_KEY_MAP_LEGEND_TERRAIN")}</p>
                            {terrainLegend.map(item => (
                                <div key={item.label} className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: item.color, border: `1px solid ${CIV.border}44` }} />
                                    <span className="text-xs" style={{ color: CIV.muted }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
