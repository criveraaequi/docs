import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const hero = containerRef.current?.querySelector<HTMLElement>(
      ".payout-hero, .page-intro, .back-link"
    );
    if (hero) {
      hero.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div key={location.pathname} ref={containerRef} className="page-transition">
      {children}
    </div>
  );
}
