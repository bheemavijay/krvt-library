import { readTopNavigationRequest as readTopNavigationRequestFromRepository } from "@/features/reader/repositories/readerNavigationRepository";

export function readTopNavigationRequest() {
  return readTopNavigationRequestFromRepository();
}
