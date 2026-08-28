-- Faz 7 ilk dilim: davet adı keşif listesinde. Sipariş makinesi çamaşır kalır.

INSERT OR IGNORE INTO service_categories (id, name, fulfillment_mode, pricing_model)
VALUES ('davet', 'Davet', 'delivery', 'per_piece');
