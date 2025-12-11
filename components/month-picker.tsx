import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface MonthPickerProps {
    label: string;
}

export function MonthPicker({label}: MonthPickerProps) {
    return (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft />
          </Button>
          <p className="font-medium">{label}</p>
          <Button variant="outline" size="icon">
            <ChevronRight />
          </Button>
        </div>
    );
}