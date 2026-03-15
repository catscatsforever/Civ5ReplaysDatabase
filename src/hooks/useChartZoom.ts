import { useState, useMemo, useRef } from "react";

interface UseChartZoomOpts {
    yPadding?: number;
    layout?: "horizontal" | "vertical";
}

export function useChartZoom<T extends Record<string, any>>(
    fullData: T[],
    xKey: string,
    yKeys: string[],
    opts: UseChartZoomOpts = {},
) {
    const { yPadding = 0.05, layout = "horizontal" } = opts;

    const dragging = useRef(false);
    const startRef = useRef<string | number | undefined>(undefined);
    const endRef = useRef<string | number | undefined>(undefined);

    const [refLeft, setRefLeft] = useState<string | number | undefined>(undefined);
    const [refRight, setRefRight] = useState<string | number | undefined>(undefined);
    const [filtered, setFiltered] = useState<T[] | null>(null);

    const onMouseDown = (e: any) => {
        if (e?.activeLabel != null) {
            dragging.current = true;
            startRef.current = e.activeLabel;
            endRef.current = undefined;
            setRefLeft(e.activeLabel);
            setRefRight(undefined);
        }
    };

    const onMouseMove = (e: any) => {
        if (dragging.current && e?.activeLabel != null) {
            endRef.current = e.activeLabel;
            setRefRight(e.activeLabel);
        }
    };

    const onMouseUp = () => {
        if (!dragging.current) return;
        dragging.current = false;

        const left = startRef.current;
        const right = endRef.current;

        setRefLeft(undefined);
        setRefRight(undefined);
        startRef.current = undefined;
        endRef.current = undefined;

        if (left == null || right == null || String(left) === String(right)) return;

        let i1 = fullData.findIndex((d) => String(d[xKey]) === String(left));
        let i2 = fullData.findIndex((d) => String(d[xKey]) === String(right));
        if (i1 < 0 || i2 < 0) return;
        if (i1 > i2) [i1, i2] = [i2, i1];

        const sliced = fullData.slice(i1, i2 + 1);
        if (sliced.length < 1) return;
        setFiltered(sliced);
    };

    const resetZoom = () => {
        setFiltered(null);
        setRefLeft(undefined);
        setRefRight(undefined);
        dragging.current = false;
    };

    const zoomedData = filtered ?? fullData;
    const isZoomed = filtered !== null;

    const yDomain = useMemo((): [number, number] | undefined => {
        if (!filtered) return undefined;
        let min = Infinity;
        let max = -Infinity;
        filtered.forEach((d) => {
            yKeys.forEach((k) => {
                const v = d[k];
                if (typeof v === "number" && !isNaN(v)) {
                    if (v < min) min = v;
                    if (v > max) max = v;
                }
            });
        });
        if (!isFinite(min) || !isFinite(max)) return undefined;
        const pad = (max - min) * yPadding;
        return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
    }, [filtered, yKeys, yPadding]);

    const showRef = refLeft != null && refRight != null;
    const refAreaProps =
        layout === "vertical"
            ? { y1: refLeft, y2: refRight, fillOpacity: 0.18, fill: "#DCBD88" }
            : { x1: refLeft, x2: refRight, fillOpacity: 0.18, fill: "#DCBD88" };

    return {
        zoomedData,
        isZoomed,
        yDomain,
        showRef,
        refAreaProps,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        resetZoom,
    };
}
