/**
 * Tip B (home-visit) state machine. Faz 8 adım 1: geçiş + rol whitelist.
 * `homeVisitStrategy.ready` hâlâ false — sipariş kabulü açılmaz.
 * Client hedef durum göndermez; aksiyon gönderir, sunucu sonraki durumu üretir.
 */

export const HOME_VISIT_STATUSES = [
  "pending",
  "confirmed",
  "on_the_way",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type HomeVisitStatus = (typeof HOME_VISIT_STATUSES)[number];

/** system = timeout; admin = manuel destek (in_progress iptali). */
export type HomeVisitActor = "customer" | "provider" | "admin" | "system";

/**
 * Client'ın göndereceği aksiyonlar. Hedef status yok.
 * Provider "tamamladım" bu adımda durum değiştirmez; completed yalnız customer `complete`.
 */
export type HomeVisitAction =
  | "confirm"
  | "reject"
  | "cancel"
  | "start_travel"
  | "start_work"
  | "complete"
  | "timeout"
  | "force_cancel";

type Transition = { from: HomeVisitStatus; to: HomeVisitStatus };

const PROVIDER_TRANSITIONS: Transition[] = [
  { from: "pending", to: "confirmed" },
  { from: "pending", to: "rejected" },
  { from: "confirmed", to: "on_the_way" },
  { from: "confirmed", to: "cancelled" },
  { from: "on_the_way", to: "in_progress" },
  { from: "on_the_way", to: "cancelled" },
];

const CUSTOMER_TRANSITIONS: Transition[] = [
  { from: "confirmed", to: "cancelled" },
  { from: "on_the_way", to: "cancelled" },
  { from: "in_progress", to: "completed" },
];

const SYSTEM_TRANSITIONS: Transition[] = [{ from: "pending", to: "cancelled" }];

const ADMIN_TRANSITIONS: Transition[] = [{ from: "in_progress", to: "cancelled" }];

const BY_ACTOR: Record<HomeVisitActor, Transition[]> = {
  provider: PROVIDER_TRANSITIONS,
  customer: CUSTOMER_TRANSITIONS,
  system: SYSTEM_TRANSITIONS,
  admin: ADMIN_TRANSITIONS,
};

const ACTION_TARGET: Record<HomeVisitAction, HomeVisitStatus> = {
  confirm: "confirmed",
  reject: "rejected",
  cancel: "cancelled",
  start_travel: "on_the_way",
  start_work: "in_progress",
  complete: "completed",
  timeout: "cancelled",
  force_cancel: "cancelled",
};

const ACTION_ACTORS: Record<HomeVisitAction, HomeVisitActor[]> = {
  confirm: ["provider"],
  reject: ["provider"],
  cancel: ["customer", "provider"],
  start_travel: ["provider"],
  start_work: ["provider"],
  complete: ["customer"],
  timeout: ["system"],
  force_cancel: ["admin"],
};

export function isHomeVisitStatus(value: string | null | undefined): value is HomeVisitStatus {
  return Boolean(value && (HOME_VISIT_STATUSES as readonly string[]).includes(value));
}

export function homeVisitTransitionsFor(actor: HomeVisitActor): Transition[] {
  return BY_ACTOR[actor];
}

/** Hedef durumu client değil bu fonksiyon üretir; `to` yalnız test/guard için. */
export function canHomeVisitTransition(
  from: HomeVisitStatus,
  to: HomeVisitStatus,
  actor: HomeVisitActor,
): boolean {
  return BY_ACTOR[actor].some((t) => t.from === from && t.to === to);
}

export function homeVisitNext(
  from: HomeVisitStatus,
  action: HomeVisitAction,
  actor: HomeVisitActor,
): HomeVisitStatus | null {
  if (!ACTION_ACTORS[action].includes(actor)) return null;
  const to = ACTION_TARGET[action];
  return canHomeVisitTransition(from, to, actor) ? to : null;
}

export function pilotFromHomeVisit(status: HomeVisitStatus): import("./types").OrderStatus {
  if (status === "pending") return "onay_bekliyor";
  if (status === "completed") return "teslim_edildi";
  if (status === "rejected" || status === "cancelled") return "iptal";
  return "teslim_alindi";
}
