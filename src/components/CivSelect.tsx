import { useState, useRef, useEffect, useCallback } from "react";
import { CIV } from "../civPalette";
import CivText from "./CivText";

export interface CivSelectOption {
    value: string;
    label: string;
}

interface CivSelectProps {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    options: CivSelectOption[];
    /** Icon size passed to CivText. Default: 16 */
    iconSize?: number;
    /** Minimum width of the trigger button. Default: 160 */
    minWidth?: number;
}

/**
 * A fully custom select-replacement that renders option labels through
 * <CivText>, so [ICON_*] tokens appear as inline images.
 *
 * Keyboard accessible:
 *  - Enter / Space  → open / confirm
 *  - Escape         → close
 *  - ArrowUp/Down   → navigate options
 */
export default function CivSelect({
                                      label,
                                      value,
                                      onChange,
                                      options,
                                      iconSize = 16,
                                      minWidth = 160,
                                  }: CivSelectProps) {
    const [open, setOpen]   = useState(false);
    const [focused, setFocused] = useState(0);
    const containerRef      = useRef<HTMLDivElement>(null);
    const listRef           = useRef<HTMLUListElement>(null);

    const selectedOption = options.find((o) => o?.value === value) ?? options[0];

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Keep focused index in sync when value changes externally
    useEffect(() => {
        const idx = options.findIndex((o) => o?.value === value);
        setFocused(idx >= 0 ? idx : 0);
    }, [value, options]);

    // Scroll focused item into view when open
    useEffect(() => {
        if (!open || !listRef.current) return;
        const el = listRef.current.children[focused] as HTMLElement | undefined;
        el?.scrollIntoView({ block: "nearest" });
    }, [open, focused]);

    const select = useCallback((v: string) => {
        onChange(v);
        setOpen(false);
    }, [onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
            return;
        }
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); setFocused((f) => Math.min(f + 1, options.length - 1)); break;
            case "ArrowUp":   e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); break;
            case "Enter":
            case " ":         e.preventDefault(); select(options[focused]?.value ?? value); break;
            case "Escape":    e.preventDefault(); setOpen(false); break;
        }
    };

    const triggerStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        minWidth,
        padding: "6px 12px",
        background: CIV.navBg,
        border: `2px solid ${CIV.border}`,
        borderRadius: 8,
        color: CIV.text,
        cursor: "pointer",
        fontSize: 13,
        userSelect: "none",
        outline: "none",
    };

    const dropdownStyle: React.CSSProperties = {
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        zIndex: 200,
        minWidth: "100%",
        maxHeight: 260,
        overflowY: "auto",
        background: CIV.navBg,
        border: `2px solid ${CIV.border}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
        padding: "4px 0",
    };

    return (
        <label className="flex flex-col gap-1 text-sm" style={{ color: CIV.muted }}>
            {label && (
                <span className="tracking-widest uppercase text-xs">{label}</span>
            )}
            <div
                ref={containerRef}
                style={{ position: "relative", display: "inline-block" }}
                onKeyDown={handleKeyDown}
            >
                {/* Trigger */}
                <div
                    role="combobox"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    tabIndex={0}
                    style={triggerStyle}
                    onClick={() => setOpen((o) => !o)}
                    onFocus={() => {}}
                >
                    <CivText
                        text={selectedOption?.label ?? ""}
                        iconSize={iconSize}
                        style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    />
                    {/* Chevron */}
                    <svg
                        width="10" height="6" viewBox="0 0 10 6" fill="none"
                        style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
                    >
                        <path d="M1 1l4 4 4-4" stroke={CIV.border} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                {/* Dropdown list */}
                {open && (
                    <ul
                        ref={listRef}
                        role="listbox"
                        style={dropdownStyle}
                    >
                        {options.map((opt, i) => {
                            const isSelected = opt.value === value;
                            const isFocused  = i === focused;
                            return (
                                <li
                                    key={opt.value}
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseEnter={() => setFocused(i)}
                                    onClick={() => select(opt.value)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "6px 14px",
                                        cursor: "pointer",
                                        background: isFocused
                                            ? CIV.navSel
                                            : isSelected
                                                ? `${CIV.navSel}88`
                                                : "transparent",
                                        color: isSelected ? CIV.gold : CIV.text,
                                        borderLeft: isSelected ? `2px solid ${CIV.border}` : "2px solid transparent",
                                        fontSize: 13,
                                        userSelect: "none",
                                    }}
                                >
                                    <CivText text={opt.label} iconSize={iconSize} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </label>
    );
}
