import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

type ViewportShellProps = {
  children: ReactNode;
};

export function ViewportShell({ children }: ViewportShellProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentHeightRef = useRef(DESIGN_HEIGHT);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let frame = 0;

    const applyScale = () => {
      // Do not use innerWidth here: browser zoom changes innerWidth and would
      // cancel the browser's own zoom. outerWidth follows the actual window
      // size, so Ctrl +/- can scale text, icons, cards and buttons together.
      const scale = window.outerWidth / DESIGN_WIDTH;

      canvas.style.transform = `scale(${scale})`;
      stage.style.width = `${DESIGN_WIDTH * scale}px`;
      stage.style.height = `${contentHeightRef.current * scale}px`;
    };

    const scheduleScale = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(applyScale);
    };

    applyScale();
    window.addEventListener("resize", scheduleScale, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleScale);
    };
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const updateHeight = () => {
      const nextHeight = Math.max(DESIGN_HEIGHT, canvas.scrollHeight);
      contentHeightRef.current = nextHeight;

      const transform = canvas.style.transform;
      const match = transform.match(/scale\(([^)]+)\)/);
      const scale = match ? Number(match[1]) : 1;
      stage.style.height = `${nextHeight * scale}px`;
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="viewport-shell">
      <div ref={stageRef} className="viewport-stage">
        <div ref={canvasRef} className="design-canvas">
          {children}
        </div>
      </div>
    </div>
  );
}

