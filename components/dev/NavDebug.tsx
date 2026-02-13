"use client";

import { useEffect } from "react";

export default function NavDebug() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const origPush = history.pushState;
    const origReplace = history.replaceState;

    history.pushState = function (...args: any[]) {
      // @ts-ignore
      console.log("%c[nav] pushState", "color:#7dd3fc", ...args);
      // @ts-ignore
      return origPush.apply(this, args);
    };

    history.replaceState = function (...args: any[]) {
      // @ts-ignore
      console.log("%c[nav] replaceState", "color:#fca5a5", ...args);
      // @ts-ignore
      return origReplace.apply(this, args);
    };

    const onPop = () => console.log("%c[nav] popstate", "color:#a7f3d0", location.href);
    window.addEventListener("popstate", onPop);

    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  return null;
}
