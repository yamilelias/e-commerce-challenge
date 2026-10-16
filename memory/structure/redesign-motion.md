# Homepage reveal motion (RD-04)

- `apps/web/src/components/home/motion/Reveal.tsx` exports `Reveal({ children, index?, className? })`. It wraps children in visible server-rendered markup and applies a stagger step capped at five (six steps total). After hydration, only elements below the viewport enter a waiting state; they transition once when visible. Reduced-motion preference leaves content visible and reveals any waiting content if the preference changes.
- `apps/web/src/components/home/motion/Reveal.module.css` animates only opacity and transform and disables the entrance under `prefers-reduced-motion: reduce`. It consumes the `--home-motion-reveal`, `--home-motion-ease`, and `--home-motion-stagger` variables defined in `apps/web/src/app/globals.css`.
- `apps/web/src/lib/motion/observeReveal.ts` owns one lazily created `IntersectionObserver` at threshold 0.12 for all mounted Reveal instances and disconnects it when none remain.
- `docs/qa/home-redesign.md` records observed redesign and motion verification, including the runtime checks that could not be completed.
