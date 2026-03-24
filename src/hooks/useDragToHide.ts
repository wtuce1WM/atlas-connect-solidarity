import { useState, useRef, useCallback } from "react";

interface UseDragToHideReturn {
  cardsHidden: boolean;
  dragOffsetY: number;
  isDragging: boolean;
  showCards: () => void;
  hideCards: () => void;
  resetDrag: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDownDrag: (e: React.MouseEvent) => void;
}

const THRESHOLD = 60;

export function useDragToHide(): UseDragToHideReturn {
  const [cardsHidden, setCardsHidden] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const cardsHiddenRef = useRef(false);

  const showCards = useCallback(() => {
    cardsHiddenRef.current = false;
    setCardsHidden(false);
    setDragOffsetY(0);
  }, []);

  const hideCards = useCallback(() => {
    cardsHiddenRef.current = true;
    setCardsHidden(true);
    setDragOffsetY(0);
  }, []);

  const resetDrag = useCallback(() => {
    setCardsHidden(false);
    cardsHiddenRef.current = false;
    setDragOffsetY(0);
  }, []);

  const resolveDrag = useCallback(() => {
    setIsDragging(false);
    setDragOffsetY((prev) => {
      const hidden = cardsHiddenRef.current;
      if (hidden && prev < -THRESHOLD) {
        cardsHiddenRef.current = false;
        setCardsHidden(false);
      } else if (!hidden && prev > THRESHOLD) {
        cardsHiddenRef.current = true;
        setCardsHidden(true);
      }
      return 0;
    });
    touchStartRef.current = null;
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
    setIsDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    setDragOffsetY(cardsHiddenRef.current ? Math.min(0, dy) : Math.max(0, dy));
  }, []);

  const onTouchEnd = useCallback(() => {
    resolveDrag();
  }, [resolveDrag]);

  const onMouseDownDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchStartRef.current = { y: e.clientY, time: Date.now() };
    setIsDragging(true);
    let moved = false;

    const onMove = (ev: MouseEvent) => {
      if (!touchStartRef.current) return;
      moved = true;
      const dy = ev.clientY - touchStartRef.current.y;
      setDragOffsetY(cardsHiddenRef.current ? Math.min(0, dy) : Math.max(0, dy));
    };

    const onUp = () => {
      setIsDragging(false);
      if (!moved) {
        cardsHiddenRef.current = true;
        setCardsHidden(true);
        setDragOffsetY(0);
      } else {
        setDragOffsetY((prev) => {
          const hidden = cardsHiddenRef.current;
          if (hidden && prev < -THRESHOLD) {
            cardsHiddenRef.current = false;
            setCardsHidden(false);
          } else if (!hidden && prev > THRESHOLD) {
            cardsHiddenRef.current = true;
            setCardsHidden(true);
          }
          return 0;
        });
      }
      touchStartRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return {
    cardsHidden,
    dragOffsetY,
    isDragging,
    showCards,
    hideCards,
    resetDrag,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDownDrag,
  };
}
