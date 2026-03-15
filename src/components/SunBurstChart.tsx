import React from "react";
import * as d3 from "d3";

type sunBurst = { name: string; label: string; value: number; fill?: string; children: sunBurst[] }
interface sunBurstChart { data: sunBurst, size: number }

export function SunBurstChart (chart: sunBurstChart) {
    const data = chart.data
    const SIZE = chart.size
    const RADIUS = SIZE / 2;
    const svgRef = React.useRef<SVGSVGElement>(null);

    const partition = (data: sunBurst) =>
        d3.partition<sunBurst>().size([2 * Math.PI, RADIUS])(
            d3
                .hierarchy(data)
                .sum((d) => d.value)
                .sort((a, b) => b.value ?? 0 - (a.value ?? 0))
        );

    const format = d3.format(",d");

    const arc = d3
        .arc<d3.HierarchyRectangularNode<sunBurst>>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(RADIUS / 2)
        .innerRadius((d) => d.children ? 0 : d.y0 - SIZE/20)
        .outerRadius((d) => d.children ? d.y1 - 1 - SIZE/20 : d.y1 - 1);

    const WIN_COLORS: Record<string, string> = {
        Domination: '#BE1600',
        Science: '#0089AD',
        Diplomatic: '#7E73D3',
        Cultural: '#AD007B',
        Time: '#84572D',
    };
    const getColor = (d: d3.HierarchyRectangularNode<sunBurst>) => {
        return d.data.fill ?? WIN_COLORS[d.data.name];
    };

    const getTextTransform = (d: d3.HierarchyRectangularNode<sunBurst>) => {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = d.children ? (d.y0 + d.y1) / 3.2 : (d.y0 + d.y1) / 2 - 10;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    };

    const root = partition(data);

    return (
        <svg width={SIZE} height={SIZE} viewBox={`${-SIZE / 2}, ${-SIZE / 2}, ${SIZE}, ${SIZE}`} ref={svgRef}
             style={{translate: '-50%'}}>
            <defs>
                <filter id="text-shadow">
                    <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodColor="black" floodOpacity="2.5"/>
                </filter>
            </defs>
            <g fillOpacity={0.9}>
                {root
                    .descendants()
                    .filter((d) => d.depth)
                    .map((d, i) => (
                        <path key={`${d.data.name}-${i}`} fill={getColor(d)} d={arc(d) ?? undefined}>
                            <text>
                                {d
                                    .ancestors()
                                    .map((d) => d.data.name)
                                    .reverse()
                                    .join("/")}
                                \n${format(d.value ?? 0)}
                            </text>
                        </path>
                    ))}
            </g>
            <g
                pointerEvents="none"
                textAnchor="middle"
                fontSize={15}
                fontFamily="Futura PT"
                fill="#FFFFC8"
            >
                {root
                    .descendants()
                    .filter((d) => d.depth && ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 10)
                    .map((d, i) => (
                        <text key={`${d.data.name}-${i}`} transform={getTextTransform(d)} dy={4} fontSize={18} filter="url(#text-shadow)">
                            {d.data.label !== '' ? <tspan x={0} y={-6} fontSize={16}>{d.data.name}</tspan> : d.data.name}
                            {d.data.label !== '' ? <tspan x={0} y={14} fontSize={14}>{d.data.label}</tspan> : ''}
                        </text>
                    ))}
            </g>
        </svg>
    );
}
