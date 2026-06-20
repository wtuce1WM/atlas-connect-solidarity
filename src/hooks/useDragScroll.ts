import { useEffect, useRef } from "react";

/**
 * Enables smooth click-and-drag horizontal scrolling on a container with overflow-x-auto.
 * Touch scrolling continues to work natively. Useful for previewing horizontal
 * scroll lists with a mouse (desktop emulation of mobile).
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;
    let momentumRAF = 0;
    let moved = false;

    const stopMomentum = () => {
      if (momentumRAF) {
        cancelAnimationFrame(momentumRAF);
        momentumRAF = 0;
      }
    };

    const runMomentum = () => {
      if (Math.abs(velocity) < 0.05) {
        velocity = 0;
        return;
      }
      el.scrollLeft += velocity * 16;
      velocity *= 0.92;
      momentumRAF = requestAnimationFrame(runMomentum);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      stopMomentum();
      isDown = true;
      moved = false;
      startX = e.clientX;
      lastX = e.clientX;
      lastT = performance.now();
      startScroll = el.scrollLeft;
      velocity = 0;
      el.style.scrollBehavior = "auto";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        if (!moved) {
          // First time we cross the threshold: now we're really dragging
          el.style.cursor = "grabbing";
        }
        moved = true;
      }
      if (moved) {
        el.scrollLeft = startScroll - dx;
        const now = performance.now();
        const dt = now - lastT;
        if (dt > 0) {
          velocity = (lastX - e.clientX) / dt;
        }
        lastX = e.clientX;
        lastT = now;
      }
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "";
      if (moved && Math.abs(velocity) > 0.1) {
        runMomentum();
      }
    };

    // Only suppress click if a real drag happened
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
      }
      moved = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      // Use the dominant axis: trackpads send deltaX for horizontal swipes,
      // mouse wheels send deltaY. Both scroll this container horizontally.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;
      stopMomentum();
      el.style.scrollBehavior = "auto";
      el.scrollLeft += delta;
      e.preventDefault();
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return ref;
}
