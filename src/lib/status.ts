import type { UserRole } from "@/lib/db/auth";
import type { LaundryPackageId, OrderPackageId } from "./categories/registry";

export type PackageId = LaundryPackageId;

export type OrderStatusId =
  | "pending"
  | "accepted"
  | "dropped_off"
  | "washing"
  | "ironing"
  | "ready"
  | "admin_pending"
  | "completed"
  | "rejected"
  | "cancelled"
  | "disputed";

export const ORDER_STATUSES: OrderStatusId[] = [
  "pending",
  "accepted",
  "dropped_off",
  "washing",
  "ironing",
  "ready",
  "admin_pending",
  "completed",
  "rejected",
  "cancelled",
  "disputed",
];

export const ALLOWED_TRANSITIONS: Record<OrderStatusId, OrderStatusId[]> = {
  pending: ["accepted", "rejected", "dropped_off"],
  accepted: ["dropped_off", "washing", "cancelled"],
  dropped_off: ["washing", "cancelled"],
  washing: ["ironing", "ready"],
  ironing: ["ready"],
  ready: ["completed", "admin_pending"],
  admin_pending: ["completed", "disputed"],
  completed: [],
  rejected: [],
  cancelled: [],
  disputed: [],
};

const TERMINAL_NEGATIVE: OrderStatusId[] = ["rejected", "cancelled", "disputed"];

export type StatusTone = "neutral" | "active" | "done" | "negative";

export type StatusMeta = {
  label: string;
  trackLabel: string;
  tone: StatusTone;
  badgeClass: string;
};

export const STATUS_META: Record<OrderStatusId, StatusMeta> = {
  pending: {
    label: "Bekliyor",
    trackLabel: "Onay bekliyor",
    tone: "neutral",
    badgeClass: "bg-[var(--sand)] text-[var(--clay)]",
  },
  accepted: {
    label: "Kabul edildi",
    trackLabel: "Teslim alındı",
    tone: "active",
    badgeClass: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  },
  dropped_off: {
    label: "Kapıda bırakıldı",
    trackLabel: "Teslim alındı",
    tone: "active",
    badgeClass: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  },
  washing: {
    label: "Yıkanıyor",
    trackLabel: "Yıkanıyor",
    tone: "active",
    badgeClass: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  },
  ironing: {
    label: "Ütüleniyor",
    trackLabel: "Ütüleniyor",
    tone: "active",
    badgeClass: "bg-[color-mix(in_srgb,var(--teal)_14%,transparent)] text-[var(--teal)]",
  },
  ready: {
    label: "Hazır",
    trackLabel: "Hazır, teslim al",
    tone: "active",
    badgeClass: "bg-[color-mix(in_srgb,var(--teal)_18%,transparent)] text-[var(--teal)]",
  },
  admin_pending: {
    label: "Admin onayı",
    trackLabel: "Hazır, teslim al",
    tone: "active",
    badgeClass: "bg-[color-mix(in_srgb,var(--teal)_18%,transparent)] text-[var(--teal)]",
  },
  completed: {
    label: "Bitti",
    trackLabel: "Teslim edildi",
    tone: "done",
    badgeClass: "bg-[var(--paper)] text-[var(--muted)]",
  },
  rejected: {
    label: "Reddedildi",
    trackLabel: "İptal",
    tone: "negative",
    badgeClass: "bg-[var(--paper)] text-[var(--muted)]",
  },
  cancelled: {
    label: "İptal",
    trackLabel: "İptal",
    tone: "negative",
    badgeClass: "bg-[var(--paper)] text-[var(--muted)]",
  },
  disputed: {
    label: "İtirazlı",
    trackLabel: "İtiraz",
    tone: "negative",
    badgeClass: "bg-[var(--paper)] text-[var(--muted)]",
  },
};

export function isOrderStatus(value: string | null | undefined): value is OrderStatusId {
  return Boolean(value && (ORDER_STATUSES as string[]).includes(value));
}

export function statusMeta(status: OrderStatusId): StatusMeta {
  return STATUS_META[status];
}

export function statusLabel(status: OrderStatusId): string {
  return STATUS_META[status].label;
}

export function statusBadgeClass(status: OrderStatusId): string {
  return STATUS_META[status].badgeClass;
}

/** Provider masası: bir sonraki advance düğmesi metni (null = düğme yok). */
export function providerAdvanceLabel(
  status: OrderStatusId,
  packageId: PackageId,
  ctx: {
    needsPickupCode: boolean;
    pickupConfirmed: boolean;
    priceChangePending: boolean;
  },
): string | null {
  if (ctx.needsPickupCode) return "Alım kodu ile teslim al";
  if (status === "accepted" && ctx.pickupConfirmed && !ctx.priceChangePending) return "Kapıda bırakıldı";
  if (status === "dropped_off") return "Yıkamaya geç";
  if (status === "washing") return packageId === "tam" ? "Ütüye geç" : "Hazır";
  if (status === "ironing") return "Hazır";
  return null;
}

/** Müşteri takip ekranı alt metni. */
export function customerStatusHint(status: OrderStatusId): string {
  if (status === "ready" || status === "admin_pending") {
    return "Hizmet veren kodu girince iş biter ve para geçer.";
  }
  if (status === "completed") return "Teslim bitti. İstersen yorum ve fotoğraf bırak.";
  if (status === "pending") return "Hizmet veren onayını bekliyor.";
  return STATUS_META[status].trackLabel;
}

export type TransitionOpts = {
  packageId?: PackageId;
  /** completed geçişi: müşteri veya hizmet vereni mi. */
  isOrderParty?: boolean;
};

function packageAllowsTransition(from: OrderStatusId, to: OrderStatusId, packageId?: PackageId) {
  if (!packageId) return true;
  if (to === "ironing" && packageId !== "tam") return false;
  if (from === "washing" && to === "ready" && packageId === "tam") return false;
  if (from === "washing" && to === "ironing" && packageId !== "tam") return false;
  return true;
}

const PROVIDER_TARGETS: OrderStatusId[] = [
  "accepted",
  "rejected",
  "dropped_off",
  "washing",
  "ironing",
  "ready",
  "admin_pending",
];

/** Tek geçiş kapısı: grafik + paket + rol. */
export function canTransition(
  from: OrderStatusId,
  to: OrderStatusId,
  role: UserRole,
  opts?: TransitionOpts,
): boolean {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) return false;
  if (!packageAllowsTransition(from, to, opts?.packageId)) return false;
  if (role === "admin") return true;
  if (to === "completed") return Boolean(opts?.isOrderParty);
  if (PROVIDER_TARGETS.includes(to)) return role === "provider";
  if (to === "cancelled" || to === "disputed") return role === "customer" || role === "provider";
  if (to === "rejected") return role === "provider";
  return false;
}

export function nextOperationalStatus(
  current: OrderStatusId,
  packageId: PackageId,
): OrderStatusId | null {
  if (current === "accepted") return "dropped_off";
  if (current === "dropped_off") return "washing";
  if (current === "washing") return packageId === "tam" ? "ironing" : "ready";
  if (current === "ironing") return "ready";
  return null;
}

export function canCancel(status: OrderStatusId) {
  return status === "pending";
}

export function canAddPhotos(status: OrderStatusId) {
  return status !== "pending" && !TERMINAL_NEGATIVE.includes(status) && status !== "completed";
}

export function canReview(status: OrderStatusId) {
  return status === "completed";
}

export function trackSteps(packageId: OrderPackageId): OrderStatusId[] {
  const base: OrderStatusId[] = ["pending", "accepted", "washing", "ready", "completed"];
  if (packageId === "tam") {
    return ["pending", "accepted", "washing", "ironing", "ready", "completed"];
  }
  return base;
}

/** Takip çubuğunda hangi adım vurgulanır (dropped_off → accepted adımı). */
export function trackHighlightStatus(status: OrderStatusId): OrderStatusId {
  if (status === "dropped_off") return "accepted";
  if (status === "admin_pending") return "ready";
  if (TERMINAL_NEGATIVE.includes(status)) return "cancelled";
  return status;
}
