// This service is responsible for loading the user's reading history.

import { getReadingState } from "@/features/reader";

export function loadHistory() {
  return getReadingState();
}
