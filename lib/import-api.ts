const FALLBACK_IMPORT_API_URL = "https://YOUR_BACKEND_URL/api/import";

function normalizeConfiguredApiUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/import") ? trimmed : `${trimmed}/api/import`;
}

export function getImportApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_IMPORT_API_URL;

  if (!configuredUrl?.trim()) {
    return FALLBACK_IMPORT_API_URL;
  }

  const url = configuredUrl.trim().replace(/\/+$/, "");

  return url.includes("/api/import") ? url : `${url}/api/import`;
}
