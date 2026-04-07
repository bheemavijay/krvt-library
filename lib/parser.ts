import type { ParsedNovel } from "@/types";

export function parseTxtNovel(rawText: string): ParsedNovel {
  const normalizedText = normalizeText(rawText);

  if (!normalizedText) {
    throw new Error("The uploaded TXT file is empty.");
  }

  return {
    title: extractTitle(normalizedText),
    chapters: [
      {
        title: "Chapter 1",
        content: normalizedText,
      },
    ],
  };
}

function extractTitle(text: string) {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || "Untitled Novel";
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}
