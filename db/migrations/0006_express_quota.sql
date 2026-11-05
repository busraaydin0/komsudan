-- K-010 / 3b-lite: acil kota, gün satırında acil kullanım, teslim iadesi.

ALTER TABLE provider_capacity_settings
  ADD COLUMN express_quota INTEGER NOT NULL DEFAULT 0 CHECK (express_quota >= 0);

ALTER TABLE provider_capacity_days
  ADD COLUMN used_express_units INTEGER NOT NULL DEFAULT 0 CHECK (used_express_units >= 0);

ALTER TABLE orders ADD COLUMN completed_at TEXT;
ALTER TABLE orders ADD COLUMN express_refund INTEGER NOT NULL DEFAULT 0 CHECK (express_refund >= 0);
