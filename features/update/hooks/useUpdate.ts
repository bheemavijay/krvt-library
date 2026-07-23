import { useCallback, useState } from "react";

import { updateNovel as updateNovelService } from "@/features/update/services/updateNovel";
import type { NovelSummary } from "@/shared/types";

type UseUpdateOptions = {
  onMessage?: (message: string) => void;
  onUpdated?: () => void;
};

function getNetworkInformation() {
  if (typeof navigator === "undefined") return null;
  return (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection ?? null;
}

function shouldWarnForMeteredConnection(network: any) {
  const type = network.type?.toLowerCase() ?? "";
  const effectiveType = network.effectiveType?.toLowerCase() ?? "";
  return network.saveData === true || type === "cellular" || effectiveType === "2g" || effectiveType === "3g";
}

export function useUpdate() {
  const [busyNovelId, setBusyNovelId] = useState<string | null>(null);

  const updateNovel = useCallback(
    async (summary: NovelSummary, options: UseUpdateOptions = {}) => {
      const network = getNetworkInformation();
      if (
        network &&
        shouldWarnForMeteredConnection(network) &&
        !window.confirm("This update may use mobile data. Connect to Wi-Fi for large downloads, or continue anyway.")
      ) {
        options.onMessage?.("Update cancelled. Connect to Wi-Fi and try again.");
        return;
      }

      try {
        setBusyNovelId(summary.id);
        const result = await updateNovelService(summary);
        if (!result) return;
        options.onUpdated?.();
        options.onMessage?.(result.message);
      } catch (error: any) {
        options.onMessage?.(error?.message || `Update failed for "${summary.title}"`);
      } finally {
        setBusyNovelId(null);
      }
    },
    [],
  );

  return {
    busyNovelId,
    updateNovel,
  };
}
