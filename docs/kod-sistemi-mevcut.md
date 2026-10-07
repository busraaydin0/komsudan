# Kod sistemi — mevcut durum (genişletme öncesi)

- **Tek alan:** `orders.pickup_code` (6 hane, `genCode()`), deneme sayacı `code_attempts` (`orders.ts`).
- **Üretim:** `ready` geçişinde kod yazılır; `hazir` iken `ensurePickupCode` yoksa üretilir (`orderService.ts`).
- **Teslim:** Sağlayıcı `deliver` + kod → `verifyPickupCode` → `completed`; 5 yanlışta kod yenilenir, müşteriye bildirim.
- **Görünürlük:** `toOrder` müşteriye `pickupCode` döner (`status === hazir`); sağlayıcı masasında kod **girilir**, API’den okunmaz (maske yok, ayrı alan yok).
- **Eksikler:** Sipariş referans kodu yok; alım/teslim ayrımı yok; alım kodu kapı özeti onayı yok; teslim foto zorunluluğu yok; kodsuz teslim / admin hattı yok.
