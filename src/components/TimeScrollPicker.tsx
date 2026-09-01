"use client";

import { useEffect, useMemo, useRef } from "react";
import { DEFAULT_DURATION_MINUTES, listStartMinutes, minutesToHmm } from "@/lib/timeWindow";

const ITEM = 44;
const VISIBLE = 5;

export function TimeScrollPicker({
  startMin,
  durationMinutes,
  onChange,
}: {
  startMin: number;
  durationMinutes?: number;
  onChange: (startMin: number) => void;
}) {
  const duration = durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const options = useMemo(() => listStartMinutes(duration), [duration]);
  const scroller = useRef<HTMLDivElement>(null);
  const skip = useRef(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.max(0, options.indexOf(startMin));
    skip.current = true;
    el.scrollTop = i * ITEM;
    const id = requestAnimationFrame(() => {
      skip.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [startMin, options]);

  function emitFromScroll() {
    const el = scroller.current;
    if (!el || skip.current) return;
    const i = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
    const next = options[i];
    if (next != null && next !== startMin) onChange(next);
  }

  return (
    <div className="relative mx-auto mt-3 w-full max-w-[14rem]" style={{ height: ITEM * VISIBLE }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-14 bg-gradient-to-b from-[var(--card)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-14 bg-gradient-to-t from-[var(--card)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-2 top-1/2 z-[1] h-11 -translate-y-1/2 rounded-2xl bg-[color-mix(in_srgb,var(--teal)_12%,transparent)] ring-1 ring-[var(--teal)]" />
      <div
        ref={scroller}
        role="listbox"
        aria-label="Saat"
        className="h-full overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        onScroll={emitFromScroll}
      >
        <div aria-hidden style={{ height: ITEM * 2 }} />
        {options.map((m) => (
          <button
            key={m}
            type="button"
            role="option"
            aria-selected={m === startMin}
            onClick={() => onChange(m)}
            className={`flex w-full shrink-0 items-center justify-center text-lg tabular-nums ${
              m === startMin ? "font-medium text-[var(--ink)]" : "text-[var(--muted)]"
            }`}
            style={{ height: ITEM, scrollSnapAlign: "center" }}
          >
            {minutesToHmm(m)}
          </button>
        ))}
        <div aria-hidden style={{ height: ITEM * 2 }} />
      </div>
    </div>
  );
}
