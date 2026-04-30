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
      el.scrollLeft += velocity * 16; // ~per frame
      velocity *= 0.92; // friction
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
      el.style.cursor = "grabbing";
      el.style.scrollBehavior = "auto";
      try { el.setPointerCapture(e.pointerId); } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;

      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) {
        // pixels per ms — used as velocity for momentum
        velocity = (lastX - e.clientX) / dt;
      }
      lastX = e.clientX;
      lastT = now;
    };

    const endDrag = (e?: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "";
      if (e) { try { el.releasePointerCapture(e.pointerId); } catch {} }
      // Kick off momentum if velocity is meaningful
      if (Math.abs(velocity) > 0.1) {
        runMomentum();
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      stopMomentum();
      el.style.scrollBehavior = "smooth";
      el.scrollLeft += e.deltaY;
      e.preventDefault();
      // Reset behavior shortly after so drag stays snappy
      window.setTimeout(() => { el.style.scrollBehavior = "auto"; }, 200);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerleave", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("pointerleave", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  return ref;
}
