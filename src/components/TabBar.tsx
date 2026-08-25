"use client";

import { useOrders } from "@/lib/api";

export type AppTab = "harita" | "siparis" | "hizmet";

const ITEMS: { id: AppTab; label: string }[] = [
  { id: "harita", label: "Harita" },
  { id: "siparis", label: "Siparişim" },
  { id: "hizmet", label: "Hizmet" },
];

export function TabBar({ tab, onTab }: { tab: AppTab; onTab: (t: AppTab) => void }) {
  const { orders } = useOrders();
  const openOrder = orders.some((o) => o.status !== "teslim_edildi" && o.status !== "iptal");
  const openDesk = orders.some((o) => o.status !== "teslim_edildi" && o.status !== "iptal");

  return (
    <nav
      className="k-tabbar absolute inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] backdrop-blur-md"
      aria-label="Ana menü"
    >
      <ul className="grid grid-cols-3">
        {ITEMS.map((item) => {
          const on = tab === item.id;
          const badge = item.id === "siparis" ? openOrder : item.id === "hizmet" ? openDesk : false;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onTab(item.id)}
                aria-current={on ? "page" : undefined}
                className={`relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 pt-1.5 text-[11px] font-medium ${
                  on ? "text-[var(--teal)]" : "text-[var(--muted)]"
                }`}
              >
                <TabIcon id={item.id} on={on} />
                {item.label}
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

function TabIcon({ id, on }: { id: AppTab; on: boolean }) {
  const stroke = on ? "var(--teal)" : "var(--muted)";
  if (id === "harita") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 7h10l-.8 11.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7Z"
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7" stroke={stroke} strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="8" width="16" height="11" rx="2" stroke={stroke} strokeWidth="1.8" />
      <path d="M8 8V6.5A4 4 0 0 1 16 6.5V8" stroke={stroke} strokeWidth="1.8" />
      <path d="M4 13h16" stroke={stroke} strokeWidth="1.8" />
    </svg>
  );
}
