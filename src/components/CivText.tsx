import React from "react";
import { parseIconMarkup } from "../icons";

interface CivTextProps {
    /** The raw text string, possibly containing [ICON_*] tokens. */
    text: string;
    /** Icon size in px. Default: 22 */
    iconSize?: number;
    /** Extra className applied to the wrapping <span>. */
    className?: string;
    /** Extra inline style for the wrapping <span>. */
    style?: React.CSSProperties;
}

/**
 * Renders a string that may contain [ICON_*] markup tokens.
 * Each recognised token is replaced with an inline 22×22 px <img>.
 * Unknown tokens are left as literal text.
 *
 * Use wherever text could contain icon markup:
 *   <CivText text={cell} />
 *   <CivText text="Gold: [ICON_GOLD] 42" />
 */
export default function CivText({
                                    text,
                                    iconSize = 22,
                                    className,
                                    style,
                                }: CivTextProps) {
    if (!text || typeof text !== "string") return null;

    const segments = parseIconMarkup(text);

    // Fast path: no icons found
    if (segments.length === 1 && typeof segments[0] === "string") {
        return (
            <span className={className} style={style}>
        {segments[0]}
      </span>
        );
    }

    return (
        <span
            className={className}
            style={{ display: "inline-flex", alignItems: "center", gap: 2, flexWrap: "wrap", ...style }}
        >
      {segments.map((seg, i) => {
          if (typeof seg === "string") {
              return seg ? <span key={i}>{seg}</span> : null;
          }
          return (
              <img
                  key={i}
                  src={seg.icon.url}
                  alt={seg.icon.label}
                  title={seg.icon.label}
                  width={iconSize}
                  height={iconSize}
                  style={{
                      display: "inline-block",
                      verticalAlign: "middle",
                      imageRendering: "auto",
                      flexShrink: 0,
                      // Graceful fallback: hide broken images but keep space
                      objectFit: "contain",
                  }}
                  onError={(e) => {
                      // Replace broken image with the text token
                      const parent = (e.target as HTMLImageElement).parentNode;
                      if (parent) {
                          const span = document.createElement("span");
                          span.textContent = seg.token;
                          span.title = seg.icon.label;
                          span.style.cssText =
                              "font-size:0.75em;opacity:0.7;font-family:monospace";
                          parent.replaceChild(span, e.target as Node);
                      }
                  }}
              />
          );
      })}
    </span>
    );
}
