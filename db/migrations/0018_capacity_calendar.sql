-- Tarih bazlı makine kapasitesi (v0.3 P5/P6). Prototip: pending siparişler silinmez; remaining kalkar.

CREATE TABLE IF NOT EXISTS provider_capacity_settings (
  provider_id TEXT PRIMARY KEY REFERENCES providers(id),
  half_units_per_day INTEGER NOT NULL CHECK (half_units_per_day > 0),
  working_days TEXT NOT NULL,
  max_units_per_order INTEGER NOT NULL CHECK (max_units_per_order > 0)
);

CREATE TABLE IF NOT EXISTS provider_capacity_days (
  provider_id TEXT NOT NULL REFERENCES providers(id),
  date TEXT NOT NULL,
  max_units INTEGER NOT NULL CHECK (max_units > 0),
  used_units INTEGER NOT NULL DEFAULT 0 CHECK (used_units >= 0),
  PRIMARY KEY (provider_id, date),
  CHECK (used_units <= max_units)
);

CREATE INDEX IF NOT EXISTS idx_capacity_days_date ON provider_capacity_days(provider_id, date);

ALTER TABLE orders ADD COLUMN estimated_delivery_date TEXT;
ALTER TABLE orders ADD COLUMN promised_delivery_date TEXT;
ALTER TABLE orders ADD COLUMN capacity_allocations TEXT;
ALTER TABLE orders ADD COLUMN delay_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE providers DROP COLUMN remaining;
