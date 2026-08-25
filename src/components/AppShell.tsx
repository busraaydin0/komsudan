"use client";

import { useEffect, useState } from "react";
import { AccountScreen } from "@/components/AccountScreen";
import { CustomerApp } from "@/components/CustomerApp";
import { LoginGate } from "@/components/LoginGate";
import { ProviderDesk } from "@/components/ProviderDesk";
import { TabBar, type AppTab } from "@/components/TabBar";
import { useSession } from "@/lib/api";

function readTab(): AppTab {
  if (typeof window === "undefined") return "harita";
  const q = new URLSearchParams(window.location.search).get("tab");
  if (q === "masa") return "hizmet";
  if (q === "siparis" || q === "hizmet" || q === "harita" || q === "hesap") return q;
  return "harita";
}

export function AppShell() {
  const [tab, setTab] = useState<AppTab | null>(null);
  const { account, loyalty, ready, reload } = useSession();

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

  if (!ready || !tab) {
    return <div className="h-dvh bg-[var(--paper)]" />;
  }

  const locked = !account || !account.identityVerified || !account.passkeyEnabled;
  if (locked) {
    return <LoginGate account={account} onReady={reload} />;
  }

  const hideMap = tab === "hizmet" || tab === "hesap";

  return (
    <div className="relative h-dvh overflow-hidden bg-[var(--paper)]">
      <div
        className={hideMap ? "absolute inset-0 hidden" : "h-full"}
        aria-hidden={hideMap}
        inert={hideMap ? true : undefined}
      >
        <CustomerApp
          pane={tab === "siparis" ? "orders" : "map"}
          mapActive={tab === "harita"}
          loyaltyRate={loyalty?.rate ?? 0}
          loyaltyLabel={loyalty?.label ?? "Komşu"}
          onOpenOrders={() => go("siparis")}
          onPlacedOrder={() => go("siparis")}
          onBackToMap={() => go("harita")}
        />
      </div>
      {tab === "hizmet" && (
        <div className="relative z-10 h-full overflow-y-auto">
          <ProviderDesk />
        </div>
      )}
      {tab === "hesap" && (
        <div className="relative z-10 h-full overflow-y-auto">
          <AccountScreen
            account={account}
            loyalty={loyalty}
            onLogout={() => void reload()}
            onRefresh={reload}
          />
        </div>
      )}
      <TabBar tab={tab} onTab={go} />
    </div>
  );
}
