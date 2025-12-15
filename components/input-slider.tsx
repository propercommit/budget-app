import { Input } from "./ui/input";
import { Slider } from "./ui/slider";

interface InputSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    color: string;
    legend?: string;
    showAmount: boolean;
    showLegend: boolean;
};

export function InputSlider({label, value, onChange, color, legend, showAmount, showLegend}: InputSliderProps) {
    return (
    <div>
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <p className="text-sm font-medium">{label}</p>
                {showAmount === true && <span className="text-sm font-semibold">$ {value}</span>}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">$</span>
                <Input 
                    type="number" 
                    placeholder="0" 
                    value={value || ""} 
                    onChange={(e) => onChange(Number(e.target.value))} 
                    className="flex-1" 
                />
            </div>
            <div className="mt-4">
                <Slider 
                    value={[value]}
                    onValueChange={(vals: number[]) => onChange(vals[0])}
                    className={`
                        [&_[data-slot=slider-thumb]]:border-${color}-500 
                        [&_[data-slot=slider-thumb]]:bg-${color}-100 
                        [&_[data-slot=slider-range]]:bg-${color}-500 
                        [&_[data-slot=slider-thumb]]:w-10 [&_[data-slot=slider-thumb]]:h-5 
                        [&_[data-slot=slider-track]]:h-3 
                        [&_[data-slot=slider-track]]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]
                    `}
                />
            </div>
        </div>
            {showLegend === true && <p className="text-xs text-gray-500 mt-3">{legend}</p>}
    </div>

    );
}