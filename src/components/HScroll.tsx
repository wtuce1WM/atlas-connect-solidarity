import { forwardRef, type HTMLAttributes } from "react";
import { useDragScroll } from "@/hooks/useDragScroll";

/**
 * Horizontal scroll container with click-drag and mouse-wheel support.
 * Drop-in replacement for `<div className="flex overflow-x-auto ...">`.
 */
const HScroll = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, _ref) => {
    const ref = useDragScroll<HTMLDivElement>();
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  },
);
HScroll.displayName = "HScroll";

export default HScroll;
