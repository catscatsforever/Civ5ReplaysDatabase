import React, { useState, useMemo, useRef, useEffect } from "react";
import { CIV } from "../civPalette";
import { useLang } from "../LangContext";
import CivText from "./CivText";

const PAGE_SIZE = 200;

type SortDir = "asc" | "desc" | null;

interface PaginatedTableProps {
    columns: string[];
    values: any[][];
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Returns true when a value looks numeric (handles stringified numbers too). */
function isNumeric(v: any): boolean {
    if (v === null || v === undefined || v === "") return false;
    return !isNaN(Number(v));
}

/** Detects whether the majority of a column's non-null values are numeric. */
function isColumnNumeric(values: any[][], colIdx: number): boolean {
    let numeric = 0;
    let total = 0;
    const sample = Math.min(values.length, 200); // sample first 200 rows
    for (let i = 0; i < sample; i++) {
        const v = values[i][colIdx];
        if (v === null || v === undefined) continue;
        total++;
        if (isNumeric(v)) numeric++;
    }
    return total > 0 && numeric / total > 0.5;
}

/** Compare function: numeric-aware, null-safe. */
function compareValues(a: any, b: any, numeric: boolean): number {
    // Nulls always sort to the end
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;

    if (numeric) {
        const na = Number(a);
        const nb = Number(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
    }

    return String(a).localeCompare(String(b), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function PaginatedTable({ columns, values }: PaginatedTableProps) {
    const { t } = useLang();
    const [page, setPage] = useState(0);
    const [sortCol, setSortCol] = useState<number | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);

    // Track data identity to reset state when data changes
    const prevValuesRef = useRef(values);
    useEffect(() => {
        if (prevValuesRef.current !== values) {
            prevValuesRef.current = values;
            setPage(0);
            setSortCol(null);
            setSortDir(null);
        }
    }, [values]);

    // Pre-compute which columns are numeric (for sort comparisons)
    const numericCols = useMemo(
        () => columns.map((_, i) => isColumnNumeric(values, i)),
        [columns, values]
    );

    // Sort the full dataset
    const sortedValues = useMemo(() => {
        if (sortCol === null || sortDir === null) return values;
        const col = sortCol;
        const numeric = numericCols[col];
        const dir = sortDir === "asc" ? 1 : -1;
        return [...values].sort((a, b) => dir * compareValues(a[col], b[col], numeric));
    }, [values, sortCol, sortDir, numericCols]);

    const totalPages = Math.max(1, Math.ceil(sortedValues.length / PAGE_SIZE));
    const needsPagination = sortedValues.length > PAGE_SIZE;

    const pageRows = useMemo(
        () => sortedValues.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [sortedValues, page]
    );

    const startRow = page * PAGE_SIZE + 1;
    const endRow = Math.min((page + 1) * PAGE_SIZE, sortedValues.length);

    /* ── Sort click handler ─────────────────────────────────────────────── */
    function handleSortClick(colIdx: number) {
        if (sortCol !== colIdx) {
            // New column: start ascending
            setSortCol(colIdx);
            setSortDir("asc");
        } else {
            // Same column: cycle asc → desc → reset
            if (sortDir === "asc") {
                setSortDir("desc");
            } else if (sortDir === "desc") {
                setSortCol(null);
                setSortDir(null);
            } else {
                setSortDir("asc");
            }
        }
        setPage(0); // reset to first page on sort change
    }

    /* ── Sort indicator ─────────────────────────────────────────────────── */
    function SortIndicator({ colIdx }: { colIdx: number }) {
        if (sortCol === colIdx && sortDir === "asc") {
            return <span style={{ color: CIV.gold, marginLeft: 4 }}>▲</span>;
        }
        if (sortCol === colIdx && sortDir === "desc") {
            return <span style={{ color: CIV.gold, marginLeft: 4 }}>▼</span>;
        }
        return <span style={{ color: `${CIV.muted}80`, marginLeft: 4, fontSize: "0.7em" }}>⇅</span>;
    }

    if (columns.length === 0) {
        return (
            <div className="p-8 text-center" style={{ color: CIV.muted }}>
                {t("TXT_KEY_QUERY_EMPTY_RESULT")}
            </div>
        );
    }

    /* ── Column border style ────────────────────────────────────────────── */
    const colBorderStyle: React.CSSProperties = {
        borderRight: `1px solid ${CIV.border}40`,
    };
    const lastColStyle: React.CSSProperties = {}; // no right border on last column

    /* ── Pagination bar ─────────────────────────────────────────────────── */
    function PaginationControls({ position }: { position: "top" | "bottom" }) {
        return (
            <tr>
                <td
                    colSpan={columns.length}
                    style={{
                        padding: 0,
                        ...(position === "top"
                            ? { borderBottom: `2px solid ${CIV.border}` }
                            : { borderTop: `2px solid ${CIV.border}` }),
                    }}
                >
                    <div
                        className="flex items-center justify-between px-5 py-2.5"
                        style={{ background: CIV.navBg }}
                    >
            <span className="text-xs" style={{ color: CIV.muted }}>
              {position === "top"
                  ? `${t("TXT_KEY_PAGING_SHOWING")} ${startRow}–${endRow} ${t("TXT_KEY_PAGING_OF")} ${sortedValues.length} ${t("TXT_KEY_PAGING_ROWS")}`
                  : `${t("TXT_KEY_PAGING_PAGE")} ${page + 1} ${t("TXT_KEY_PAGING_OF")} ${totalPages}`}
            </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(0)}
                                disabled={page === 0}
                                className="civ-btn civ-btn-chip"
                                style={{ padding: "3px 7px", fontSize: "0.7rem" }}
                            >
                                ⟪
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="civ-btn civ-btn-chip"
                                style={{ padding: "3px 7px", fontSize: "0.7rem" }}
                            >
                                ◀
                            </button>

                            {(() => {
                                const buttons: React.ReactElement[] = [];
                                const maxBtns = 7;
                                let start = Math.max(0, page - Math.floor(maxBtns / 2));
                                let end = Math.min(totalPages, start + maxBtns);
                                if (end - start < maxBtns) start = Math.max(0, end - maxBtns);

                                for (let i = start; i < end; i++) {
                                    buttons.push(
                                        <button
                                            key={i}
                                            onClick={() => setPage(i)}
                                            className={`civ-btn civ-btn-chip ${i === page ? "civ-btn-active" : ""}`}
                                            style={{ padding: "3px 8px", fontSize: "0.7rem" }}
                                        >
                                            {i + 1}
                                        </button>
                                    );
                                }
                                return buttons;
                            })()}

                            <button
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="civ-btn civ-btn-chip"
                                style={{ padding: "3px 7px", fontSize: "0.7rem" }}
                            >
                                ▶
                            </button>
                            <button
                                onClick={() => setPage(totalPages - 1)}
                                disabled={page >= totalPages - 1}
                                className="civ-btn civ-btn-chip"
                                style={{ padding: "3px 7px", fontSize: "0.7rem" }}
                            >
                                ⟫
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                {needsPagination && <PaginationControls position="top" />}
                <tr style={{ borderBottom: `2px solid ${CIV.border}`, background: CIV.navBg }}>
                    {columns.map((col, idx) => (
                        <th
                            key={col + idx}
                            className="text-left py-2.5 px-4 whitespace-nowrap select-none"
                            style={{
                                color: CIV.gold,
                                cursor: "pointer",
                                userSelect: "none",
                                ...(idx < columns.length - 1 ? colBorderStyle : lastColStyle),
                            }}
                            onClick={() => handleSortClick(idx)}
                            title={`Sort by ${col}`}
                        >
                <span className="inline-flex items-center gap-0.5">
                  <CivText text={col} iconSize={16} />
                  <SortIndicator colIdx={idx} />
                </span>
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {pageRows.map((row, i) => (
                    <tr
                        key={page * PAGE_SIZE + i}
                        style={{
                            borderBottom: `1px solid ${CIV.grid}`,
                            background: i % 2 === 0 ? CIV.surface : CIV.surfaceAlt,
                        }}
                    >
                        {row.map((cell: any, j: number) => (
                            <td
                                key={j}
                                className="py-2 px-4 whitespace-nowrap font-mono text-xs"
                                style={{
                                    color: CIV.text,
                                    ...(j < columns.length - 1 ? colBorderStyle : lastColStyle),
                                }}
                            >
                                {cell === null ? (
                                    <span style={{ color: CIV.muted, fontStyle: "italic" }}>NULL</span>
                                ) : (
                                    <CivText text={String(cell)} iconSize={18} />
                                )}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
                {needsPagination && (
                    <tfoot>
                    <PaginationControls position="bottom" />
                    </tfoot>
                )}
            </table>
        </div>
    );
}
