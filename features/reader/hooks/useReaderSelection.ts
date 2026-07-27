import { useCallback, useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export function useReaderSelection({
  normalizedContentLength,
  startLongPressTts,
}: {
  normalizedContentLength: number;
  startLongPressTts: (index: number) => void;
}) {
  const activeChapterRef = useRef<HTMLAnchorElement | null>(null);
  const paragraphRefs = useRef<Array<HTMLParagraphElement | null>>([]);

  useEffect(() => {
    paragraphRefs.current = paragraphRefs.current.slice(0, normalizedContentLength);
  }, [normalizedContentLength]);

  const handleParagraphPointerDown = useCallback(
    (index: number) => (_event: ReactPointerEvent<HTMLParagraphElement>) => {
      startLongPressTts(index);
    },
    [startLongPressTts],
  );

  return {
    activeChapterRef,
    paragraphRefs,
    handleParagraphPointerDown,
  };
}
