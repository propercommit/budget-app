import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/spending/month";
import { Button } from "./ui/button";

interface MonthPickerProps {
    selectedMonth: string;
    onMonthChange: (month: string) => void;
}

export function MonthPicker({ selectedMonth, onMonthChange }: MonthPickerProps) {
    
    const getCurrentMonth = (): string => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

    const goToToday = () => {
        onMonthChange(getCurrentMonth());
    };

    const isCurrentMonth = selectedMonth === getCurrentMonth();

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft />
            </Button>
            <p className="font-medium min-w-[140px] text-center">
                {monthLabel(selectedMonth)}
            </p>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight />
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={goToToday}
                disabled={isCurrentMonth}
            >
                Today
            </Button>
        </div>
    );
}