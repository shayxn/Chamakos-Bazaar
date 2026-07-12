import { useState, useEffect } from "react";

function isMobileUA(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function useMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isMobileUA() || window.innerWidth < 768;
  });

  useEffect(() => {
    const update = () => setMobile(isMobileUA() || window.innerWidth < 768);
    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", update);
    update();
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}
