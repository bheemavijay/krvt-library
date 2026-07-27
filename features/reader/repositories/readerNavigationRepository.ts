const TOP_NAVIGATION_KEY = "krvt-reader-open-chapter-at-top";

export function markTopNavigation(novelId: string, chapterIndex: number) {
  try {
    window.sessionStorage.setItem(TOP_NAVIGATION_KEY, JSON.stringify({ novelId, chapterIndex }));
  } catch {}
}

export function readTopNavigationRequest() {
  try {
    const storedValue = window.sessionStorage.getItem(TOP_NAVIGATION_KEY);
    if (!storedValue) return null;
    const parsed = JSON.parse(storedValue) as { novelId?: unknown; chapterIndex?: unknown };
    if (typeof parsed.novelId !== "string" || typeof parsed.chapterIndex !== "number") return null;
    return { novelId: parsed.novelId, chapterIndex: parsed.chapterIndex };
  } catch {
    return null;
  }
}

export function clearTopNavigationRequest() {
  try {
    window.sessionStorage.removeItem(TOP_NAVIGATION_KEY);
  } catch {}
}
