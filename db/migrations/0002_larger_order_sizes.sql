-- Eski tek sipariş tavanı 4 birimdi (Büyük). 3–5 makine siparişi için 10 birime çek.
UPDATE provider_capacity_settings
SET max_units_per_order = 10
WHERE max_units_per_order = 4;
