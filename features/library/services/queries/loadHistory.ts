// This service is responsible for loading the user's reading history.
// TODO: [KRVT-A6] This is a temporary implementation. The reading state logic
// should be fully migrated to the Reader feature's services.

import { getReadingState } from "@/features/reader";

export function loadHistory() {
  return getReadingState();
}
