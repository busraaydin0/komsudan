"use client";

import { useInbox, useNotifications } from "@/lib/api";
import { tabBarIconKind, tabBarItems, type AppTab } from "@/components/tabBarItems";

export type { AppTab } from "@/components/tabBarItems";

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
  const items = tabBarItems(showAdmin);

  return (
    <nav
      className="k-tabbar absolute inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] backdrop-blur-md"
      aria-label="Ana menü"
    >
      <ul className={showAdmin ? "grid grid-cols-2" : "grid grid-cols-5"}>
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
                aria-label={item.label}
                data-tab={item.id}
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
  const kind = tabBarIconKind(id);
  if (kind === "map") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden data-icon={kind}>
        <path
          d="M12 21s7-5.4 7-11.2A7 7 0 1 0 5 9.8C5 15.6 12 21 12 21Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <circle cx="12" cy="9.5" r="2.2" fill={stroke} />
      </svg>
    );
  }
  if (kind === "bag") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden data-icon={kind}>
        <path
          d="M7 7h10l-.8 11.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "chat") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden data-icon={kind}>
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
  if (kind === "desk") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden data-icon={kind}>
        <rect x="4" y="8" width="16" height="11" rx="2" stroke={stroke} strokeWidth="1.8" />
        <path d="M8 8V6.5A4 4 0 0 1 16 6.5V8" stroke={stroke} strokeWidth="1.8" />
        <path d="M4 13h16" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "admin") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden data-icon={kind}>
        <rect x="6" y="5" width="12" height="15" rx="2" stroke={stroke} strokeWidth="1.8" />
        <path d="M9 5V4.2A1.2 1.2 0 0 1 10.2 3h3.6A1.2 1.2 0 0 1 15 4.2V5" stroke={stroke} strokeWidth="1.8" />
        <path d="M9 11h6M9 14.5h4" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden data-icon={kind}>
      <circle cx="12" cy="8" r="3.2" stroke={stroke} strokeWidth="1.8" />
      <path d="M5 19.2c.8-3.4 3.5-5.2 7-5.2s6.2 1.8 7 5.2" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}
