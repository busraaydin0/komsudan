# Komşudan – Proje Günlüğü

Kural: Her değişiklikte en üste yeni kayıt eklenir. Adım onaylanmadan sonraki adıma geçilmez.
Kaynak dokümanlar: MVP Tanım v0.3, Karar Kaydı v0.3, Süreç Haritası v0.4 (`docs/kaynak/`, henüz eklenmedi). Kısa referans: `docs/URUN_REFERANS_v0.3.md`.
Çalışma dalı: `chore/laundry-only`.

---

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
