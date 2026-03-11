"use client";

import { useState, useEffect } from "react";
import { getMockMode } from "@/lib/store";

export function MockModeBorder() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getMockMode());

    const handler = (e: Event) => {
      setEnabled((e as CustomEvent).detail);
    };
    window.addEventListener("mockmode-changed", handler);
    return () => window.removeEventListener("mockmode-changed", handler);
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] pointer-events-none border-[4px] border-red-500"
      aria-hidden="true"
    />
  );
}
