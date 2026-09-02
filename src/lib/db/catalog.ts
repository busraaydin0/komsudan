import type { DropPoint, Provider } from "@/lib/types";
import { CATEGORIES, isCatalogCategoryId } from "@/lib/categories/registry";
import { listProducts, toPublicProduct } from "./products";
import { listServices, toPublicService } from "./services";
import { listRepairs, toPublicRepair } from "./repairs";
import { listTechs, toPublicTech } from "./tech";
import { listWashes, toPublicWash } from "./washes";
import { listCouriers, toPublicCourier } from "./couriers";
import { listGardens, toPublicGarden } from "./gardens";
import { listCargos, toPublicCargo } from "./cargos";
import { listPrints, toPublicPrint } from "./prints";
import { listPreserves, toPublicPreserve } from "./preserves";
import { listCarpets, toPublicCarpet } from "./carpets";
import { listLessons, toPublicLesson } from "./lessons";
import { listTalks, toPublicTalk } from "./talks";
import { listGraves, toPublicGrave } from "./graves";

function extrasForCategory(categoryId: string, providerId: string) {
  const extra = {
    products: [] as ReturnType<typeof toPublicProduct>[],
    services: [] as ReturnType<typeof toPublicService>[],
    repairs: [] as ReturnType<typeof toPublicRepair>[],
    techs: [] as ReturnType<typeof toPublicTech>[],
    washes: [] as ReturnType<typeof toPublicWash>[],
    couriers: [] as ReturnType<typeof toPublicCourier>[],
    gardens: [] as ReturnType<typeof toPublicGarden>[],
    cargos: [] as ReturnType<typeof toPublicCargo>[],
    prints: [] as ReturnType<typeof toPublicPrint>[],
    preserves: [] as ReturnType<typeof toPublicPreserve>[],
    carpets: [] as ReturnType<typeof toPublicCarpet>[],
    lessons: [] as ReturnType<typeof toPublicLesson>[],
    talks: [] as ReturnType<typeof toPublicTalk>[],
    graves: [] as ReturnType<typeof toPublicGrave>[],
  };
  if (!isCatalogCategoryId(categoryId)) return extra;
  const key = CATEGORIES[categoryId].catalogKey;
  if (key === "products") extra.products = listProducts(providerId).map(toPublicProduct);
  else if (key === "services") extra.services = listServices(providerId).map(toPublicService);
  else if (key === "repairs") extra.repairs = listRepairs(providerId).map(toPublicRepair);
  else if (key === "techs") extra.techs = listTechs(providerId).map(toPublicTech);
  else if (key === "washes") extra.washes = listWashes(providerId).map(toPublicWash);
  else if (key === "couriers") extra.couriers = listCouriers(providerId).map(toPublicCourier);
  else if (key === "gardens") extra.gardens = listGardens(providerId).map(toPublicGarden);
  else if (key === "cargos") extra.cargos = listCargos(providerId).map(toPublicCargo);
  else if (key === "prints") extra.prints = listPrints(providerId).map(toPublicPrint);
  else if (key === "preserves") extra.preserves = listPreserves(providerId).map(toPublicPreserve);
  else if (key === "carpets") extra.carpets = listCarpets(providerId).map(toPublicCarpet);
  else if (key === "lessons") extra.lessons = listLessons(providerId).map(toPublicLesson);
  else if (key === "talks") extra.talks = listTalks(providerId).map(toPublicTalk);
  else if (key === "graves") extra.graves = listGraves(providerId).map(toPublicGrave);
  return extra;
}

export function toProvider(row: {
  id: string;
  payload: string;
  remaining: number;
  category_id?: string | null;
}): Provider {
  const p = JSON.parse(row.payload) as Provider;
  const categoryId = row.category_id ?? p.categoryId ?? "camasir";
  const extra = extrasForCategory(categoryId, row.id);
  return {
    ...p,
    id: row.id,
    remaining: row.remaining,
    workPhotos: p.workPhotos ?? [],
    avatarUrl: p.avatarUrl ?? null,
    recentReviews: p.recentReviews ?? [],
    categoryId,
    products: extra.products.length ? extra.products : (p.products ?? []),
    services: extra.services.length ? extra.services : (p.services ?? []),
    repairs: extra.repairs.length ? extra.repairs : (p.repairs ?? []),
    techs: extra.techs.length ? extra.techs : (p.techs ?? []),
    washes: extra.washes.length ? extra.washes : (p.washes ?? []),
    couriers: extra.couriers.length ? extra.couriers : (p.couriers ?? []),
    gardens: extra.gardens.length ? extra.gardens : (p.gardens ?? []),
    cargos: extra.cargos.length ? extra.cargos : (p.cargos ?? []),
    prints: extra.prints.length ? extra.prints : (p.prints ?? []),
    preserves: extra.preserves.length ? extra.preserves : (p.preserves ?? []),
    carpets: extra.carpets.length ? extra.carpets : (p.carpets ?? []),
    lessons: extra.lessons.length ? extra.lessons : (p.lessons ?? []),
    talks: extra.talks.length ? extra.talks : (p.talks ?? []),
    graves: extra.graves.length ? extra.graves : (p.graves ?? []),
  };
}

export function toDrop(row: { payload: string }): DropPoint {
  return JSON.parse(row.payload) as DropPoint;
}
