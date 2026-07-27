import { clearTopNavigationRequest as clearTopNavigationRequestInRepository } from "@/features/reader/repositories/readerNavigationRepository";

export function clearTopNavigationRequest() {
  clearTopNavigationRequestInRepository();
}
