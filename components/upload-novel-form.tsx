"use client";

import type { ChangeEvent } from "react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { saveUploadedNovelFromFile } from "@/lib/library-storage";

type UploadNovelFormProps = {
  className?: string;
};

export function UploadNovelForm({ className }: UploadNovelFormProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setFileName(file.name);

    try {
      const result = await saveUploadedNovelFromFile(file);

      if (result.persistence === "local") {
        setStatusMessage("Saved locally. Supabase is unavailable right now.");
      } else {
        setStatusMessage("Saved to Supabase and synced to your local library.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to parse this TXT file.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <Card className={cn("rounded-[1.75rem] bg-panel-strong/75 p-4 sm:p-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.32em] text-accent">Upload TXT Novel</p>
          <div className="space-y-1">
            <h2 className="font-heading text-xl text-foreground sm:text-2xl">
              Add a plain text story to your shelf.
            </h2>
            <p className="text-sm leading-7 text-muted">
              KRVT Library will detect chapter headings like Chapter 1 and open the
              upload in the same reading experience.
            </p>
          </div>
          <p className="text-sm text-muted-strong">
            {fileName ? `Selected file: ${fileName}` : "Accepts .txt files only."}
          </p>
          {errorMessage ? (
            <p
              className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          {statusMessage ? (
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
              {statusMessage}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className="w-full lg:w-auto"
            aria-busy={isUploading}
          >
            {isUploading ? "Parsing TXT..." : "Upload TXT Novel"}
          </Button>
          <label htmlFor={inputId} className="text-xs text-muted lg:text-right">
            Mobile friendly upload, desktop compact control.
          </label>
        </div>
      </div>
    </Card>
  );
}
