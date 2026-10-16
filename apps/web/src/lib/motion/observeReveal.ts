type RevealCallback = () => void;

const callbacks = new Map<Element, RevealCallback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          callbacks.get(entry.target)?.();
          callbacks.delete(entry.target);
          observer?.unobserve(entry.target);
        }

        if (callbacks.size === 0) {
          observer?.disconnect();
          observer = null;
        }
      },
      { threshold: 0.12 },
    );
  }

  return observer;
}

/** All Reveal instances share one observer, which is released after the last reveal. */
export function observeReveal(element: Element, reveal: RevealCallback): () => void {
  callbacks.set(element, reveal);
  getObserver().observe(element);

  return () => {
    callbacks.delete(element);
    observer?.unobserve(element);
    if (callbacks.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}
