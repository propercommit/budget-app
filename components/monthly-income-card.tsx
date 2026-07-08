import { InputSlider } from "./input-slider";
import { LegendChip } from "./legend-chip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";


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
    onActiveIncomeCommit: (value: number) => void;
    onPassiveIncomeCommit: (value: number) => void;
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
    onPassiveIncomeChange,
    onActiveIncomeCommit,
    onPassiveIncomeCommit
}: MonthlyIncomeCardProps) {

    const totalIncome = activeIncome + passiveIncome;
    const activePercentage = totalIncome > 0 ? Math.round((activeIncome / totalIncome) * 100) : 0;
    const passivePercentage = totalIncome > 0 ? Math.round((passiveIncome / totalIncome) * 100) : 0;

    const arcLength = 345.4;
    const activeArcLength = (activePercentage / 100) * arcLength;
    const passiveArcLength = (passivePercentage / 100) * arcLength;

    return (
        <Card className="mt-6">
            <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{legend}</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground text-center">{progressBarTitle}</p>
                <div className="relative">
                <svg width="280" height="150" viewBox="0 0 280 150" className="overflow-visible">
                    {/* Background arc (always visible) */}
                    <path
                        d="M 30 130 A 110 110 0 0 1 250 130"
                        fill="none"
                        className="stroke-border"
                        strokeWidth="28"
                        strokeLinecap="round"
                    />
                    {/* Active income arc (blue) */}
                    <path
                        d="M 30 130 A 110 110 0 0 1 250 130"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="28"
                        strokeLinecap="round"
                        strokeDasharray={`${activeArcLength} ${arcLength}`}
                        style={{
                            transition: "stroke-dasharray 500ms ease-out, opacity 300ms ease-out",
                            opacity: activePercentage > 0 ? 1 : 0,
                        }}
                    />
                    {/* Passive income arc (purple) */}
                    <path
                        d="M 30 130 A 110 110 0 0 1 250 130"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="28"
                        strokeLinecap="round"
                        strokeDasharray={`${passiveArcLength} ${arcLength}`}
                        strokeDashoffset={-activeArcLength}
                        style={{
                            transition: "stroke-dasharray 500ms ease-out, stroke-dashoffset 500ms ease-out, opacity 300ms ease-out",
                            opacity: passivePercentage > 0 ? 1 : 0,
                        }}
                    />
                    {/* Center text */}
                    <text x="140" y="105" textAnchor="middle" className="text-4xl font-bold fill-foreground">
                    {activePercentage}%
                    </text>
                    <text x="140" y="128" textAnchor="middle" className="text-sm fill-muted-foreground">
                    Active
                    </text>
                </svg>
                </div>
                <div className="flex items-center gap-6">
                <LegendChip label="Active" percentage={activePercentage} color="blue"/>
                <LegendChip label="Passive" percentage={passivePercentage} color="purple"/>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-4">
               <div className="flex flex-col gap-2">
                <InputSlider 
                    label={leftSliderTitle}
                    value={activeIncome}
                    onChange={onActiveIncomeChange}
                    onCommit={onActiveIncomeCommit}
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
                        onCommit={onPassiveIncomeCommit}
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