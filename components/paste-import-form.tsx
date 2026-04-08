"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { previewParsedNovelText, saveUploadedNovelFromText } from "@/lib/library-storage";
import { cn } from "@/lib/utils";

type PasteImportFormProps = {
  className?: string;
};

type PreviewState = {
  title: string;
  paragraphs: string[];
};

export function PasteImportForm({ className }: PasteImportFormProps) {
  const textareaId = useId();
  const [rawText, setRawText] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePreview = () => {
    setIsParsing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = previewParsedNovelText(rawText);

      setPreview({
        title: result.novel.title,
        paragraphs: result.previewParagraphs,
      });
    } catch (error) {
      setPreview(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to parse this novel content.",
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await saveUploadedNovelFromText(rawText);

      setPreview({
        title: result.record.novel.title,
        paragraphs: result.record.novel.chapters[0]?.content.slice(0, 3) ?? [],
      });
      setStatusMessage(
        result.persistence === "local"
          ? "Saved locally. Supabase is unavailable right now."
          : "Saved to Supabase and synced to your local library.",
      );
      setRawText("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save this novel.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn("rounded-[1.75rem] bg-panel-strong/75 p-4 sm:p-5", className)}>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.32em] text-accent">Paste Import</p>
          <div className="space-y-1">
            <h2 className="font-heading text-xl text-foreground sm:text-2xl">
              Paste raw novel text and turn it into a readable draft.
            </h2>
            <p className="text-sm leading-7 text-muted">
              Preview the detected title and opening paragraphs before adding it to your
              library.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor={textareaId} className="text-sm text-muted-strong">
            Novel content
          </label>
          <textarea
            id={textareaId}
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Paste your novel text here..."
            className="min-h-64 w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-foreground outline-none transition placeholder:text-muted focus:border-accent/50 sm:min-h-80"
          />
          <p className="text-xs text-muted">
            Minimum 200 characters. Best results come from full paragraphs with line breaks.
          </p>
        </div>

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

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={handlePreview}
            disabled={isParsing || isSaving}
            aria-busy={isParsing}
            className="w-full sm:w-auto"
          >
            {isParsing ? "Parsing..." : "Parse & Preview"}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isParsing}
            aria-busy={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? "Saving..." : "Save to Library"}
          </Button>
        </div>

        {preview ? (
          <div className="space-y-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-accent">Preview</p>
              <h3 className="font-heading text-lg text-foreground sm:text-xl">{preview.title}</h3>
            </div>
            <div className="space-y-3 text-sm leading-7 text-muted-strong">
              {preview.paragraphs.length > 0 ? (
                preview.paragraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))
              ) : (
                <p>No preview paragraphs were detected.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
