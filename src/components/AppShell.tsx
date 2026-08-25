"use client";

import { useEffect, useState } from "react";
import { CustomerApp } from "@/components/CustomerApp";
import { ProviderDesk } from "@/components/ProviderDesk";
import { TabBar, type AppTab } from "@/components/TabBar";

function readTab(): AppTab {
  if (typeof window === "undefined") return "harita";
  const q = new URLSearchParams(window.location.search).get("tab");
  if (q === "siparis" || q === "masa" || q === "harita") return q;
  return "harita";
}

export function AppShell() {
  const [tab, setTab] = useState<AppTab | null>(null);

  useEffect(() => {
    setTab(readTab());
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  function go(next: AppTab) {
    setTab(next);
    const url = next === "harita" ? "/" : `/?tab=${next}`;
    window.history.replaceState(null, "", url);
  }

  if (!tab) {
    return <div className="h-dvh bg-[var(--paper)]" />;
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-[var(--paper)]">
      <div
        className={tab === "masa" ? "absolute inset-0 hidden" : "h-full"}
        aria-hidden={tab === "masa"}
        inert={tab === "masa" ? true : undefined}
      >
        <CustomerApp
          pane={tab === "siparis" ? "orders" : "map"}
          mapActive={tab === "harita"}
          onOpenOrders={() => go("siparis")}
          onPlacedOrder={() => go("siparis")}
          onBackToMap={() => go("harita")}
        />
      </div>
      {tab === "masa" && (
        <div className="relative z-10 h-full overflow-y-auto">
          <ProviderDesk />
        </div>
      )}
      <TabBar tab={tab} onTab={go} />
    </div>
  );
}
