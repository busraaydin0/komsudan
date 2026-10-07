/** Tek kaynak: kategori kaydı. Yeni alan: id’yi CATEGORY_IDS’e ekle, CATEGORIES’e yaz. */

export const LAUNDRY_PACKAGE_IDS = ["yikama", "katlama", "tam"] as const;
export type LaundryPackageId = (typeof LAUNDRY_PACKAGE_IDS)[number];

export const CATEGORY_IDS = ["camasir"] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Keşifte açık id’ler. Yeni kategori önce kayda, sonra buraya. */
export const PUBLIC_CATEGORY_IDS = CATEGORY_IDS;
export type PublicCategoryId = CategoryId;

export function isPublicCategoryId(id: string | null | undefined): id is PublicCategoryId {
  return Boolean(id && (PUBLIC_CATEGORY_IDS as readonly string[]).includes(id));
}

/** Boş veya kapalı id gelince harita/keşif çamaşıra iner. */
export function clampPublicCategoryIds(ids?: readonly string[] | null): PublicCategoryId[] {
  const next = (ids ?? []).filter(isPublicCategoryId);
  return next.length ? next : [...PUBLIC_CATEGORY_IDS];
}

/** Sipariş packageId. Çamaşırda paket id’si ayrı (yikama/katlama/tam). */
export type OrderPackageId = LaundryPackageId;

export type CategoryDef = {
  id: CategoryId;
  sortOrder: number;
  name: string;
  icon: string;
  orderPackageId: OrderPackageId | null;
  usesFoodSm: boolean;
  blocksLaundryPackages: boolean;
  catalogKey: string;
  table: string | null;
  domainLib: string;
  editor: string;
  unitQty: string;
  capacityLabel: string;
  /** Liste/profil: “bugün N {seatPhrase}”. */
  seatPhrase: string;
  offerBio: string;
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

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  camasir: CAMASIR,
};

export const CATEGORY_LIST: CategoryDef[] = CATEGORY_IDS.map((id) => CATEGORIES[id]);

const CATEGORY_SET = new Set<string>(CATEGORY_IDS);
const LAUNDRY_SET = new Set<string>(LAUNDRY_PACKAGE_IDS);

export function isCategoryId(id: string | null | undefined): id is CategoryId {
  return Boolean(id && CATEGORY_SET.has(id));
}

export function canonicalCategoryId(id: string): string {
  return id;
}

export function normalizeCategoryIds(ids: readonly string[]): CategoryId[] {
  const seen = new Set<CategoryId>();
  const out: CategoryId[] = [];
  for (const raw of ids) {
    const id = canonicalCategoryId(raw);
    if (!isCategoryId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function isLaundryPackageId(id: string | null | undefined): id is LaundryPackageId {
  return Boolean(id && LAUNDRY_SET.has(id));
}

export function categoryDef(id: CategoryId): CategoryDef {
  return CATEGORIES[id];
}

/** Çamaşır yıkama/ütü SM. Kayıtta başka alan yok; her zaman false. */
export function usesFoodSm(_packageId?: string, _food = false): boolean {
  return false;
}

export function capacityLabelForPackage(packageId: string): string {
  if (isLaundryPackageId(packageId) || isCategoryId(packageId)) {
    return CATEGORIES.camasir.capacityLabel;
  }
  return CATEGORIES.camasir.capacityLabel;
}

export function seatPhraseFor(categoryId?: string | null): string {
  if (isCategoryId(categoryId)) return CATEGORIES[categoryId].seatPhrase;
  return CATEGORIES.camasir.seatPhrase;
}

export const CATEGORY_ID_ENUM = CATEGORY_IDS as unknown as [CategoryId, ...CategoryId[]];
