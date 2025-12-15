
import { InputSlider } from "./input-slider";
import { LegendChip } from "./legend-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";

interface MonthlyIncomeCardProps {
    title: string;
    legend: string;
    progressBarTitle: string;
    leftSliderTitle: string;
    rightSliderTitle: string;
    leftSliderLegend: string;
    rightSliderLegend: string;
    activeIncome: number;
    passiveIncome: number;
    onActiveIncomeChange: (value: number) => void;
    onPassiveIncomeChange: (value: number) => void;
}

export function MonthlyIncomeCard({
    title, 
    legend, 
    progressBarTitle, 
    leftSliderTitle, 
    rightSliderTitle, 
    leftSliderLegend, 
    rightSliderLegend,
    activeIncome,
    passiveIncome,
    onActiveIncomeChange,
    onPassiveIncomeChange
}: MonthlyIncomeCardProps) {
    return (
        <Card className="mt-6">
            <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{legend}</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-gray-500 text-center">{progressBarTitle}</p>
                <div className="relative">
                <svg width="280" height="150" viewBox="0 0 280 150" className="overflow-visible">
                    {/* Active income arc (blue) */}
                    <path
                    d="M 30 130 A 110 110 0 0 1 250 130"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="28"
                    strokeLinecap="round"
                    strokeDasharray={`${(81 / 100) * 345.4} 345.4`}
                    />
                    {/* Passive income arc (purple) */}
                    <path
                    d="M 30 130 A 110 110 0 0 1 250 130"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="28"
                    strokeLinecap="round"
                    strokeDasharray={`${(19 / 100) * 345.4} 345.4`}
                    strokeDashoffset={-((81 / 100) * 345.4)}
                    />
                    {/* Center text */}
                    <text x="140" y="105" textAnchor="middle" className="text-4xl font-bold fill-foreground">
                    81%
                    </text>
                    <text x="140" y="128" textAnchor="middle" className="text-sm fill-gray-500">
                    Active
                    </text>
                </svg>
                </div>
                <div className="flex items-center gap-6">
                <LegendChip label="Active" percentage={81} color="blue"/>
                <LegendChip label="Passive" percentage={19} color="purple"/>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-4">
               <div className="flex flex-col gap-2">
                <InputSlider 
                    label={leftSliderTitle}
                    value={activeIncome}
                    onChange={onActiveIncomeChange}
                    color="hsl(217,91%,60%)"
                    colorLight="hsl(217,91%,95%)"
                    legend={leftSliderLegend}
                    showAmount={false}
                    showLegend={true}
                />
               </div>
                <div className="flex flex-col gap-2">
                    <InputSlider
                        label={rightSliderTitle}
                        value={passiveIncome}
                        onChange={onPassiveIncomeChange}
                        color="hsl(271,81%,56%)"
                        colorLight="hsl(271,81%,95%)"
                        legend={rightSliderLegend}
                        showAmount={false}
                        showLegend={true}
                    />
                </div>
            </div>
            </CardContent>
        </Card>
    );
}