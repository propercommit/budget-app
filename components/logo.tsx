"use client"

import { useState, useEffect } from "react";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    animated?: boolean;
}

/** Brand palette for "The Peaks" mark — blue trendline resolving on an emerald point. */
const STROKE = "#2F50C8";
const AREA = "#2F50C8";
const POINT = "#1E9C57";

const SIZE_CONFIG = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 56, height: 56 },
} as const;

/**
 * "The Peaks" — the app's brandmark. A spending trendline folded into two soft
 * peaks that resolve on an emerald point; a chart rendered as an emblem.
 *
 * Renders a filled area under the trendline, the stroked line itself, and the
 * end point. When `animated` is true the line draws itself in on mount (via a
 * normalized `pathLength` dash sweep) and the whole mark lifts slightly on hover.
 * The `size`/`animated` prop contract is shared by every call site (header,
 * login, password-recovery, account), so keep it stable.
 */
export function Logo({ size = "md", animated = true }: LogoProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isDrawn, setIsDrawn] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsDrawn(true), 100);

        return () => clearTimeout(timer);
    }, []);

    const config = SIZE_CONFIG[size];

    // Only sweep the line in when animated; otherwise show it fully drawn at once.
    const drawn = animated === false || isDrawn === true;
    const lifted = animated === true && isHovered === true;

    return (
        <div
            className={animated === true ? "cursor-pointer" : ""}
            onMouseEnter={() => { if (animated === true) setIsHovered(true); }}
            onMouseLeave={() => { if (animated === true) setIsHovered(false); }}
        >
            <svg
                width={config.width}
                height={config.height}
                viewBox="0 0 96 96"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
                aria-hidden="true"
            >
                <g
                    style={{
                        transformOrigin: "48px 48px",
                        transform: lifted === true ? "scale(1.06)" : "scale(1)",
                        transition: "transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
                    }}
                >
                    {/* Filled area under the trendline */}
                    <path
                        d="M12 74 34 36a6 6 0 0 1 10.4 0l8 13.6L62 24a6 6 0 0 1 10.6.2L84 46v20a8 8 0 0 1-8 8Z"
                        fill={AREA}
                        style={{
                            opacity: drawn === true ? 0.15 : 0,
                            transition: "opacity 0.5s ease-out 0.35s",
                        }}
                    />

                    {/* Trendline — draws itself in via the normalized dash sweep */}
                    <path
                        d="M12 74 34 36a6 6 0 0 1 10.4 0l8 13.6L62 24a6 6 0 0 1 10.6.2L84 46"
                        fill="none"
                        stroke={STROKE}
                        strokeWidth={9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={100}
                        strokeDasharray={100}
                        style={{
                            strokeDashoffset: drawn === true ? 0 : 100,
                            transition: "stroke-dashoffset 0.7s ease-out",
                        }}
                    />

                    {/* Emerald end point — pops in once the line reaches it */}
                    <circle
                        cx={84}
                        cy={46}
                        r={8}
                        fill={POINT}
                        style={{
                            transformOrigin: "84px 46px",
                            transform: drawn === true ? "scale(1)" : "scale(0)",
                            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.55s",
                        }}
                    />
                </g>
            </svg>
        </div>
    );
}
