import { parseIconMarkup } from "../icons";
import { CIV } from "../civPalette";

const ICON_SIZE = 14;
const FONT = '18px Futura PT';

function getTextWidth(text: string): number {
    const element = document.createElement('canvas');
    const context = element.getContext('2d');
    if (context) {
        context.font = `${FONT}`;

        return context.measureText(text).width;
    }
    return 0;
}

interface Segment {
    type: "text" | "icon";
    value: string;
    width: number;
    alt?: string;
}

function buildSegments(raw: string): Segment[] {
    const parsed = parseIconMarkup(String(raw ?? ""));
    return parsed.flatMap((seg): Segment[] => {
        if (typeof seg === "string") {
            if (!seg) return [];
            return [{ type: "text", value: seg, width: getTextWidth(seg) }];
        }
        return [{ type: "icon", value: seg.icon.url, alt: seg.icon.label, width: ICON_SIZE + 4 }];
    });
}

function totalWidth(segs: Segment[]): number {
    return segs.reduce((sum, s) => sum + s.width, 0);
}

interface XTickProps {
    x?: number;
    y?: number;
    payload?: { value: any };
    fill?: string;
    fontSize?: number;
}

export function CivXTick({ x = 0, y = 0, payload, fill = CIV.tick, fontSize = 11 }: XTickProps) {
    const raw = String(payload?.value ?? "");
    const segs = buildSegments(raw);
    const total = totalWidth(segs);

    let cursor = x - total / 2;
    const midY = y + 14; // baseline offset below axis line

    return (
        <g>
            {segs.map((seg, i) => {
                const sx = cursor;
                cursor += seg.width;
                if (seg.type === "icon") {
                    return (
                        <image
                            key={i}
                            href={seg.value}
                            x={sx}
                            y={midY - ICON_SIZE}
                            width={ICON_SIZE}
                            height={ICON_SIZE}
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <title>{seg.alt}</title>
                        </image>
                    );
                }
                return (
                    <text key={i} x={sx} y={midY} fill={fill} fontSize={fontSize}
                          dominantBaseline="auto" textAnchor="start" style={{ userSelect: 'none' }} >
                        {seg.value}
                    </text>
                );
            })}
        </g>
    );
}

interface YTickProps {
    x?: number;
    y?: number;
    payload?: { value: any };
    fill?: string;
    fontSize?: number;
}

export function CivYTick({ x = 0, y = 0, payload, fill = CIV.tick, fontSize = 11 }: YTickProps) {
    const raw = String(payload?.value ?? "");
    const segs = buildSegments(raw);
    const total = totalWidth(segs);

    let cursor = x - total - 4;
    const midY = y;

    return (
        <g>
            {segs.map((seg, i) => {
                const sx = cursor;
                cursor += seg.width;
                if (seg.type === "icon") {
                    return (
                        <image
                            key={i}
                            href={seg.value}
                            x={sx}
                            y={midY - ICON_SIZE / 2}
                            width={ICON_SIZE}
                            height={ICON_SIZE}
                            preserveAspectRatio="xMidYMid meet"
                        >
                            <title style={{ userSelect: 'none' }}>{seg.alt}</title>
                        </image>
                    );
                }
                return (
                    <text key={i} x={sx} y={midY} fill={fill} fontSize={fontSize}
                          dominantBaseline="central" textAnchor="start" style={{ userSelect: 'none' }}>
                        {seg.value}
                    </text>
                );
            })}
        </g>
    );
}

interface AxisLabelProps {
    viewBox?: { x: number; y: number; width: number; height: number };
    value?: string;
    position?: string;
    fill?: string;
    fontSize?: number;
    angle?: number;   // -90 for vertical Y labels
    offset?: number;
    angle0?: number;
    offset0?: number;
}

export function CivAxisLabel({
                                 viewBox = { x: 0, y: 0, width: 0, height: 0 },
                                 value = "",
                                 fill = CIV.muted,
                                 fontSize = 12,
                                 angle = -90,
                                 offset = 0,
                                 angle0 = -1,
                                 offset0 = 0,
                             }: AxisLabelProps) {
    const segs = buildSegments(value);
    const total = totalWidth(segs);

    const cx = viewBox.x + viewBox.width / 2;
    const cy = viewBox.y + viewBox.height / 2;
    offset = offset0 ?? offset;
    if (angle === -90 || angle0 === -90) {
        const lx = viewBox.x + offset0;
        const ly = cy;
        let cursor = ly - total / 2;

        return (
            <g transform={`rotate(-90, ${ly}, ${ly})`}>
                {segs.map((seg, i) => {
                    const sx = cursor;
                    cursor += seg.width;
                    if (seg.type === "icon") {
                        return (
                            <image key={i} href={seg.value}
                                   x={sx}
                                   y={lx - ICON_SIZE / 2}
                                   width={ICON_SIZE} height={ICON_SIZE}
                                   preserveAspectRatio="xMidYMid meet">
                                <title style={{ userSelect: 'none' }} >{seg.alt}</title>
                            </image>
                        );
                    }
                    return (
                        <text key={i} x={sx} y={lx} fill={fill} fontSize={fontSize}
                              dominantBaseline="central" textAnchor="start" style={{ userSelect: 'none' }} >
                            {seg.value}
                        </text>
                    );
                })}
            </g>
        );
    }

    const bx = cx;
    const by = viewBox.y + viewBox.height + offset0;
    let cursor = bx - total / 2;

    return (
        <g>
            {segs.map((seg, i) => {
                const sx = cursor;
                cursor += seg.width;
                if (seg.type === "icon") {
                    return (
                        <image key={i} href={seg.value}
                               x={sx} y={by - ICON_SIZE}
                               width={ICON_SIZE} height={ICON_SIZE}
                               preserveAspectRatio="xMidYMid meet">
                            <title style={{ userSelect: 'none' }} >{seg.alt}</title>
                        </image>
                    );
                }
                return (
                    <text key={i} x={sx} y={by} fill={fill} fontSize={fontSize}
                          dominantBaseline="auto" textAnchor="start" style={{ userSelect: 'none' }} >
                        {seg.value}
                    </text>
                );
            })}
        </g>
    );
}

import React from "react";
import CivText from "./CivText";
import { TOOLTIP_STYLE } from "../civPalette";

interface CivTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: any; color?: string; stroke?: string }>;
    label?: any;
    labelFormatter?: (label: any) => string;
    formatter?: (value: any, name: string) => [string, string] | string;
    labelStyle?: React.CSSProperties;
    label0?: string;
}

export function CivTooltip({
                               active,
                               payload,
                               label,
                               labelFormatter,
                               formatter,
                               labelStyle,
                               label0 = '',
                           }: CivTooltipProps) {
    if (!active || !payload?.length) return null;

    const rawLabel = labelFormatter ? labelFormatter(label) : String(label ?? "");

    return (
        <div style={{ ...TOOLTIP_STYLE, padding: "8px 12px", minWidth: 120 }}>
            <p style={{ marginBottom: 4, fontSize: 18, ...labelStyle }}>
                <CivText text={`${label0} ${rawLabel}`} iconSize={14} />
            </p>
            {payload.map((entry, i) => {
                const color = entry.color ?? entry.stroke ?? "#fff";
                let displayName = entry.name;
                let displayValue = String(entry.value ?? "");

                if (formatter) {
                    const result = formatter(entry.value, entry.name);
                    if (Array.isArray(result)) {
                        [displayValue, displayName] = result;
                    } else {
                        displayValue = result;
                    }
                }

                return (
                    <p key={i} style={{ color, margin: "2px 0", fontSize: 16 }}>
                        <CivText text={`${displayName}: ${displayValue}`} iconSize={13} />
                    </p>
                );
            })}
        </div>
    );
}
