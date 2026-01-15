interface AnimatedPointProps {
    x: number;
    y: number;
    color: string;
    isHovered: boolean;
    isLast: boolean;
    delay: number;
    animId: string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export function AnimatedPoint({
    x,
    y,
    color,
    isHovered,
    isLast,
    delay,
    animId,
    onMouseEnter,
    onMouseLeave,
}: AnimatedPointProps) {
    return (
        <g 
            style={{
                opacity: 0,
                transformOrigin: `${x}px ${y}px`,
                animation: `popIn-${animId} 0.3s ease-out ${delay}s forwards`,
            }}
        >
            {/* Invisible hitbox */}
            <circle
                cx={x}
                cy={y}
                r="20"
                fill="transparent"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="cursor-pointer"
            />
            {/* Visible point */}
            <circle
                cx={x}
                cy={y}
                r={isHovered ? 6 : 4}
                fill="white"
                stroke={color}
                strokeWidth="2"
                className="transition-all pointer-events-none"
            />
            {/* Glow on last point */}
            {isLast && (
                <circle 
                    cx={x} 
                    cy={y} 
                    r="8" 
                    fill={color} 
                    opacity="0.3" 
                    className="pointer-events-none" 
                />
            )}
        </g>
    );
}