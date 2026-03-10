import { useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Upload } from "lucide-react";
import { availableIcons, iconMap } from "@/lib/icon-map";

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [iconSource, setIconSource] = useState<"preset" | "upload">(
        value.startsWith("data:") ? "upload" : "preset"
    );

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onChange(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-900">Icon</Label>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => setIconSource("preset")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        iconSource === "preset"
                            ? "text-gray-900 border-blue-500"
                            : "text-gray-500 border-transparent"
                    }`}
                >
                    Choose Icon
                </button>
                {/* <button
                    type="button"
                    onClick={() => setIconSource("upload")}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        iconSource === "upload"
                            ? "text-gray-900 border-blue-500"
                            : "text-gray-500 border-transparent"
                    }`}
                >
                    Upload Icon
                </button> */}
            </div>
            
            {iconSource === "preset" ? (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {availableIcons.map((icon) => {
                        const isSelected = value === icon.id;
                        return (
                            <button
                                type="button"
                                key={icon.id}
                                onClick={() => {
                                    onChange(icon.id);
                                }}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all flex-shrink-0 min-w-[72px] ${
                                    isSelected
                                        ? "bg-blue-50 border-2 border-blue-500"
                                        : "bg-gray-100 border-2 border-transparent hover:bg-gray-200"
                                }`}
                            >
                                <div className={isSelected ? "text-blue-500" : "text-gray-600"}>
                                    {iconMap[icon.id]}
                                </div>
                                <span className={`text-xs font-medium ${isSelected ? "text-blue-500" : "text-gray-500"}`}>
                                    {icon.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-8 px-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                    {value.startsWith("data:") ? (
                        <div className="flex flex-col items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={value} alt="Custom icon" className="w-12 h-12 object-contain" />
                            <p className="text-sm text-gray-500">Icon uploaded!</p>
                        </div>
                    ) : (
                        <>
                            {/* <Upload className="w-8 h-8 text-gray-400" />
                            <p className="text-sm text-gray-500">Upload your custom icon</p> */}
                        </>
                    )}
                    <Label
                        htmlFor="icon-upload"
                        className="cursor-pointer px-5 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        {value.startsWith("data:") ? "Change Icon" : "Select File"}
                    </Label>
                    <Input
                        id="icon-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleIconUpload}
                    />
                </div>
            )}
        </div>
    );
}