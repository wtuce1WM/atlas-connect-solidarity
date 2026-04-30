import { useEffect, useRef } from "react";

/**
 * Enables click-and-drag horizontal scrolling on a container with overflow-x-auto.
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
    let moved = false;

    const onPointerDown = (e: PointerEvent) => {
      // Only react to mouse / pen — let touch use native scroll
      if (e.pointerType === "touch") return;
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
      el.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      el.scrollLeft = startScroll - dx;
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "";
    };

    // Suppress click after a real drag, so buttons inside don't fire
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };

    // Convert vertical wheel scrolling to horizontal when over the strip
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      // Only hijack if the container actually overflows horizontally
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
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
