import { useState, useCallback, useRef, useEffect } from "react";
import { CIV } from "../civPalette";
import CivText from "../components/CivText";

export function useLegendToggle(allKeys: string[]) {
    const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
    const allKeysRef = useRef(allKeys);
    allKeysRef.current = allKeys;

    const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastClicked = useRef<string | null>(null);

    const keysKey = allKeys.join("\0");
    useEffect(() => {
        setHiddenKeys((prev) => {
            const valid = new Set(allKeys);
            const cleaned = new Set([...prev].filter((k) => valid.has(k)));
            return cleaned.size !== prev.size ? cleaned : prev;
        });
    }, [keysKey]);

    const handleClick = useCallback((dataKey: string) => {
        const keys = allKeysRef.current;

        if (lastClicked.current === dataKey && clickTimer.current !== null) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
            lastClicked.current = null;

            setHiddenKeys((prev) => {
                const othersHidden = keys.filter((k) => k !== dataKey).every((k) => prev.has(k));
                return othersHidden ? new Set<string>() : new Set(keys.filter((k) => k !== dataKey));
            });
        } else {
            lastClicked.current = dataKey;
            if (clickTimer.current) clearTimeout(clickTimer.current);
            clickTimer.current = setTimeout(() => {
                clickTimer.current = null;
                lastClicked.current = null;
                setHiddenKeys((prev) => {
                    const next = new Set(prev);
                    if (next.has(dataKey)) {
                        next.delete(dataKey);
                    } else if (next.size + 1 < keys.length) {
                        next.add(dataKey);
                    }
                    return next;
                });
            }, 300);
        }
    }, []);

    const isVisible = useCallback((key: string) => !hiddenKeys.has(key), [hiddenKeys]);

    return { hiddenKeys, handleClick, isVisible, setHiddenKeys };
}

interface LegendItem {
    key: string;
    color: string;
    label: string;
    dashed?: boolean;
}

interface InteractiveLegendProps {
    items: LegendItem[];
    hiddenKeys: Set<string>;
    onClick: (key: string) => void;
    hint?: string;
}

export function InteractiveLegend({ items, hiddenKeys, onClick, hint }: InteractiveLegendProps) {
    return (
        <div className="text-center select-none py-1">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                {items.map(({ key, color, label, dashed }) => {
                    const hidden = hiddenKeys.has(key);
                    return (
                        <span
                            key={key}
                            onClick={(e) => { e.stopPropagation(); onClick(key); }}
                            onDoubleClick={(e) => { e.stopPropagation(); }}
                            className="flex items-center gap-1.5 cursor-pointer"
                            style={{
                                opacity: hidden ? 0.3 : 1,
                                textDecoration: hidden ? "line-through" : "none",
                                color: CIV.muted,
                                fontSize: 12,
                                transition: "opacity 0.15s",
                            }}
                        >
                            {dashed ? (
                                <span
                                    className="inline-block w-4 h-0 shrink-0"
                                    style={{ borderTop: `2px dashed ${color}`, opacity: hidden ? 0.3 : 1 }}
                                />
                            ) : (
                                <span
                                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                                    style={{ background: color, opacity: hidden ? 0.3 : 1 }}
                                />
                            )}
                                          <CivText text={label} iconSize={14} />
                        </span>
                    );
                })}
            </div>
            {hint && (
                <p className="text-[10px] mt-1" style={{ color: CIV.muted, opacity: 0.5 }}>
                    {hint}
                </p>
            )}
        </div>
    );
}
