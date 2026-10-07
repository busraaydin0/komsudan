-- Faz 6.5: kategori iskeleti. Yalnız çamaşır. Yeni kategori yok.

CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fulfillment_mode TEXT NOT NULL
    CHECK(fulfillment_mode IN ('delivery', 'home_visit')),
  pricing_model TEXT NOT NULL
    CHECK(pricing_model IN ('per_piece', 'per_kg', 'fixed', 'hourly'))
);

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('camasir', 'Çamaşır Yıkama', 'delivery', 'per_piece');
