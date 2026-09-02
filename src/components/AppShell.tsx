"use client";

import { useEffect, useState } from "react";
import { AccountScreen } from "@/components/AccountScreen";
import { AppNotice } from "@/components/AppNotice";
import { NoticeCenter } from "@/components/NoticeCenter";
import { CustomerApp } from "@/components/CustomerApp";
import { LoginGate } from "@/components/LoginGate";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { ProviderDesk } from "@/components/ProviderDesk";
import { TabBar, type AppTab } from "@/components/TabBar";
import { useSession } from "@/lib/api";
import { permissionAsked } from "@/lib/permissions";
import type { PreferredIntent } from "@/lib/types";

function readTab(intent?: PreferredIntent | null): AppTab {
  if (typeof window === "undefined") return "harita";
  const q = new URLSearchParams(window.location.search).get("tab");
  if (q === "masa") return "hizmet";
  if (q === "siparis" || q === "hizmet" || q === "harita" || q === "hesap") return q;
  return intent === "offer" ? "hizmet" : "harita";
}

export function AppShell() {
  const [tab, setTab] = useState<AppTab | null>(null);
  const [askPerms, setAskPerms] = useState(false);
  const [editDiscovery, setEditDiscovery] = useState(false);
  const [discoveryDone, setDiscoveryDone] = useState(false);
  const { account, loyalty, ready, reload } = useSession();

  useEffect(() => {
    setTab((prev) => prev ?? readTab(account?.preferredIntent));
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, [account?.preferredIntent]);

  useEffect(() => {
    if (!account?.identityVerified || !account.passkeyEnabled) {
      setDiscoveryDone(false);
    }
  }, [account?.identityVerified, account?.passkeyEnabled]);

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

  if (!ready) {
    return <div className="h-dvh bg-[var(--paper)]" />;
  }

  const locked = !account || !account.identityVerified || !account.passkeyEnabled;
  if (locked) {
    return <LoginGate account={account} onReady={reload} />;
  }

  if (!discoveryDone || editDiscovery) {
    return (
      <OnboardingFlow
        account={account}
        onDone={async (intent) => {
          setEditDiscovery(false);
          setDiscoveryDone(true);
          await reload();
          const next = intent === "offer" ? "hizmet" : "harita";
          setTab(next);
          window.history.replaceState(null, "", next === "harita" ? "/" : `/?tab=${next}`);
        }}
      />
    );
  }

  if (!tab) {
    return <div className="h-dvh bg-[var(--paper)]" />;
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
          categoryIds={account.preferredCategoryIds ?? []}
          homeLat={account.homeLat}
          homeLng={account.homeLng}
          onOpenOrders={() => go("siparis")}
          onPlacedOrder={() => go("siparis")}
          onBackToMap={() => go("harita")}
          onEditDiscovery={() => setEditDiscovery(true)}
        />
      </div>
      {tab === "hizmet" && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <ProviderDesk onEditDiscovery={() => setEditDiscovery(true)} />
        </div>
      )}
      {tab === "hesap" && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <AccountScreen
            account={account}
            loyalty={loyalty}
            onLogout={() => void reload()}
            onRefresh={reload}
            onOpenMap={() => go("harita")}
            onEditDiscovery={() => setEditDiscovery(true)}
          />
        </div>
      )}
      <TabBar tab={tab} onTab={go} />
    </div>
  );
}
