"use client";

import { useEffect, useState } from "react";

export function AlertBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const res = await fetch("/api/low-stock-alerts?status=OPEN");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setCount(data.length);
        }
      } catch {
        // silently fail
      }
    }

    void fetchCount();
    const interval = setInterval(() => void fetchCount(), 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}
