/**
 * Clean paragraph content
 * - Remove duplicate whitespace
 * - Filter out empty/too-short paragraphs
 * - Remove common junk patterns (ads, navigation, etc)
 */
export function cleanParagraphs(paragraphs: string[]): string[] {
  const blockedPatterns = [
    "advertisement",
    "report this ad",
    "continue reading",
    "bookmark",
    "like it",
    "thanks for reading",
    "support us",
    "buy coffee",
    "patreon",
    "sponsor",
  ];

  return paragraphs
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => {
      // Must be at least 2 characters
      if (!p || p.length < 2) {
        return false;
      }

      // Check against blocked patterns
      const lower = p.toLowerCase();
      return !blockedPatterns.some((pattern) =>
        lower.includes(pattern)
      );
    });
}
