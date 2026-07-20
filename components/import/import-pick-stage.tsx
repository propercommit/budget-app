"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

/** The picked statement file, decoded — content stays client-side until Continue. */
export interface PickedFile {
    name: string;
    kb: number;
    content: string;
}

interface ImportPickStageProps {
    file: PickedFile | null;
    /** Parse/staging failure to surface inline (server message verbatim). */
    error: string | null;
    onPick: (file: PickedFile) => void;
    onRemove: () => void;
}

/** Reads a browser File into the {@link PickedFile} shape. */
async function decodeFile(file: File): Promise<PickedFile> {

    const content = await file.text();
    const kb = file.size > 0 ? Math.max(1, Math.round(file.size / 1024)) : 1;

    return { name: file.name, kb, content };
}

/**
 * The file-pick body: dashed dropzone (click or drag), the selected-file
 * card, and the local-parsing privacy note. Errors from a failed staging
 * round-trip render inline under the picker.
 */
export function ImportPickStage({ file, error, onPick, onRemove }: ImportPickStageProps) {

    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const handleFiles = async (list: FileList | null) => {

        const picked = list?.[0];

        if (picked === undefined) return;

        onPick(await decodeFile(picked));
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept=".mt940,.sta,.940,.txt"
                className="hidden"
                onChange={(event) => {
                    const files = event.target.files;

                    // Reset so re-selecting the same file re-fires onChange.
                    event.target.value = "";

                    void handleFiles(files);
                }}
            />

            {file === null ? (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault();
                        setDragging(false);
                    }}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        void handleFiles(event.dataTransfer.files);
                    }}
                    className="w-full flex flex-col items-center justify-center gap-2.5 px-6 py-11 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
                    style={
                        dragging
                            ? { borderColor: "var(--primary)", backgroundColor: "rgba(47, 80, 200, 0.04)" }
                            : { borderColor: "var(--border)", backgroundColor: "transparent" }
                    }
                >
                    <span className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Upload className="size-6" strokeWidth={2} />
                    </span>
                    <span className="text-[15px] font-semibold text-foreground mt-1.5">
                        {dragging ? "Drop it here" : "Drop your bank statement here"}
                    </span>
                    <span className="text-[13px] text-muted-foreground text-center">
                        MT940 statement (.mt940, .sta) · or <span className="text-primary font-semibold">click to browse</span>
                    </span>
                </button>
            ) : (
                <>
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted border border-border animate-in fade-in duration-200">
                        <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <FileText className="size-5" strokeWidth={2} />
                        </span>

                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-foreground truncate">{file.name}</span>
                            <span className="block text-xs text-muted-foreground mt-0.5">{file.kb} KB · MT940 · ready to review</span>
                        </span>

                        <button
                            type="button"
                            aria-label="Remove file"
                            onClick={onRemove}
                            className="w-9 h-9 rounded-full bg-card border border-border text-muted-foreground flex items-center justify-center flex-shrink-0 transition-all active:scale-[0.92]"
                        >
                            <X className="size-4" strokeWidth={2.2} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="mt-2.5 bg-transparent border-none px-0.5 py-1.5 text-[13px] font-semibold text-primary cursor-pointer"
                    >
                        Choose a different file
                    </button>
                </>
            )}

            {error !== null && (
                <p className="text-[13px] font-medium m-0 mt-3 px-1" style={{ color: "#FF3B30" }} role="alert">
                    {error}
                </p>
            )}

            <p className="text-xs text-muted-foreground/80 leading-relaxed m-0 mt-3.5 px-1">
                The statement is parsed locally. You’ll review every transaction — nothing is written to your budget until you confirm.
            </p>
        </div>
    );
}
