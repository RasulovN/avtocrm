# AvtoCRM Xavfsizlik va Kamchiliklar Tahlili

Mening keng qamrovli tahlilimga asoslanib, bu erda loyihada topilgan xavfsizlik kamchiliklari va dastur mantig'iga oid muammolar keltirilgan:

## 🔴 MUHIM (Critical) Masalalar

### 1. Shtrixli chop etish (Barcode Print) orqali aks ettirilgan XSS (Bir nechta fayllar)
**Fayllar:** `StockEntryListPage.tsx`, `ProductBarcodePage.tsx`, `ProductListPage.tsx`, `BarcodePrint.tsx`

**Tavsif:** Ma'lumotlar bazasidagi shtrix-kod qiymatlari (yoki mahsulot nomlari) to'g'ridan-to'g'ri HTML/JavaScript shablonlariga hech qanday qochmasdan (escaping) interpolyatsiya qilinmoqda yoki `innerHTML` orqali to'g'ridan-to'g'ri `document.write` ichiga joylashtirilmoqda:

```javascript
printWindow.document.write(`
  ...
  <div class="barcode-value">${barcodeValue}</div>
  <script>
    JsBarcode('#barcode-svg', '${barcodeValue}', ...);
  </script>
`);
```
Agar tajovuzkor `"><script>alert(1)</script>` kabi qiymatga ega mahsulot nomi yoki shtrix-kodni ishlatsa, u chop etish oynasida zararli kodni ishga tushirishi mumkin. Bu sessiya va tokenlarning o'g'irlanishiga (XSS) olib keladi.

**Tuzatish:** 
- String interpolyatsiyasi o'rniga `document.createElement` va `textContent` usullaridan foydalaning.
- React'da tayyorlangan maxsus `xss.ts` faylidagi qochish funksiyalaridan to'g'ri va doimiy foydalaning (masalan: `escapeHtml`, `escapeJsString`).

## 🟠 YUQORI (High) Masalalar

### 2. Nozik foydalanuvchi ma'lumotlarini `localStorage`-da saqlash
**Fayl:** `authService.ts`, `app/store.ts`

**Tavsif:** Butun foydalanuvchi ob'ekti (jumladan telefon raqami, email, do'kon identifikatori, roli va h.k.) login tizimidan so'ng `localStorage`da ochiq ko'rinishda saqlanadi:
```javascript
localStorage.setItem('crm_user', JSON.stringify(user));
```
Agar dasturda biron bir XSS zaifligi topilsa, barcha mijoz ma'lumotlari xavf ostida qoladi.

**Tuzatish:**
- Sessiyani boshqarish uchun faqat backend tomonidan boshqariladigan `httpOnly` va `Secure` cookie fayllardan foydalaning.
- `localStorage`-da faqat sezgir bo'lmagan UI sozlamalarini (masalan, mavzu/theme) saqlang.

### 3. Kontent xavfsizligi siyosati (CSP) yo'q
**Fayl:** `index.html`

**Tavsif:** Dasturda hech qanday Content-Security-Policy (CSP) meta-tegi yoki sarlavhalari sozlangan emas. Bu dasturni hatto oddiy in'ektsiya hujumlaridan ham himoyasiz qiladi.

**Tuzatish:** `index.html` faylining `<head>` qismiga quyidagi qatorni qo'shing yoki serverda sozlang:
`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';">`

## 🟡 O'RTA (Medium) Masalalar

### 4. Ishonchsiz cookie konfiguratsiyasi
**Fayl:** `src/utils/cookie.ts`

**Tavsif:** Cookie fayllari `secure` bayrog'isiz (flag) o'rnatilmoqda. Bu ma'lumotlarning HTTP tarmog'i orqali shifrlanmagan holda yuborilishiga imkon beradi (MITM hujumi xavfi).

**Tuzatish:** Ishlab chiqarish muhitida `secure: true` qilib sozlang:
```javascript
Cookies.set(USER_KEY, userStr, { 
  expires: 7, 
  path: '/', 
  sameSite: 'lax',
  secure: import.meta.env.PROD 
});
```

### 5. Faqat mijoz tomonidan avtorizatsiya va himoyasiz API chaqiruvlar
**Fayllar:** Barcha sahifa komponentlari (UserListPage, StoreListPage va h.k.)

**Tavsif:** Dasturda UI darajasida avtorizatsiya nazorat qilinadi (masalan: `if (isAdmin)`), lekin frontendda foydalanuvchi do'konlarga oid ma'lumotlarni so'rashda URL parametrlarini o'zgartirishi orqali boshqa do'konlarning ma'lumotlarini olishi ehtimoli mavjud. Agar Backend avtorizatsiyani har bir bosqichda tekshirmasa, IDOR (Insecure Direct Object Reference) xavfi mavjud.

### 6. Tashqi skriptni kiritish xavfi (CDN)
**Fayllar:** Barcha chop etish funksiyalariga ega fayllar

**Tavsif:** Dastur `https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/...` orqali tashqi skriptni yuklab oladi. Agar ushbu CDN buzilsa yoki tarmoqda o'zgartirilsa, tizimga zararli kod tushadi.

**Tuzatish:** 
- Kutubxonani lokal loyihaga o'rnating va paketdan foydalaning yoki HTML'da yuklashda SRI (`integrity="..."`) xeshlaridan foydalaning.

### 7. Qattiq kodlangan (Hardcoded) WebSocket URL manzili
**Fayl:** `src/context/NotificationProvider.tsx`

**Tavsif:** `const WS_URL = 'wss://api.avtoyon.uz/ws/notifications/';` o'zgaruvchisi ochiq yozilgan.
**Tuzatish:** Buni muhit oʻzgaruvchilariga (`import.meta.env.VITE_WS_URL`) koʻchirish kerak.

## 🔵 KAM (Low) va Sifat Masalalari

### 8. `innerHTML` yordamida to'g'ridan-to'g'ri chop etish
`BarcodePrint.tsx` va `ProductListPage.tsx` da `printContentRef.current.innerHTML` dan to'g'ridan-to'g'ri shablonga interpolyatsiya qilinmoqda. React-da himoyalangan kontent bo'lsa-da, chop etish sahifasi uchun xavfsiz bo'lmagan usul hisoblanadi.

### 9. Typelarning yo'qligi (`any` turlaridan foydalanish)
Ko'pgina xizmat fayllarida (`userService.ts`, `inventoryService.ts` va hokazo) xatolarni qabul qilishda yoki obyektlarni formatlashda TypeScript'ning `any` turlaridan xavfli darajada keng foydalanilgan.
**Tuzatish:** TypeScript turlarini (Interfeyslar) aniq belgilang.

### 10. `window.open` va `document.write` kombinatsiyasidan foydalanish
Modern dasturlashda `document.write` usulidan foydalanish eskirgan amaliyot hisoblanadi. Buning o'rniga Blob obyektini yaratish va uni URL orqali ochish tavsiya qilinadi:
```javascript
const blob = new Blob([htmlContent], { type: 'text/html' });
window.open(URL.createObjectURL(blob), '_blank');
```

## 📋 QISQACHA XULOSA
Ushbu kamchiliklarni bartaraf etish tizimning barqarorligini va foydalanuvchilar ma'lumotlari xavfsizligini ta'minlashda juda muhimdir. Birinchi navbatda XSS (P0) va LocalStorage (P1) bilan bog'liq xatolarni tuzatish tavsiya etiladi.