import { ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Home() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex gap-2 items-center mb-2">
        <div className="bg-green-500 rounded-lg p-2">
          <DollarSign className="text-white"/>
        </div>
      <h1 className="text-2xl font-bold">Budget Planner</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">Take control of your finances</p>
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft />
          </Button>
          <p className="font-medium">December 2025</p>
          <Button variant="outline" size="icon">
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Trends</span>
          <Switch className="data-[state=checked]:bg-green-500"/>
        </div>
      </div>
    </div>
  );
}
