import type { DropPoint, Provider } from "@/lib/types";
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

export function toProvider(row: {
  id: string;
  payload: string;
  remaining: number;
  category_id?: string | null;
}): Provider {
  const p = JSON.parse(row.payload) as Provider;
  const categoryId = row.category_id ?? p.categoryId ?? "camasir";
  const products = listProducts(p.id).map(toPublicProduct);
  const services = listServices(p.id).map(toPublicService);
  const repairs = listRepairs(p.id).map(toPublicRepair);
  const techs = listTechs(p.id).map(toPublicTech);
  const washes = listWashes(p.id).map(toPublicWash);
  const couriers = listCouriers(p.id).map(toPublicCourier);
  const gardens = listGardens(p.id).map(toPublicGarden);
  const cargos = listCargos(p.id).map(toPublicCargo);
  const prints = listPrints(p.id).map(toPublicPrint);
  const preserves = listPreserves(p.id).map(toPublicPreserve);
  const carpets = listCarpets(p.id).map(toPublicCarpet);
  const lessons = listLessons(p.id).map(toPublicLesson);
  const talks = listTalks(p.id).map(toPublicTalk);
  const graves = listGraves(p.id).map(toPublicGrave);
  return {
    ...p,
    id: row.id,
    remaining: row.remaining,
    workPhotos: p.workPhotos ?? [],
    avatarUrl: p.avatarUrl ?? null,
    recentReviews: p.recentReviews ?? [],
    categoryId,
    products: products.length > 0 ? products : (p.products ?? []),
    services: services.length > 0 ? services : (p.services ?? []),
    repairs: repairs.length > 0 ? repairs : (p.repairs ?? []),
    techs: techs.length > 0 ? techs : (p.techs ?? []),
    washes: washes.length > 0 ? washes : (p.washes ?? []),
    couriers: couriers.length > 0 ? couriers : (p.couriers ?? []),
    gardens: gardens.length > 0 ? gardens : (p.gardens ?? []),
    cargos: cargos.length > 0 ? cargos : (p.cargos ?? []),
    prints: prints.length > 0 ? prints : (p.prints ?? []),
    preserves: preserves.length > 0 ? preserves : (p.preserves ?? []),
    carpets: carpets.length > 0 ? carpets : (p.carpets ?? []),
    lessons: lessons.length > 0 ? lessons : (p.lessons ?? []),
    talks: talks.length > 0 ? talks : (p.talks ?? []),
    graves: graves.length > 0 ? graves : (p.graves ?? []),
  };
}

export function toDrop(row: { payload: string }): DropPoint {
  return JSON.parse(row.payload) as DropPoint;
}
