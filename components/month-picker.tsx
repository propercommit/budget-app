import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface MonthPickerProps {
    selectedMonth: string;
    onMonthChange: (month: string) => void;
}

export function MonthPicker({ selectedMonth, onMonthChange }: MonthPickerProps) {
    
    const formatMonthLabel = (monthString: string): string => {
        const [year, month] = monthString.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    const navigateMonth = (direction: "prev" | "next") => {
        const [year, month] = selectedMonth.split("-").map(Number);
        const date = new Date(year, month - 1);
        
        if (direction === "prev") {
            date.setMonth(date.getMonth() - 1);
        } else {
            date.setMonth(date.getMonth() + 1);
        }
        
        const newYear = date.getFullYear();
        const newMonth = String(date.getMonth() + 1).padStart(2, "0");
        onMonthChange(`${newYear}-${newMonth}`);
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft />
            </Button>
            <p className="font-medium min-w-[140px] text-center">
                {formatMonthLabel(selectedMonth)}
            </p>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight />
            </Button>
        </div>
    );
}