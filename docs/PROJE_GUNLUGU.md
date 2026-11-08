# Komşudan – Proje Günlüğü

Kural: Her değişiklikte en üste yeni kayıt eklenir. Adım onaylanmadan sonraki adıma geçilmez.
Kaynak dokümanlar: MVP Tanım v0.3, Karar Kaydı v0.3, Süreç Haritası v0.4 (`docs/kaynak/`, henüz eklenmedi). Kısa referans: `docs/URUN_REFERANS_v0.3.md`.
Çalışma dalı: `chore/laundry-only`.

---

## 2026-11-09 – Sipariş, veren onaylamadan “alınmış” görünüyordu
- Dal: `fix/siparis-onay-bekliyor` (main’den; `fix/alim-takvimi` PR #6 ayrı). **K-012 bu dalda var** (`061366c`, `orderAuth.ts`).
- Otomatik kabul yok: `createOrder` → `pending` + history `to_status=pending` (aktör müşteri). `accepted` yalnız `applyOrderAction accept` + `assertProviderAction`. Expire `pending→rejected`. Seed `demo-live-accepted/ready` başka satırlar.
- Yanıltma: (1) Sipariş sekmesi hazır demoyu (`KL-EADY`) yeni `pending` talebin üstüne açıyordu. (2) `accepted.trackLabel` “Teslim alındı” idi.
- Düzeltme: `pickTrackedOrderId` onay bekleyen kaydı öne alır. Etiketler: pending “Onay bekliyor” / `PENDING_CUSTOMER_HINT`; accepted “Hizmet veren kabul etti”. `pending→dropped_off` kapatıldı. Kapasite kabulde ayrılmaya devam.
- Test: oluşturma pending; müşteri kabul 403; yalnız veren accepted + kapasite; kabulsüz alım/yıkama yok. `npm test` 173, lint, build.
- Main’e merge yok.

## 2026-11-07 – Adım 10: Oturum, pencere, yetki ve admin ayrımı main'e alındı
- PR **#4** (`fix/oturum-kaybi`) merge: `4592fb9`. PR **#3** (`fix/pencere-butonu`) merge: `b13ecf1`. PR **#5** (`fix/kendine-siparis`, K-011/K-012/K-013) merge: `3cce159`. Squash yok.
- Etiket: `sunum-v2` (`3cce159`).
- Temiz klon: `npm ci`, `npm test` **168**, lint ve `next build` yeşil; `demo:reset` + `npm run dev -- --port 3001`.
- 390px tur: oturum yenileme/sunucu restart sonrası duruyor; Elif takviminde alım pencereleri seçiliyor; müşteri kabul 403; Elif kabul→yıkama→hazır→teslim kodu, cüzdan hold/capture/pending doğru; Elif SELF_ORDER 403; admin yalnız Yönetim+Hesap ve sipariş 403. Canlı ikinci acil: saat ~23:58, bugün alım penceresi yok (`EXPRESS_NOT_TODAY`); kota kuralı `expressQuota.test.ts` 12/12.

## 2026-11-07 – K-013: admin yetkisi, self-promote kapanışı, admin:create
- Dal: `fix/kendine-siparis` (PR #5 üzerine; main’e birleştirilmedi).
- Önce: OTP/profil zod rol kabul etmiyordu; `insertUser` varsayılan `customer`. `requireAuth` `role===admin` her rolü geçiriyordu. `seedStaffUsers` (5321100099 + `demo-staff-passkey`) production’da da çalışıyordu. Admin `createOrder` yapabiliyordu.
- Rol/super_admin yalnız DB. `requireAuth` bypass kaldırıldı. `service_admin` yalnız `/api/admin/*`. Sipariş mutasyonu / ödeme / çekim / kodsuz teslim: veren veya `super_admin`. Admin rolleri sipariş oluşturamaz (`ADMIN_CANNOT_ORDER`). UI: Yönetim + Hesap.
- Demo admin ve seed passkey yalnız `NODE_ENV !== production`. `npm run admin:create -- <telefon> <service_admin|super_admin>` (production’da sunucu terminali; audit + cüzdan).
- Kontrol: `npm test`, lint, `next build`. Main’e merge yok.

## 2026-11-07 – K-012: işlem bazlı yetki, REQUIRE_PROVIDER_TO_MUTATE kaldırıldı
- Dal: `fix/kendine-siparis` (PR #5 üzerine; main’e birleştirilmedi).
- `REQUIRE_PROVIDER_TO_MUTATE=false` siparişi gören herkese kabul/red/kod veriyordu. Bayrak silindi; yetki işlem + kimlik (`user.id === provider_id` / `user_id`) ile.
- Hizmet veren (veya admin): kabul, red, alım/teslim kodu, washing/ironing/ready, erteleme, alım/teslim fotoğrafı.
- Müşteri (veya admin): alım özeti, boy artışı, iptal (`pending` → `cancelled`; mevcut SM zaman/durum kuralları), yorum, uyuşmazlık açma.
- `PILOT_SEE_ALL_ORDERS` kapandı: üçüncü kişi GET 404, mutasyon 403 `FORBIDDEN` (“Bu işlemi yapma yetkiniz yok.”).
- `ALLOW_SELF_ORDER` açıkken aynı hesap iki tarafı da oynar (kimlik her iki id ile örtüşür).
- UI: müşteri ekranında veren düğmeleri, masada müşteri düğmeleri yok.
- Kontrol: `npm test` **149**, lint ve `next build` yeşil. Main’e merge yok.

## 2026-11-07 – K-011: kendine sipariş engeli
- Dal: `fix/kendine-siparis`. Önce kural yoktu: `createOrder` `user_id === provider_id` kabul ediyordu; `REQUIRE_PROVIDER_TO_MUTATE = false` ile aynı hesap kabul/red/kod da yapabiliyordu.
- `createOrder` 403 `SELF_ORDER`. Katalog girişli izleyicide kendi kartı yok. `ALLOW_SELF_ORDER=1` yalnız yerel/test; production’da bayrak okunmaz.

## 2026-11-07 – Takvim zarfı: sipariş penceresi görünmüyordu
- Dal: `fix/pencere-butonu`. `AppointmentCalendar` `{ data: { windows } }` açmıyordu; takvim boş kalıyordu. `parseCalendarWindows` + test.

## 2026-11-07 – Oturum çerezi HTTP'de düşüyordu
- Dal: `fix/oturum-kaybi`. `next start` (NODE_ENV=production) `Secure` çerez yazıyordu; HTTP LAN IP'de tarayıcı `komsu_sid/at/rt` reddediyordu → her yenilemede giriş.
- Secure yalnız production + HTTPS. `JWT_SECRET` yoksa durur, rastgele üretilmez.
- Takvim düğmesi ayrı: calendar GET kimlik istemez; oturum kaybı LoginGate'e düşürür, checkout'a gelinmez.

## 2026-11-07 – Adım 9: Acil 3b-lite main'e alındı
- PR **#2** merge commit ile birleşti (squash yok): `fdf920d`.
- Etiket: `sunum-v1` (`fdf920d`).
- `npm ci` + `npm test` **135**; lint ve `next build` yeşil. Temiz klon: `demo:reset`, `npm run dev`; GET `/` ve GET `/api/catalog` 200.

## 2026-11-06 – Adım 8d: seed/ekran aynı birim (makine/gün)
- Seed `ELIF_EXPRESS_QUOTA_MACHINES = 1`; DB `express_quota = 2` yarım-makine birimi. Ekran `halfUnitsToMachines` ile **1 makine/gün**. Demo siparişi kotayı düşürmez (ayar alanı).
- Duman: `acil kota: iki sipariş, üçüncü hata, geç teslimde zam iadesi`. Fixture: `migrate0005.test.ts` 0006 kayıpsız.

## 2026-11-05 – Adım 8c: 390px tarayıcı turu
- `feat/express-quota-refund`. Kapasite GET `{ data: { capacity } }` zarfı panoda açılmıyordu; kayıtlı kota 0 görünüyordu. `unwrapEnvelope` ile düzeltildi.
- 390px: Elif **Acil kontenjan = 1** (kota 2 birim); 99 günlük makineye (4) kırpılır. Müşteri **Acil teslim** açıkken yalnız Elif Y. listede (Merve/Gülşen/Burak yok). Cüzdan **Acil iade +₺40**. Yönetim Elif aylık **Geciken acil 1**.
- Taşma yok. Sıralama chip’lerinde “Fiy…” kırpılması önceki davranış. Geçersiz kota kırmızı hata değil, input min/max + clamp.
- `npm test` 134, lint, `next build` yeşil.

## 2026-11-05 – Adım 8: Acil 3b-lite (K-010)
- Dal: `feat/express-quota-refund` (`main`'den).
- **K-010:** `express_quota` (varsayılan 0) + gün satırında `used_express_units`. Normal görünen kapasite = `max_units − kota`. Acil yalnız kotadan. Kota 0 / yetersiz → `EXPRESS_QUOTA`. Kabul edilmiş tarih kaymaz.
- BR-021 ve sunucu: bugünün kalan **kotası** birime yeter (K-008 kapasite kuralının yerine).
- **BR-025 18:00 dönüşü uygulanmadı.** Gerekçe: K-008 acil yalnız bugün alım; önceki akşam kota kullanılmamış olacağından dönüş acili sıfırlardı.
- BR-024: geciken acilde zam iadesi (`express_refund`); capture/komisyon net üzerinden. Zamanında iade yok. Çift iade yok. Hold yoksa yalnız payments + `orders.express_refund`.
- Aylık profil: geciken acil sayısı. Otomatik askı yok.
- UI: veren kapasite “Acil kontenjan (makine/gün)”; müşteri acil kartı kota yetmezse gizlenir.
- Seed: elif 1 makine/gün (DB 2 birim). `demo:reset`: geciken acil + iade satırı.
- Migration `0006_express_quota.sql`. Kontrol turu: `npm test` **134**; lint ve `next build` yeşil.
- **Kontrol (Adım 8b):** Canlı `data/komsudan.db` kopyası (backup API, WAL dahil) zaten 0006’lıydı. Satırlar aynı, FK boş, kayıp yok: users 13, orders 11, payments 9, wallets 4, wallet_ledger 1, reviews 9, provider_capacity_settings 8, provider_capacity_days 1. Vitest eski şema fixture (0004+veri → migrate 0005+0006) aynı sayıları korudu; `express_quota`/`used_express_units`/`express_refund` varsayılan 0.
- Duman: kota 2 → iki acil kabul → üçüncü `EXPRESS_QUOTA` → geç teslimde zam iadesi + para değişmezi (geçti).
- Canlı API (`demo:reset` sonrası): elif `expressQuota=2`; katalogda yalnız elif `todayExpressFreeUnits=2` (Merve/Gülşen/Burak 0); aylık profil `delayedExpress=1`.
- 390px tarayıcı turu: Adım 8c.
- Açık / risk: otomatik askı yok (ÖNERİ); 18:00 dönüşü bilinçli yok; simüle hold'suz siparişte cüzdan hareketi yok (yalnız kayıt).

## 2026-11-05 – Adım 7: main'e birleştirme
- Eski `main` etiketi: `legacy-multi-category` (`f8d30e0`).
- PR **#1** merge commit ile birleşti (squash yok): `be5a593`.
- Birleşme sonrası `main`: `npm ci` yeşil; `npm test` **120/120**; `npm run build` yeşil.

## 2026-11-05 – Üretim derlemesi ve README
- `next build` + `next start` (JWT_SECRET ≥32). GET `/` 200; POST OTP (production’da `demoCode` yok); GET `/api/catalog` 8 veren. `demo:reset` production’da exit 1.
- Temiz clone: `npm ci` + test 120 + lint + build yeşil. better-sqlite3 native derlemesi bu ortamda geçti.
- README: ürün özeti, MVP içi/dışı, demo, sınırlar, teknoloji. Faz/çok kategori/gel al yok.

## 2026-11-05 – Adım 5b: Yönetim sekmesi (tarayıcı raporu)
- service_admin 4. sekme **Yönetim** (etiket + pano ikonu). Müşteri/veren sırası aynı (4. Hizmet). `tabBarItems.test.ts`.

## 2026-11-05 – Adım 5: Demo hazırlığı
- **Doğrulama:** `data/komsudan.db` kopyasında (orijinale dokunulmadı, backup API) 0005 sonrası satırlar aynı; FK check boş; passkey ve sessions/refresh join duruyor. Vitest: eski şema fixture → migrate.

| tablo | 0004 öncesi | 0005 sonrası |
|-------|-------------|--------------|
| users | 2 | 2 |
| orders | 1 | 1 |
| payments | 1 | 1 |
| wallets | 1 | 1 |
| wallet_ledger | 1 | 1 |
| reviews | 1 | 1 |
| messages | 1 | 1 |

Canlı kopya (Adım 5 başı, orijinal dosyaya dokunulmadı): users 9, orders 0, payments 0, wallets 1, wallet_ledger 0, reviews 8, messages 0 — kayıp yok. Passkey 2 satır, session/refresh join 1.
- **Duman:** OTP→yükle→sipariş→teslim→pending→balance→yorum; acil 15 dk EXPIRED + rezerv iade; iptal/red reserved+kapasite; service_admin KPI/askı.
- **Düzeltme:** TabBar 6. sekme 390px (`text-[9px]`, truncate, ikon 18). Lint: `CustomerApp` `home` useMemo, `MapCanvas` init `modeRef`. Keşif: `onboardingCompletedAt` varsa atlanır (demo hesap). `createOrder` rezervi sipariş satırından önce yazıyordu (`wallet_ledger.order_id` FK) — satır sonrası hold.
- **Demo:** `npm run demo:reset` (production yasak); README Demo bölümü. `WALLET_PENDING_WAIT_MS=60` önerisi.
- **Bulunan hata / kayıp:** 0005 kopyada veri kaybı yok; yeni migration gerekmedi. Seed `availability_slots` 1 saatlik vitrin penceresi yazıyordu, takvim 2 saate böldüğü için seçilebilir pencere boştu — seed gün boyu 08:00–20:00 (Pzt–Cmt). `npm test` `.next` yokken `pageRootMainKb` null; raporu yine yazar.
- **Bilinen sınırlar:** 3b yok (acil kontenjan, 18:00, iade/risk); kapıda renk grubu onayı yok; gerçek ödeme/çekim yok; otomatik askı yok.
- Tarayıcı: computerUse ile 390px tur. Konsolda uygulama JS exception yok (yalnız MapLibre WebGL/sürücü uyarısı). 6 sekme sığdı (Harita…Yönetim…Hesap). Harita karolarında “API KEY REQUIRED” (harita sağlayıcı, demo). Ekran görüntüleri: `/opt/cursor/artifacts/adim5-*.png`.

## 2026-11-01 – Adım 4: Hizmet Admini
- **K-009:** rol `service_admin`; yönetim API (`/api/admin/providers`, `.../monthly`, `/api/admin/kpi`, `.../suspend`); askı bayrağı + `admin_audit`; aylık profil ve KPI İstanbul ayı; "dikkat" rozeti DEMO eşiği (BR-029, otomatik askı yok).
- Migration `0005_service_admin.sql`. Seed: Hizmet Admini `5321100099` (üretimde demo sipariş yok).
- UI: yalnız admin rollerinde "Yönetim" sekmesi.
- Açık: otomatik askı / eşik (ÖNERİ, yok). 3b acil kontenjan bekliyor.

## 2026-11-01 – Adım 3a: Acil teslim (fiyat, 24 sa, 15 dk, liste, ≥1 sa)
- **K-008:** müşteri anahtarı; zam yalnız `express=true` (`EXPRESS_BUMP=0.40`); 24 sa = alım başlangıcı+24 sa (paket/yorgan ezilir); `respond_by` 15 dk; takvim `?express=1` (≥1 sa); BR-021 katalog `express` + bugünün kalan birimi; acilsiz aynı gün ≥2 sa kalır; `delayOrder` acilde hata.
- Migration yok. 3b (kontenjan, 18:00, iade+risk) ve ÖNERİ 30 dk red uygulanmadı.

## 2026-10-30 – Adım 2c: Para tutarlılığı
- Kapıda `authorizePayment` + `adjustHoldForOrder` tek transaction (`authorizePaymentAndHold`). INSUFFICIENT_BALANCE ödeme tutarını eski haline döndürür.
- Capture: hold varken reserved ≠ payment.amount ise `HOLD_CAPTURE_MISMATCH` (kısmi tahsil yok). Kazanç `payment.amount - commission`.
- Bilinen sınırlar: cüzdan hold'u olmayan (kart/simüle) siparişlerde cüzdan düşümü yok; eski DB'de capture ledger'ı olmayan tamamlanmış siparişler reserved'e dokunmaz.

## 2026-10-29 – Adım 2: Cüzdan kademeleri
- Kullanılabilir (`balance`) / rezerv (`reserved`) / bekleyen (`pending`). Teslimde net kazanç bekleyene yazılır, 24 sa sonra kullanılabilir.
- **K-007 (ONAYLI):** bekleme 24 sa. Sabit: `PENDING_EARNING_WAIT_MS` (`src/lib/walletMethods.ts`).
- Migration `0004_wallet_tiers.sql`; `wallet_pending_earnings`. Authorize ödemeler geriye dönük `reserved` doldurulur, `balance` dokunulmaz.
- Kalan: acil iadesi için hazır (Adım 3).
- Komisyon cüzdana yazılmaz, payments.commission'da; Adım 4 aylık özeti oradan okur. Demo: WALLET_PENDING_WAIT_MS.

## 2026-10-29 – Adım 1c: Eski kategori temizliği ve doküman hizalama
- Migration 0003_laundry_legacy_category_cleanup: çamaşır dışı tablo ve kayıtlar KALICI silinir (service_categories, drop_points, ürün/hizmet kartları, çamaşır dışı sipariş ve bağlı mesaj/ödeme/review). Eski veritabanı yedeklenmeden çalıştırılmamalı.
- legacyCategoryCleanup.test.ts ve laundryBootstrap.test.ts güncellendi: 28 dosya, 86 test geçti.
- Lint: 0 hata, 2 uyarı (CustomerApp.tsx:129 `home`, MapCanvas.tsx:129 `mode`) → Adım 6 temizlik.
- .gitignore: /data/ eklendi. mimari.md durum eşlemesi URUN_REFERANS §3 ile hizalandı.
- Adım 1 KAPANDI. Sonraki: Adım 2 (cüzdan kademeleri).
- Açık: teslim/sunum tarihi.

## 2026-10-29 – Adım 1 / 1b: Dokümanlar repoya alındı, eski kurallar hizalandı
- daf14ed push edildi (ürün referansı, günlük, Cursor kuralı).
- Eski .cursor kuralları v0.3 ile hizalandı (gel al, kg/tartım, iyzico, push kuralı).
- docs/mimari.md ile durum eşlemesi tutarsızlıkları açık (admin_pending, ready=RETURNING, PICKUP=dropped_off); commit edilmemiş dosyalar incelemede.
- Sonraki adım: commit edilmemiş dosyaların kararı, sonra Adım 2 (cüzdan kademeleri).

## 2026-10-29 – Adım 0 (DÜZELTİLMİŞ): Gap analizi `chore/laundry-only` dalına göre

**Düzeltme:** İlk analiz `main` dalına bakılarak yapılmıştı (çok kategorili, eski model). Gerçek çalışma dalı `chore/laundry-only`: yalnız çamaşır, 324 dosya değişmiş (~32 bin satır silinmiş), migration'lar `0001_schema` + `0002_larger_order_sizes`, 27 test dosyası. İlk matris geçersiz.

**Dalda ONAYLI ve KODDA VAR:** paket/boy (+3–5 makine)/ekler, renk grubu 1–3 kapıda, tek fiyat + sunucu hesabı, %10 komisyon, makine kapasitesi, 7 gün × 2 saatlik pencere, aynı gün ≥2 sa, sistem teslim günü, 48/72 sa, kapasite kabulde, 45 dk cevap + hatırlatma + `EXPIRED` red + alternatif veren, kapıdan alım/teslim, `KL-XXXX` + 4 haneli kodlar, kapıda sayım/foto/onay, simüle bakiye (yükle → hold → teslimde capture), süper admin, çift rol, 72 sa erteleme. Sadakat izi yok (spec ile uyumlu).

**KALAN BOŞLUKLAR (ONAYLI ama kodda eksik / aykırı):**
1. Acil: kodda +%25 ve "aynı gün"e bağlı; spec +%40, 24 saat, 15 dk cevap, günlük acil kontenjan, 18:00 geri dönüş, 24 sa kaçınca iade → eksik
2. Cevap süresi: her sipariş 45 dk; acilde 15 dk olmalı
3. Süre tablosu: `yikama` ve `katlama` ikisi 48 sa (spec yalnız "yıkama+katlama 48" der) — küçük, netleştirilecek
4. Cüzdan: tek `balance`; kullanılabilir / bekleyen / rezerv kademeleri yok; teslimde net kazanç bekleyen bakiyeye düşmüyor
5. Kapıda otomatik fiyat onayı (renk grubu aşımı): boy yükseltme onayı var, grup aşımı yok
6. Hizmet Admini ayrı rol yok
7. Aylık hizmet veren profili / pilot KPI yok
8. Q2 çelişkisi: yorgan +24 sa kodda uygulanıyor, ama Q2 açık (spec: cevap gelene kadar uygulama)

**Durum adları:** kod İngilizce, spec farklı. Karar: yeniden adlandırma yok, eşleme tablosu `URUN_REFERANS_v0.3.md` §3'te. `admin_pending` kodsuz teslim için ek durum.

**Uygulanmayacak (ÖNERİ / Q1–Q12):** tek bekleyen talep, acil red 30 dk, kapıya bırakma yasağı + admin override, bekleme 24 sa, çekim kuralları, birleşik kart görünümü.

### Kararlar
- **K-001 (ONAYLI):** Yığın repodakiyle aynı (Next 16 + React 19 + TS + Tailwind 4 + better-sqlite3 ham SQL + zod + jose + Vitest). ORM eklenmez.
- **K-002 (ONAYLI):** Çamaşıra odaklanıldı; diğer kategoriler dalda koddan kaldırıldı.
- **K-003 (ÖNERİ):** Ödeme simüle kalır; gerçek fon tutma raporda "gelecek çalışma".
- **K-004 (ONAYLI (29 Eki 2026)):** OTP girişi kalır, siparişteki passkey/kimlik zorunluluğu hafifletilir.
- **K-005 (ONAYLI (29 Eki 2026)):** Çalışma tabanı `chore/laundry-only`; bitince PR ile `main`'e alınır.
- **K-006 (ONAYLI (29 Eki 2026)):** Durum adları yeniden adlandırılmaz, dokümanda eşlenir.

### Önerilen yol haritası (kalan işler)
- Adım 1: Durum adı eşlemesi + doküman/kural dosyalarını repoya al (kod yok)
- Adım 2: Cüzdan kademeleri (kullanılabilir / bekleyen / rezerv, teslimde bekleyene düşme)
- Adım 3: Acil teslim (+%40, 24 sa, 15 dk cevap, kontenjan, 18:00 dönüş, iade) — iade için Adım 2'ye bağlı
- Adım 4: Hizmet Admini rolü + aylık hizmet veren profili + pilot KPI
- Adım 5: Kapıda renk grubu aşımı fiyat onayı + süre tablosu netleştirme
- Adım 6: Test boşlukları, demo verisi, rapor, savunma hazırlığı

### Açık sorular
1. Teslim / sunum tarihi?
2. K-004, K-005, K-006 onayı
3. Q2: yorgan +24 sa KALSIN, onaylandı
4. Bekleyen bakiye süresi 24 sa onayı (Adım 2 için)

### Savunma notları
- Neden gerçek ödeme yok? Fon tutma lisanslı ödeme kuruluşu gerektirir; MVP'de simüle, raporda gerekçeli.
- Neden SQLite? Tek dosya, demo kolay; SQL yalnız `src/lib/db/`, Postgres/Turso'ya geçiş dar.
- Neden kg/tartım yok? Evdeki tartılar farklı, hileye açık; boy + sayım + müşteri onayı daha savunulabilir.
- Neden sistem teslim tarihi hesaplıyor? Hizmet verenin keyfi tarihini önler, kapasite gerçek kalır.
- Kanıt gücü torba/mühürden düşük; kod + foto + müşteri onayı ile azaltıldı, risk kaydına yazıldı.
- Neden durum adları spec'ten farklı? Kod İngilizce, spec Türkçe/domain dili; eşleme tablosuyla izlenebilir, yeni yaşam döngüsü yok.
