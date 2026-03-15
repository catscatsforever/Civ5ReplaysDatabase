import { useRef, useEffect, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { sql, SQLite } from "@codemirror/lang-sql";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { autocompletion, closeBrackets, type CompletionContext, type Completion, type CompletionResult } from "@codemirror/autocomplete";
import { CIV } from "../civPalette";

const civTheme = EditorView.theme(
    {
        "&": {
            backgroundColor: CIV.body,
            color: CIV.text,
            fontSize: "13px",
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
            border: `2px solid ${CIV.border}`,
            borderRadius: "8px",
            overflow: "hidden",
        },
        ".cm-content": {
            caretColor: CIV.gold,
            padding: "12px 0",
        },
        ".cm-cursor, .cm-dropCursor": {
            borderLeftColor: CIV.gold,
            borderLeftWidth: "2px",
        },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
            backgroundColor: `${CIV.navSel} !important`,
        },
        ".cm-panels": { backgroundColor: CIV.surface, color: CIV.text },
        ".cm-panels.cm-panels-top": { borderBottom: `2px solid ${CIV.border}` },
        ".cm-panels.cm-panels-bottom": { borderTop: `2px solid ${CIV.border}` },
        ".cm-activeLine": { backgroundColor: `${CIV.navBg}80` },
        ".cm-gutters": {
            backgroundColor: CIV.navBg,
            color: CIV.muted,
            border: "none",
            borderRight: `1px solid ${CIV.border}40`,
        },
        ".cm-activeLineGutter": {
            backgroundColor: CIV.navSel,
            color: CIV.gold,
        },
        ".cm-lineNumbers .cm-gutterElement": {
            padding: "0 8px 0 12px",
            minWidth: "2.5em",
        },
        ".cm-tooltip": {
            backgroundColor: CIV.surface,
            border: `2px solid ${CIV.border}`,
            color: CIV.text,
        },
        ".cm-tooltip .cm-tooltip-arrow::before": { borderTopColor: CIV.border },
        ".cm-tooltip .cm-tooltip-arrow::after": { borderTopColor: CIV.surface },
        ".cm-tooltip-autocomplete": {
            "& > ul > li": { padding: "4px 8px" },
            "& > ul > li[aria-selected]": { backgroundColor: CIV.navSel, color: CIV.gold },
        },
        ".cm-matchingBracket": {
            backgroundColor: `${CIV.gold}30`,
            outline: `1px solid ${CIV.gold}60`,
            color: CIV.gold,
        },
        ".cm-placeholder": { color: CIV.muted },
        ".cm-scroller": { overflow: "auto" },
    },
    { dark: true }
);

import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const civHighlight = HighlightStyle.define([
    { tag: t.keyword,        color: "#c9a040", fontWeight: "bold" },
    { tag: t.definitionKeyword, color: "#c9a040", fontWeight: "bold" },
    { tag: t.typeName,       color: "#5bb5b5" },
    { tag: t.string,         color: "#8bc96a" },
    { tag: t.number,         color: "#d4845a" },
    { tag: t.bool,           color: "#d4845a" },
    { tag: t.null,           color: "#c75050", fontStyle: "italic" },
    { tag: t.operator,       color: CIV.text },
    { tag: t.punctuation,    color: CIV.muted },
    { tag: t.paren,          color: CIV.muted },
    { tag: t.squareBracket,  color: CIV.muted },
    { tag: t.brace,          color: CIV.muted },
    { tag: t.comment,        color: "#6a6a6a", fontStyle: "italic" },
    { tag: t.lineComment,    color: "#6a6a6a", fontStyle: "italic" },
    { tag: t.blockComment,   color: "#6a6a6a", fontStyle: "italic" },
    { tag: t.function(t.variableName), color: "#7b8ec9" },
    { tag: t.propertyName,   color: "#5bb5b5" },
    { tag: t.variableName,   color: CIV.text },
    { tag: t.special(t.string), color: "#c9597a" },
]);

export interface SqlSchema {
    [tableName: string]: string[];
}

const TABLE_CONTEXT_KW = new Set([
    "from", "join", "inner", "left", "right", "outer", "cross",
    "natural", "table", "into", "update", "alter", "drop",
    "truncate", "describe", "exists",
]);

const COLUMN_CONTEXT_KW = new Set([
    "select", "where", "and", "or", "on", "set", "by",
    "having", "when", "then", "else", "case", "as",
    "between", "in", "like", "not", "is", "distinct",
    "values", "using", "partition", "over", "within",
]);

const SQL_FUNCTIONS = new Set([
    "count", "sum", "avg", "min", "max", "total", "group_concat",
    "abs", "coalesce", "ifnull", "nullif", "iif", "typeof",
    "length", "lower", "upper", "trim", "ltrim", "rtrim",
    "substr", "replace", "instr", "hex", "quote", "round",
    "cast", "printf",
]);

type ContextKind = "table" | "column" | "neutral";

function detectContext(textBefore: string): ContextKind {
    const cleaned = textBefore
        .replace(/'[^']*'/g, "''")
        .replace(/--[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");

    const tokens = cleaned.match(/\w+|[(),.;*]/g);
    if (!tokens || tokens.length === 0) return "neutral";

    for (let i = tokens.length - 1; i >= 0; i--) {
        const tok = tokens[i].toLowerCase();

        if (i === tokens.length - 1 && /^\w+$/.test(tokens[i])) continue;

        if (tok === "(") {
            if (i > 0) {
                const before = tokens[i - 1].toLowerCase();
                if (SQL_FUNCTIONS.has(before)) return "column";
            }
            continue;
        }
        if (/^[(),.;*]$/.test(tok)) continue;  // skip punctuation
        if (TABLE_CONTEXT_KW.has(tok)) return "table";
        if (COLUMN_CONTEXT_KW.has(tok)) return "column";
    }

    return "neutral";
}

function buildCompletionSource(schema: SqlSchema) {
    const tableNames = Object.keys(schema);

    // Pre-build completion items
    const tableCompletions: Completion[] = tableNames.map((name) => ({
        label: name,
        type: "class",
        detail: "table",
    }));

    // All columns with their source table
    const columnCompletions: Completion[] = [];
    const seen = new Set<string>();
    for (const [table, cols] of Object.entries(schema)) {
        for (const col of cols) {
            const key = col.toLowerCase();
            // If column name is unique, show it plain; if ambiguous, show table prefix
            if (seen.has(key)) {
                columnCompletions.push({
                    label: col,
                    type: "property",  // "property" icon → column
                    detail: table,
                    apply: col,
                });
            } else {
                seen.add(key);
                columnCompletions.push({
                    label: col,
                    type: "property",
                    detail: table,
                });
            }
        }
    }

    const qualifiedCompletions: Completion[] = [];
    for (const [table, cols] of Object.entries(schema)) {
        for (const col of cols) {
            qualifiedCompletions.push({
                label: `${table}.${col}`,
                type: "property",
                detail: `${table} column`,
            });
        }
    }

    return (context: CompletionContext): CompletionResult | null => {
        const word = context.matchBefore(/[\w.]*/);
        if (!word) return null;
        // Don't trigger on empty match unless explicitly requested
        if (word.from === word.to && !context.explicit) return null;

        const textBefore = context.state.doc.sliceString(0, word.from);
        const ctx = detectContext(textBefore);
        const prefix = word.text.toLowerCase();

        if (prefix.includes(".")) {
            const [tablePart] = prefix.split(".");
            const matchTable = tableNames.find(
                (tn) => tn.toLowerCase() === tablePart
            );
            if (matchTable) {
                const cols = schema[matchTable] || [];
                return {
                    from: word.from,
                    options: cols.map((col) => ({
                        label: `${matchTable}.${col}`,
                        type: "property",
                        detail: matchTable,
                    })),
                    filter: true,
                };
            }
        }

        const TABLE_BOOST_HI = 10;
        const TABLE_BOOST_LO = -5;
        const COL_BOOST_HI = 10;
        const COL_BOOST_LO = -5;
        const options: Completion[] = [];

        for (const tc of tableCompletions) {
            options.push({
                ...tc,
                boost: ctx === "table" ? TABLE_BOOST_HI : ctx === "column" ? TABLE_BOOST_LO : 0,
            });
        }
        for (const cc of columnCompletions) {
            options.push({
                ...cc,
                boost: ctx === "column" ? COL_BOOST_HI : ctx === "table" ? COL_BOOST_LO : 0,
            });
        }
        for (const qc of qualifiedCompletions) {
            options.push({
                ...qc,
                boost: ctx === "column" ? COL_BOOST_HI - 1 : COL_BOOST_LO,
            });
        }
        return {
            from: word.from,
            options,
            filter: true,
        };
    };
}

interface SqlEditorProps {
    value: string;
    onChange: (val: string) => void;
    onExecute?: () => void;
    placeholder?: string;
    minHeight?: string;
    maxHeight?: string;
    schema?: SqlSchema;
}

export default function SqlEditor({
                                      value,
                                      onChange,
                                      onExecute,
                                      placeholder = "",
                                      minHeight = "140px",
                                      maxHeight = "400px",
                                      schema,
                                  }: SqlEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const sqlCompartment = useRef(new Compartment());
    const completionCompartment = useRef(new Compartment());
    const onChangeRef = useRef(onChange);
    const onExecuteRef = useRef(onExecute);
    onChangeRef.current = onChange;
    onExecuteRef.current = onExecute;

    const updateListener = useCallback(
        () =>
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const newVal = update.state.doc.toString();
                    onChangeRef.current(newVal);
                }
            }),
        []
    );

    const buildSqlExtension = useCallback(() => {
        return sql({ dialect: SQLite, upperCaseKeywords: true });
    }, []);

    const buildCompletionExtension = useCallback((s?: SqlSchema) => {
        if (s && Object.keys(s).length > 0) {
            const source = buildCompletionSource(s);
            return autocompletion({
                override: [source],
                activateOnTyping: true,
                maxRenderedOptions: 40,
            });
        }
        return autocompletion({ activateOnTyping: true });
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const executeKeymap = keymap.of([
            {
                key: "Ctrl-Enter",
                mac: "Cmd-Enter",
                run: () => {
                    onExecuteRef.current?.();
                    return true;
                },
            },
        ]);

        const state = EditorState.create({
            doc: value,
            extensions: [
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                history(),
                bracketMatching(),
                closeBrackets(),
                completionCompartment.current.of(buildCompletionExtension(schema)),
                sqlCompartment.current.of(buildSqlExtension()),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                syntaxHighlighting(civHighlight),
                civTheme,
                cmPlaceholder(placeholder),
                executeKeymap,
                keymap.of([...defaultKeymap, ...historyKeymap]),
                updateListener(),
                EditorView.lineWrapping,
                EditorView.theme({
                    ".cm-scroller": { minHeight, maxHeight },
                }),
            ],
        });

        const view = new EditorView({ state, parent: containerRef.current });
        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, []);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        view.dispatch({
            effects: completionCompartment.current.reconfigure(buildCompletionExtension(schema)),
        });
    }, [schema, buildCompletionExtension]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const current = view.state.doc.toString();
        if (current !== value) {
            view.dispatch({
                changes: { from: 0, to: current.length, insert: value },
            });
        }
    }, [value]);

    return <div ref={containerRef} className="w-full" />;
}
