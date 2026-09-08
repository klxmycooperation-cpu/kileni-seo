"use client";

import { useEffect, useRef, type ReactNode } from "react";

const DESKTOP_DISCLOSURE_QUERY = "(min-width: 761px)";

/**
 * Native closed details hide their descendants from the accessibility tree,
 * even when desktop CSS makes those descendants visually present. Keep the
 * native disclosure closed on mobile, but make its semantic state match the
 * always-visible desktop presentation.
 */
export function AboutDisclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_DISCLOSURE_QUERY);
    const syncWithViewport = () => {
      if (detailsRef.current) detailsRef.current.open = media.matches;
    };

    syncWithViewport();
    media.addEventListener("change", syncWithViewport);
    return () => media.removeEventListener("change", syncWithViewport);
  }, []);

  return <details ref={detailsRef} className="about-mobile-disclosure">
    <summary>{summary}</summary>
    {children}
  </details>;
}
