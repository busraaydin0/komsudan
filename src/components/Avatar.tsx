"use client";

import { initials } from "@/lib/avatar";

const SIZE = {
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

export function Avatar({
  name,
  url,
  size = "md",
  className = "",
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const dim = SIZE[size];
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-[var(--line)] ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${dim} grid shrink-0 place-items-center rounded-full bg-[var(--teal)] font-medium text-[var(--paper)] ${className}`}
    >
      {initials(name)}
    </span>
  );
}
