import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

// Scrolls the page area back to the top on every navigation. Ported from
// upstream so the editor does not keep the previous scroll position.
const PageScrollContainer = ({ children }) => {
  const { pathname } = useLocation();
  const scrollRef = useRef(null);

  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
    scrollRef.current.scrollLeft = 0;
  }, [pathname]);

  return (
    <main
      id="renderList"
      ref={scrollRef}
      className="os-page-scroll flex-1 min-w-0 min-h-0 overflow-auto"
    >
      {children}
    </main>
  );
};

export default PageScrollContainer;
