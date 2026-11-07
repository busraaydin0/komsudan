# Komşudan

Çukurambar (Ankara) **çamaşır pazaryeri**. Müşteri paketi, boyu ve ekleri seçer; kapıdan alınır, yıkanır, kapıya teslim edilir. Eve kimse girmez. Hizmet vereni sistem atamaz; müşteri seçer. Teslim **gününü sistem** hesaplar, saat penceresini müşteri seçer.

Klasör adı `katla`, npm paketi `komsudan`. Kod İngilizce, arayüz Türkçe.

## Kapsam

**MVP içi:** yalnız çamaşır (`yikama` / `katlama` / `tam` + boy + ekler). Kapı alım/teslim. Cüzdan simülasyonu. Acil teslim (zam, 24 sa, 15 dk cevap, kota, geciken acil iadesi). Hizmet Admini (KPI, askı).

**MVP dışı:** gel al noktası, QR/torba, tartım, sadakat, gerçek ödeme/çekim, halı ve kuru temizleme, eve giriş. Acil 18:00 kota dönüşü (BR-025, bilinçli uygulanmadı). Otomatik askı. Kapıda renk grubu onayı.

Tutar ve sipariş durumu istemciden gelmez; sunucu hesaplar.

## Kurulum

Node 20+. `better-sqlite3` native derler: macOS’ta Xcode CLT; Linux’ta `python3`, `make`, `g++` (Debian: `build-essential`).

```bash
git clone https://github.com/busraaydin0/komsudan.git
cd komsudan
git checkout chore/laundry-only
cp .env.example .env   # JWT_SECRET en az 32 karakter
npm ci                 # veya npm install
npm run dev
```

Tarayıcı: [http://localhost:3000](http://localhost:3000)

Üretim: kalıcı `next start` (Vercel/serverless değil; SQLite tek dosya). `JWT_SECRET` zorunlu.

```bash
npm run build
JWT_SECRET=en-az-otuz-iki-karakter-uzun-gizli npm start
```

`NODE_ENV=production` iken `npm run demo:reset` çalışmaz; demo admin (5321100099) ve seed passkey yazılmaz. OTP yanıtında `demoCode` yoktur (`OTP_ECHO=1` ile açılır). Katalog seed’i verenleri kurar; jüri siparişleri ve aylık KPI örnekleri eklenmez.

## Admin hesabı oluşturma

Rol HTTP, OTP veya profil ile yazılmaz; yalnız veritabanı. Üretimde demo admin yoktur. Sunucuda, kalıcı process’in kullandığı DB’ye:

```bash
npm run admin:create -- 5XXXXXXXXX service_admin
npm run admin:create -- 5XXXXXXXXX super_admin
```

| Rol | Ne yapar | Ne yapamaz |
|-----|----------|------------|
| `service_admin` | `/api/admin/*`: veren listesi, aylık profil, KPI, askı | Sipariş oluşturma, durum, kod, ödeme, çekim, kodsuz teslim |
| `super_admin` | Yönetim + sipariş mutasyonu, ödeme/çekim, kodsuz teslim | Sipariş oluşturma (`ADMIN_CANNOT_ORDER`) |

Komut kullanıcıyı oluşturur veya rolünü ayarlar, cüzdan satırını kurar, `admin_audit` yazar. Telefon `5XX…` olmalı; geçersiz rol hata verir. Arayüzde bu roller yalnız **Yönetim** (ve çıkış için Hesap) görür.

**Güvenlik:** komutu yalnız sunucu terminalinden çalıştır. `JWT_SECRET` ve DB dosyası git’te yok. Production’da seed passkey (`demo-staff-passkey`, pilot onay) kapalı.

Git’te yok: `data/*.db`, `data/uploads/`, `.env`.

## Demo

Jüri / savunma için 8–10 dakikalık tur. **Production’da `demo:reset` yok.**

```bash
# .env: WALLET_PENDING_WAIT_MS=60  (bekleyen kazanç 60 sn)
npm run demo:reset
npm run dev
```

`demo:reset` mevcut `data/komsudan.db` dosyasını `data/backups/` altına kopyalar, sonra siler ve seed + örnek siparişleri kurar.

Geliştirmede OTP yanıtında ve giriş ekranında `demoCode` görünür (5 dk).

| Rol | Telefon | Ne görülür |
|-----|---------|------------|
| Müşteri | `5321100090` | Harita, sipariş, cüzdan (~2500 ₺), örnek işler |
| Hizmet veren (Elif) | `5321100001` | Hizmet masası, gelen işler |
| Hizmet Admini | `5321100099` | **Yönetim** + Hesap, KPI, askı |

Kimlik + cihaz kilidi demo hesaplarda işaretli. İzin penceresinde “şimdilik geç”. Keşif yeniden sorulursa “hizmet almak” + Çukurambar.

**K-011:** kendine sipariş kapalı (`user_id === provider_id` → `SELF_ORDER`). Keşif listesinde kendi kartın müşteri olarak çıkmaz. Tek cihazla aynı hesabı hem veren hem müşteri diye denemek için `.env` içine `ALLOW_SELF_ORDER=1` (yalnız `NODE_ENV !== production`; production’da bayrak yok sayılır).

**K-012/K-013:** sipariş işlemi kimliğe bağlı. Müşteri kabul/ilerletme/kod giremez; Elif masasında yalnız kendi işleri. Yanlış rol 403. `super_admin` sipariş mutasyonu yapabilir; `service_admin` (`5321100099`) yalnız yönetim, sipariş/ödeme yok. Admin hesabı sipariş oluşturamaz.

### 8–10 dk senaryo

1. Müşteri `5321100090` — OTP’yi ekrandan yaz. Harita: Çukurambar iğneleri.
2. **Acil teslim** aç; kota 0 olan verenler (Merve, Gülşen, Burak) listeden düşer, Elif (1 makine/gün) kalır. Karta bas → sipariş sheet (paket, boy, pencere, tutar).
3. **Sipariş** sekmesi; **Hesap** → cüzdan. Demo’da geciken acil satırı **Acil iade** (+zam kısmı) görünür.
4. Çıkış. Elif `5321100001` — **Hizmet**: kapasite kartında **Acil kontenjan (makine/gün)** (0…günlük makine). Kabul / yıkama / hazır. Hazır teslim kodu müşteride `5678`.
5. Çıkış. Hizmet Admini `5321100099` — **Yönetim**: KPI, veren listesi, Elif “dikkat”, aylık profilde **Geciken acil**. Askıya al → listeden düşer; açınca döner. Harita/sipariş sekmesi yok.
6. İsteğe bağlı: yeni sipariş → teslim → bekleyen kazanç `WALLET_PENDING_WAIT_MS` sonra bakiye.

## Test komutları

| Komut | Açıklama |
|--------|----------|
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run knip` | Kullanılmayan dosya/export |
| `npm run check` | lint + typecheck + test + knip |
| `npm run build` | Üretim derlemesi |
| `npm run demo:reset` | Temiz demo DB (`NODE_ENV!=production`) |
| `npm run admin:create` | Admin kullanıcısı oluştur / rol ayarla (production’da da) |

## Bilinen sınırlar

- Acil 18:00 kota dönüşü (BR-025) yok: acil yalnız bugün alım olduğu için dönüş kuralı kotayı sıfırlardı.
- Geciken acil iadesi var; otomatik askı yok (Hizmet Admini elle askıya alır). Aylık profilde geciken acil sayısı görünür.
- Gerçek ödeme ve çekim yok (cüzdan simülasyon).
- Kapıda renk grubu onayı yok.
- Harita karoları demo anahtarsızsa “API KEY REQUIRED” filigranı gösterebilir.
- Üretim OTP: `demoCode` alanı yok; `sms` metninde simülasyon kodu hâlâ durur.

## Teknoloji

| | |
|--|--|
| Uygulama | Next.js 16 App Router (JSON API + PWA), kalıcı `next start` |
| UI | React 19, Tailwind CSS 4, MapLibre |
| Veri | better-sqlite3 (`data/komsudan.db`), numaralı `db/migrations/` |
| Auth | Telefon + OTP, JWT (`jose`) |
| Doğrulama | Zod; cevap `{ data }` / `{ error }` |
| Test | Vitest |

Katmanlar: route → `src/lib/services/` → `src/lib/db/`. Ayrıntı: [docs/mimari.md](docs/mimari.md).
