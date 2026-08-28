"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { PILOT, trustLabel } from "@/lib/data";
import { dryingListLabel } from "@/lib/drying";
import { dropsForFood, foodCategoryLabel, foodLeadLabel, foodQtyBounds, foodUnitMeta } from "@/lib/food";
import {
  dropsForSewing,
  sewingDropLabel,
  sewingLeadLabel,
  sewingMaterialLabel,
  sewingQtyBounds,
  sewingSubcategoryLabel,
  sewingUnitMeta,
} from "@/lib/sewing";
import {
  dropsForRepair,
  repairCanOrder,
  repairDropLabel,
  repairJobLabel,
  repairKindLabel,
  repairLeadLabel,
  repairPartsLabel,
  repairPriceTypeLabel,
  repairQtyBounds,
  repairQuoteLabel,
  repairUnitMeta,
} from "@/lib/repair";
import {
  dropsForTech,
  techCanOrder,
  techDropLabel,
  techJobLabel,
  techKindLabel,
  techLeadLabel,
  techMaterialsLabel,
  techPriceTypeLabel,
  techQtyBounds,
  techUnitMeta,
} from "@/lib/tech";
import {
  dropsForWash,
  washBookingLabel,
  washCanOrder,
  washDropLabel,
  washDurationLabel,
  washIncludesList,
  washJobLabel,
  washMaterialsLabel,
  washQtyBounds,
  washVehicleLabel,
  WASH_UNIT,
} from "@/lib/wash";
import {
  courierAvailLabel,
  courierCanOrder,
  courierCarryList,
  courierConfirmList,
  courierDropLabel,
  courierDurationLabel,
  courierPriceTypeLabel,
  courierQtyBounds,
  courierRouteList,
  courierSizeList,
  courierTransportList,
  dropsForCourier,
  COURIER_UNIT,
} from "@/lib/courier";
import {
  dropsForGarden,
  gardenAreaList,
  gardenAvailLabel,
  gardenCanOrder,
  gardenDropLabel,
  gardenDurationLabel,
  gardenEquipmentLabel,
  gardenJobList,
  gardenPriceTypeLabel,
  gardenQtyBounds,
  GARDEN_UNIT,
} from "@/lib/garden";
import {
  cargoAvailLabel,
  cargoCanOrder,
  cargoConfirmList,
  cargoDropLabel,
  cargoDropList,
  cargoDurationLabel,
  cargoJobList,
  cargoPickupList,
  cargoPriceTypeLabel,
  cargoQtyBounds,
  cargoSizeList,
  dropsForCargo,
  CARGO_UNIT,
} from "@/lib/cargo";
import {
  dropsForPrint,
  printAvailLabel,
  printCanOrder,
  printColorList,
  printDropLabel,
  printDurationLabel,
  printFileList,
  printPaperList,
  printPickupList,
  printQtyBounds,
  printSendList,
  printSideList,
  PRINT_UNIT,
} from "@/lib/print";
import {
  dropsForPreserve,
  preserveCanOrder,
  preserveDaysLabel,
  preserveDropLabel,
  preserveKindList,
  preserveMaterialLabel,
  preservePickupList,
  preserveQtyBounds,
  preserveStorageList,
  preserveUnitMeta,
} from "@/lib/preserve";
import {
  CARPET_UNIT,
  carpetCanOrder,
  carpetCleanList,
  carpetDaysLabel,
  carpetDropLabel,
  carpetKindList,
  carpetPickupList,
  carpetQtyBounds,
  carpetSizeList,
  dropsForCarpet,
} from "@/lib/carpet";
import {
  LESSON_UNIT,
  dropsForLesson,
  lessonCanOrder,
  lessonDropLabel,
  lessonDurationList,
  lessonKindList,
  lessonLevelList,
  lessonMaterialList,
  lessonPlaceList,
  lessonQtyBounds,
  lessonSubjectList,
} from "@/lib/lesson";
import {
  TALK_UNIT,
  dropsForTalk,
  talkCanOrder,
  talkDropLabel,
  talkDurationList,
  talkKindList,
  talkLangList,
  talkLevelList,
  talkMaterialList,
  talkPlaceList,
  talkQtyBounds,
} from "@/lib/talk";
import {
  dropsForGrave,
  graveAvailList,
  graveCanOrder,
  graveDropLabel,
  graveDurationLabel,
  graveFeeList,
  graveFlowerList,
  graveKindList,
  gravePhotoList,
  gravePriceList,
  graveQtyBounds,
  graveUnitMeta,
} from "@/lib/grave";
import { formatKm, kmBetween } from "@/lib/geo";
import { estimateFood, estimateFor, tl, clampPieces, PIECES_MAX, PIECES_MIN } from "@/lib/pricing";
import { seatLabel, seatTone } from "@/lib/seat";
import { postOrder, postReview, patchOrder, useCatalog, useOrders } from "@/lib/api";
import { readLocationIfGranted, subscribeLocation } from "@/lib/permissions";
import { canCancel, trackSteps } from "@/lib/status";
import { PhotoStrip, ReviewComposer, ReviewList } from "@/components/Photos";
import { Avatar } from "@/components/Avatar";
import type {
  DropMethod,
  DropPoint,
  LngLat,
  MapMode,
  Order,
  PackageId,
  Provider,
  ProviderProduct,
  ProviderRepair,
  ProviderService,
  ProviderTech,
  ProviderWash,
  ProviderCourier,
  ProviderGarden,
  ProviderCargo,
  ProviderPrint,
  ProviderPreserve,
  ProviderCarpet,
  ProviderLesson,
  ProviderTalk,
  ProviderGrave,
} from "@/lib/types";

const MapCanvas = dynamic(() => import("./MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[var(--paper)]">
      <div className="k-skel absolute inset-0 opacity-40" />
    </div>
  ),
});

const PIECES = [8, 12, 16, 24, 32];

function isDavet(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "davet";
}

function isDikis(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "dikis";
}

function isTamir(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "tamir";
}

function isTeknoloji(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "teknoloji";
}

function isAraba(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "araba";
}

function isKurye(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "kurye";
}

function isBahce(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "bahce";
}

function isKargo(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "kargo";
}

function isCikti(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "cikti";
}

function isKislik(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "kislik";
}

function isHali(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "hali";
}

function isOdev(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "odev";
}

function isDil(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "dil";
}

function isMezar(p: Pick<Provider, "categoryId">) {
  return p.categoryId === "mezar";
}

function laundryInFilter(ids?: string[]) {
  if (!ids?.length) return true;
  return ids.includes("camasir");
}

type NearbySort = "near" | "far" | "priceHigh" | "priceLow" | "rating" | "reviews" | "space";

const NEARBY_SORTS: { id: NearbySort; label: string }[] = [
  { id: "near", label: "Yakından uzağa" },
  { id: "far", label: "Uzaktan yakına" },
  { id: "priceHigh", label: "Fiyat çoktan aza" },
  { id: "priceLow", label: "Fiyat azdan çoğa" },
  { id: "rating", label: "En çok puanlanan" },
  { id: "reviews", label: "En çok yorum" },
  { id: "space", label: "Bugün yer var" },
];

function listPrice(p: Provider): number | null {
  if (isDavet(p)) {
    const prices = (p.products ?? []).map((x) => x.pricePerPerson);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isDikis(p)) {
    const prices = (p.services ?? []).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isTamir(p)) {
    const prices = (p.repairs ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isTeknoloji(p)) {
    const prices = (p.techs ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isAraba(p)) {
    const prices = (p.washes ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isKurye(p)) {
    const prices = (p.couriers ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isBahce(p)) {
    const prices = (p.gardens ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isKargo(p)) {
    const prices = (p.cargos ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isCikti(p)) {
    const prices = (p.prints ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isKislik(p)) {
    const prices = (p.preserves ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isHali(p)) {
    const prices = (p.carpets ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isOdev(p)) {
    const prices = (p.lessons ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isDil(p)) {
    const prices = (p.talks ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  if (isMezar(p)) {
    const prices = (p.graves ?? []).filter((x) => x.price > 0).map((x) => x.price);
    return prices.length ? Math.min(...prices) : null;
  }
  return p.packages.find((x) => x.id === "tam")?.pricePerPiece ?? p.packages.at(-1)?.pricePerPiece ?? null;
}

function sortNearby(rows: { p: Provider; km: number }[], sort: NearbySort) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "far") return b.km - a.km || b.p.rating - a.p.rating;
    if (sort === "priceHigh" || sort === "priceLow") {
      const pa = listPrice(a.p);
      const pb = listPrice(b.p);
      if (pa == null && pb == null) return a.km - b.km;
      if (pa == null) return 1;
      if (pb == null) return -1;
      const dir = sort === "priceHigh" ? -1 : 1;
      return (pa - pb) * dir || a.km - b.km;
    }
    if (sort === "rating") return b.p.rating - a.p.rating || b.p.reviews - a.p.reviews || a.km - b.km;
    if (sort === "reviews") return b.p.reviews - a.p.reviews || b.p.rating - a.p.rating || a.km - b.km;
    if (sort === "space") return b.p.remaining - a.p.remaining || a.km - b.km;
    return a.km - b.km || b.p.rating - a.p.rating;
  });
  return copy;
}

type Sheet = "list" | "provider" | "checkout" | "track";

type Props = {
  pane?: "map" | "orders";
  mapActive?: boolean;
  loyaltyRate?: number;
  loyaltyLabel?: string;
  meAvatar?: string | null;
  categoryIds?: string[];
  homeLat?: number | null;
  homeLng?: number | null;
  onOpenOrders?: () => void;
  onPlacedOrder?: () => void;
  onBackToMap?: () => void;
};

export function CustomerApp({
  pane = "map",
  mapActive = true,
  loyaltyRate = 0,
  loyaltyLabel = "Komşu",
  meAvatar,
  categoryIds,
  homeLat,
  homeLng,
  onOpenOrders,
  onPlacedOrder,
  onBackToMap,
}: Props) {
  const { providers, dropPoints, ready, reload: reloadCatalog } = useCatalog(
    categoryIds?.length ? categoryIds : undefined,
  );
  const { orders, reload: reloadOrders } = useOrders();
  const [mode, setMode] = useState<MapMode>("3d");
  const [user, setUser] = useState<LngLat | null>(null);
  const [far, setFar] = useState(false);
  const [hello, setHello] = useState(true);
  const [sheet, setSheet] = useState<Sheet>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageId>("tam");
  const [productId, setProductId] = useState<string | null>(null);
  const [pieces, setPieces] = useState(16);
  const [guests, setGuests] = useState(8);
  const [allergy, setAllergy] = useState("");
  const [express, setExpress] = useState(false);
  const [drop, setDrop] = useState<DropMethod>("nokta");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [dryerOnly, setDryerOnly] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listTall, setListTall] = useState(false);
  const listDrag = useRef<{ y: number } | null>(null);
  const [err, setErr] = useState("");
  const [placing, setPlacing] = useState(false);

  const home =
    homeLat != null && homeLng != null ? { lat: homeLat, lng: homeLng } : null;
  const origin = user ?? home ?? PILOT.center;
  const ranked = useMemo(() => {
    return providers
      .filter((p) => (p.categoryId && p.categoryId !== "camasir" ? true : dryerOnly ? p.hasDryer : true))
      .map((p) => ({ p, km: kmBetween(origin, p.loc) }))
      .sort((a, b) => a.km - b.km);
  }, [origin, dryerOnly, providers]);
  const available = ranked.filter(({ p }) => p.remaining > 0).length;

  const selected = selectedId ? providers.find((p) => p.id === selectedId) : undefined;
  const active = orders.find((o) => o.id === activeId) ?? orders[0];
  const davet = selected ? isDavet(selected) : false;
  const dikis = selected ? isDikis(selected) : false;
  const tamir = selected ? isTamir(selected) : false;
  const teknoloji = selected ? isTeknoloji(selected) : false;
  const araba = selected ? isAraba(selected) : false;
  const kurye = selected ? isKurye(selected) : false;
  const bahce = selected ? isBahce(selected) : false;
  const kargo = selected ? isKargo(selected) : false;
  const cikti = selected ? isCikti(selected) : false;
  const kislik = selected ? isKislik(selected) : false;
  const hali = selected ? isHali(selected) : false;
  const odev = selected ? isOdev(selected) : false;
  const dil = selected ? isDil(selected) : false;
  const mezar = selected ? isMezar(selected) : false;
  const product = selected?.products?.find((x) => x.id === productId) ?? selected?.products?.[0];
  const service = selected?.services?.find((x) => x.id === productId) ?? selected?.services?.[0];
  const repair = selected?.repairs?.find((x) => x.id === productId) ?? selected?.repairs?.[0];
  const tech = selected?.techs?.find((x) => x.id === productId) ?? selected?.techs?.[0];
  const wash = selected?.washes?.find((x) => x.id === productId) ?? selected?.washes?.[0];
  const courier = selected?.couriers?.find((x) => x.id === productId) ?? selected?.couriers?.[0];
  const garden = selected?.gardens?.find((x) => x.id === productId) ?? selected?.gardens?.[0];
  const cargo = selected?.cargos?.find((x) => x.id === productId) ?? selected?.cargos?.[0];
  const print = selected?.prints?.find((x) => x.id === productId) ?? selected?.prints?.[0];
  const preserve = selected?.preserves?.find((x) => x.id === productId) ?? selected?.preserves?.[0];
  const carpet = selected?.carpets?.find((x) => x.id === productId) ?? selected?.carpets?.[0];
  const lesson = selected?.lessons?.find((x) => x.id === productId) ?? selected?.lessons?.[0];
  const talk = selected?.talks?.find((x) => x.id === productId) ?? selected?.talks?.[0];
  const grave = selected?.graves?.find((x) => x.id === productId) ?? selected?.graves?.[0];
  const quote = selected
    ? davet && product
      ? estimateFood(guests, product.pricePerPerson, loyaltyRate)
      : dikis && service
        ? estimateFood(guests, service.price, loyaltyRate)
        : tamir && repair && repairCanOrder(repair)
          ? estimateFood(guests, repair.price, loyaltyRate)
          : tamir
            ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
            : teknoloji && tech && techCanOrder(tech)
              ? estimateFood(guests, tech.price, loyaltyRate)
              : teknoloji
                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                : araba && wash && washCanOrder(wash)
                  ? estimateFood(guests, wash.price, loyaltyRate)
                  : araba
                    ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                    : kurye && courier && courierCanOrder(courier)
                      ? estimateFood(guests, courier.price, loyaltyRate)
                      : kurye
                        ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                        : bahce && garden && gardenCanOrder(garden)
                          ? estimateFood(guests, garden.price, loyaltyRate)
                          : bahce
                            ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : kargo && cargo && cargoCanOrder(cargo)
                              ? estimateFood(guests, cargo.price, loyaltyRate)
                              : kargo
                                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : cikti && print && printCanOrder(print)
                              ? estimateFood(guests, print.price, loyaltyRate)
                              : cikti
                                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : kislik && preserve && preserveCanOrder(preserve)
                              ? estimateFood(guests, preserve.price, loyaltyRate)
                              : kislik
                                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : hali && carpet && carpetCanOrder(carpet)
                              ? estimateFood(guests, carpet.price, loyaltyRate)
                              : hali
                                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : odev && lesson && lessonCanOrder(lesson)
                              ? estimateFood(guests, lesson.price, loyaltyRate)
                              : odev
                                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : dil && talk && talkCanOrder(talk)
                              ? estimateFood(guests, talk.price, loyaltyRate)
                              : dil
                                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : mezar && grave && graveCanOrder(grave)
                              ? estimateFood(guests, grave.price, loyaltyRate)
                              : mezar
                                ? { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 }
                            : estimateFor(selected, pieces, pkg, express && selected.express, loyaltyRate)
    : { total: 0, before: 0, loyaltyRate: 0, commission: 0, providerNet: 0, perPiece: 0 };

  useEffect(() => {
    function apply(loc: LngLat | null) {
      if (!loc) {
        setUser((prev) => prev ?? home ?? PILOT.center);
        return;
      }
      const dist = kmBetween(loc, PILOT.center);
      setFar(dist > PILOT.radiusKm);
      setUser(dist > PILOT.radiusKm ? (home ?? PILOT.center) : loc);
    }

    apply(null);
    const unsub = subscribeLocation(apply);
    void readLocationIfGranted().then(apply);
    return unsub;
  }, [homeLat, homeLng]);

  useEffect(() => {
    if (pane === "map") {
      setSheet("list");
      setSelectedId(null);
    }
  }, [pane]);

  useEffect(() => {
    if (pane !== "orders") return;
    setHello(false);
    const prefer =
      orders.find((o) => o.status === "hazir") ??
      orders.find((o) => o.status !== "teslim_edildi" && o.status !== "iptal") ??
      orders[0];
    if (prefer) {
      setActiveId(prefer.id);
      setSheet("track");
    } else {
      setSheet("list");
    }
  }, [pane, orders]);

  useEffect(() => {
    if (selected) {
      if (isDavet(selected)) {
        const first = selected.products?.[0]?.id ?? null;
        setProductId(selected.products?.some((x) => x.id === productId) ? productId : first);
      } else if (isDikis(selected)) {
        const first = selected.services?.[0]?.id ?? null;
        setProductId(selected.services?.some((x) => x.id === productId) ? productId : first);
      } else if (isTamir(selected)) {
        const first = selected.repairs?.[0]?.id ?? null;
        setProductId(selected.repairs?.some((x) => x.id === productId) ? productId : first);
      } else if (isTeknoloji(selected)) {
        const first = selected.techs?.[0]?.id ?? null;
        setProductId(selected.techs?.some((x) => x.id === productId) ? productId : first);
      } else if (isAraba(selected)) {
        const first = selected.washes?.[0]?.id ?? null;
        setProductId(selected.washes?.some((x) => x.id === productId) ? productId : first);
      } else if (isKurye(selected)) {
        const first = selected.couriers?.[0]?.id ?? null;
        setProductId(selected.couriers?.some((x) => x.id === productId) ? productId : first);
      } else if (isBahce(selected)) {
        const first = selected.gardens?.[0]?.id ?? null;
        setProductId(selected.gardens?.some((x) => x.id === productId) ? productId : first);
      } else if (isKargo(selected)) {
        const first = selected.cargos?.[0]?.id ?? null;
        setProductId(selected.cargos?.some((x) => x.id === productId) ? productId : first);
      } else if (isCikti(selected)) {
        const first = selected.prints?.[0]?.id ?? null;
        setProductId(selected.prints?.some((x) => x.id === productId) ? productId : first);
      } else if (isKislik(selected)) {
        const first = selected.preserves?.[0]?.id ?? null;
        setProductId(selected.preserves?.some((x) => x.id === productId) ? productId : first);
      } else if (isHali(selected)) {
        const first = selected.carpets?.[0]?.id ?? null;
        setProductId(selected.carpets?.some((x) => x.id === productId) ? productId : first);
      } else if (isOdev(selected)) {
        const first = selected.lessons?.[0]?.id ?? null;
        setProductId(selected.lessons?.some((x) => x.id === productId) ? productId : first);
      } else if (isDil(selected)) {
        const first = selected.talks?.[0]?.id ?? null;
        setProductId(selected.talks?.some((x) => x.id === productId) ? productId : first);
      } else if (isMezar(selected)) {
        const first = selected.graves?.[0]?.id ?? null;
        setProductId(selected.graves?.some((x) => x.id === productId) ? productId : first);
      } else {
        setPkg(selected.packages.some((x) => x.id === pkg) ? pkg : (selected.packages[0]?.id ?? "tam"));
      }
      setSlot(selected.slots[0] ?? "");
      setDrop(selected.drops.includes("kapi") ? "kapi" : "nokta");
      setExpress(false);
      setAllergy("");
      if (!selected.drops.includes("nokta")) setDropId(null);
      else if (!dropId) setDropId(dropPoints[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function openProvider(id: string) {
    setSelectedId(id);
    setSheet("provider");
    setHello(false);
  }

  function onListScroll(e: React.UIEvent<HTMLDivElement>) {
    if (pane !== "map" || sheet !== "list") return;
    if (!listTall && e.currentTarget.scrollTop > 8) setListTall(true);
  }

  function onSheetPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (pane !== "map" || sheet !== "list") return;
    listDrag.current = { y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onSheetPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!listDrag.current) return;
    const dy = listDrag.current.y - e.clientY;
    listDrag.current = null;
    if (Math.abs(dy) < 12) {
      setListTall((open) => !open);
      return;
    }
    if (dy > 28) setListTall(true);
    else if (dy < -28) setListTall(false);
  }

  async function place() {
    if (!selected || placing) return;
    setErr("");
    setPlacing(true);
    try {
      const davetOrder = isDavet(selected);
      const dikisOrder = isDikis(selected);
      const tamirOrder = isTamir(selected);
      const teknolojiOrder = isTeknoloji(selected);
      const arabaOrder = isAraba(selected);
      const kuryeOrder = isKurye(selected);
      const bahceOrder = isBahce(selected);
      const kargoOrder = isKargo(selected);
      const ciktiOrder = isCikti(selected);
      const kislikOrder = isKislik(selected);
      const haliOrder = isHali(selected);
      const odevOrder = isOdev(selected);
      const dilOrder = isDil(selected);
      const mezarOrder = isMezar(selected);
      if (davetOrder && !allergy.trim()) {
        setErr("Alerji durumunu yaz. Yoksa “yok” de.");
        setPlacing(false);
        return;
      }
      if (tamirOrder && !repairCanOrder(repair)) {
        setErr("Bu iş için önce inceleme. Fiyat ürünü görünce netleşir.");
        setPlacing(false);
        return;
      }
      if (teknolojiOrder && !techCanOrder(tech)) {
        setErr("Bu iş için önce inceleme. Fiyat cihazı görünce netleşir.");
        setPlacing(false);
        return;
      }
      if (arabaOrder && !washCanOrder(wash)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (kuryeOrder && !courierCanOrder(courier)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (bahceOrder && !gardenCanOrder(garden)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (kargoOrder && !cargoCanOrder(cargo)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (ciktiOrder && !printCanOrder(print)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (kislikOrder && !preserveCanOrder(preserve)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (haliOrder && !carpetCanOrder(carpet)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (odevOrder && !lessonCanOrder(lesson)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (dilOrder && !talkCanOrder(talk)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      if (mezarOrder && !graveCanOrder(grave)) {
        setErr("Bu hizmet için fiyat yok.");
        setPlacing(false);
        return;
      }
      const order = await postOrder(
        davetOrder
          ? {
              providerId: selected.id,
              productId: product?.id,
              guestCount: guests,
              allergyNote: allergy,
              drop,
              dropPointId: drop === "nokta" ? dropId : null,
              slot,
              note,
            }
          : dikisOrder
            ? {
                providerId: selected.id,
                productId: service?.id,
                guestCount: guests,
                drop,
                dropPointId: drop === "nokta" ? dropId : null,
                slot,
                note,
              }
            : tamirOrder
              ? {
                  providerId: selected.id,
                  productId: repair?.id,
                  guestCount: guests,
                  drop,
                  dropPointId: drop === "nokta" ? dropId : null,
                  slot,
                  note,
                }
              : teknolojiOrder
                ? {
                    providerId: selected.id,
                    productId: tech?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : arabaOrder
                ? {
                    providerId: selected.id,
                    productId: wash?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : kuryeOrder
                ? {
                    providerId: selected.id,
                    productId: courier?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : bahceOrder
                ? {
                    providerId: selected.id,
                    productId: garden?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : kargoOrder
                ? {
                    providerId: selected.id,
                    productId: cargo?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : ciktiOrder
                ? {
                    providerId: selected.id,
                    productId: print?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : kislikOrder
                ? {
                    providerId: selected.id,
                    productId: preserve?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : haliOrder
                ? {
                    providerId: selected.id,
                    productId: carpet?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : odevOrder
                ? {
                    providerId: selected.id,
                    productId: lesson?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : dilOrder
                ? {
                    providerId: selected.id,
                    productId: talk?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : mezarOrder
                ? {
                    providerId: selected.id,
                    productId: grave?.id,
                    guestCount: guests,
                    drop,
                    dropPointId: drop === "nokta" ? dropId : null,
                    slot,
                    note,
                  }
              : {
              providerId: selected.id,
              packageId: pkg,
              pieces,
              express: express && selected.express,
              drop,
              dropPointId: drop === "nokta" ? dropId : null,
              slot,
              note,
            },
      );
      await Promise.all([reloadOrders(), reloadCatalog()]);
      setActiveId(order.id);
      setSheet("track");
      onPlacedOrder?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sipariş alınamadı.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-[var(--paper)]">
      <MapCanvas
        mode={mode}
        selectedId={selectedId}
        dropId={drop === "nokta" ? dropId : null}
        user={user}
        meAvatar={meAvatar}
        providers={providers}
        dropPoints={dropPoints}
        visible={mapActive}
        onSelect={openProvider}
        onSelectDrop={(id) => {
          setDropId(id);
          setDrop("nokta");
        }}
      />
      <div className="k-map-vignette pointer-events-none absolute inset-0 z-[1]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
        <div className="k-glass k-rise pointer-events-auto rounded-2xl px-3 py-2 ring-1 ring-[var(--line)]">
          <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-lg leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--teal)]" />
            Komşudan
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{PILOT.label}</p>
        </div>
        <div className="k-rise pointer-events-auto mr-12 flex items-center gap-2" style={{ animationDelay: "60ms" }}>
          <div
            className="k-glass relative grid grid-cols-2 rounded-full p-1 ring-1 ring-[var(--line)]"
            role="group"
            aria-label="Harita görünümü"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[var(--ink)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                transform: mode === "3d" ? "translateX(calc(100% + 4px))" : "translateX(0)",
              }}
            />
            {(["2d", "3d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-medium uppercase transition-colors duration-200 ${
                  mode === m ? "text-[var(--paper)]" : "text-[var(--muted)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      {pane === "map" && (
      <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+5rem)] left-3 z-10">
        <div className="k-rise pointer-events-auto flex flex-wrap gap-1.5" style={{ animationDelay: "90ms" }}>
          {laundryInFilter(categoryIds) && (
          <button
            type="button"
            onClick={() => setDryerOnly((v) => !v)}
            className={`k-chip rounded-full px-3 py-1.5 text-xs ring-1 backdrop-blur ${
              dryerOnly
                ? "bg-[var(--teal)] text-white ring-[var(--teal)]"
                : "k-glass ring-[var(--line)]"
            }`}
          >
            Kurutucu var
          </button>
          )}
          {categoryIds && categoryIds.length > 0 && (
            <span className="k-glass inline-flex items-center rounded-full px-2.5 py-1.5 text-xs ring-1 ring-[var(--line)]">
              Seçili hizmet
            </span>
          )}
          <span className="k-glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs ring-1 ring-[var(--line)]">
            <span className="inline-grid h-3.5 w-3.5 place-items-center rounded-[3px] bg-[var(--clay)] text-[var(--paper)]" aria-hidden>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="M7 7h10l-.8 11.2a2 2 0 0 1-2 1.8H9.8a2 2 0 0 1-2-1.8L7 7Z" stroke="currentColor" strokeWidth="2.2" />
                <path d="M9 7V5.8A3 3 0 0 1 12 3a3 3 0 0 1 3 2.8V7" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </span>
            Nötr nokta
          </span>
        </div>
        {far && (
          <p className="k-glass k-rise pointer-events-auto mt-2 max-w-[16rem] rounded-xl px-3 py-2 text-xs text-[var(--muted)] ring-1 ring-[var(--line)]">
            Pilot bölge Çukurambar. Harita oraya alındı — sen uzaktasın.
          </p>
        )}
      </div>
      )}

      {hello && sheet === "list" && pane === "map" && (
        <>
          <button
            type="button"
            aria-label="Karşılamayı kapat"
            onClick={() => setHello(false)}
            className="k-welcome-dim absolute inset-0 z-[15] bg-[rgba(28,23,18,0.18)]"
          />
          <div className="absolute inset-x-0 top-[26%] z-20 mx-auto max-w-md px-4">
            <div className="k-welcome k-glass rounded-3xl p-5 shadow-[var(--shadow-pop)] ring-1 ring-[var(--line)]">
              <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">
                Bırak · işlensin · al
              </p>
              <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl leading-tight">
                Çevrende{" "}
                <span className="text-[var(--teal)] tabular-nums">{ready ? available : "—"}</span>{" "}
                kişi şu anda müsait.
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {categoryIds?.length === 1 && categoryIds[0] === "davet"
                  ? "Eve kimse girmez. Yemek kapıda veya nötr noktada teslim."
                  : categoryIds?.length === 1 && categoryIds[0] === "dikis"
                    ? "Eve kimse girmez. Dikim kapıda, adresten veya noktada teslim."
                    : categoryIds?.length === 1 && categoryIds[0] === "tamir"
                      ? "Eve kimse girmez. Tamir atölyede; kapıda, noktada veya yakın buluşmada teslim."
                      : categoryIds?.length === 1 && categoryIds[0] === "teknoloji"
                        ? "Format ve kurulum atölyede veya yerinde; kapıda, noktada veya yerinde teslim."
                        : categoryIds?.length === 1 && categoryIds[0] === "araba"
                          ? "Araç yıkanır yerinde; getir, al. Eve kimse girmez."
                          : categoryIds?.length === 1 && categoryIds[0] === "kurye"
                            ? "Paket alınır, yakında bırakılır. Eve kimse girmez."
                            : categoryIds?.length === 1 && categoryIds[0] === "bahce"
                              ? "İş bahçede yapılır; çim, budama, saksı. Eve kimse girmez."
                              : categoryIds?.length === 1 && categoryIds[0] === "kargo"
                                ? "Şubeden al, noktaya veya adrese bırak. Eve kimse girmez."
                              : categoryIds?.length === 1 && categoryIds[0] === "cikti"
                                ? "A4 çıktı evde basılır; adresten veya noktada al. Eve kimse girmez."
                              : categoryIds?.length === 1 && categoryIds[0] === "kislik"
                                ? "Kışlık evde hazırlanır; adresten veya noktada al. Eve kimse girmez."
                              : categoryIds?.length === 1 && categoryIds[0] === "hali"
                                ? "Halı evde yıkanmaz; adresten veya noktada al-ver. Eve kimse girmez."
                              : categoryIds?.length === 1 && categoryIds[0] === "odev"
                                ? "Ödev eşliği verenin evinde, ortak alanda veya online. Eve kimse girmez."
                              : categoryIds?.length === 1 && categoryIds[0] === "dil"
                                ? "Dil pratiği verenin evinde, ortak alanda veya online. Eve kimse girmez."
                              : categoryIds?.length === 1 && categoryIds[0] === "mezar"
                                ? "Mezar bakımı mezarlıkta yapılır. Eve kimse girmez."
                              : "Eve kimse girmez. Çamaşırı kapıda veya nötr noktada bırak."}
              </p>
              <button
                type="button"
                onClick={() => setHello(false)}
                className="k-press k-cta mt-4 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.28)]"
              >
                Haritayı aç
              </button>
            </div>
          </div>
        </>
      )}

      <section
        className={`absolute inset-x-0 z-10 mx-auto max-w-lg px-3 transition-[height,max-height,top] duration-300 ease-[var(--ease-out)] ${
          pane === "orders"
            ? "top-[calc(env(safe-area-inset-top)+4.25rem)] bottom-[var(--tabbar)]"
            : `bottom-[var(--tabbar)] ${
                sheet === "list"
                  ? listTall
                    ? "h-[calc(100dvh-var(--tabbar)-5.5rem)] max-h-[calc(100dvh-var(--tabbar)-5.5rem)]"
                    : "h-[38vh] max-h-[38vh]"
                  : "max-h-[calc(100dvh-var(--tabbar)-5.5rem)]"
              }`
        }`}
      >
        <div
          className="h-full overflow-y-auto overscroll-contain rounded-t-3xl bg-[var(--card)] shadow-[var(--shadow-sheet)] ring-1 ring-[var(--line)]"
          onScroll={onListScroll}
        >
          <div className="sticky top-0 z-10 flex justify-center bg-[var(--card)] pt-2 pb-1">
            <button
              type="button"
              aria-label={listTall ? "Listeyi küçült" : "Listeyi aç"}
              aria-expanded={listTall}
              className="flex h-7 w-full touch-none items-center justify-center"
              onPointerDown={onSheetPointerDown}
              onPointerUp={onSheetPointerUp}
              onPointerCancel={() => {
                listDrag.current = null;
              }}
            >
              <span className="h-1 w-10 rounded-full bg-[var(--line)]" />
            </button>
          </div>
          <div key={sheet} className="k-sheet">
            {sheet === "list" && pane === "map" && (
              <List
                ranked={ranked}
                ready={ready}
                onPick={openProvider}
                onSortChange={() => setListTall(true)}
                onTrack={
                  orders[0]
                    ? () => {
                        const prefer =
                          orders.find((o) => o.status === "hazir") ??
                          orders.find((o) => o.status !== "teslim_edildi" && o.status !== "iptal") ??
                          orders[0];
                        setActiveId(prefer.id);
                        setSheet("track");
                        onOpenOrders?.();
                      }
                    : undefined
                }
              />
            )}
            {sheet === "provider" && selected && (
              <ProviderPane
                p={selected}
                km={kmBetween(origin, selected.loc)}
                pkg={pkg}
                onPkg={setPkg}
                productId={productId}
                onProduct={setProductId}
                onBack={() => {
                  setSheet("list");
                  setSelectedId(null);
                }}
                onNext={() => {
                  if (isDavet(selected)) {
                    const prod =
                      selected.products?.find((x) => x.id === productId) ?? selected.products?.[0];
                    const { min, max } = foodQtyBounds(prod, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForFood(prod, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isDikis(selected)) {
                    const svc =
                      selected.services?.find((x) => x.id === productId) ?? selected.services?.[0];
                    const { min, max } = sewingQtyBounds(svc, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForSewing(svc, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isTamir(selected)) {
                    const card =
                      selected.repairs?.find((x) => x.id === productId) ?? selected.repairs?.[0];
                    const { min, max } = repairQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForRepair(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isTeknoloji(selected)) {
                    const card =
                      selected.techs?.find((x) => x.id === productId) ?? selected.techs?.[0];
                    const { min, max } = techQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForTech(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isAraba(selected)) {
                    const card =
                      selected.washes?.find((x) => x.id === productId) ?? selected.washes?.[0];
                    const { min, max } = washQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForWash(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isKurye(selected)) {
                    const card =
                      selected.couriers?.find((x) => x.id === productId) ?? selected.couriers?.[0];
                    const { min, max } = courierQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForCourier(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isBahce(selected)) {
                    const card =
                      selected.gardens?.find((x) => x.id === productId) ?? selected.gardens?.[0];
                    const { min, max } = gardenQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForGarden(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isKargo(selected)) {
                    const card =
                      selected.cargos?.find((x) => x.id === productId) ?? selected.cargos?.[0];
                    const { min, max } = cargoQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForCargo(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isCikti(selected)) {
                    const card =
                      selected.prints?.find((x) => x.id === productId) ?? selected.prints?.[0];
                    const { min, max } = printQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForPrint(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isKislik(selected)) {
                    const card =
                      selected.preserves?.find((x) => x.id === productId) ?? selected.preserves?.[0];
                    const { min, max } = preserveQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForPreserve(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isHali(selected)) {
                    const card =
                      selected.carpets?.find((x) => x.id === productId) ?? selected.carpets?.[0];
                    const { min, max } = carpetQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForCarpet(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isOdev(selected)) {
                    const card =
                      selected.lessons?.find((x) => x.id === productId) ?? selected.lessons?.[0];
                    const { min, max } = lessonQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForLesson(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isDil(selected)) {
                    const card =
                      selected.talks?.find((x) => x.id === productId) ?? selected.talks?.[0];
                    const { min, max } = talkQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForTalk(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else if (isMezar(selected)) {
                    const card =
                      selected.graves?.find((x) => x.id === productId) ?? selected.graves?.[0];
                    const { min, max } = graveQtyBounds(card, selected.remaining);
                    setGuests((n) => Math.min(max, Math.max(min, n)));
                    const allowed = dropsForGrave(card, selected.drops);
                    setDrop((d) => (allowed.includes(d) ? d : allowed[0] ?? d));
                  } else {
                    setPieces((n) => clampPieces(n, selected.remaining));
                  }
                  setSheet("checkout");
                }}
              />
            )}
            {sheet === "checkout" && selected && (
              <Checkout
                p={selected}
                pieces={pieces}
                onPieces={(n) => setPieces(clampPieces(n, selected.remaining))}
                guests={guests}
                onGuests={setGuests}
                allergy={allergy}
                onAllergy={setAllergy}
                product={product}
                service={service}
                repair={repair}
                tech={tech}
                wash={wash}
                courier={courier}
                garden={garden}
                cargo={cargo}
                print={print}
                preserve={preserve}
                carpet={carpet}
                lesson={lesson}
                talk={talk}
                grave={grave}
                productName={
                  mezar
                    ? grave?.name
                    : dil
                    ? talk?.name
                    : odev
                    ? lesson?.name
                    : hali
                    ? carpet?.name
                    : kislik
                    ? preserve?.name
                    : cikti
                    ? print?.name
                    : kargo
                    ? cargo?.name
                    : bahce
                    ? garden?.name
                    : kurye
                    ? courier?.name
                    : araba
                      ? wash?.name
                      : teknoloji
                        ? tech?.name
                        : tamir
                          ? repair?.name
                          : dikis
                            ? service?.name
                            : product?.name
                }
                express={express}
                onExpress={setExpress}
                drop={drop}
                onDrop={setDrop}
                dropId={dropId}
                dropPoints={dropPoints}
                onDropId={setDropId}
                slot={slot}
                onSlot={setSlot}
                note={note}
                onNote={setNote}
                quote={quote}
                loyaltyLabel={loyaltyLabel}
                err={err}
                placing={placing}
                onBack={() => setSheet("provider")}
                onPlace={() => void place()}
              />
            )}
            {sheet === "track" && active && (
              <>
                {pane === "orders" && orders.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto px-4 pb-1">
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setActiveId(o.id)}
                        className={`k-chip shrink-0 rounded-full px-2.5 py-1 text-[11px] ring-1 ${
                          o.id === active.id
                            ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                            : "ring-[var(--line)]"
                        }`}
                      >
                        {STEP_LABEL[o.status]}
                        {!o.review && o.status === "teslim_edildi" ? " · yorum" : ""}
                      </button>
                    ))}
                  </div>
                )}
                <Track
                order={active}
                provider={providers.find((p) => p.id === active.providerId)}
                backLabel={pane === "orders" ? "Harita" : "Liste"}
                onBack={() => {
                  if (pane === "orders") onBackToMap?.();
                  else setSheet("list");
                }}
                onReload={() => void Promise.all([reloadOrders(), reloadCatalog()])}
              />
              </>
            )}
            {pane === "orders" && !active && (
              <div className="p-6 pt-2">
                <h2 className="font-[family-name:var(--font-display)] text-2xl">Siparişin</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Henüz sipariş yok. Haritadan bir komşu seç, çamaşırı bırak.
                </p>
                <button
                  type="button"
                  onClick={() => onBackToMap?.()}
                  className="k-press k-cta mt-4 rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm font-medium text-white"
                >
                  Haritaya dön
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function List({
  ranked,
  ready,
  onPick,
  onTrack,
  onSortChange,
}: {
  ranked: { p: Provider; km: number }[];
  ready: boolean;
  onPick: (id: string) => void;
  onTrack?: () => void;
  onSortChange?: () => void;
}) {
  const [sort, setSort] = useState<NearbySort>("near");
  const sorted = useMemo(() => sortNearby(ranked, sort), [ranked, sort]);

  function pickSort(id: NearbySort) {
    setSort(id);
    onSortChange?.();
  }

  return (
    <div className="p-4 pt-2">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Yakındakiler</h2>
        {onTrack && (
          <button type="button" onClick={onTrack} className="k-press text-xs text-[var(--teal)]">
            Siparişimi gör
          </button>
        )}
      </div>
      <div
        className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
        role="group"
        aria-label="Sıralama"
      >
        {NEARBY_SORTS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={sort === opt.id}
            onClick={() => pickSort(opt.id)}
            className={`k-chip shrink-0 rounded-full px-2.5 py-1.5 text-xs ring-1 ${
              sort === opt.id
                ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                : "ring-[var(--line)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {!ready ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="k-skel h-[4.25rem] rounded-2xl" />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {sorted.map(({ p, km }, i) => {
            const tone = seatTone(p.remaining, p.capacity);
            const load = seatLabel(tone);
            const fill =
              tone === "full"
                ? 100
                : p.capacity > 0
                  ? Math.max(8, Math.round((p.remaining / p.capacity) * 100))
                  : 0;
            const bar =
              tone === "full"
                ? "bg-[var(--load-full)]"
                : tone === "low"
                  ? "bg-[var(--load-low)]"
                  : "bg-[var(--teal)]";
            const tag =
              tone === "full"
                ? "text-[var(--load-full)]"
                : tone === "low"
                  ? "text-[var(--load-low)]"
                  : "";
            const price = listPrice(p);
            return (
              <li key={p.id} className="k-rise" style={{ animationDelay: `${i * 45}ms` }}>
                <button
                  type="button"
                  onClick={() => onPick(p.id)}
                  className="k-card flex w-full items-center gap-3 rounded-2xl bg-[var(--paper)] px-3 py-3 text-left ring-1 ring-[var(--line)]"
                >
                  <Avatar name={p.name} url={p.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {p.neighborhood} · {formatKm(km)} · {trustLabel(p.trust)}
                      {isDavet(p)
                        ? (p.products ?? []).length
                          ? ` · ${(p.products ?? []).map((x) => x.name).join(", ")}`
                          : " · menü yok"
                        : isDikis(p)
                          ? (p.services ?? []).length
                            ? ` · ${(p.services ?? []).map((x) => x.name).join(", ")}`
                            : " · hizmet yok"
                          : isTamir(p)
                            ? (p.repairs ?? []).length
                              ? ` · ${(p.repairs ?? []).map((x) => x.name).join(", ")}`
                              : " · hizmet yok"
                            : isTeknoloji(p)
                              ? (p.techs ?? []).length
                                ? ` · ${(p.techs ?? []).map((x) => x.name).join(", ")}`
                                : " · hizmet yok"
                              : isAraba(p)
                                ? (p.washes ?? []).length
                                  ? ` · ${(p.washes ?? []).map((x) => x.name).join(", ")}`
                                  : " · hizmet yok"
                                : isKurye(p)
                                  ? (p.couriers ?? []).length
                                    ? ` · ${(p.couriers ?? []).map((x) => x.name).join(", ")}`
                                    : " · hizmet yok"
                                  : isBahce(p)
                                    ? (p.gardens ?? []).length
                                      ? ` · ${(p.gardens ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                  : isKargo(p)
                                    ? (p.cargos ?? []).length
                                      ? ` · ${(p.cargos ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                  : isCikti(p)
                                    ? (p.prints ?? []).length
                                      ? ` · ${(p.prints ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                  : isKislik(p)
                                    ? (p.preserves ?? []).length
                                      ? ` · ${(p.preserves ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                  : isHali(p)
                                    ? (p.carpets ?? []).length
                                      ? ` · ${(p.carpets ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                  : isOdev(p)
                                    ? (p.lessons ?? []).length
                                      ? ` · ${(p.lessons ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                  : isDil(p)
                                    ? (p.talks ?? []).length
                                      ? ` · ${(p.talks ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                  : isMezar(p)
                                    ? (p.graves ?? []).length
                                      ? ` · ${(p.graves ?? []).map((x) => x.name).join(", ")}`
                                      : " · hizmet yok"
                                : dryingListLabel(p)
                              ? ` · ${dryingListLabel(p)}`
                              : ""}
                      {load ? (
                        <span className={tag}>
                          {" · "}
                          {load}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-2 block h-1 w-28 overflow-hidden rounded-full bg-[var(--line)]">
                      <span
                        className={`block h-full rounded-full transition-[width,background-color] duration-500 ${bar}`}
                        style={{ width: `${fill}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block tabular-nums">{p.rating.toFixed(1)}</span>
                    <span className="text-xs text-[var(--muted)]">
                      {price == null
                        ? isTamir(p) || isTeknoloji(p)
                          ? ((isTamir(p) ? p.repairs : p.techs) ?? []).length
                            ? "inceleme"
                            : "hizmet yok"
                          : isAraba(p) || isDikis(p) || isKurye(p) || isBahce(p) || isKargo(p) || isCikti(p) || isKislik(p) || isHali(p) || isOdev(p) || isDil(p) || isMezar(p)
                            ? "hizmet yok"
                            : "menü yok"
                        : isDavet(p)
                          ? `${tl(price)}/kişi`
                          : isAraba(p)
                            ? `${tl(price)}/araç`
                            : isCikti(p)
                              ? `${tl(price)}/sayfa`
                            : isKislik(p)
                              ? `${tl(price)}/${preserveUnitMeta((p.preserves ?? []).find((x) => x.price === price)?.priceUnit ?? (p.preserves ?? [])[0]?.priceUnit).qty}`
                            : isHali(p)
                              ? `${tl(price)}/adet`
                            : isOdev(p)
                              ? `${tl(price)}/ders`
                            : isDil(p)
                              ? `${tl(price)}/görüşme`
                            : isMezar(p)
                              ? `${tl(price)}/${graveUnitMeta((p.graves ?? []).find((x) => x.price === price)?.pricing ?? (p.graves ?? [])[0]?.pricing).qty}`
                            : isKargo(p)
                              ? (p.cargos ?? []).some((x) => x.price > 0 && x.priceType === "mesafe")
                                ? `${tl(price)}'den`
                                : `${tl(price)}/paket`
                            : isKurye(p) || isBahce(p)
                              ? `${tl(price)}'den`
                            : isDikis(p) || isTamir(p) || isTeknoloji(p)
                            ? `${tl(price)}'den`
                            : `${tl(price)}/parça`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProviderPane({
  p,
  km,
  pkg,
  onPkg,
  productId,
  onProduct,
  onBack,
  onNext,
}: {
  p: Provider;
  km: number;
  pkg: PackageId;
  onPkg: (id: PackageId) => void;
  productId: string | null;
  onProduct: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const tone = seatTone(p.remaining, p.capacity);
  const davet = isDavet(p);
  const dikis = isDikis(p);
  const tamir = isTamir(p);
  const teknoloji = isTeknoloji(p);
  const araba = isAraba(p);
  const kurye = isKurye(p);
  const bahce = isBahce(p);
  const kargo = isKargo(p);
  const cikti = isCikti(p);
  const kislik = isKislik(p);
  const hali = isHali(p);
  const odev = isOdev(p);
  const dil = isDil(p);
  const mezar = isMezar(p);
  const unitCatalog = davet || dikis || tamir || teknoloji || araba || kurye || bahce || kargo || cikti || kislik || hali || odev || dil || mezar;
  const items = davet
    ? (p.products ?? [])
    : dikis
      ? (p.services ?? [])
      : tamir
        ? (p.repairs ?? [])
        : teknoloji
          ? (p.techs ?? [])
          : araba
            ? (p.washes ?? [])
            : kurye
              ? (p.couriers ?? [])
              : bahce
                ? (p.gardens ?? [])
                : kargo
                  ? (p.cargos ?? [])
                  : cikti
                    ? (p.prints ?? [])
                    : kislik
                      ? (p.preserves ?? [])
                    : hali
                      ? (p.carpets ?? [])
                    : odev
                      ? (p.lessons ?? [])
                    : dil
                      ? (p.talks ?? [])
                    : mezar
                      ? (p.graves ?? [])
            : p.packages;
  const canNext = unitCatalog ? items.length > 0 : p.packages.length > 0;
  return (
    <div className="p-4 pt-2">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        ← Liste
      </button>
      <div className="mt-2 flex items-start gap-3">
        <Avatar name={p.name} url={p.avatarUrl} size="lg" />
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">{p.name}</h2>
          <p className="text-sm text-[var(--muted)]">
            {p.neighborhood} · {formatKm(km)} · {p.rating} ({p.reviews} yorum) ·{" "}
            <span
              className={
                tone === "full"
                  ? "text-[var(--load-full)]"
                  : tone === "low"
                    ? "text-[var(--load-low)]"
                    : ""
              }
            >
              {p.remaining <= 0
                ? "bugün dolu"
                : davet
                  ? `bugün ${p.remaining} kişilik yer`
                  : cikti
                    ? `bugün ${p.remaining} sayfa yer`
                    : kislik
                    ? `bugün ${p.remaining} yer`
                    : hali
                    ? `bugün ${p.remaining} adet yer`
                    : odev
                    ? `bugün ${p.remaining} ders yer`
                    : dil
                    ? `bugün ${p.remaining} görüşme yer`
                    : mezar
                    ? `bugün ${p.remaining} iş yer`
                    : dikis || tamir || teknoloji || araba || kurye || bahce || kargo
                    ? `bugün ${p.remaining} yer`
                    : `bugün ${p.remaining} parça yer`}
            </span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{p.bio}</p>
      {(p.workPhotos.length > 0 || p.recentReviews.length > 0) && (
        <>
          <h3 className="mt-4 text-sm font-medium">Yorumlar</h3>
          {p.workPhotos.length > 0 && <PhotoStrip photos={p.workPhotos} />}
          <ReviewList reviews={p.recentReviews} />
        </>
      )}
      <div className="mt-4 grid gap-2">
        {davet
          ? (p.products ?? []).map((item) => {
              const unit = foodUnitMeta(item.priceUnit);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">
                        {tl(item.pricePerPerson)}/{unit.label}
                      </span>
                    </span>
                    {(item.description || foodCategoryLabel(item.foodCategory)) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[foodCategoryLabel(item.foodCategory), item.description].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          : dikis
            ? (p.services ?? []).map((item) => {
                const unit = sewingUnitMeta(item.priceUnit);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onProduct(item.id)}
                    className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                      productId === item.id
                        ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                        : "bg-[var(--paper)] ring-[var(--line)]"
                    }`}
                  >
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between font-medium">
                        {item.name}
                        <span className="tabular-nums">
                          {tl(item.price)}/{unit.label.toLowerCase()}
                        </span>
                      </span>
                      {(item.description || sewingSubcategoryLabel(item.subcategory)) && (
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {[sewingSubcategoryLabel(item.subcategory), item.description].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
          : tamir
            ? (p.repairs ?? []).map((item) => {
                const unit = repairUnitMeta(item.priceUnit);
                const priced = repairCanOrder(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onProduct(item.id)}
                    className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                      productId === item.id
                        ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                        : "bg-[var(--paper)] ring-[var(--line)]"
                    }`}
                  >
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between font-medium">
                        {item.name}
                        <span className="tabular-nums">
                          {priced
                            ? `${item.priceType === "baslangic" ? `${tl(item.price)}'ten` : tl(item.price)}/${unit.label.toLowerCase()}`
                            : "inceleme"}
                        </span>
                      </span>
                      {(item.description || repairKindLabel(item.kind) || repairJobLabel(item.job)) && (
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {[repairKindLabel(item.kind), repairJobLabel(item.job), item.item, item.description]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
          : teknoloji
            ? (p.techs ?? []).map((item) => {
                const unit = techUnitMeta(item.priceUnit);
                const priced = techCanOrder(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onProduct(item.id)}
                    className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                      productId === item.id
                        ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                        : "bg-[var(--paper)] ring-[var(--line)]"
                    }`}
                  >
                    {item.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between font-medium">
                        {item.name}
                        <span className="tabular-nums">
                          {priced
                            ? `${item.priceType === "baslangic" ? `${tl(item.price)}'ten` : tl(item.price)}/${unit.label.toLowerCase()}`
                            : "inceleme"}
                        </span>
                      </span>
                      {(item.description || techKindLabel(item.kind) || techJobLabel(item.job)) && (
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {[techKindLabel(item.kind), techJobLabel(item.job), item.item, item.description]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
          : araba
            ? (p.washes ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">{tl(item.price)}/araç</span>
                    </span>
                    {(item.description || washJobLabel(item.job) || washVehicleLabel(item.vehicle)) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[washJobLabel(item.job), washVehicleLabel(item.vehicle), item.description]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : kurye
            ? (p.couriers ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">
                        {item.priceType === "mesafe" ? `${tl(item.price)}'den` : `${tl(item.price)}/gönderi`}
                      </span>
                    </span>
                    {(item.description || courierTransportList(item.transport).length || item.maxKm) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[
                          courierTransportList(item.transport).join(", ") || null,
                          item.maxKm ? `${item.maxKm} km'ye kadar` : null,
                          item.description,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : bahce
            ? (p.gardens ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">
                        {item.priceType === "sabit" ? `${tl(item.price)}/iş` : `${tl(item.price)}'den`}
                      </span>
                    </span>
                    {(item.description || gardenJobList(item.jobs).length) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[gardenJobList(item.jobs).slice(0, 3).join(", ") || null, item.description]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : kargo
            ? (p.cargos ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">
                        {item.priceType === "mesafe" ? `${tl(item.price)}'den` : `${tl(item.price)}/paket`}
                      </span>
                    </span>
                    {(cargoJobList(item.jobs).length || item.maxKm) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[
                          cargoJobList(item.jobs).slice(0, 2).join(", ") || null,
                          item.maxKm ? `${item.maxKm} km çevresinde` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : cikti
            ? (p.prints ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">{tl(item.price)}/sayfa</span>
                    </span>
                    {(printColorList(item.colors).length || printSideList(item.sides).length) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[printColorList(item.colors).join(", ") || null, printSideList(item.sides).join(", ") || null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : kislik
            ? (p.preserves ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">
                        {tl(item.price)}/{preserveUnitMeta(item.priceUnit).qty}
                      </span>
                    </span>
                    {(preserveKindList(item.kinds).length || item.description) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[preserveKindList(item.kinds).slice(0, 2).join(", ") || null, item.description]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : hali
            ? (p.carpets ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">{tl(item.price)}/adet</span>
                    </span>
                    {(carpetKindList(item.kinds).length || carpetSizeList(item.sizes).length) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[
                          carpetKindList(item.kinds).slice(0, 2).join(", ") || null,
                          carpetSizeList(item.sizes).slice(0, 2).join(", ") || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : odev
            ? (p.lessons ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">{tl(item.price)}/ders</span>
                    </span>
                    {(lessonKindList(item.kinds).length || lessonLevelList(item.levels).length) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[
                          lessonKindList(item.kinds).slice(0, 2).join(", ") || null,
                          lessonLevelList(item.levels).join(", ") || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : dil
            ? (p.talks ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">{tl(item.price)}/görüşme</span>
                    </span>
                    {(talkLangList(item.langs, item.langOther).length || talkKindList(item.kinds).length) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[
                          talkLangList(item.langs, item.langOther).slice(0, 2).join(", ") || null,
                          talkKindList(item.kinds).slice(0, 2).join(", ") || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : mezar
            ? (p.graves ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onProduct(item.id)}
                  className={`k-chip flex w-full gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${
                    productId === item.id
                      ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                      : "bg-[var(--paper)] ring-[var(--line)]"
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between font-medium">
                      {item.name}
                      <span className="tabular-nums">
                        {tl(item.price)}/{graveUnitMeta(item.pricing).qty}
                      </span>
                    </span>
                    {(graveKindList(item.kinds).length || item.cemetery) && (
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {[
                          graveKindList(item.kinds).slice(0, 2).join(", ") || null,
                          item.cemetery || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))
          : p.packages.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => onPkg(pack.id)}
                className={`k-chip rounded-2xl px-3 py-3 text-left ring-1 ${
                  pkg === pack.id
                    ? "bg-[var(--sand)] ring-[var(--clay)] shadow-[0_0_0_1px_rgba(196,92,38,0.12)]"
                    : "bg-[var(--paper)] ring-[var(--line)]"
                }`}
              >
                <span className="flex justify-between font-medium">
                  {pack.title}
                  <span className="tabular-nums">{tl(pack.pricePerPiece)}/parça</span>
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{pack.blurb}</span>
              </button>
            ))}
        {davet && (p.products ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz menü eklemedi.</p>
        )}
        {dikis && (p.services ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {tamir && (p.repairs ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {teknoloji && (p.techs ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {araba && (p.washes ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {kurye && (p.couriers ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {bahce && (p.gardens ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {kargo && (p.cargos ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {cikti && (p.prints ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {kislik && (p.preserves ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {hali && (p.carpets ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {odev && (p.lessons ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {dil && (p.talks ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
        {mezar && (p.graves ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted)]">Bu komşu henüz hizmet eklemedi.</p>
        )}
      </div>
      <button
        type="button"
        disabled={!canNext}
        onClick={onNext}
        className="k-press k-cta mt-4 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.22)] disabled:opacity-40"
      >
        {davet ? "Devam · miktar ve alerji" : unitCatalog ? "Devam · miktar ve teslimat" : "Devam · parça ve teslimat"}
      </button>
    </div>
  );
}

function Checkout({
  p,
  pieces,
  onPieces,
  guests,
  onGuests,
  allergy,
  onAllergy,
  product,
  service,
  repair,
  tech,
  wash,
  courier,
  garden,
  cargo,
  print,
  preserve,
  carpet,
  lesson,
  talk,
  grave,
  productName,
  express,
  onExpress,
  drop,
  onDrop,
  dropId,
  dropPoints,
  onDropId,
  slot,
  onSlot,
  note,
  onNote,
  quote,
  loyaltyLabel,
  err,
  placing,
  onBack,
  onPlace,
}: {
  p: Provider;
  pieces: number;
  onPieces: (n: number) => void;
  guests: number;
  onGuests: (n: number) => void;
  allergy: string;
  onAllergy: (s: string) => void;
  product?: ProviderProduct;
  service?: ProviderService;
  repair?: ProviderRepair;
  tech?: ProviderTech;
  wash?: ProviderWash;
  courier?: ProviderCourier;
  garden?: ProviderGarden;
  cargo?: ProviderCargo;
  print?: ProviderPrint;
  preserve?: ProviderPreserve;
  carpet?: ProviderCarpet;
  lesson?: ProviderLesson;
  talk?: ProviderTalk;
  grave?: ProviderGrave;
  productName?: string;
  express: boolean;
  onExpress: (v: boolean) => void;
  drop: DropMethod;
  onDrop: (v: DropMethod) => void;
  dropId: string | null;
  dropPoints: DropPoint[];
  onDropId: (id: string) => void;
  slot: string;
  onSlot: (s: string) => void;
  note: string;
  onNote: (s: string) => void;
  quote: { total: number; before: number; loyaltyRate: number; commission: number; providerNet: number };
  loyaltyLabel: string;
  err: string;
  placing: boolean;
  onBack: () => void;
  onPlace: () => void;
}) {
  const davet = isDavet(p);
  const dikis = isDikis(p);
  const tamir = isTamir(p);
  const teknoloji = isTeknoloji(p);
  const araba = isAraba(p);
  const kurye = isKurye(p);
  const bahce = isBahce(p);
  const kargo = isKargo(p);
  const cikti = isCikti(p);
  const kislik = isKislik(p);
  const hali = isHali(p);
  const odev = isOdev(p);
  const dil = isDil(p);
  const mezar = isMezar(p);
  const unitPriced = davet || dikis || tamir || teknoloji || araba || kurye || bahce || kargo || cikti || kislik || hali || odev || dil || mezar;
  const unit = mezar
    ? graveUnitMeta(grave?.pricing)
    : dil
    ? TALK_UNIT
    : odev
    ? LESSON_UNIT
    : hali
    ? CARPET_UNIT
    : kislik
    ? preserveUnitMeta(preserve?.priceUnit)
    : cikti
    ? PRINT_UNIT
    : kargo
    ? CARGO_UNIT
    : bahce
    ? GARDEN_UNIT
    : kurye
    ? COURIER_UNIT
    : araba
    ? WASH_UNIT
    : teknoloji
      ? techUnitMeta(tech?.priceUnit)
      : tamir
        ? repairUnitMeta(repair?.priceUnit)
        : dikis
          ? sewingUnitMeta(service?.priceUnit)
          : foodUnitMeta(product?.priceUnit);
  const bounds = mezar
    ? graveQtyBounds(grave, p.remaining)
    : dil
    ? talkQtyBounds(talk, p.remaining)
    : odev
    ? lessonQtyBounds(lesson, p.remaining)
    : hali
    ? carpetQtyBounds(carpet, p.remaining)
    : kislik
    ? preserveQtyBounds(preserve, p.remaining)
    : cikti
    ? printQtyBounds(print, p.remaining)
    : kargo
    ? cargoQtyBounds(cargo, p.remaining)
    : bahce
    ? gardenQtyBounds(garden, p.remaining)
    : kurye
    ? courierQtyBounds(courier, p.remaining)
    : araba
    ? washQtyBounds(wash, p.remaining)
    : teknoloji
      ? techQtyBounds(tech, p.remaining)
      : tamir
        ? repairQtyBounds(repair, p.remaining)
        : dikis
          ? sewingQtyBounds(service, p.remaining)
          : foodQtyBounds(product, p.remaining);
  const cap = unitPriced ? bounds.max : Math.min(PIECES_MAX, p.remaining > 0 ? p.remaining : PIECES_MAX);
  const minCount = unitPriced ? bounds.min : PIECES_MIN;
  const foodDrops = mezar
    ? dropsForGrave(grave, p.drops)
    : dil
    ? dropsForTalk(talk, p.drops)
    : odev
    ? dropsForLesson(lesson, p.drops)
    : hali
    ? dropsForCarpet(carpet, p.drops)
    : kislik
    ? dropsForPreserve(preserve, p.drops)
    : cikti
    ? dropsForPrint(print, p.drops)
    : kargo
    ? dropsForCargo(cargo, p.drops)
    : bahce
    ? dropsForGarden(garden, p.drops)
    : kurye
    ? dropsForCourier(courier, p.drops)
    : araba
    ? dropsForWash(wash, p.drops)
    : teknoloji
      ? dropsForTech(tech, p.drops)
      : tamir
        ? dropsForRepair(repair, p.drops)
        : dikis
          ? dropsForSewing(service, p.drops)
          : davet
            ? dropsForFood(product, p.drops)
            : p.drops;
  const [draft, setDraft] = useState(String(unitPriced ? guests : pieces));

  useEffect(() => {
    setDraft(String(unitPriced ? guests : pieces));
  }, [unitPriced, guests, pieces]);

  function clampGuests(n: number) {
    if (!Number.isFinite(n)) return bounds.min;
    return Math.min(bounds.max, Math.max(bounds.min, Math.round(n)));
  }

  function typeCount(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, unit.id === "sayfa" || unit.id === "kg" ? 3 : 2);
    setDraft(digits);
    if (!digits) return;
    if (unitPriced) onGuests(clampGuests(Number(digits)));
    else onPieces(clampPieces(Number(digits), p.remaining));
  }

  function commitCount() {
    if (unitPriced) onGuests(clampGuests(Number(draft) || bounds.min));
    else onPieces(clampPieces(Number(draft) || PIECES_MIN, p.remaining));
  }

  const count = unitPriced ? guests : pieces;
  const unitPrice = mezar
    ? (grave?.price ?? 0)
    : dil
    ? (talk?.price ?? 0)
    : odev
    ? (lesson?.price ?? 0)
    : hali
    ? (carpet?.price ?? 0)
    : kislik
    ? (preserve?.price ?? 0)
    : cikti
    ? (print?.price ?? 0)
    : kargo
    ? (cargo?.price ?? 0)
    : bahce
    ? (garden?.price ?? 0)
    : kurye
    ? (courier?.price ?? 0)
    : araba
    ? (wash?.price ?? 0)
    : teknoloji
      ? (tech?.price ?? 0)
      : tamir
        ? (repair?.price ?? 0)
        : dikis
          ? (service?.price ?? 0)
          : (product?.pricePerPerson ?? 0);
  const canPlace =
    (!tamir || repairCanOrder(repair)) &&
    (!teknoloji || techCanOrder(tech)) &&
    (!araba || washCanOrder(wash)) &&
    (!kurye || courierCanOrder(courier)) &&
    (!bahce || gardenCanOrder(garden)) &&
    (!kargo || cargoCanOrder(cargo)) &&
    (!cikti || printCanOrder(print)) &&
    (!kislik || preserveCanOrder(preserve)) &&
    (!hali || carpetCanOrder(carpet)) &&
    (!odev || lessonCanOrder(lesson)) &&
    (!dil || talkCanOrder(talk)) &&
    (!mezar || graveCanOrder(grave));
  const qtyTitle =
    unit.id === "kisi" ? "Kaç kişilik?" : unit.id === "kg" ? "Kaç kg?" : `Kaç ${unit.qty}?`;

  return (
    <div className="p-4 pt-2">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        {davet ? "← Menü" : dikis || tamir || teknoloji || araba || kurye || bahce || kargo || cikti || kislik || hali || odev || dil || mezar ? "← Hizmet" : "← Paket"}
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">
        {unitPriced ? qtyTitle : "Kaç parça?"}
      </h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {unitPriced
          ? `${productName ?? (dikis || tamir || teknoloji || araba || kurye || bahce || kargo || cikti || kislik || hali || odev || dil || mezar ? "Seçili hizmet" : "Seçili yemek")} · ${
              (tamir || teknoloji) && !canPlace
                ? "fiyat inceleme sonrası."
                : kurye && courier?.priceType === "mesafe"
                  ? `${tl(unitPrice)}'den, mesafeye göre.`
                : kargo && cargo?.priceType === "mesafe"
                  ? `${tl(unitPrice)}'den, mesafeye göre.`
                : bahce && garden?.priceType && garden.priceType !== "sabit"
                  ? `${tl(unitPrice)}'den, ${gardenPriceTypeLabel(garden.priceType).toLowerCase()}.`
                : `${tl(unitPrice)}/${unit.label.toLowerCase()}.`
            } ${bounds.min}–${cap} ${unit.qty}.`
          : `Gömlek, pantolon, tişört birer parça. Nevresim / yorgan iki sayılır. Sen yaz, 1–${cap}.`}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label={unitPriced ? `Bir ${unit.qty} azalt` : "Bir parça azalt"}
          disabled={count <= minCount}
          onClick={() => (unitPriced ? onGuests(count - 1) : onPieces(count - 1))}
          className="k-press grid h-11 w-11 place-items-center rounded-full text-lg ring-1 ring-[var(--line)] disabled:opacity-40"
        >
          −
        </button>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={unitPriced ? `${unit.qty} sayısı` : "Parça sayısı"}
          value={draft}
          onChange={(e) => typeCount(e.target.value)}
          onBlur={commitCount}
          className="h-11 w-20 rounded-2xl bg-[var(--paper)] text-center font-[family-name:var(--font-display)] text-2xl tabular-nums ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
        />
        <button
          type="button"
          aria-label={unitPriced ? `Bir ${unit.qty} ekle` : "Bir parça ekle"}
          disabled={count >= cap}
          onClick={() => (unitPriced ? onGuests(count + 1) : onPieces(count + 1))}
          className="k-press grid h-11 w-11 place-items-center rounded-full text-lg ring-1 ring-[var(--line)] disabled:opacity-40"
        >
          +
        </button>
        <span className="text-sm text-[var(--muted)]">{unitPriced ? unit.qty : "parça"}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(unitPriced ? [bounds.min, 4, 8, 12, 16, 24].filter((n, i, a) => n <= cap && a.indexOf(n) === i) : PIECES)
          .filter((n) => n <= cap)
          .map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => (unitPriced ? onGuests(n) : onPieces(n))}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              count === n
                ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                : "ring-[var(--line)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {p.remaining > 0 && p.remaining < (unitPriced ? bounds.max : PIECES_MAX) && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Bugün en fazla {p.remaining} {unitPriced ? unit.qty : "parça"} yer var.
        </p>
      )}
      {davet && foodLeadLabel(product?.leadHours) && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Sipariş için minimum süre: {foodLeadLabel(product?.leadHours)}.
        </p>
      )}
      {dikis && sewingLeadLabel(service?.leadDays) && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Tahmini hazırlama: {sewingLeadLabel(service?.leadDays)}.
        </p>
      )}
      {dikis && sewingMaterialLabel(service?.material) && (
        <p className="mt-2 text-xs text-[var(--muted)]">Malzeme: {sewingMaterialLabel(service?.material)}</p>
      )}
      {dikis && service?.workRadiusKm ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma alanı: {service.workRadiusKm} km</p>
      ) : null}
      {dikis && service?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{service.notes}</p>
      ) : null}
      {tamir && repairLeadLabel(repair?.leadDays) && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Tahmini tamir: {repairLeadLabel(repair?.leadDays)}.
        </p>
      )}
      {tamir && repairPartsLabel(repair?.parts) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{repairPartsLabel(repair?.parts)}</p>
      ) : null}
      {tamir && repair?.inspectRequired ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Ön inceleme gerekli.</p>
      ) : null}
      {tamir && repairQuoteLabel(repair?.quoteFrom) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{repairQuoteLabel(repair?.quoteFrom)}</p>
      ) : null}
      {tamir && repair?.warrantyDays != null ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Garanti / tekrar kontrol: {repair.warrantyDays} gün</p>
      ) : null}
      {tamir && repair?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma saatleri: {repair.workHours}</p>
      ) : null}
      {tamir && repair?.workRadiusKm ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Hizmet bölgesi: {repair.workRadiusKm} km</p>
      ) : null}
      {tamir && repair?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{repair.notes}</p>
      ) : null}
      {tamir && repairPriceTypeLabel(repair?.priceType) && canPlace ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{repairPriceTypeLabel(repair?.priceType)}</p>
      ) : null}
      {teknoloji && techLeadLabel(tech) ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Tahmini işlem: {techLeadLabel(tech)}.</p>
      ) : null}
      {teknoloji && techMaterialsLabel(tech?.materials) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{techMaterialsLabel(tech?.materials)}</p>
      ) : null}
      {teknoloji && tech?.inspectRequired ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Ön inceleme gerekli.</p>
      ) : null}
      {teknoloji && tech?.quoteFromPhoto ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Fotoğraf / video ile ön değerlendirme mümkün.</p>
      ) : null}
      {teknoloji && tech?.platform ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Platform: {tech.platform}</p>
      ) : null}
      {teknoloji && tech?.warrantyDays != null ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Garanti / tekrar kontrol: {tech.warrantyDays} gün</p>
      ) : null}
      {teknoloji && tech?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma saatleri: {tech.workHours}</p>
      ) : null}
      {teknoloji && tech?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{tech.notes}</p>
      ) : null}
      {teknoloji && techPriceTypeLabel(tech?.priceType) && canPlace ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{techPriceTypeLabel(tech?.priceType)}</p>
      ) : null}
      {araba && washDurationLabel(wash?.durationMin) ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Tahmini süre: {washDurationLabel(wash?.durationMin)}.</p>
      ) : null}
      {araba && washIncludesList(wash?.includes).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Dahil: {washIncludesList(wash?.includes).join(", ")}</p>
      ) : null}
      {araba && washBookingLabel(wash?.booking) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{washBookingLabel(wash?.booking)}</p>
      ) : null}
      {araba && wash?.location ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Konum: {wash.location}</p>
      ) : null}
      {araba && washMaterialsLabel(wash?.materials) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{washMaterialsLabel(wash?.materials)}</p>
      ) : null}
      {araba && wash?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma saatleri: {wash.workHours}</p>
      ) : null}
      {araba && wash?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{wash.notes}</p>
      ) : null}
      {kurye && courierDurationLabel(courier?.durationMin) ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Tahmini teslim: {courierDurationLabel(courier?.durationMin)}.</p>
      ) : null}
      {kurye && courier?.maxKm ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{courier.maxKm} km&apos;ye kadar</p>
      ) : null}
      {kurye && courierTransportList(courier?.transport).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Ulaşım: {courierTransportList(courier?.transport).join(", ")}</p>
      ) : null}
      {kurye && courierSizeList(courier?.sizes).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Paket: {courierSizeList(courier?.sizes).join(", ")}</p>
      ) : null}
      {kurye && courierRouteList(courier?.routes).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{courierRouteList(courier?.routes).join(" · ")}</p>
      ) : null}
      {kurye && courierAvailLabel(courier?.avail) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{courierAvailLabel(courier?.avail)}</p>
      ) : null}
      {kurye && courier?.region ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Bölge: {courier.region}</p>
      ) : null}
      {kurye && courierCarryList(courier?.carry, courier?.carryOther).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Taşır: {courierCarryList(courier?.carry, courier?.carryOther).join(", ")}
        </p>
      ) : null}
      {kurye && courier?.refuse ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Taşımaz: {courier.refuse}</p>
      ) : null}
      {kurye && courierConfirmList(courier?.confirm).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Onay: {courierConfirmList(courier?.confirm).join(", ")}</p>
      ) : null}
      {kurye && courier?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma saatleri: {courier.workHours}</p>
      ) : null}
      {kurye && courier?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{courier.notes}</p>
      ) : null}
      {kurye && courierPriceTypeLabel(courier?.priceType) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{courierPriceTypeLabel(courier?.priceType)}</p>
      ) : null}
      {bahce && gardenDurationLabel(garden?.durationMin) ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Tahmini süre: {gardenDurationLabel(garden?.durationMin)}.</p>
      ) : null}
      {bahce && gardenJobList(garden?.jobs).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{gardenJobList(garden?.jobs).join(", ")}</p>
      ) : null}
      {bahce && gardenAreaList(garden?.areas).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{gardenAreaList(garden?.areas).join(", ")}</p>
      ) : null}
      {bahce && gardenEquipmentLabel(garden?.equipment) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{gardenEquipmentLabel(garden?.equipment)}</p>
      ) : null}
      {bahce && garden?.location ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Konum: {garden.location}</p>
      ) : null}
      {bahce && garden?.maxKm ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{garden.maxKm} km&apos;ye kadar</p>
      ) : null}
      {bahce && gardenAvailLabel(garden?.avail) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{gardenAvailLabel(garden?.avail)}</p>
      ) : null}
      {bahce && garden?.canDo ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Yapar: {garden.canDo}</p>
      ) : null}
      {bahce && garden?.cannotDo ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Yapmaz: {garden.cannotDo}</p>
      ) : null}
      {bahce && garden?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma saatleri: {garden.workHours}</p>
      ) : null}
      {bahce && garden?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{garden.notes}</p>
      ) : null}
      {bahce && gardenPriceTypeLabel(garden?.priceType) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{gardenPriceTypeLabel(garden?.priceType)}</p>
      ) : null}
      {kargo && cargoDurationLabel(cargo?.durationMin) ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Tahmini süre: {cargoDurationLabel(cargo?.durationMin)}.</p>
      ) : null}
      {kargo && cargoJobList(cargo?.jobs).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{cargoJobList(cargo?.jobs).join(", ")}</p>
      ) : null}
      {kargo && cargoSizeList(cargo?.sizes).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Paket: {cargoSizeList(cargo?.sizes).join(", ")}</p>
      ) : null}
      {kargo && cargo?.maxKm ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{cargo.maxKm} km çevresinde</p>
      ) : null}
      {kargo && cargo?.branches ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Şubeler: {cargo.branches}</p>
      ) : null}
      {kargo && cargo?.points ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Noktalar: {cargo.points}</p>
      ) : null}
      {kargo && cargoPickupList(cargo?.pickup).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Alma: {cargoPickupList(cargo?.pickup).join(", ")}</p>
      ) : null}
      {kargo && cargoDropList(cargo?.dropoff).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Bırakma: {cargoDropList(cargo?.dropoff).join(", ")}</p>
      ) : null}
      {kargo && cargoConfirmList(cargo?.confirm).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Doğrulama: {cargoConfirmList(cargo?.confirm).join(", ")}</p>
      ) : null}
      {kargo && cargoAvailLabel(cargo?.avail) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{cargoAvailLabel(cargo?.avail)}</p>
      ) : null}
      {kargo && cargo?.refuse ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Taşımaz: {cargo.refuse}</p>
      ) : null}
      {kargo && cargo?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma saatleri: {cargo.workHours}</p>
      ) : null}
      {kargo && cargo?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{cargo.notes}</p>
      ) : null}
      {kargo && cargoPriceTypeLabel(cargo?.priceType) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{cargoPriceTypeLabel(cargo?.priceType)}</p>
      ) : null}
      {cikti && printDurationLabel(print?.durationMin) ? (
        <p className="mt-3 text-xs text-[var(--muted)]">Hazırlama: {printDurationLabel(print?.durationMin)}.</p>
      ) : null}
      {cikti && printColorList(print?.colors).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{printColorList(print?.colors).join(", ")}</p>
      ) : null}
      {cikti && printPaperList(print?.paper).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{printPaperList(print?.paper).join(", ")}</p>
      ) : null}
      {cikti && printSideList(print?.sides).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{printSideList(print?.sides).join(", ")}</p>
      ) : null}
      {cikti && printFileList(print?.files).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Dosya: {printFileList(print?.files).join(", ")}</p>
      ) : null}
      {cikti && print?.minPages ? (
        <p className="mt-2 text-xs text-[var(--muted)]">En az {print.minPages} sayfa</p>
      ) : null}
      {cikti && printSendList(print?.send).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Gönderim: {printSendList(print?.send).join(", ")}</p>
      ) : null}
      {cikti && printPickupList(print?.pickup).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Alma: {printPickupList(print?.pickup).join(", ")}</p>
      ) : null}
      {cikti && printAvailLabel(print?.avail) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{printAvailLabel(print?.avail)}</p>
      ) : null}
      {cikti && print?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Çalışma saatleri: {print.workHours}</p>
      ) : null}
      {cikti && print?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{print.notes}</p>
      ) : null}
      {kislik && preserve?.description ? (
        <p className="mt-3 text-xs text-[var(--muted)]">{preserve.description}</p>
      ) : null}
      {kislik && preserveKindList(preserve?.kinds).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{preserveKindList(preserve?.kinds).join(", ")}</p>
      ) : null}
      {kislik && preserve?.portion ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Porsiyon: {preserve.portion}</p>
      ) : null}
      {kislik && preserve?.ingredients ? (
        <p className="mt-2 text-xs text-[var(--muted)]">İçerik: {preserve.ingredients}</p>
      ) : null}
      {kislik && preserveMaterialLabel(preserve?.material) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{preserveMaterialLabel(preserve?.material)}</p>
      ) : null}
      {kislik && preserveDaysLabel(preserve?.leadDays) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Hazırlama: {preserveDaysLabel(preserve?.leadDays)}.</p>
      ) : null}
      {kislik && preserveDaysLabel(preserve?.noticeDays, " önce") ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Bildirim: {preserveDaysLabel(preserve?.noticeDays, " önce")}.
        </p>
      ) : null}
      {kislik && preserveStorageList(preserve?.storage).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{preserveStorageList(preserve?.storage).join(", ")}</p>
      ) : null}
      {kislik && preservePickupList(preserve?.pickup).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Alma: {preservePickupList(preserve?.pickup).join(", ")}</p>
      ) : null}
      {kislik && preserve?.season ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{preserve.season}</p>
      ) : null}
      {kislik && preserve?.minOrder ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          En az {preserve.minOrder} {preserveUnitMeta(preserve.priceUnit).qty}
        </p>
      ) : null}
      {kislik && preserve?.allergens ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Alerjen: {preserve.allergens}</p>
      ) : null}
      {kislik && preserve?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{preserve.notes}</p>
      ) : null}
      {hali && carpet?.description ? (
        <p className="mt-3 text-xs text-[var(--muted)]">{carpet.description}</p>
      ) : null}
      {hali && carpetKindList(carpet?.kinds).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{carpetKindList(carpet?.kinds).join(", ")}</p>
      ) : null}
      {hali && carpetSizeList(carpet?.sizes).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{carpetSizeList(carpet?.sizes).join(", ")}</p>
      ) : null}
      {hali && carpetCleanList(carpet?.cleans).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{carpetCleanList(carpet?.cleans).join(", ")}</p>
      ) : null}
      {hali && carpet?.minOrder ? (
        <p className="mt-2 text-xs text-[var(--muted)]">En az {carpet.minOrder} adet</p>
      ) : null}
      {hali && carpetDaysLabel(carpet?.leadDays) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Hazırlama: {carpetDaysLabel(carpet?.leadDays)}.</p>
      ) : null}
      {hali && carpetDaysLabel(carpet?.noticeDays, " önce") ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Bildirim: {carpetDaysLabel(carpet?.noticeDays, " önce")}.
        </p>
      ) : null}
      {hali && carpetPickupList(carpet?.pickup).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Alma: {carpetPickupList(carpet?.pickup).join(", ")}</p>
      ) : null}
      {hali && carpet?.readyAt ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Teslim zamanı: {carpet.readyAt}</p>
      ) : null}
      {hali && carpet?.products ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Ürünler: {carpet.products}</p>
      ) : null}
      {hali && carpet?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{carpet.notes}</p>
      ) : null}
      {odev && lesson?.description ? (
        <p className="mt-3 text-xs text-[var(--muted)]">{lesson.description}</p>
      ) : null}
      {odev && lessonKindList(lesson?.kinds).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{lessonKindList(lesson?.kinds).join(", ")}</p>
      ) : null}
      {odev && lessonLevelList(lesson?.levels).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{lessonLevelList(lesson?.levels).join(", ")}</p>
      ) : null}
      {odev && lessonSubjectList(lesson?.subjects, lesson?.subjectOther).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {lessonSubjectList(lesson?.subjects, lesson?.subjectOther).join(", ")}
        </p>
      ) : null}
      {odev && lessonDurationList(lesson?.durations).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{lessonDurationList(lesson?.durations).join(", ")}</p>
      ) : null}
      {odev && lesson?.weekly ? (
        <p className="mt-2 text-xs text-[var(--muted)]">En az {lesson.weekly} ders / hafta</p>
      ) : null}
      {odev && lessonPlaceList(lesson?.place).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Yer: {lessonPlaceList(lesson?.place).join(", ")}</p>
      ) : null}
      {odev && lessonMaterialList(lesson?.materials).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Malzeme: {lessonMaterialList(lesson?.materials).join(", ")}
        </p>
      ) : null}
      {odev && lesson?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{lesson.notes}</p>
      ) : null}
      {dil && talk?.description ? (
        <p className="mt-3 text-xs text-[var(--muted)]">{talk.description}</p>
      ) : null}
      {dil && talkLangList(talk?.langs, talk?.langOther).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{talkLangList(talk?.langs, talk?.langOther).join(", ")}</p>
      ) : null}
      {dil && talkKindList(talk?.kinds).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{talkKindList(talk?.kinds).join(", ")}</p>
      ) : null}
      {dil && talkLevelList(talk?.levels).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{talkLevelList(talk?.levels).join(", ")}</p>
      ) : null}
      {dil && talkDurationList(talk?.durations).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{talkDurationList(talk?.durations).join(", ")}</p>
      ) : null}
      {dil && talkPlaceList(talk?.place).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Yer: {talkPlaceList(talk?.place).join(", ")}</p>
      ) : null}
      {dil && talkMaterialList(talk?.materials).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Materyal: {talkMaterialList(talk?.materials).join(", ")}
        </p>
      ) : null}
      {dil && talk?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{talk.notes}</p>
      ) : null}
      {mezar && grave?.description ? (
        <p className="mt-3 text-xs text-[var(--muted)]">{grave.description}</p>
      ) : null}
      {mezar && graveKindList(grave?.kinds).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{graveKindList(grave?.kinds).join(", ")}</p>
      ) : null}
      {mezar && grave?.cemetery ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {grave.cemetery}
          {grave.radiusKm ? ` · ${grave.radiusKm} km'ye kadar` : ""}
        </p>
      ) : null}
      {mezar && gravePriceList(grave?.pricing).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{gravePriceList(grave?.pricing).join(", ")}</p>
      ) : null}
      {mezar && graveFlowerList(grave?.flowers).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          Çiçek: {graveFlowerList(grave?.flowers).join(", ")}
        </p>
      ) : null}
      {mezar && graveFeeList(grave?.fees).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{graveFeeList(grave?.fees).join(", ")}</p>
      ) : null}
      {mezar && graveDurationLabel(grave?.durationMin) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{graveDurationLabel(grave?.durationMin)}</p>
      ) : null}
      {mezar && gravePhotoList(grave?.photos).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{gravePhotoList(grave?.photos).join(", ")}</p>
      ) : null}
      {mezar && graveAvailList(grave?.avails).length ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{graveAvailList(grave?.avails).join(", ")}</p>
      ) : null}
      {mezar && grave?.workHours ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{grave.workHours}</p>
      ) : null}
      {mezar && grave?.notes ? (
        <p className="mt-2 text-xs text-[var(--muted)]">{grave.notes}</p>
      ) : null}
      {davet && product?.allergens && (
        <p className="mt-2 text-xs text-[var(--muted)]">İçerik / alerjen: {product.allergens}</p>
      )}
      {davet && (
        <label className="mt-4 block">
          <span className="text-sm font-medium">Alerji var mı?</span>
          <input
            value={allergy}
            onChange={(e) => onAllergy(e.target.value)}
            placeholder='Yoksa “yok” yaz. Gluten, fındık, laktoz…'
            maxLength={300}
            className="mt-1 w-full rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none focus:ring-[var(--teal)]"
          />
        </label>
      )}
      {!unitPriced && p.express && (
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={express}
            onChange={(e) => onExpress(e.target.checked)}
          />
          Aynı gün (+%25)
        </label>
      )}
      <h3 className="mt-5 text-sm font-medium">Teslimat</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {foodDrops.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onDrop(d)}
            className={`k-chip rounded-full px-3 py-1.5 text-sm ring-1 ${
              drop === d ? "bg-[var(--teal)] text-white ring-[var(--teal)]" : "ring-[var(--line)]"
            }`}
          >
            {mezar
              ? graveDropLabel(d)
              : dil
              ? talkDropLabel(d, talk?.place)
              : odev
              ? lessonDropLabel(d, lesson?.place)
              : hali
              ? carpetDropLabel(d)
              : kislik
              ? preserveDropLabel(d)
              : cikti
              ? printDropLabel(d)
              : kargo
              ? cargoDropLabel(d)
              : bahce
              ? gardenDropLabel(d)
              : kurye
              ? courierDropLabel(d)
              : araba
              ? washDropLabel(d)
              : teknoloji
                ? techDropLabel(d, tech?.delivery)
                : tamir
                  ? repairDropLabel(d, repair?.delivery)
                  : dikis
                    ? sewingDropLabel(d, service?.delivery)
                    : d === "kapi"
                      ? "Kapı"
                      : "Nötr nokta"}
          </button>
        ))}
      </div>
      {drop === "nokta" && (
        <div className="mt-2 grid gap-1.5">
          {dropPoints.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDropId(d.id)}
              className={`k-chip rounded-xl px-3 py-2 text-left text-sm ring-1 ${
                dropId === d.id ? "bg-[var(--sand)] ring-[var(--clay)]" : "ring-[var(--line)]"
              }`}
            >
              {d.name}
              <span className="block text-xs text-[var(--muted)]">{d.hint}</span>
            </button>
          ))}
        </div>
      )}
      <h3 className="mt-5 text-sm font-medium">Saat</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {p.slots.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSlot(s)}
            className={`k-chip rounded-full px-3 py-1.5 text-xs ring-1 ${
              slot === s
                ? "bg-[var(--ink)] text-[var(--paper)] ring-[var(--ink)]"
                : "ring-[var(--line)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder={
          bahce
            ? "Musluk, otopark, kapı kodu…"
            : kargo
            ? "Şube, fiş no, kapı kodu…"
            : cikti
            ? "Sayfa, renk, dosya adı…"
            : odev
            ? "Sınıf, konu, platform…"
            : dil
            ? "Hedef, seviye, platform…"
            : mezar
            ? "Mezarlık, parsel, çiçek tercihi…"
            : hali
            ? "Leke, ebat, kapı kodu…"
            : kislik
            ? "Kavanoz, alerji, teslim saati…"
            : kurye
            ? "Alıcı, kapı kodu, paket içeriği…"
            : araba
            ? "Plaka, araç tipi, kapı kodu…"
            : teknoloji
            ? "Cihaz, model, kapı kodu…"
            : tamir
            ? "Arıza, marka, kapı kodu…"
            : dikis
              ? "Ölçü, kumaş, kapı kodu…"
              : davet
                ? "Kapı kodu, teslim notu…"
                : "Nevresim, leke, hassas kumaş, kapı kodu…"
        }
        className="mt-4 w-full resize-none rounded-2xl bg-[var(--paper)] px-3 py-2 text-sm ring-1 ring-[var(--line)] outline-none transition-[box-shadow] duration-200 focus:ring-[var(--teal)]"
        rows={2}
      />
      <p className="mt-4 font-[family-name:var(--font-display)] text-2xl tabular-nums">
        {canPlace ? tl(quote.total) : "İnceleme sonrası"}
      </p>
      <p className="text-xs text-[var(--muted)]">
        {!canPlace
          ? "Bu hizmette sipariş yok; fiyat cihazı görünce netleşir. "
          : quote.loyaltyRate > 0
          ? `${loyaltyLabel} · %${Math.round(quote.loyaltyRate * 100)} indirim, önce ${tl(quote.before)}. `
          : unitPriced
            ? `${unit.qty} × ${unit.label.toLowerCase()} fiyatı. `
            : `Min. ${tl(100)}. `}
        {canPlace ? "Siparişte karttan ön otorizasyon; teslim kodu doğrulanınca tahsilat." : ""}
      </p>
      {err && <p className="k-rise mt-2 text-sm text-[var(--clay)]">{err}</p>}
      <button
        type="button"
        disabled={placing || !canPlace}
        onClick={onPlace}
        className="k-press k-cta mt-3 w-full rounded-full bg-[var(--clay)] py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(196,92,38,0.22)] disabled:opacity-40"
      >
        {placing ? "Gönderiliyor…" : canPlace ? "Siparişi bırak" : "Sipariş yok · inceleme"}
      </button>
    </div>
  );
}

const STEP_LABEL: Record<Order["status"], string> = {
  onay_bekliyor: "Onay bekliyor",
  teslim_alindi: "Teslim alındı",
  yikaniyor: "Yıkanıyor",
  utuleniyor: "Ütüleniyor",
  hazir: "Hazır, teslim al",
  teslim_edildi: "Teslim edildi",
  iptal: "İptal",
};

function Track({
  order,
  provider,
  backLabel,
  onBack,
  onReload,
}: {
  order: Order;
  provider: Provider | undefined;
  backLabel: string;
  onBack: () => void;
  onReload: () => void;
}) {
  const food = order.packageId === "davet";
  const sewing = order.packageId === "dikis";
  const repair = order.packageId === "tamir";
  const tech = order.packageId === "teknoloji";
  const wash = order.packageId === "araba";
  const courier = order.packageId === "kurye";
  const garden = order.packageId === "bahce";
  const cargo = order.packageId === "kargo";
  const print = order.packageId === "cikti";
  const preserve = order.packageId === "kislik";
  const hali = order.packageId === "hali";
  const odev = order.packageId === "odev";
  const dil = order.packageId === "dil";
  const mezar = order.packageId === "mezar";
  const catalog = food || sewing || repair || tech || wash || courier || garden || cargo || print || preserve || hali || odev || dil || mezar;
  const steps = trackSteps(order.packageId, catalog);
  const idx = steps.indexOf(order.status);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="p-4 pt-2">
      <button type="button" onClick={onBack} className="k-press text-xs text-[var(--muted)]">
        ← {backLabel}
      </button>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Sipariş {order.id}</h2>
      <p className="text-sm text-[var(--muted)]">
        {provider?.name} ·{" "}
        {food
          ? `${order.guestCount ?? order.pieces} kişilik ${order.productName ?? "davet"}`
          : sewing || repair || tech || wash || courier || garden || cargo || print || preserve || hali || odev || dil || mezar
            ? `${order.guestCount ?? order.pieces} ${order.productName ?? "hizmet"}`
            : `${order.pieces} parça`}{" "}
        · {tl(order.total)}
      </p>
      {food && order.allergyNote && (
        <p className="mt-1 text-sm text-[var(--muted)]">Alerji: {order.allergyNote}</p>
      )}
      {order.status === "iptal" && (
        <p className="mt-3 text-sm text-[var(--clay)]">
          Sipariş iptal edildi. Ön otorizasyon çözüldü, para çekilmedi.
        </p>
      )}
      {order.status === "hazir" && order.pickupCode && (
        <div className="k-rise mt-4 rounded-2xl bg-[var(--paper)] px-4 py-3 ring-1 ring-[var(--teal)]">
          <p className="text-[11px] font-medium tracking-[0.14em] text-[var(--teal)] uppercase">
            Teslim kodu
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl tabular-nums tracking-[0.28em]">
            {order.pickupCode}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Uygulamada ve SMS simülasyonunda. Teslim alırken komşuna söyle; kod girilince{" "}
            {tl(order.total)} tahsil edilir.
          </p>
        </div>
      )}
      {order.paymentStatus === "authorized" && order.status !== "iptal" && order.status !== "hazir" && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Kartta {tl(order.total)} tutanak (ön otorizasyon). Teslim kodundan sonra geçer.
        </p>
      )}
      {order.paymentStatus === "captured" && (
        <p className="mt-3 text-sm text-[var(--teal)]">
          Ödeme alındı · {tl(order.total)}
          {order.paidAt
            ? ` · ${new Date(order.paidAt).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`
            : ""}
        </p>
      )}
      {order.photos.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-medium">İş fotoğrafları</h3>
          <PhotoStrip photos={order.photos} />
        </>
      )}
      <ol className="mt-5">
        {steps.map((s, i) => {
          const done = i < idx;
          const current = i === idx && order.status !== "iptal";
          return (
            <li key={s} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && (
                <span
                  className={`absolute top-3 left-[5px] h-[calc(100%-4px)] w-px ${
                    done ? "bg-[var(--teal)]" : "bg-[var(--line)]"
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  current
                    ? "k-pulse-dot bg-[var(--teal)]"
                    : done
                      ? "bg-[var(--teal)]"
                      : "bg-[var(--line)]"
                }`}
              />
              <span
                className={`text-sm ${
                  current || done ? "text-[var(--ink)]" : "text-[var(--muted)]"
                } ${current ? "font-medium" : ""}`}
              >
                {food && s === "teslim_alindi" ? "Hazırlanıyor" : STEP_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {order.status === "hazir"
          ? "Hizmet veren kodu girince iş biter ve para geçer."
          : order.status === "teslim_edildi"
            ? "Teslim bitti. İstersen yorum ve fotoğraf bırak."
            : order.status === "onay_bekliyor"
              ? "Komşu kabul etmeden iptal edebilirsin. Tutanak çözülür, para çekilmez."
              : "Durumu Hizmet sekmesinden ilerlet. Canlı sunucudan güncellenir."}
      </p>
      {canCancel(order.status) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void (async () => {
              if (!window.confirm("Sipariş iptal edilsin mi? Ön otorizasyon çözülür, para çekilmez.")) {
                return;
              }
              setBusy(true);
              setErr("");
              try {
                await patchOrder(order.id, "reject");
                onReload();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "İptal alınamadı.");
              } finally {
                setBusy(false);
              }
            })();
          }}
          className="k-press mt-4 w-full rounded-full py-2.5 text-sm text-[var(--clay)] ring-1 ring-[var(--line)]"
        >
          {busy ? "…" : "Siparişi iptal et"}
        </button>
      )}
      {order.status === "teslim_edildi" && order.review && (
        <div className="mt-4">
          <h3 className="text-sm font-medium">Yorumun</h3>
          <ReviewList reviews={[order.review]} />
        </div>
      )}
      {order.status === "teslim_edildi" && !order.review && (
        <ReviewComposer
          busy={busy}
          err={err}
          onSubmit={(input) => {
            void (async () => {
              setBusy(true);
              setErr("");
              try {
                await postReview(order.id, input);
                onReload();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Yorum alınamadı.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      )}
    </div>
  );
}
