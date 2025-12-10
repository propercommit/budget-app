"use client"
import { ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";


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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Monthly Income</CardTitle>
          <CardDescription>Enter your active and passive income sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-gray-500 text-center">Income Distribution</p>
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
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-500">Active: 81%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-sm text-gray-500">Passive: 19%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Active Income</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">$</span>
                <Input type="number" placeholder="0" className="flex-1" />
              </div>
              <div className="mt-4">
                <Slider className="[&_[data-slot=slider-thumb]]:border-blue-500 [&_[data-slot=slider-thumb]]:bg-blue-100 [&_[data-slot=slider-range]]:bg-blue-500 [&_[data-slot=slider-thumb]]:w-10 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-track]]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"/>
              </div>
              <p className="text-xs text-gray-500">Salary, wages, freelance</p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Passive Income</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">$</span>
                <Input type="number" placeholder="0" className="flex-1" />
              </div>
              <div className="mt-4">
                <Slider className="[&_[data-slot=slider-thumb]]:border-purple-500 [&_[data-slot=slider-thumb]]:bg-purple-100 [&_[data-slot=slider-range]]:bg-purple-500 [&_[data-slot=slider-thumb]]:w-10 [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-track]]:h-3 [&_[data-slot=slider-track]]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"/>
              </div>
              <p className="text-xs text-gray-500">Investments, rentals, dividends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}