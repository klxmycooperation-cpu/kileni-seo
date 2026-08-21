"use client";

import { useEffect, useRef, useState } from "react";

type ProcessStep = { title: string; text: string; result: string };

export function HomeProcessSteps({ steps }: { steps: ProcessStep[] }) {
  const storyRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const story = storyRef.current;
    const chapters = story?.querySelectorAll<HTMLElement>("[data-process-chapter]");
    if (!story || !chapters?.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveStep(Number((visible.target as HTMLElement).dataset.processChapter));
      },
      { rootMargin: "-32% 0px -38% 0px", threshold: [0.2, 0.48, 0.8] },
    );
    chapters.forEach((chapter) => observer.observe(chapter));
    return () => observer.disconnect();
  }, []);

  const active = steps[activeStep] ?? steps[0];

  return (
    <div className="home-process-story" ref={storyRef} data-active-step={activeStep}>
      <div className="home-process-story__sticky" aria-label={active?.title}>
        <div className="home-process-board" data-stage={activeStep} aria-hidden="true">
          <div className="home-process-board__header"><span>KILENI / workflow</span><i /></div>
          <div className="home-process-board__screen">
            <div className="home-process-board__scanline" />
            <div className="home-process-board__noise"><i/><i/><i/><i/><i/><i/></div>
            <div className="home-process-board__priorities"><i/><i/><i/></div>
            <div className="home-process-board__fixes"><i/><i/><i/><i/></div>
            <div className="home-process-board__clear"><i>✓</i><span>verified</span></div>
          </div>
          <div className="home-process-board__rail">
            {steps.map((step, index) => <span key={step.title} data-current={index === activeStep || undefined}>{String(index + 1).padStart(2, "0")}</span>)}
          </div>
        </div>
        <div className="home-process-story__result" aria-live="polite">
          <span>{String(activeStep + 1).padStart(2, "0")} / 04</span>
          <strong>{active?.result}</strong>
        </div>
      </div>
      <ol className="home-process-chapters">
        {steps.map((step, index) => (
          <li key={step.title} data-process-chapter={index} data-active={index === activeStep || undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{step.title}</h3><p>{step.text}</p></div>
            <strong><i aria-hidden="true">✓</i>{step.result}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}
