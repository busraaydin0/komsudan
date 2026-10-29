-- Çok-kategori prototipinden kalan tablolar ve kayıtlar (yalnız çamaşır pilotu).

DROP TABLE IF EXISTS provider_services;
DROP TABLE IF EXISTS provider_products;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS drop_points;
DROP TABLE IF EXISTS order_events;

UPDATE users
SET preferred_category_ids = '["camasir"]',
    updated_at = datetime('now')
WHERE preferred_category_ids IS NOT NULL
  AND TRIM(preferred_category_ids) != ''
  AND TRIM(preferred_category_ids) != '[]'
  AND TRIM(preferred_category_ids) != '["camasir"]';

UPDATE providers
SET payload = json_set(payload, '$.categoryId', 'camasir')
WHERE json_valid(payload)
  AND json_extract(payload, '$.categoryId') IS NOT NULL
  AND json_extract(payload, '$.categoryId') != 'camasir';

DELETE FROM provider_prices
WHERE package_id NOT IN ('yikama', 'katlama', 'tam');

DELETE FROM service_packages
WHERE (
  CASE
    WHEN instr(id, ':') > 0 THEN substr(id, instr(id, ':') + 1)
    ELSE id
  END
) NOT IN ('yikama', 'katlama', 'tam');

DELETE FROM message_moderation_events
WHERE message_id IN (
  SELECT m.id
  FROM messages m
  INNER JOIN conversations c ON c.id = m.conversation_id
  WHERE c.order_id IN (
    SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam')
  )
);

DELETE FROM message_reports
WHERE message_id IN (
  SELECT m.id
  FROM messages m
  INNER JOIN conversations c ON c.id = m.conversation_id
  WHERE c.order_id IN (
    SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam')
  )
);

DELETE FROM messages
WHERE conversation_id IN (
  SELECT id FROM conversations
  WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'))
);

DELETE FROM conversations
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM gallery_photos
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM reviews
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM disputes
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM wallet_ledger
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM notifications
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM payments
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM delivery_override_requests
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM handoff_codes
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM appointments
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM order_photos
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM order_status_history
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM order_items
WHERE order_id IN (SELECT id FROM orders WHERE package_id NOT IN ('yikama', 'katlama', 'tam'));

DELETE FROM orders
WHERE package_id NOT IN ('yikama', 'katlama', 'tam');
