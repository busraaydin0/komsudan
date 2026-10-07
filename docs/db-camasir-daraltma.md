# Veritabanı çamaşıra daraltma — migrate.ts ve SQL zinciri

Tarih: 2026-10-07.

## `migrate.ts` ne yapar

`migrate(db)` her açılışta (`src/lib/db/client.ts` → `prepare`) çalışır:

1. `_migrations (id, applied_at)` yoksa oluşturur. `id` = **dosya adı** (`0008_categories.sql`), içerik hash’i değil.
2. `db/migrations/*.sql` dosyalarını **isim sırasıyla** okur. `_migrations`’ta yoksa `db.exec(sql)` + satır ekler. Varsa atlar.
3. Dosyalar bitsin bitmesin **`ensureColumns(db)` her seferinde** çalışır.

Yani numaralı SQL **bir kez** uygulanır; `ensureColumns` **her boot’ta** idempotent yama yapar.

## SQL dosyası vs gömülü blok

| Mekanizma | Ne zaman | Idempotent mi | Bu prototipte rolü |
| --- | --- | --- | --- |
| `db/migrations/NNNN_*.sql` | Dosya adı `_migrations`’ta yoksa bir kez | Dosyaya bağlı: `CREATE TABLE IF NOT EXISTS` güvenli; çıplak `ALTER TABLE ADD COLUMN` ikinci uygulamada patlar | Şema evrimi, git geçmişi |
| `addColumn(table, name, ddl)` | Her boot | Evet (`PRAGMA table_info`) | Eski DB’ye kolon eklemek; SQL’de tekrar ALTER yazmamak |
| `CREATE TABLE IF NOT EXISTS` `ensureColumns` içinde | Her boot | Evet | SQL silinse / eski DB’de dosya hiç uygulanmamış olsa bile tabloyu ayağa kaldırmak |
| `INSERT OR IGNORE` / `UPDATE` `ensureColumns` içinde | Her boot | Evet | Kategori satırı, isim, `is_active` |

**Dosyayı silmek mevcut DB’den tablo düşürmez.** `_migrations` satırı kalır; tablo durur. Yeni boş DB o dosyayı hiç görmez — tablo ancak `ensureColumns` hâlâ `CREATE TABLE` ediyorsa oluşur.

Bu yüzden çamaşır dışı kategoriyi kaldırmak için **hem** `0010`–`0025` / `0029` SQL’i **hem** `ensureColumns` içindeki `CREATE` / `INSERT` şart. Yalnız SQL silmek yetmez.

`addColumn` olmayan tabloya `ALTER` dener (`provider_repairs` yoksa). Çamaşır dışı tabloları yaratmayı bırakınca o tablolara `addColumn` da kalkmalı.

## Zincir (yeniden numara)

Korunan çekirdek (`0001`–`0009`) aynı kaldı. Kategori SQL’leri (`0010`–`0025`) ve `0029_tamir_home_visit.sql` silindi. Eski `0026`–`0028` / `0030` içerikleri yeni numaraya taşındı. `0027` çıplak `ALTER` olduğu için yeni dosyada yok: kolonlar `ensureColumns.addColumn`.

| Dosya | İçerik |
| --- | --- |
| `0001_pilot.sql` | PWA iskelet: providers, orders, users, reviews, … |
| `0002_auth.sql` | OTP, refresh |
| `0003_providers.sql` | profiler, paket, drop, **availability_slots** |
| `0004_orders.sql` | sipariş indeksleri |
| `0005_order_history.sql` | geçmiş |
| `0006_notifications.sql` | bildirim |
| `0007_payments.sql` | ödeme |
| `0008_categories.sql` | `service_categories` + tek satır `camasir` |
| `0009_onboarding.sql` | camasir INSERT OR IGNORE |
| `0010_washes.sql` | `provider_washes` (araba kategorisi yok; WashServiceEditor) |
| `0011_appointments.sql` | randevu tablosu (Tip B belirsiz; korundu) |
| `0012_disputes.sql` | itiraz |
| `0013_review_dimensions.sql` | no-op; kolonlar ensureColumns |
| `0014_order_messages.sql` | konuşma / mesaj |
| `0015_wallets.sql` | cüzdan |

`ensureColumns` hâlâ: sipariş/auth kolonları, camasir güncellemesi, diğer kategori satırlarını silme, `provider_washes`, `appointments`, `wallets`, review alt puanları.

**Mevcut yerel `data/komsudan.db`:** yeni dosya adları `_migrations`’ta yok sayılır; `CREATE IF NOT EXISTS` / `addColumn` ile bir kez daha uygulanır, şema kırılmaz. Çamaşır dışı **tablolar ve seed satırları dosyada kalır** — DROP yok. Temiz şema için yedekleyip dosyayı silip seed’i baştan çalıştır (komut aşağıda; otomatik çalıştırılmadı).

## Yerel DB’yi sıfırlamak (yıkıcı — elle)

```bash
mkdir -p data/backups
cp data/komsudan.db "data/backups/komsudan-pre-laundry-db-$(date +%Y%m%d-%H%M%S).db"
rm -f data/komsudan.db data/komsudan.db-wal data/komsudan.db-shm
# npm run dev  → migrate + seed boş dosyaya
```
