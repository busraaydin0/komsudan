-- Dikiş & Tadilat: Tip A teslim. Hizmet kartı ayrı tabloda; sipariş tutarı sunucuda.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('dikis', 'Dikiş & Tadilat', 'delivery', 'fixed');

CREATE TABLE IF NOT EXISTS provider_services (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES provider_profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  subcategory TEXT NOT NULL DEFAULT 'diger',
  photo_url TEXT,
  price INTEGER NOT NULL,
  price_unit TEXT NOT NULL DEFAULT 'adet',
  min_order INTEGER NOT NULL DEFAULT 1,
  lead_days INTEGER,
  max_per_week INTEGER,
  delivery_adres INTEGER NOT NULL DEFAULT 1,
  delivery_nokta INTEGER NOT NULL DEFAULT 1,
  delivery_yakin INTEGER NOT NULL DEFAULT 0,
  work_radius_km INTEGER,
  notes TEXT,
  material TEXT NOT NULL DEFAULT 'customer',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_provider ON provider_services(provider_id);
