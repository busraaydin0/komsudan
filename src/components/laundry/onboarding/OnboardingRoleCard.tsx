"use client";


export function OnboardingRoleCard({
  on,
  title,
  hint,
  onClick,
}: {
  on: boolean;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-left ring-1 ${
        on ? "bg-[var(--sand)] ring-[var(--clay)]" : "bg-[var(--paper)] ring-[var(--line)]"
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p>
    </button>
  );
}
