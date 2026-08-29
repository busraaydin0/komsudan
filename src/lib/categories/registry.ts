/** Tek kaynak: 15 kategori. Davranış buradan türetilir; elle union/zincir yazma. */

export const LAUNDRY_PACKAGE_IDS = ["yikama", "katlama", "tam"] as const;
export type LaundryPackageId = (typeof LAUNDRY_PACKAGE_IDS)[number];

export const CATEGORY_IDS = [
  "camasir",
  "davet",
  "dikis",
  "tamir",
  "teknoloji",
  "araba",
  "kurye",
  "bahce",
  "kargo",
  "cikti",
  "kislik",
  "hali",
  "odev",
  "dil",
  "mezar",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Çamaşır dışındaki alanlar; siparişte packageId = kategori id. */
export type CatalogCategoryId = Exclude<CategoryId, "camasir">;

export type OrderPackageId = LaundryPackageId | CatalogCategoryId;

export type CatalogItemKey =
  | "packages"
  | "products"
  | "services"
  | "repairs"
  | "techs"
  | "washes"
  | "couriers"
  | "gardens"
  | "cargos"
  | "prints"
  | "preserves"
  | "carpets"
  | "lessons"
  | "talks"
  | "graves";

export type CategoryDef = {
  id: CategoryId;
  sortOrder: number;
  name: string;
  icon: string;
  /** Sipariş packageId. Çamaşırda paket id’si ayrı (yikama/katlama/tam). */
  orderPackageId: OrderPackageId | null;
  usesFoodSm: boolean;
  blocksLaundryPackages: boolean;
  catalogKey: CatalogItemKey;
  table: string | null;
  domainLib: string;
  editor: string;
  unitQty: string;
  capacityLabel: string;
  /** Liste/profil: “bugün N {seatPhrase}”. capacityLabel sipariş hatasıyla aynı olmayabilir. */
  seatPhrase: string;
  offerBio: string;
};

const CATALOG: Record<CatalogCategoryId, Omit<CategoryDef, "id" | "usesFoodSm" | "blocksLaundryPackages" | "orderPackageId">> = {
  davet: {
    sortOrder: 2,
    name: "Davet İkramlık",
    icon: "feast",
    catalogKey: "products",
    table: "provider_products",
    domainLib: "food.ts",
    editor: "FoodMenuEditor",
    unitQty: "kişi",
    capacityLabel: "kişilik yer",
    seatPhrase: "kişilik yer",
    offerBio: "Davet ikramlık. Menünü Hizmet’ten ekle.",
  },
  dikis: {
    sortOrder: 3,
    name: "Dikiş & Tadilat",
    icon: "needle",
    catalogKey: "services",
    table: "provider_services",
    domainLib: "sewing.ts",
    editor: "SewingServiceEditor",
    unitQty: "adet",
    capacityLabel: "adet yer",
    seatPhrase: "yer",
    offerBio: "Dikiş ve tadilat. Hizmetlerini Hizmet’ten ekle.",
  },
  tamir: {
    sortOrder: 4,
    name: "Tamir",
    icon: "wrench",
    catalogKey: "repairs",
    table: "provider_repairs",
    domainLib: "repair.ts",
    editor: "RepairServiceEditor",
    unitQty: "adet",
    capacityLabel: "adet yer",
    seatPhrase: "yer",
    offerBio: "Tamir. Hizmetlerini Hizmet’ten ekle.",
  },
  teknoloji: {
    sortOrder: 5,
    name: "Teknoloji & Kurulum",
    icon: "chip",
    catalogKey: "techs",
    table: "provider_tech",
    domainLib: "tech.ts",
    editor: "TechServiceEditor",
    unitQty: "adet",
    capacityLabel: "adet yer",
    seatPhrase: "yer",
    offerBio: "Teknoloji ve kurulum. Hizmetlerini Hizmet’ten ekle.",
  },
  araba: {
    sortOrder: 6,
    name: "Araba Yıkama",
    icon: "car",
    catalogKey: "washes",
    table: "provider_washes",
    domainLib: "wash.ts",
    editor: "WashServiceEditor",
    unitQty: "araç",
    capacityLabel: "adet yer",
    seatPhrase: "yer",
    offerBio: "Araba yıkama. Hizmetlerini Hizmet’ten ekle.",
  },
  kurye: {
    sortOrder: 7,
    name: "Yakın Mesafe Kurye",
    icon: "scooter",
    catalogKey: "couriers",
    table: "provider_couriers",
    domainLib: "courier.ts",
    editor: "CourierServiceEditor",
    unitQty: "paket",
    capacityLabel: "adet yer",
    seatPhrase: "yer",
    offerBio: "Yakın mesafe kurye. Hizmetlerini Hizmet’ten ekle.",
  },
  bahce: {
    sortOrder: 8,
    name: "Bahçe & Bitki",
    icon: "seedling",
    catalogKey: "gardens",
    table: "provider_gardens",
    domainLib: "garden.ts",
    editor: "GardenServiceEditor",
    unitQty: "iş",
    capacityLabel: "adet yer",
    seatPhrase: "yer",
    offerBio: "Bahçe ve bitki. Hizmetlerini Hizmet’ten ekle.",
  },
  kargo: {
    sortOrder: 9,
    name: "Kargo & Paket",
    icon: "package",
    catalogKey: "cargos",
    table: "provider_cargos",
    domainLib: "cargo.ts",
    editor: "CargoServiceEditor",
    unitQty: "paket",
    capacityLabel: "adet yer",
    seatPhrase: "yer",
    offerBio: "Kargo ve paket. Hizmetlerini Hizmet’ten ekle.",
  },
  cikti: {
    sortOrder: 10,
    name: "Evde Çıktı Alma",
    icon: "printer",
    catalogKey: "prints",
    table: "provider_prints",
    domainLib: "print.ts",
    editor: "PrintServiceEditor",
    unitQty: "sayfa",
    capacityLabel: "sayfa yer",
    seatPhrase: "sayfa yer",
    offerBio: "Evde çıktı. Hizmetlerini Hizmet’ten ekle.",
  },
  kislik: {
    sortOrder: 11,
    name: "Kışlık & Dondurucu Hazırlığı",
    icon: "jar",
    catalogKey: "preserves",
    table: "provider_preserves",
    domainLib: "preserve.ts",
    editor: "PreserveServiceEditor",
    unitQty: "birim",
    capacityLabel: "birim yer",
    seatPhrase: "yer",
    offerBio: "Kışlık ve dondurucu. Hizmetlerini Hizmet’ten ekle.",
  },
  hali: {
    sortOrder: 12,
    name: "Halı Yıkama",
    icon: "soap",
    catalogKey: "carpets",
    table: "provider_carpets",
    domainLib: "carpet.ts",
    editor: "CarpetServiceEditor",
    unitQty: "adet",
    capacityLabel: "adet yer",
    seatPhrase: "adet yer",
    offerBio: "Halı yıkama. Hizmetlerini Hizmet’ten ekle.",
  },
  odev: {
    sortOrder: 13,
    name: "İlkokul / Ortaokul Ödev Eşliği",
    icon: "book",
    catalogKey: "lessons",
    table: "provider_lessons",
    domainLib: "lesson.ts",
    editor: "LessonServiceEditor",
    unitQty: "ders",
    capacityLabel: "ders yer",
    seatPhrase: "ders yer",
    offerBio: "Ödev eşliği. Hizmetlerini Hizmet’ten ekle.",
  },
  dil: {
    sortOrder: 14,
    name: "Yabancı Dil Pratiği",
    icon: "globe",
    catalogKey: "talks",
    table: "provider_talks",
    domainLib: "talk.ts",
    editor: "TalkServiceEditor",
    unitQty: "görüşme",
    capacityLabel: "görüşme yer",
    seatPhrase: "görüşme yer",
    offerBio: "Dil pratiği. Hizmetlerini Hizmet’ten ekle.",
  },
  mezar: {
    sortOrder: 15,
    name: "Mezar Bakımı & Çiçeklendirme",
    icon: "headstone",
    catalogKey: "graves",
    table: "provider_graves",
    domainLib: "grave.ts",
    editor: "GraveServiceEditor",
    unitQty: "işlem",
    capacityLabel: "iş yer",
    seatPhrase: "iş yer",
    offerBio: "Mezar bakımı. Hizmetlerini Hizmet’ten ekle.",
  },
};

const CAMASIR: CategoryDef = {
  id: "camasir",
  sortOrder: 1,
  name: "Çamaşır Yıkama",
  icon: "laundry",
  orderPackageId: null,
  usesFoodSm: false,
  blocksLaundryPackages: false,
  catalogKey: "packages",
  table: "service_packages",
  domainLib: "pricing.ts",
  editor: "LaundryProfile",
  unitQty: "parça",
  capacityLabel: "parça yer",
  seatPhrase: "parça yer",
  offerBio: "",
};

function finishCatalog(id: CatalogCategoryId): CategoryDef {
  return {
    id,
    orderPackageId: id,
    usesFoodSm: true,
    blocksLaundryPackages: true,
    ...CATALOG[id],
  };
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  camasir: CAMASIR,
  davet: finishCatalog("davet"),
  dikis: finishCatalog("dikis"),
  tamir: finishCatalog("tamir"),
  teknoloji: finishCatalog("teknoloji"),
  araba: finishCatalog("araba"),
  kurye: finishCatalog("kurye"),
  bahce: finishCatalog("bahce"),
  kargo: finishCatalog("kargo"),
  cikti: finishCatalog("cikti"),
  kislik: finishCatalog("kislik"),
  hali: finishCatalog("hali"),
  odev: finishCatalog("odev"),
  dil: finishCatalog("dil"),
  mezar: finishCatalog("mezar"),
};

export const CATEGORY_LIST: CategoryDef[] = CATEGORY_IDS.map((id) => CATEGORIES[id]);

export const CATALOG_CATEGORY_IDS = CATEGORY_IDS.filter((id): id is CatalogCategoryId => id !== "camasir");

const CATEGORY_SET = new Set<string>(CATEGORY_IDS);
const CATALOG_SET = new Set<string>(CATALOG_CATEGORY_IDS);
const LAUNDRY_SET = new Set<string>(LAUNDRY_PACKAGE_IDS);

export function isCategoryId(id: string | null | undefined): id is CategoryId {
  return Boolean(id && CATEGORY_SET.has(id));
}

export function isCatalogCategoryId(id: string | null | undefined): id is CatalogCategoryId {
  return Boolean(id && CATALOG_SET.has(id));
}

export function isLaundryPackageId(id: string | null | undefined): id is LaundryPackageId {
  return Boolean(id && LAUNDRY_SET.has(id));
}

export function categoryDef(id: CategoryId): CategoryDef {
  return CATEGORIES[id];
}

/** Tip A kısaltılmış SM: davet ve kopyaları. `food` bayrağı eski çağrıları korur. */
export function usesFoodSm(packageId: string, food = false): boolean {
  if (food) return true;
  return isCatalogCategoryId(packageId);
}

export function capacityLabelForPackage(packageId: string): string {
  if (isCatalogCategoryId(packageId)) return CATEGORIES[packageId].capacityLabel;
  return CATEGORIES.camasir.capacityLabel;
}

export function seatPhraseFor(categoryId?: string | null): string {
  if (isCategoryId(categoryId)) return CATEGORIES[categoryId].seatPhrase;
  return CATEGORIES.camasir.seatPhrase;
}

export const CATEGORY_ID_ENUM = CATEGORY_IDS as unknown as [CategoryId, ...CategoryId[]];
