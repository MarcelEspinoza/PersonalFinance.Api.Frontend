import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const THRESHOLD_PX = 300;

const buttonClass =
  'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border bg-card/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Floating "back to top" / "go to bottom" buttons shown on every screen.
 * Each button only renders when it is useful, so hidden buttons are never clickable.
 */
export function ScrollButtons() {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const distanceToBottom = document.documentElement.scrollHeight - (scrollY + window.innerHeight);
      setShowUp(scrollY > THRESHOLD_PX);
      setShowDown(distanceToBottom > THRESHOLD_PX);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Content height changes (lazy data, collapsed groups...) don't fire scroll/resize events.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (observer) observer.observe(document.body);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (observer) observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!showUp && !showDown) return null;

  // z-30: above page content and sticky headers, but below page overlays such as z-40 action
  // sheets, dialogs and the chat bubble (z-50), so the buttons never cover their content.
  return (
    <div
      className="pointer-events-none fixed bottom-20 z-30 flex flex-col gap-2 transition-[right] duration-300 ease-out print:hidden"
      style={{ right: 'calc(1.5rem + var(--right-panel-offset))' }}
    >
      {showUp && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={buttonClass}
          aria-label="Ir arriba"
          title="Ir arriba"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
      {showDown && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
          className={buttonClass}
          aria-label="Ir abajo"
          title="Ir abajo"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
