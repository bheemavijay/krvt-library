const activeNovelJobs = new Set<string>();

function normalizeJobKey(key: string | undefined | null) {
  return String(key ?? "").trim();
}

export function acquireNovelJobLock(keyInput: string | undefined | null) {
  const key = normalizeJobKey(keyInput);
  if (!key) {
    return false;
  }

  if (activeNovelJobs.has(key)) {
    console.info("krvt.debug.lock.skip", { key });
    return false;
  }

  activeNovelJobs.add(key);
  console.info("krvt.debug.lock.acquire", { key });
  return true;
}

export function releaseNovelJobLock(keyInput: string | undefined | null) {
  const key = normalizeJobKey(keyInput);
  if (!key) {
    return;
  }

  activeNovelJobs.delete(key);
  console.info("krvt.debug.lock.release", { key });
}
