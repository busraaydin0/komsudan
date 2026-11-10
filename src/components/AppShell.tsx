"use client";

import { useEffect, useState } from "react";
import { AccountScreen } from "@/components/AccountScreen";
import { AppNotice } from "@/components/AppNotice";
import { NoticeCenter } from "@/components/NoticeCenter";
import { CustomerApp } from "@/components/CustomerApp";
import { LoginGate } from "@/components/LoginGate";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { PermissionPrompt } from "@/components/PermissionPrompt";
import { MessagesScreen } from "@/components/MessagesScreen";
import { AdminDesk } from "@/components/AdminDesk";
import { ProviderDesk } from "@/components/ProviderDesk";
import { TabBar, type AppTab } from "@/components/TabBar";
import { tabForNotice } from "@/lib/noticeTab";
import { useSession } from "@/lib/api";
import { permissionAsked } from "@/lib/permissions";
import type { PreferredIntent } from "@/lib/types";

function isStaffRole(role: string | null | undefined) {
  return role === "service_admin" || role === "admin";
}

function readTab(intent?: PreferredIntent | null, staff = false): AppTab {
  if (staff) {
    if (typeof window === "undefined") return "yonetim";
    const q = new URLSearchParams(window.location.search).get("tab");
    return q === "hesap" ? "hesap" : "yonetim";
  }
  if (typeof window === "undefined") return "harita";
  const q = new URLSearchParams(window.location.search).get("tab");
  if (q === "masa") return "hizmet";
  if (q === "siparis" || q === "hizmet" || q === "yonetim" || q === "harita" || q === "hesap" || q === "mesaj") {
    return q;
  }
  return intent === "offer" ? "hizmet" : "harita";
}

export function AppShell() {
  const [tab, setTab] = useState<AppTab | null>(null);
  const [homeTick, setHomeTick] = useState(0);
  const [askPerms, setAskPerms] = useState(false);
  const [editDiscovery, setEditDiscovery] = useState(false);
  const [discoveryDone, setDiscoveryDone] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const { account, ready, reload } = useSession();

  useEffect(() => {
    const staff = isStaffRole(account?.role);
    setTab((prev) => {
      const next = prev ?? readTab(account?.preferredIntent, staff);
      if (staff && next !== "yonetim" && next !== "hesap") return "yonetim";
      return next;
    });
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, [account?.preferredIntent, account?.role]);

  useEffect(() => {
    if (!account?.identityVerified || !account.passkeyEnabled) {
      setDiscoveryDone(false);
    } else if (account.onboardingCompletedAt) {
      setDiscoveryDone(true);
    }
  }, [account?.identityVerified, account?.passkeyEnabled, account?.onboardingCompletedAt]);

  useEffect(() => {
    if (!ready || !account?.identityVerified || !account.passkeyEnabled) return;
    if (!permissionAsked()) setAskPerms(true);
  }, [ready, account]);

  function go(next: AppTab) {
    const staff = isStaffRole(account?.role);
    const dest = staff && next !== "hesap" ? "yonetim" : next;
    if (dest !== "mesaj") setChatOrderId(null);
    if (dest === "harita") setHomeTick((n) => n + 1);
    setTab(dest);
    const url = dest === "harita" ? "/" : `/?tab=${dest}`;
    window.history.replaceState(null, "", url);
  }

  function openNotice(n: { type: string }) {
    if (isStaffRole(account?.role)) {
      go("yonetim");
      return;
    }
    go(tabForNotice(n.type));
  }

  if (!ready) {
    return <div className="h-dvh bg-[var(--paper)]" />;
  }

  const locked = !account || !account.identityVerified || !account.passkeyEnabled;
  if (locked) {
    return <LoginGate account={account} onReady={reload} />;
  }

  const isStaff = isStaffRole(account.role);
  if ((!discoveryDone || editDiscovery) && !isStaff) {
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

  const staff = isStaffRole(account.role);
  const hideMap = staff || tab === "hizmet" || tab === "hesap" || tab === "mesaj" || tab === "yonetim";

  return (
    <div className="relative h-dvh overflow-hidden bg-[var(--paper)]">
      {askPerms && <PermissionPrompt onDone={() => setAskPerms(false)} />}
      <NoticeCenter onOpen={openNotice} />
      <AppNotice onOpen={openNotice} />
      {!staff && (
        <div
          className={hideMap ? "absolute inset-0 hidden" : "h-full"}
          aria-hidden={hideMap}
          inert={hideMap ? true : undefined}
        >
          <CustomerApp
            pane={tab === "siparis" ? "orders" : "map"}
            mapActive={tab === "harita"}
            homeTick={homeTick}
            meAvatar={account.avatarUrl}
            viewerId={account.id}
            homeLat={account.homeLat}
            homeLng={account.homeLng}
            onOpenOrders={() => go("siparis")}
            onPlacedOrder={() => go("siparis")}
            onBackToMap={() => go("harita")}
            onEditDiscovery={() => setEditDiscovery(true)}
            onOpenMessages={(orderId) => {
              setChatOrderId(orderId);
              go("mesaj");
            }}
          />
        </div>
      )}
      {tab === "mesaj" && !staff && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <MessagesScreen
            openOrderId={chatOrderId}
            onOpenThread={setChatOrderId}
          />
        </div>
      )}
      {tab === "hizmet" && !staff && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <ProviderDesk
            onEditDiscovery={() => setEditDiscovery(true)}
            onOpenMessages={(orderId) => {
              setChatOrderId(orderId);
              go("mesaj");
            }}
          />
        </div>
      )}
      {tab === "yonetim" && staff && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <AdminDesk />
        </div>
      )}
      {tab === "hesap" && (
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <AccountScreen
            account={account}
            onLogout={() => void reload()}
            onRefresh={reload}
            onOpenMap={() => go("harita")}
            onEditDiscovery={() => setEditDiscovery(true)}
          />
        </div>
      )}
      <TabBar
        tab={tab}
        showAdmin={staff}
        onTab={(t) => {
          if (t === "mesaj") setChatOrderId(null);
          go(t);
        }}
      />
    </div>
  );
}
