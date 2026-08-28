-- Davet ürün kartı: foto, açıklama, kategori, birim, min/max, süre, teslimat, alerjen.

ALTER TABLE provider_products ADD COLUMN photo_url TEXT;
ALTER TABLE provider_products ADD COLUMN description TEXT;
ALTER TABLE provider_products ADD COLUMN category TEXT;
ALTER TABLE provider_products ADD COLUMN price_unit TEXT NOT NULL DEFAULT 'kisi';
ALTER TABLE provider_products ADD COLUMN min_order INTEGER NOT NULL DEFAULT 1;
ALTER TABLE provider_products ADD COLUMN max_qty INTEGER;
ALTER TABLE provider_products ADD COLUMN lead_hours INTEGER;
ALTER TABLE provider_products ADD COLUMN delivery TEXT NOT NULL DEFAULT 'ikisi';
ALTER TABLE provider_products ADD COLUMN allergens TEXT;
