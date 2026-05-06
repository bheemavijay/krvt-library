export function getImportApiUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_IMPORT_API_URL;

  if (configuredUrl?.trim()) {
    const url = configuredUrl.trim().replace(/\/+$/, "");
    return url.includes("/api/import") ? url : `${url}/api/import`;
  }

  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return "";
  }

  return "/api/import";
}
