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
            <Label>Icon</Label>
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setIconSource("preset")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        iconSource === "preset"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Choose Icon
                </button>
                <button
                    onClick={() => setIconSource("upload")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        iconSource === "upload"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Upload Icon
                </button>
            </div>
            {iconSource === "preset" ? (
                <div className="grid grid-cols-4 gap-2">
                    {availableIcons.map((icon) => (
                        <button
                            key={icon.id}
                            onClick={() => onChange(icon.id)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                                value === icon.id
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                            }`}
                        >
                            {iconMap[icon.id]}
                            <span className="text-xs">{icon.name}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-border rounded-lg">
                    {value.startsWith("data:") ? (
                        <div className="flex flex-col items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={value} alt="Custom icon" className="w-12 h-12 object-contain" />
                            <p className="text-xs text-muted-foreground">Icon uploaded!</p>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Upload your custom icon</p>
                        </>
                    )}
                    <Label
                        htmlFor="icon-upload"
                        className="cursor-pointer px-4 py-2 text-sm border rounded-md hover:bg-accent"
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