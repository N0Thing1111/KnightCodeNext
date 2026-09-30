(() => {
  "use strict";
  const root = document.querySelector(".quest-dashboard");
  if (!root) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  let observer;
  if ("IntersectionObserver" in window && !motion.matches) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(
            entry.target.classList.contains("learning-path")
              ? "route-traced"
              : "quest-fill",
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );
    root
      .querySelectorAll(
        ".progress-track > span, .inline-progress > span, .goal-progress > span, .learning-path",
      )
      .forEach((el) => observer.observe(el));
  }
  const crest = root.querySelector(".hero-character");
  let frame = 0;
  let px = 0,
    py = 0;
  function resetCrest() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!crest) return;
    ["--crest-x", "--crest-y", "--crest-angle"].forEach((name) =>
      crest.style.removeProperty(name),
    );
  }
  if (crest) {
    crest.addEventListener(
      "pointermove",
      (event) => {
        if (
          motion.matches ||
          !finePointer.matches ||
          event.pointerType === "touch"
        )
          return;
        const box = crest.getBoundingClientRect();
        px = Math.max(
          -1,
          Math.min(
            1,
            ((event.clientX - box.left) / Math.max(1, box.width)) * 2 - 1,
          ),
        );
        py = Math.max(
          -1,
          Math.min(
            1,
            ((event.clientY - box.top) / Math.max(1, box.height)) * 2 - 1,
          ),
        );
        if (!frame)
          frame = requestAnimationFrame(() => {
            crest.style.setProperty("--crest-x", (px * 5).toFixed(2) + "px");
            crest.style.setProperty("--crest-y", (py * 3).toFixed(2) + "px");
            crest.style.setProperty(
              "--crest-angle",
              (px * 7).toFixed(2) + "deg",
            );
            frame = 0;
          });
      },
      { passive: true },
    );
    crest.addEventListener("pointerleave", resetCrest);
    crest.addEventListener("pointercancel", resetCrest);
  }
  motion.addEventListener("change", () => {
    resetCrest();
    if (motion.matches && observer) observer.disconnect();
  });
  finePointer.addEventListener("change", resetCrest);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetCrest();
  });
})();
