"use client";

import { type ReactNode, useEffect, useRef } from "react";

type CanvasTextProps = {
  text: string;
  children?: ReactNode;
  className?: string;
  backgroundClassName?: string;
  colors?: string[];
  lineGap?: number;
  animationDuration?: number;
};

const defaultColors = ["#e5edff", "#9bb8ff", "#5d8cf2", "#7ea3ff"];

/** A high-density canvas texture clipped by CSS to the supplied text. */
export function CanvasText({
  text,
  children,
  className = "",
  backgroundClassName = "",
  colors = defaultColors,
  lineGap = 8,
  animationDuration = 10,
}: CanvasTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    let disposed = false;
    let visible = true;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      width = Math.max(1, Math.ceil(element.clientWidth));
      height = Math.max(1, Math.ceil(element.clientHeight));
      pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.ceil(width * pixelRatio);
      canvas.height = Math.ceil(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const draw = () => {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      const baseGradient = context.createLinearGradient(0, 0, width, height);
      baseGradient.addColorStop(0, "#b6cbff");
      baseGradient.addColorStop(0.48, "#7198ff");
      baseGradient.addColorStop(1, "#a7c0ff");
      context.fillStyle = baseGradient;
      context.fillRect(0, 0, width, height);
      context.lineWidth = 0.8;
      context.lineCap = "round";

      const textureGap = Math.max(11, lineGap * 1.55);
      for (let y = -textureGap; y < height + textureGap * 2; y += textureGap) {
        const index = Math.floor((y + textureGap) / textureGap);
        const amplitude = Math.min(8, Math.max(3, height * 0.025));
        const phase = Math.PI * 1.44 + index * 0.68;
        context.beginPath();
        context.moveTo(-24, y);
        context.bezierCurveTo(
          width * 0.25,
          y + Math.sin(phase) * amplitude,
          width * 0.72,
          y + Math.cos(phase + 0.8) * amplitude,
          width + 24,
          y + Math.sin(phase + 1.6) * amplitude,
        );
        context.strokeStyle = colors[index % colors.length] ?? defaultColors[0];
        context.globalAlpha = 0.42;
        context.stroke();
      }
      context.globalAlpha = 1;
      element.style.setProperty("--canvas-text-pattern", `url("${canvas.toDataURL("image/png")}")`);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      element.dataset.canvasActive = visible ? "true" : "false";
      if (visible) draw();
    }, { threshold: 0 });
    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    const handleWindowResize = () => {
      resize();
      draw();
    };

    const start = async () => {
      await document.fonts.ready;
      if (disposed) return;
      resize();
      draw();
      observer.observe(element);
      resizeObserver.observe(element);
      window.addEventListener("resize", handleWindowResize);
    };
    void start();

    return () => {
      disposed = true;
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      delete element.dataset.canvasActive;
    };
  }, [animationDuration, colors, lineGap]);

  return (
    <span
      ref={textRef}
      data-canvas-text="true"
      className={`canvas-text ${backgroundClassName} ${className}`.trim()}
      aria-label={text}
    >
      {children ?? text}
    </span>
  );
}
