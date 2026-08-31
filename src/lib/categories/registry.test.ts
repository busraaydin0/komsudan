import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CATALOG_CATEGORY_IDS,
  CATEGORIES,
  CATEGORY_ID_ENUM,
  CATEGORY_IDS,
  CATEGORY_LIST,
  capacityLabelForPackage,
  canonicalCategoryId,
  normalizeCategoryIds,
  usesFoodSm,
} from "./registry";

const CAPACITY: Record<string, string> = {
  davet: "kişilik yer",
  cikti: "sayfa yer",
  kislik: "birim yer",
  hali: "adet yer",
  odev: "ders yer",
  dil: "görüşme yer",
  mezar: "iş yer",
  dikis: "adet yer",
  tamir: "adet yer",
  teknoloji: "adet yer",
  araba: "adet yer",
  kurye: "adet yer",
  bahce: "adet yer",
  kargo: "adet yer",
  yikama: "parça yer",
};

describe("Kategori registry smoke", () => {
  it("15 kategori, sort_order 1–15, dil hemen mezarın önünde", () => {
    expect(CATEGORY_IDS).toHaveLength(15);
    expect(CATEGORY_LIST.map((c) => c.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(CATEGORIES.dil.sortOrder).toBe(14);
    expect(CATEGORIES.mezar.sortOrder).toBe(15);
    expect(CATEGORY_IDS.indexOf("dil") + 1).toBe(CATEGORY_IDS.indexOf("mezar"));
  });

  it("katalog id’leri packageId ve Tip A SM üretir; dikiş tablosu tek", () => {
    expect(CATALOG_CATEGORY_IDS).not.toContain("camasir");
    expect(CATEGORIES.camasir.usesFoodSm).toBe(false);
    expect(CATEGORIES.camasir.table).toBe("service_packages");
    expect(CATEGORIES.dikis.table).toBe("provider_services");
    const otherTables = CATALOG_CATEGORY_IDS.filter((id) => id !== "dikis").map((id) => CATEGORIES[id].table);
    expect(otherTables).not.toContain("provider_services");
    for (const id of CATALOG_CATEGORY_IDS) {
      const def = CATEGORIES[id];
      expect(def.orderPackageId).toBe(id);
      expect(def.usesFoodSm).toBe(true);
      expect(def.blocksLaundryPackages).toBe(true);
      expect(usesFoodSm(id)).toBe(true);
      expect(def.editor).toBeTruthy();
      expect(def.domainLib).toBeTruthy();
    }
  });

  it("kapasite etiketi eski elle yazılan değerlerle aynı", () => {
    for (const [id, label] of Object.entries(CAPACITY)) {
      expect(capacityLabelForPackage(id)).toBe(label);
    }
  });

  it("zod enum 15 id kabul eder, yabancı id’yi reddeder", () => {
    const schema = z.enum(CATEGORY_ID_ENUM);
    expect(schema.parse("mezar")).toBe("mezar");
    expect(schema.safeParse("foto")).toEqual(expect.objectContaining({ success: false }));
  });

  it("silinen musluk kategorisi Tamir’e düşer, tekrarları tekler", () => {
    expect(canonicalCategoryId("musluk")).toBe("tamir");
    expect(canonicalCategoryId("tamir")).toBe("tamir");
    expect(normalizeCategoryIds(["camasir", "musluk", "tamir", "foto"])).toEqual(["camasir", "tamir"]);
  });
});
