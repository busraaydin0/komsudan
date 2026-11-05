"use client";

import { useInbox, useNotifications } from "@/lib/api";

export type AppTab = "harita" | "siparis" | "mesaj" | "hizmet" | "yonetim" | "hesap";

const BASE_ITEMS: { id: AppTab; label: string }[] = [
  { id: "harita", label: "Harita" },
  { id: "siparis", label: "Sipariş" },
  { id: "mesaj", label: "Mesaj" },
  { id: "hizmet", label: "Hizmet" },
  { id: "hesap", label: "Hesap" },
];

export function TabBar({
  tab,
  onTab,
  showAdmin = false,
}: {
  tab: AppTab;
  onTab: (t: AppTab) => void;
  showAdmin?: boolean;
}) {
  const { unread } = useNotifications();
  const { unreadTotal } = useInbox();
  const items = showAdmin
    ? [
        ...BASE_ITEMS.slice(0, 4),
        { id: "yonetim" as const, label: "Yönetim" },
        BASE_ITEMS[4]!,
      ]
    : BASE_ITEMS;

  return (
    <nav
      className="k-tabbar absolute inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] backdrop-blur-md"
      aria-label="Ana menü"
    >
      <ul className={showAdmin ? "grid grid-cols-6" : "grid grid-cols-5"}>
        {items.map((item) => {
          const on = tab === item.id;
          const badge =
            item.id === "mesaj" ? unreadTotal > 0 : item.id === "hesap" ? unread > 0 : false;
          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onTab(item.id)}
                aria-current={on ? "page" : undefined}
                className={`relative flex min-h-12 w-full min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pt-1 text-center font-medium leading-tight ${
                  showAdmin ? "text-[9px]" : "text-[10px]"
                } ${on ? "text-[var(--teal)]" : "text-[var(--muted)]"}`}
              >
                <TabIcon id={item.id} on={on} compact={showAdmin} />
                <span className="max-w-full truncate">{item.label}</span>
                {badge && (
                  <span className="absolute top-1.5 right-[calc(50%-1.35rem)] h-1.5 w-1.5 rounded-full bg-[var(--clay)]" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabIcon({ id, on, compact = false }: { id: AppTab; on: boolean; compact?: boolean }) {
  const stroke = on ? "var(--teal)" : "var(--muted)";
  const size = compact ? 18 : 22;
  if (id === "harita") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 21s7-5.4 7-11.2A7 7 0 1 0 5 9.8C5 15.6 12 21 12 21Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <circle cx="12" cy="9.5" r="2.2" fill={stroke} />
      </svg>
    );
  }
  if (id === "siparis") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 7h10l-.8 11.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  if (id === "mesaj") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 6.5h14v9.5a2 2 0 0 1-2 2H9l-4 3v-14.5A2 2 0 0 1 7 5.5"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M8.5 10h7M8.5 13h4.5" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "hizmet") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="8" width="16" height="11" rx="2" stroke={stroke} strokeWidth="1.8" />
        <path d="M8 8V6.5A4 4 0 0 1 16 6.5V8" stroke={stroke} strokeWidth="1.8" />
        <path d="M4 13h16" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  if (id === "yonetim") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h10" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke={stroke} strokeWidth="1.8" />
      <path d="M5 19.2c.8-3.4 3.5-5.2 7-5.2s6.2 1.8 7 5.2" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}
