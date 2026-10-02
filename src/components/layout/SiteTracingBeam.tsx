"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * A shared, passive scroll route for public pages. It deliberately owns no
 * navigation or content state: it only observes the height of the page shell.
 */
export function SiteTracingBeam({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [fade, setFade] = useState({ start: 0, end: 0 });
  const gradientId = `site-tracing-beam-${useId().replace(/:/gu, "")}`;
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end end"],
  });

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const updateGeometry = () => {
      const contentBox = content.getBoundingClientRect();
      const nextHeight = Math.ceil(contentBox.height);
      const brandCopy = content.querySelector<HTMLElement>(".site-footer .footer-brand p");
      const legal = content.querySelector<HTMLElement>(".site-footer .footer-legal-identity");
      const start = brandCopy
        ? Math.round(brandCopy.getBoundingClientRect().bottom - contentBox.top)
        : Math.max(0, nextHeight - 420);
      const legalTop = legal
        ? Math.round(legal.getBoundingClientRect().top - contentBox.top)
        : nextHeight;
      const end = Math.max(start + 120, Math.min(nextHeight, legalTop - 12));

      setHeight(nextHeight);
      setFade({ start, end });
    };
    updateGeometry();
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const beamHeight = fade.end || height;
  const y1 = useSpring(useTransform(scrollYProgress, [0, 0.82], [48, beamHeight]), { stiffness: 420, damping: 82 });
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [0, Math.max(0, beamHeight - 128)]), { stiffness: 420, damping: 82 });
  const route = `M 11 0 V ${beamHeight}`;
  const trackStyle = fade.end > 0 ? {
    "--site-beam-fade-start": `${fade.start}px`,
    "--site-beam-fade-end": `${beamHeight}px`,
  } as CSSProperties : undefined;

  return (
    <div ref={rootRef} className="site-tracing-beam">
      <div className="site-tracing-beam__track" style={trackStyle} aria-hidden="true">
        <svg viewBox={`0 0 22 ${Math.max(1, beamHeight)}`} width="22" height={beamHeight} focusable="false">
          <path className="site-tracing-beam__path--base" d={route} fill="none" />
          <motion.path className="site-tracing-beam__path--active" d={route} fill="none" stroke={`url(#${gradientId})`} />
          <defs>
            <motion.linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y1} y2={y2}>
              <stop stopColor="#9bb8ff" stopOpacity="0" />
              <stop offset="0.22" stopColor="#9bb8ff" />
              <stop offset="0.52" stopColor="#4164ff" />
              <stop offset="0.78" stopColor="#75d5ff" />
              <stop offset="1" stopColor="#75d5ff" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>
      <div ref={contentRef} className="site-tracing-beam__content">{children}</div>
    </div>
  );
}
