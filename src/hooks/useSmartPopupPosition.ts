import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseSmartPopupPositionProps {
  triggerRef: RefObject<HTMLElement | null>;
  popupRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  align?: 'left' | 'center' | 'right';
  preferredDirection?: 'up' | 'down';
  margin?: number;
  viewportPadding?: number;
  dependencies?: any[];
}

export function useSmartPopupPosition({
  triggerRef,
  popupRef,
  isOpen,
  align = 'left',
  preferredDirection = 'up',
  margin = 12,
  viewportPadding = 12,
  dependencies = [],
}: UseSmartPopupPositionProps) {
  const [coords, setCoords] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden', // Hide momentarily while we measure on first mount/render
  });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popup = popupRef.current;

    if (!trigger || !popup || !isOpen) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get popup dimension
    const popupWidth = popup.offsetWidth || 256;
    // We measure scrollHeight to get the full unconstrained height we want, 
    // or offsetHeight if it is already rendered correctly.
    const popupHeight = popup.scrollHeight || popup.offsetHeight || 380;

    // Calculate vertical space
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;

    let useUp = preferredDirection === 'up';

    if (useUp) {
      // If preferred up, check if there's enough space above.
      // If not, and there is more space below and spaceBelow can fit the popup, we switch.
      if (spaceAbove < popupHeight + margin) {
        if (spaceBelow > spaceAbove) {
          useUp = false;
        }
      }
    } else {
      // If preferred down, check if there's enough space below.
      if (spaceBelow < popupHeight + margin) {
        if (spaceAbove > spaceBelow) {
          useUp = true;
        }
      }
    }

    // Determine vertical styles
    let topVal: number | undefined;
    let bottomVal: number | undefined;
    let maxHeightVal: number | undefined;

    if (useUp) {
      bottomVal = viewportHeight - triggerRect.top + margin;
      // Clamp max height to some safety value so it does not overflow top of viewport
      maxHeightVal = spaceAbove - margin - viewportPadding;
    } else {
      topVal = triggerRect.bottom + margin;
      // Clamp max height to some safety value so it does not overflow bottom of viewport
      maxHeightVal = spaceBelow - margin - viewportPadding;
    }

    // Ensure maxHeight doesn't go below 120 pixels for usability
    maxHeightVal = Math.max(120, maxHeightVal);

    // Calculate horizontal positioning
    let targetLeft = triggerRect.left;
    if (align === 'center') {
      targetLeft = triggerRect.left + (triggerRect.width - popupWidth) / 2;
    } else if (align === 'right') {
      targetLeft = triggerRect.left + triggerRect.width - popupWidth;
    }

    const minLeft = viewportPadding;
    const maxLeft = viewportWidth - popupWidth - viewportPadding;
    const clampedLeft = Math.max(minLeft, Math.min(targetLeft, maxLeft));

    setCoords({
      position: 'fixed',
      left: `${clampedLeft}px`,
      top: topVal !== undefined ? `${topVal}px` : 'auto',
      bottom: bottomVal !== undefined ? `${bottomVal}px` : 'auto',
      maxHeight: `${maxHeightVal}px`,
      visibility: 'visible',
    });
  }, [triggerRef, popupRef, isOpen, align, preferredDirection, margin, viewportPadding]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Update position immediately
    updatePosition();

    // Use multiple triggers to guarantee measurement is correct after browser layout
    const timeoutId = setTimeout(updatePosition, 30);
    const animId = requestAnimationFrame(updatePosition);

    // Setup event listeners for resizing and scrolling in capture mode
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { capture: true });

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, { capture: true });
    };
  }, [isOpen, updatePosition, ...dependencies]);

  return {
    style: coords,
    reposition: updatePosition,
  };
}
