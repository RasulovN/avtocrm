# AvtoCRM

AvtoCRM avtomobil ehtiyot qismlari savdosi va ichki operatsiyalarini boshqarish uchun yaratilgan frontend CRM tizimi. Loyiha do'konlar, ombor, kirim, sotuv, o'tkazma, ta'minotchi, foydalanuvchi va hisobot modullarini yagona interfeysda boshqaradi.

Frontend `React + TypeScript + Vite` asosida yozilgan. UI qismi `Tailwind CSS`, `Radix UI`, `Lucide Icons` va `Zustand` bilan qurilgan. Ilova backend bilan `axios` orqali ishlaydi va autentifikatsiya cookie-session asosida yuritiladi.

## Asosiy imkoniyatlar

- Telefon va parol orqali login
- Cookie-based sessiya bilan avtorizatsiya
- O'zbek va rus tillari
- Light va dark theme
- Dashboard va operatsion ko'rsatkichlar
- Mahsulotlar ro'yxati, qo'shish, tahrirlash va barcode
- Kategoriyalarni boshqarish
- Kirim yaratish va kirim tarixi
- O'tkazmalar yaratish, ro'yxati va so'rovlar
- Sotuvlar ro'yxati va POS oynasi
- Ta'minotchilar va do'konlar boshqaruvi
- Foydalanuvchilar boshqaruvi
- Real data asosidagi hisobotlar va diagrammalar

## Texnologiyalar

- React 19
- TypeScript
- Vite 8
- React Router
- Zustand
- Axios
- Tailwind CSS
- Radix UI
- i18next
- Vitest + Testing Library

## Ishga tushirish

Talablar:

- Node.js 20+ tavsiya etiladi
- npm

O'rnatish:

```bash
npm install
```

Development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Build preview:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

Testlar:

```bash
npm run test
```

Coverage bilan:

```bash
npm run test:coverage
```

## API va autentifikatsiya

Loyiha API bilan `src/services/api.ts` orqali ishlaydi.

<!-- - Base API URL: `https://autocrm.pythonanywhere.com/api` -->
- Base API URL: `https://api.avtoyon.uz/api`
- `withCredentials: true` yoqilgan
- Login endpoint server tomonda httpOnly cookie yozadi
- Frontend esa UI uchun `crm_user` va `crm_auth_time` ni `localStorage` ga saqlaydi

Muhim izohlar:

- `401` holatida foydalanuvchi sessiyasi tozalanadi va login sahifasiga yuboriladi
- Ayrim modullarda backend ishlamasa fallback yoki mock ma'lumotlar ishlatiladi
- `productService` hozir API o'rniga demo fallback bilan ham ishlay oladi

## Routing

Ilova til prefiksi bilan ishlaydi:

- `/:lang/dashboard`
- `/:lang/products`
- `/:lang/products/new`
- `/:lang/products/:id/edit`
- `/:lang/products/:id/barcode`
- `/:lang/categories`
- `/:lang/inventory`
- `/:lang/inventory/new`
- `/:lang/transfers`
- `/:lang/transfers/new`
- `/:lang/transfers/requests`
- `/:lang/transfer-requests`
- `/:lang/sales`
- `/:lang/sales/new`
- `/:lang/suppliers`
- `/:lang/stores`
- `/:lang/stores/users`
- `/:lang/reports`
- `/:lang/settings`

Asosiy routing `src/App.tsx` ichida yozilgan.

## Modul tavsifi

### Dashboard

Dashboard sahifasi umumiy KPI ko'rsatkichlarini chiqaradi:

- jami mahsulotlar
- tushum
- qarzdorlik
- ta'minotchi qarzi
- do'konlar bo'yicha natija

### Mahsulotlar

Mahsulot moduli quyidagilarni qo'llab-quvvatlaydi:

- mahsulot ro'yxati
- mahsulot yaratish va tahrirlash
- barcode generatsiya va chiqarish
- kategoriya, do'kon va qidiruv bo'yicha filter

### Kirim

Kirim moduli ta'minotchidan mahsulot qabul qilish oqimini boshqaradi:

- kirim yaratish
- kirimlar tarixi
- to'langan summa va qarzdorlik hisoblash

### O'tkazmalar

O'tkazmalar moduli do'konlar orasidagi ichki harakatlarni boshqaradi:

- o'tkazma yaratish
- o'tkazmalar ro'yxati
- so'rovlar / request sahifasi
- statuslar: `pending`, `accepted`, `rejected`

### Sotuvlar

Sotuv moduli quyidagilarni beradi:

- sotuvlar ro'yxati
- POS sahifasi
- mahsulot qo'shish
- foyda va umumiy summa hisoblash
- to'lov turi: `cash`, `card`

### Ta'minotchilar va do'konlar

- ta'minotchilar ro'yxati va qarzdorligi
- do'konlar ro'yxati
- do'kon foydalanuvchilarini boshqarish

### Hisobotlar

Hisobotlar sahifasi real operatsion ma'lumotlardan foydalanadi:

- davr bo'yicha KPI kartalar
- trend diagramma
- transfer holatlari bo'yicha donut chart
- do'konlar kesimidagi natija
- zaxira tarkibi
- eng kuchli mahsulotlar
- avtomatik yig'ilgan qisqa hisobot kartalari

## Loyiha tuzilmasi

```text
src/
  app/                  Zustand store'lar
  components/
    shared/             layout, sidebar, navbar, page header
    ui/                 qayta ishlatiladigan UI komponentlar
  config/               environment konfiguratsiyasi
  features/             barcha page va modul sahifalari
    auth/
    categories/
    dashboard/
    inventory/
    products/
    reports/
    sales/
    settings/
    stores/
    suppliers/
    transfers/
    users/
  i18n/                 tarjima fayllari
  services/             API service qatlamlari
  test/                 test setup
  types/                umumiy TypeScript typelar
  utils/                helper funksiyalar
```

## Muhim fayllar

- `src/App.tsx` - routing
- `src/main.tsx` - app entry point
- `src/app/store.ts` - auth va theme store
- `src/services/api.ts` - axios client va interceptorlar
- `src/components/shared/MainLayout.tsx` - asosiy layout va sidebar
- `src/features/reports/ReportsPage.tsx` - hisobotlar paneli
- `src/i18n/locales/uz.json` - o'zbekcha matnlar
- `src/i18n/locales/ru.json` - ruscha matnlar

## State boshqaruvi

Loyihada global state uchun `Zustand` ishlatiladi.

Asosiy store'lar:

- `useAuthStore`
- `useThemeStore`

Auth store quyidagilarni boshqaradi:

- joriy foydalanuvchi
- loading holati
- login / logout
- auth tekshirish
- role tekshirish

Theme store quyidagilarni boshqaradi:

- `light` va `dark` mode
- `localStorage` orqali saqlash

## Lokalizatsiya

Loyiha ikki tilni qo'llab-quvvatlaydi:

- `uz`
- `ru`

Til tanlash URL prefiksi va `i18next` orqali boshqariladi.

Tarjima fayllari:

- `src/i18n/locales/uz.json`
- `src/i18n/locales/ru.json`

## Testlash

Loyihada `Vitest` va `Testing Library` ishlatiladi.

Mavjud testlar quyidagi qatlamlarda bor:

- UI komponentlar
- store
- auth service
- user service
- utility funksiyalar

## Deployment

Loyiha static frontend sifatida build qilinadi va `dist/` papkaga chiqadi. Repo ichida `vercel.json` mavjud, ya'ni Vercel'ga deploy qilish ssenariysi ham ko'zda tutilgan.

Oddiy deploy oqimi:

```bash
npm install
npm run build
```

Keyin `dist/` papkani hosting platformaga joylash mumkin.

## Eslatmalar

- API URL hozir kod ichida hardcoded
- Environment variable asosidagi konfiguratsiya hali to'liq ajratilmagan
- Ba'zi modullarda backend javob formati legacy va yangi formatni birga qo'llab-quvvatlaydi
- `README` ushbu repo'ning amaldagi frontend holatiga moslab yozilgan

## Mualliflik va foydalanish

Ichki CRM loyiha sifatida ishlab chiqilgan. Agar loyiha keyinroq kengaytirilsa, tavsiya etiladi:

- API URL ni `.env` ga ko'chirish
- role-based access nazoratini kengaytirish
- test coverage'ni oshirish
- service layer uchun yagona response normalizer qo'shish
