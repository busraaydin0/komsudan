import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CATEGORIES,
  CATEGORY_ID_ENUM,
  CATEGORY_IDS,
  CATEGORY_LIST,
  PUBLIC_CATEGORY_IDS,
  capacityLabelForPackage,
  clampPublicCategoryIds,
  isPublicCategoryId,
  normalizeCategoryIds,
  usesFoodSm,
} from "./registry";

describe("Kategori registry smoke", () => {
  it("kayıtta yalnızca çamaşır var, sort_order 1", () => {
    expect(CATEGORY_IDS).toEqual(["camasir"]);
    expect(CATEGORY_LIST).toHaveLength(1);
    expect(CATEGORIES.camasir.sortOrder).toBe(1);
    expect(CATEGORIES.camasir.table).toBe("service_packages");
    expect(CATEGORIES.camasir.usesFoodSm).toBe(false);
    expect(CATEGORIES.camasir.blocksLaundryPackages).toBe(false);
    expect(CATEGORIES.camasir.editor).toBe("LaundryProfile");
  });

  it("çamaşır paket id’si food SM üretmez; kapasite parça yer", () => {
    expect(usesFoodSm("yikama")).toBe(false);
    expect(usesFoodSm("tam")).toBe(false);
    expect(capacityLabelForPackage("yikama")).toBe("parça yer");
    expect(capacityLabelForPackage("camasir")).toBe("parça yer");
  });

  it("zod enum camasir kabul eder, yabancı id’yi reddeder", () => {
    const schema = z.enum(CATEGORY_ID_ENUM);
    expect(schema.parse("camasir")).toBe("camasir");
    expect(schema.safeParse("davet")).toEqual(expect.objectContaining({ success: false }));
    expect(schema.safeParse("foto")).toEqual(expect.objectContaining({ success: false }));
  });

  it("bilinmeyen ve kapalı id’ler tercihten düşer", () => {
    expect(normalizeCategoryIds(["camasir", "musluk", "tamir", "foto"])).toEqual(["camasir"]);
    expect(normalizeCategoryIds(["davet", "dikis"])).toEqual([]);
  });

  it("keşif yalnızca çamaşır", () => {
    expect([...PUBLIC_CATEGORY_IDS]).toEqual(["camasir"]);
    expect(isPublicCategoryId("camasir")).toBe(true);
    expect(isPublicCategoryId("davet")).toBe(false);
    expect(clampPublicCategoryIds(["davet", "dikis"])).toEqual(["camasir"]);
    expect(clampPublicCategoryIds(["camasir", "davet"])).toEqual(["camasir"]);
  });
});
