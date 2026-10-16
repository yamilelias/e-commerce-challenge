"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { observeReveal } from "@/lib/motion/observeReveal";
import styles from "./Reveal.module.css";

type RevealProps = {
  children: ReactNode;
  index?: number;
  className?: string;
};

/** A decorative entrance; server HTML and no-JS content are visible by default. */
export function Reveal({ children, index = 0, className }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const step = Number.isFinite(index) ? Math.min(5, Math.max(0, Math.floor(index))) : 0;
  const style = { "--reveal-delay": `calc(var(--home-motion-stagger, 80ms) * ${step})` } as CSSProperties;

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    // Visible in the initial viewport, after back/forward scroll restoration,
    // and without JavaScript. Only later content waits for its first entrance.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset.revealState = "waiting";
    const stopObserving = observeReveal(element, () => {
      element.dataset.revealState = "visible";
    });

    const showWhenReduced = () => {
      if (!reducedMotion.matches) return;
      element.dataset.revealState = "visible";
      stopObserving();
    };
    reducedMotion.addEventListener("change", showWhenReduced);

    return () => {
      reducedMotion.removeEventListener("change", showWhenReduced);
      stopObserving();
      delete element.dataset.revealState;
    };
  }, []);

  return (
    <div ref={elementRef} className={[styles.reveal, className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}
