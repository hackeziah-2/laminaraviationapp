import { useEffect, useState } from "react";
import { SIDEBAR_LAYOUT_BREAKPOINT_PX } from "../constants/sidebarLayout";

export function useIsLgUp() {
  const [isLgUp, setIsLgUp] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(min-width: ${SIDEBAR_LAYOUT_BREAKPOINT_PX}px)`).matches
      : false
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${SIDEBAR_LAYOUT_BREAKPOINT_PX}px)`);
    const onChange = () => setIsLgUp(mql.matches);
    mql.addEventListener("change", onChange);
    setIsLgUp(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLgUp;
}
