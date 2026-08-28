"use client";

import { useEffect, useState } from "react";
import { AccountScreen } from "@/components/AccountScreen";
import { AppNotice } from "@/components/AppNotice";
import { NoticeCenter } from "@/components/NoticeCenter";
import { CustomerApp } from "@/components/CustomerApp";
import { LoginGate } from "@/components/LoginGate";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { ProviderDesk } from "@/components/ProviderDesk";
import { TabBar, type AppTab } from "@/components/TabBar";
import { useSession } from "@/lib/api";
import { permissionAsked } from "@/lib/permissions";

function readTab(): AppTab {
  if (typeof window === "undefined") return "harita";
  const q = new URLSearchParams(window.location.search).get("tab");
  if (q === "masa") return "hizmet";
  if (q === "siparis" || q === "hizmet" || q === "harita" || q === "hesap") return q;
  return "harita";
}

export function AppShell() {
  const [tab, setTab] = useState<AppTab | null>(null);
  const [askPerms, setAskPerms] = useState(false);
  const { account, loyalty, ready, reload } = useSession();

  useEffect(() => {
    setTab(readTab());
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  useEffect(() => {
    if (!ready || !account?.identityVerified || !account.passkeyEnabled) return;
    if (!permissionAsked()) setAskPerms(true);
  }, [ready, account]);

  function go(next: AppTab) {
    setTab(next);
    const url = next === "harita" ? "/" : `/?tab=${next}`;
    window.history.replaceState(null, "", url);
  }

  function openNotice(n: { type: string }) {
    if (n.type === "nudge") go("harita");
    else if (n.type.startsWith("order_") || n.type === "pickup_code") go("siparis");
    else go("hesap");
  }

  if (!ready || !tab) {
    return <div className="h-dvh bg-[var(--paper)]" />;
  }

  const locked = !account || !account.identityVerified || !account.passkeyEnabled;
  if (locked) {
    return (
      <LoginGate account={account} onReady={reload} />
    );
  }

  const hideMap = tab === "hizmet" || tab === "hesap";

  return (
    <div className="relative h-dvh overflow-hidden bg-[var(--paper)]">
      {askPerms && <PermissionPrompt onDone={() => setAskPerms(false)} />}
      <NoticeCenter onOpen={openNotice} />
      <AppNotice onOpen={openNotice} />
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
          meAvatar={account.avatarUrl}
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
            onOpenMap={() => go("harita")}
          />
        </div>
      )}
      <TabBar tab={tab} onTab={go} />
    </div>
  );
}
