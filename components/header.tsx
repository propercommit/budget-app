"use client"

import { useState, useEffect } from "react";

interface HeaderProps {
    title: string;
    legendLabel: string;
}

export function Header({ title, legendLabel }: HeaderProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const maxX = 400;
    
    const bars = [
        { originalWidth: 70, color: "#007AFF", y: 0, delay: 0, id: "blue" },
        { originalWidth: 55, color: "#34C759", y: 26, delay: 0.1, id: "green" },
        { originalWidth: 40, color: "#FF9F0A", y: 52, delay: 0.2, id: "orange" },
    ];

    return (
        <div>
            <div 
                className="flex items-center mb-2 cursor-pointer w-fit"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <svg 
                    width="40" 
                    height="40" 
                    viewBox="0 0 70 70" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-3 overflow-visible"
                >
                    <defs>
                        {bars.map((bar) => (
                            <linearGradient key={bar.id} id={`gradient-${bar.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={bar.color} stopOpacity="0" />
                                <stop offset="70%" stopColor={bar.color} stopOpacity="0.5" />
                                <stop offset="100%" stopColor={bar.color} stopOpacity="1" />
                            </linearGradient>
                        ))}
                    </defs>
                    
                    {bars.map((bar, index) => {
                        const isExpanded = isHovered && isLoaded;
                        
                        const barX = !isLoaded 
                            ? 0 
                            : isExpanded 
                                ? maxX
                                : 0;

                        const trailWidth = 120;

                        return (
                            <g key={index}>
                                {/* Comet trail - follows behind the head */}
                                <rect
                                    x={barX - trailWidth + bar.originalWidth}
                                    y={bar.y}
                                    width={trailWidth}
                                    height="18"
                                    rx="9"
                                    fill={`url(#gradient-${bar.id})`}
                                    style={{
                                        transition: `x 0.6s ease-out ${bar.delay}s`,
                                        opacity: isExpanded ? 1 : 0,
                                    }}
                                />
                                {/* Head - the main bar */}
                                <rect
                                    x={barX}
                                    y={bar.y}
                                    width={bar.originalWidth}
                                    height="18"
                                    rx="9"
                                    fill={bar.color}
                                    style={{
                                        transition: `x 0.6s ease-out ${bar.delay}s`,
                                    }}
                                />
                            </g>
                        );
                    })}
                </svg>
                <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            </div>
            <p className="text-sm text-gray-500 mb-4">{legendLabel}</p>
        </div>
    );
}