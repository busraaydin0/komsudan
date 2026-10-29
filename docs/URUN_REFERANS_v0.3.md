# Komşudan – Ürün Referansı v0.3 (kısa)

Kaynak: MVP Tanım Dokümanı v0.3 ve Karar Kaydı v0.3 (`docs/kaynak/`). Çelişkide orijinal dokümanlar geçerlidir.
**ONAYLI** = uygulanır. **ÖNERİ** = onay gelene kadar uygulanmaz.

## 1. Hizmet modeli (ONAYLI)
- Paketler: yıkama / yıkama+katlama / yıkama+ütü+katlama (repo: `yikama`, `katlama`, `tam`).
- Boy: Küçük ≈0,5 makine, Orta ≈1, Büyük ≈2 (pilotta kalibre edilir).
- Ekler: yorgan/battaniye, tek/çift, adetle. Her adet ≈1 makine. Ütü boya dahil sabit çarpan.
- Renk ayrımı standart (beyaz/renkli/koyu), seçenek değil, fiyata gömülü. Grup varsayımı: Küçük ≤2, Orta 2-3, Büyük 3. Aşılırsa kapıda fiyat onay ekranı.
- Tek fiyat, lojistik dahil, **müşteriye ek hizmet bedeli yok** (BR-034).
- Tek sipariş üst sınırı: hizmet veren tanımlar (BR-020).

## 2. Kapasite, takvim, teslim tarihi (ONAYLI)
- Kapasite birimi **makine**. Hizmet veren günlük makine sayısı ve çalışma günlerini girer; sabit varsayılan yok.
- Takvim: bugünden **7 gün**, **2 saatlik** alım pencereleri. Durum: uygun / az yer / dolu (dolu seçilemez). Eşik oran bazlı: ≤%33 az yer, %0 dolu.
- Aynı gün alım: pencere başlangıcına ≥2 saat (acilde ≥1 saat) kalmış olmalı (BR-031).
- Teslim **gününü sistem** hesaplar (BR-017), saat penceresini **müşteri** seçer (BR-032).
- Sipariş anında tahmini, kabulde kesin; kapasite kabulde ayrılır (BR-018).
- Süreler (alımdan teslime): yıkama+katlama 48 sa, ütülü 72 sa, acil 24 sa. Büyük sipariş günlere yayılır, tek seferde teslim.
- Hizmet veren tarihi yalnız 72 saat üst sınırı içinde ve gerekçeyle ileri alabilir; müşteri ücretsiz iptal edebilir (BR-019).
- Pilotta kabul elle.

## 3. Durum makinesi
`CREATED → PROVIDER_SELECTED → ACCEPTED → PICKUP → WASHING → IRONING* → READY → RETURNING → COMPLETED`
- `IRONING` yalnız ütülü pakette. Yan durumlar: `REJECTED` (neden `EXPIRED` dahil), `CANCELLED`, `DISPUTED`.
- Yeni durum eklenmez; cevapsızlık = `REJECTED` + neden `EXPIRED`.
- **Kod adı eşlemesi (yeniden adlandırma yok):**

| Spec | Kod |
|---|---|
| CREATED + PROVIDER_SELECTED | `pending` (oluştururken veren seçili) |
| ACCEPTED | `accepted` |
| PICKUP | `dropped_off` |
| WASHING / IRONING / READY | `washing` / `ironing` / `ready` |
| RETURNING | `ready` (teslim kodu bu aşamada aktif) |
| COMPLETED / REJECTED / CANCELLED / DISPUTED | aynı |
| (kodsuz teslim) | `admin_pending` — kodda ek durum, spec'te yeni yaşam döngüsü değil |

## 4. Talep cevap süresi ve otomatik red (ONAYLI)
- Standart 45 dk, acil 15 dk; süre hizmet verenin müsaitlik saatinde işler; yarısında hatırlatma (BR-028).
- Süre dolunca otomatik red: kapasite ve bakiye rezervi serbest, müşteriye aynı tarih için diğer uygun hizmet verenler önerilir.
- Alım penceresine 1 saat kala hâlâ kabul edilmemişse otomatik red.
- Cevapsızlık risk skoruna yansır; eşik aşılırsa Hizmet Admini askıya alır (BR-029).
- Uygulama: gerçek scheduler gerekmez; istek anında süresi dolanları kontrol et (lazy expiry) veya küçük bir cron endpoint.
- **ÖNERİ:** müşteri aynı anda en fazla 1 bekleyen talep (BR-030); acilde otomatik red eşiği 30 dk.

## 5. Kodlar ve kanıt (ONAYLI)
- Tek yöntem: **kapıdan alım, kapıya teslim**. QR, torba, gel al noktası yok.
- Sipariş kodu (örn. KL-4F7K), alım kodu, teslim kodu (4 hane). Kodlar müşterinin telefonunda durur, hizmet veren girer.
- Alım: sayım + fotoğraf + boy seçimi → müşteri alım özetini onaylar → onay olmadan alım kodu girilemez.
- Hizmet veren sipariştekinden yüksek boy girerse müşteri onaylamadan geçilemez; reddederse alım ücretsiz iptal edilebilir.
- Teslim kodu yalnız `RETURNING`'de aktif, tek kullanımlık, deneme limitli; teslim fotoğrafı zorunlu.
- Kodsuz teslim: önleme bildirimi → talep (foto+konum+saat) → bir kez ücretsiz yeniden teslim, 3 gün saklama, 24 saat itiraz → itiraz varsa `DISPUTED`, rezerv bloke, admin karar verir. Pilotta otomatik kapanma yok. (Bitirme için basitleştirilmiş sürüm yeterli.)
- **ÖNERİ:** kapıya/komşuya bırakma yasak, admin override.

## 6. Ödeme: uygulama bakiyesi (ONAYLI, simüle)
1. Bakiye yetersizse kart/banka ile yükleme (simüle).
2. Talep gönderilince geçici rezerv; kabulde tahmini üst tutar kesin rezerv.
3. Kapıda boy/adet kesinleşince rezerv güncellenir; fark serbest, eksikse ek yükleme.
4. Teslim kodu girilince rezerv çözülür, **%10 komisyon** ayrılır, net kazanç hizmet verenin **bekleyen** bakiyesine düşer.
5. Bekleme süresi sonunda **kullanılabilir** olur; yeni siparişte kullanılır ya da çekim talebi açılır.
- Tek hesap, tek cüzdan (hem müşteri hem hizmet veren).
- Komisyon tabanı müşterinin ödediği toplam (acil ücreti dahil); teslim kodunda alınır, iptal/redde alınmaz (BR-033).
- **ÖNERİ:** bekleme 24 sa; yüklemede minimum yok; çekim haftalık admin onaylı; "kartla öde → yükle ve rezerve al" birleşik görünüm.
- Gerçek fon tutma lisans gerektirir (R-013/Q-009): projede simüle, raporda "gelecek çalışma".

## 7. Acil teslim (ONAYLI)
- Anahtar açılınca 24 saat teslim, normal fiyatın **+%40**'ı (ek ücret hizmet verene, komisyon toplam üzerinden). Yalnız acil desteği açık ve kapasitesi uygun hizmet verenler listelenir (BR-021).
- Aynı gün alım; cevap süresi 15 dk. Acil sipariş boş kapasiteye girer, kabul edilmişlerin tarihi kaymaz (BR-022).
- Acil kontenjan: hizmet veren günlük kapasiteden ayırabilir (varsayılan 0); kullanılmayan, önceki gün 18:00'de normal kapasiteye döner (BR-025).
- 24 saat kaçarsa acil ücret iade edilir, risk skoru etkilenir (BR-024).

## 8. Roller
- Müşteri / Hizmet veren: tek hesap, çift rol.
- **Süper Admin:** tüm alanlar, ödeme, payout.
- **Hizmet Admini:** kendi hizmet alanı; hizmet veren başvuru/doğrulama/askıya alma, sipariş ve vakalar, aylık profil, pilot KPI. Pilotta ikisi aynı kişi olabilir.
- Aylık hizmet veren profili: sipariş sayısı, tamamlanan/iptal, cevapsız, gecikme, puan, şikayet, gelir ve komisyon, ortalama doluluk.

## 9. Pilot ve ölçüm
- Ankara / Çukurambar, 4 hafta, 5 hizmet veren, davetli kullanıcı. Sadakat kapalı.
- KPI: tekrar sipariş ≥%20, memnuniyet, iptal, cevapsızlık, söz verilen–gerçek teslim farkı, gerçek makine kapasitesi / boy katsayısı kalibrasyonu.
- Opsiyonel kg girişi fiyatı etkilemez, yalnız kalibrasyon verisi.

## 10. Açık sorular (cevap gelene kadar uygulama)
Q1 tek sipariş üst sınırı Büyük (2 makine) mi · Q2 yorgan +24 sa KALSIN, onaylandı; kurutma makineye dahil mi açık · Q3 ekler MVP'de mi, "poşet" mi · Q4 Küçük boyda 3. renk grubu ek ücret · Q5 kapıda boy reddi · Q6 kapıya bırakma · Q7 bakiye minimum/çekim · Q8 kartla öde birleşik görünüm · Q9 ödeme lisansı · Q10 tek bekleyen talep · Q11 acil red eşiği 30 dk · Q12 sadakat sonrası seçenek.
