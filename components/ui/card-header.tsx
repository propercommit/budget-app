interface CardHeaderProps {
    isExpanded: boolean;
    onToggle: () => void;
    title: string;
    icon: React.ReactNode;
}

export function CardHeader({ isExpanded, onToggle, title, icon }: CardHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0, 122, 255, 0.1)' }}
                >
                    {icon}
                </div>
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            </div>
            <button
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
            >
                <svg 
                    className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>
    );
}