"use client"

export function LoadingSpinner() {
    const bars = [
        { originalWidth: 70, color: "#007AFF", y: 0, delay: 0, id: "blue" },
        { originalWidth: 55, color: "#34C759", y: 26, delay: 0.1, id: "green" },
        { originalWidth: 40, color: "#FF9F0A", y: 52, delay: 0.2, id: "orange" },
    ];

    return (
        <div className="flex items-center justify-center py-12">
            <style>{`
                @keyframes sweep {
                    0%, 100% { transform: translateX(0); opacity: 1; }
                    50% { transform: translateX(100px); opacity: 1; }
                }
                .loading-bar {
                    animation: sweep 1.2s ease-in-out infinite;
                }
            `}</style>
            <svg 
                width="170" 
                height="70" 
                viewBox="0 0 170 70" 
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
            >
                <defs>
                    {bars.map((bar) => (
                        <linearGradient key={bar.id} id={`gradient-loading-${bar.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={bar.color} stopOpacity="0" />
                            <stop offset="70%" stopColor={bar.color} stopOpacity="0.5" />
                            <stop offset="100%" stopColor={bar.color} stopOpacity="1" />
                        </linearGradient>
                    ))}
                </defs>
                
                {bars.map((bar, index) => {
                    const trailWidth = 120;

                    return (
                        <g 
                            key={index} 
                            className="loading-bar"
                            style={{ animationDelay: `${bar.delay}s` }}
                        >
                            <rect
                                x={-trailWidth + bar.originalWidth}
                                y={bar.y}
                                width={trailWidth}
                                height="18"
                                rx="9"
                                fill={`url(#gradient-loading-${bar.id})`}
                            />
                            <rect
                                x={0}
                                y={bar.y}
                                width={bar.originalWidth}
                                height="18"
                                rx="9"
                                fill={bar.color}
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}