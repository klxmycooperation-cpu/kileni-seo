"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";

type TextHoverEffectProps = {
  text: string;
  duration?: number;
  automatic?: boolean;
};

/** The supplied SVG text effect, adapted only to KILENI's intro palette. */
export const TextHoverEffect = ({ text, duration = 0, automatic = true }: TextHoverEffectProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });
  const instanceId = useId().replace(/:/gu, "");
  const textGradientId = `textGradient-${instanceId}`;
  const revealMaskId = `revealMask-${instanceId}`;
  const textMaskId = `textMask-${instanceId}`;
  const glowId = `textGlow-${instanceId}`;

  useEffect(() => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    setMaskPosition({
      cx: `${((cursor.x - svgRect.left) / svgRect.width) * 100}%`,
      cy: `${((cursor.y - svgRect.top) / svgRect.height) * 100}%`,
    });
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(event) => setCursor({ x: event.clientX, y: event.clientY })}
      className="select-none"
    >
      <defs>
        <linearGradient id={textGradientId} gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
          <stop offset="0%" stopColor="#8ba9ff" />
          <stop offset="50%" stopColor="#d5e1ff" />
          <stop offset="100%" stopColor="#8ba9ff" />
        </linearGradient>
        <motion.radialGradient
          id={revealMaskId}
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id={textMaskId}>
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#${revealMaskId})`} />
        </mask>
        <filter id={glowId} x="-30%" y="-70%" width="160%" height="240%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feFlood floodColor="#91b0ff" floodOpacity="0.8" result="glowColor" />
          <feComposite in="glowColor" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {!automatic && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="transparent"
          stroke="#8ba9ff"
          strokeWidth="0.3"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="58"
          fontWeight="700"
          letterSpacing="-3"
          style={{ opacity: hovered ? 0.7 : 0 }}
        >
          {text}
        </text>
      )}
      <motion.text
        data-kileni-intro-trace="true"
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="none"
        stroke="#9bb8ff"
        strokeWidth="0.45"
        strokeLinecap="round"
        fontFamily="Helvetica, Arial, sans-serif"
        fontSize="58"
        fontWeight="700"
        letterSpacing="-3"
        filter={`url(#${glowId})`}
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={automatic
          ? { strokeDashoffset: 0, strokeDasharray: 1000, opacity: [0.84, 1, 0.88] }
          : { strokeDashoffset: 0, strokeDasharray: 1000 }}
        transition={automatic
          ? {
              strokeDashoffset: { duration: 3, ease: "easeInOut" },
              strokeDasharray: { duration: 3, ease: "easeInOut" },
              opacity: { duration: 1.35, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
            }
          : { duration: 4, ease: "easeInOut" }}
      >
        {text}
      </motion.text>
      {!automatic && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          stroke={`url(#${textGradientId})`}
          strokeWidth="0.3"
          mask={`url(#${textMaskId})`}
          fill="transparent"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="58"
          fontWeight="700"
          letterSpacing="-3"
        >
          {text}
        </text>
      )}
    </svg>
  );
};
