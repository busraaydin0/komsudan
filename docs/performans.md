# Performans ölçümü (çamaşır pilot)

Ölçüm: `npm test -- src/lib/perf/benchmark.test.ts` → `data/perf-report.json`  
Build sonrası çalıştırın (`npm run build`).

| Metrik | Önce | Sonra |
|--------|------|-------|
| Sayfa kök JS (build-manifest toplam, KB) | 540 | 540 |
| maplibre chunk (KB, ayrı async chunk) | 931 | 960 |
| `/api/catalog` handler (KB) | &lt;1 | &lt;1 |
| `/api/orders` handler (KB) | 1 | 1 |
| Katalog listesi (`providersLive`) süre (ms) | 224.7 | 11.6 |
| Katalog listesi `prepare()` çağrısı* | 11550 | 15 |
| Sipariş listesi süre (ms) | 3.4 | 0.16 |
| Sipariş listesi `prepare()` çağrısı* | 210 | 2 |
| Sipariş oluşturma süre (ms) | 62.7 | 1.8 |
| Sipariş oluşturma `prepare()` çağrısı* | 4095 | 31 |

\* `prepare()` sayacı (benchmark hook’u): benchmark sırasında her `db.prepare` / `db.exec` bir kez sayılır; kod yolunda tekrarlayan `prepare()` çağrıları yüksek gösterir.

## Notlar

- İstemci yoklama (görünür sekme): katalog 15s, siparişler 12s, bildirimler 6s, mesaj kutusu 12s.
- Harita: `MapCanvas` + `maplibre-gl` dinamik import; chunk ilk harita mount’unda (~960 KB).
- DB: WAL + `synchronous=NORMAL`; migrate/seed yalnızca ilk açılışta; katalog/sipariş listesi toplu SQL.
- API sipariş listesi: `limit`/`offset` (varsayılan 100). Dahili expire tüm satırları `listAllOrderRows` ile okur.

## Yapılan / geri alınmayan

- `db()` her çağrıda seed çalıştırma hatası giderildi (ölçümde en büyük kazanç).
- Katalog: toplu fiyat/kapasite/puan; okuma yolunda `ensureProviderPriceGrid` yok.
- Sipariş listesi: toplu ödeme satırı; lean DTO korunur.

## Ölçülmedi / geri alınmadı

- Kök JS 540 KB değişmedi; maplibre zaten ayrı chunk’taydı — ek kök bundle kazancı yok.
