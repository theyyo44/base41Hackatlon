# MedAsistan - Proje Mimarisi

Ev ilac takip sistemi. Hasta ve doktor rolleriyle calisan, Next.js 16 + Supabase tabanli full-stack uygulama.

## Teknoloji Yigini

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, oklch renk sistemi, shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| AI | Google Gemini 2.0 Flash (ilac kutusu OCR) |
| Deployment | Vercel |

## Klasor Yapisi

```
base41Hackatlon/
└── med-asistan/
    ├── src/
    │   ├── app/                          # Next.js App Router
    │   │   ├── page.tsx                  # Landing sayfasi (giris/kayit)
    │   │   ├── layout.tsx                # Root layout (font, theme, toaster)
    │   │   ├── middleware.ts             # Auth guard (korunmus rotalari yonlendir)
    │   │   │
    │   │   ├── api/
    │   │   │   ├── analyze-medicine/     # POST: Gemini ile ilac kutusu analizi
    │   │   │   └── medicines/[id]/       # DELETE: Ilac + bagli kayitlari sil
    │   │   │
    │   │   ├── dashboard/                # HASTA PANELI
    │   │   │   ├── layout.tsx            # Sidebar + ana alan (280px grid)
    │   │   │   ├── page.tsx              # Ana panel (dozlar, istatistikler)
    │   │   │   ├── add-medicine/         # Kamera ile ilac ekle
    │   │   │   ├── inventory/            # Ilac envanteri (SKT takibi)
    │   │   │   ├── schedule/             # Takvim gorunumu
    │   │   │   ├── messages/             # Doktorla mesajlasma
    │   │   │   └── notifications/        # Bildirimler + doktor davetleri
    │   │   │
    │   │   ├── doctor-dashboard/         # DOKTOR PANELI
    │   │   │   ├── layout.tsx            # Doktor sidebar + rol kontrolu
    │   │   │   ├── page.tsx              # Doktor ana panel (hasta istatistikleri)
    │   │   │   ├── actions.ts            # Server actions (davet, hasta arama)
    │   │   │   ├── patients/             # Hasta listesi
    │   │   │   ├── patient/[id]/         # Hasta detay (ilaclar, uyum, grafik)
    │   │   │   ├── messages/             # Hastalarla mesajlasma
    │   │   │   ├── invites/              # Davet yonetimi
    │   │   │   └── profile/              # Doktor profili
    │   │   │
    │   │   └── doctor-onboarding/        # Doktor ilk kurulum
    │   │
    │   ├── components/
    │   │   ├── sidebar.tsx               # Hasta sidebar (6 menu, badge)
    │   │   ├── doctor/
    │   │   │   └── doctor-sidebar.tsx    # Doktor sidebar (teal tema)
    │   │   └── ui/                       # shadcn/ui bilesenleri
    │   │       ├── button.tsx
    │   │       ├── card.tsx
    │   │       ├── input.tsx
    │   │       ├── dialog.tsx
    │   │       ├── table.tsx
    │   │       ├── badge.tsx
    │   │       └── sonner.tsx
    │   │
    │   └── lib/
    │       ├── supabase/
    │       │   ├── client.ts             # Tarayici Supabase istemcisi
    │       │   ├── server.ts             # Sunucu Supabase istemcisi (SSR)
    │       │   └── middleware.ts          # Oturum yonetimi + yonlendirme
    │       ├── database.types.ts         # TypeScript veritabani tipleri
    │       ├── helpers.ts                # Turkce tarih formatlama, SKT hesaplama
    │       ├── doctor-constants.ts       # Uzmanlik alanlari, uyum durumu
    │       └── utils.ts                  # cn() - Tailwind class birlestirme
    │
    ├── supabase-schema.sql               # Ana tablo schemasi
    ├── supabase-doctor-migration.sql     # Doktor tablolari + RLS
    ├── supabase-doctor-read-all.sql      # Doktor okuma/yazma RLS politikalari
    ├── supabase-chat-migration.sql       # Mesajlasma tablosu + storage
    ├── supabase-chat-notification-trigger.sql  # Mesaj bildirimi trigger'i
    ├── supabase-dose-logs.sql            # Doz kayitlari schemasi
    └── supabase-find-user-by-email.sql   # E-posta ile hasta arama RPC
```

## Veritabani Schemasi

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   auth.users    │     │    profiles       │     │ doctor_profiles │
│─────────────────│     │──────────────────│     │─────────────────│
│ id (PK)         │◄───│ id (FK)          │     │ id (FK)         │
│ email           │     │ full_name        │     │ specialty       │
│ password        │     │ email            │     │ hospital        │
│                 │     │ phone            │     │ license_no      │
│                 │     │ role             │     │ title           │
│                 │     │ emergency_contact│     │ bio             │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        │    ┌──────────────────┼──────────────────┐
        │    │                  │                   │
        ▼    ▼                  ▼                   ▼
┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   medicines     │  │   schedules      │  │  dose_logs      │
│─────────────────│  │──────────────────│  │─────────────────│
│ id (PK)         │  │ id (PK)          │  │ id (PK)         │
│ user_id (FK)    │  │ medicine_id (FK) │  │ schedule_id(FK) │
│ name            │  │ user_id (FK)     │  │ medicine_id(FK) │
│ active_ingredient│ │ times (TIME[])   │  │ user_id (FK)    │
│ dosage          │  │ start_date       │  │ scheduled_at    │
│ expiry_date     │  │ end_date         │  │ status          │
│ quantity        │  │ notes            │  │ taken_at        │
│ is_active       │  └──────────────────┘  └─────────────────┘
│ prescribed_by   │
└─────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ doctor_patients  │  │ chat_messages    │  │  notifications  │
│──────────────────│  │──────────────────│  │─────────────────│
│ id (PK)          │  │ id (PK)          │  │ id (PK)         │
│ doctor_id (FK)   │  │ doctor_id (FK)   │  │ user_id (FK)    │
│ patient_id (FK)  │  │ patient_id (FK)  │  │ type            │
│ status           │  │ sender_id (FK)   │  │ title           │
│ notes            │  │ message          │  │ message         │
│ invited_at       │  │ attachment_url   │  │ is_read         │
│ accepted_at      │  │ read_at          │  │ created_at      │
│ ended_at         │  │ created_at       │  └─────────────────┘
└──────────────────┘  └──────────────────┘
```

## Veri Akisi

```
                    ┌─────────────────────────────┐
                    │       Landing Page           │
                    │    (Giris / Kayit)           │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │      Middleware               │
                    │  (Oturum kontrol + redirect)  │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
    ┌─────────────────┐              ┌─────────────────┐
    │  HASTA PANELI   │              │  DOKTOR PANELI  │
    │  /dashboard/*   │              │/doctor-dashboard│
    ├─────────────────┤              ├─────────────────┤
    │ • Ilac ekle     │              │ • Hasta listesi │
    │   (Kamera→AI)   │              │ • Recete yaz    │
    │ • Doz takibi    │◄────────────►│ • Uyum izle     │
    │ • Envanter      │  Supabase    │ • Mesajlasma    │
    │ • Mesajlasma    │  Realtime    │ • Davet gonder  │
    │ • Bildirimler   │              │ • Ilac duzenle  │
    └────────┬────────┘              └────────┬────────┘
             │                                │
             └────────────┬───────────────────┘
                          ▼
              ┌───────────────────────┐
              │      SUPABASE         │
              ├───────────────────────┤
              │ • PostgreSQL (RLS)    │
              │ • Auth (email/pass)   │
              │ • Realtime (chat)     │
              │ • Storage (dosyalar)  │
              │ • Triggers (bildirim) │
              └───────────────────────┘
```

## Guvenlik Katmanlari

1. **Middleware**: Korunmus rotalara erisimi kontrol eder, oturum yoksa anasayfaya yonlendirir
2. **Rol Kontrolu**: Layout seviyesinde `profiles.role` kontrolu (doctor/patient)
3. **RLS (Row Level Security)**: Her tablo icin Supabase politikalari
   - Hastalar sadece kendi verilerini gorur
   - Doktorlar sadece aktif hastalarinin verilerini gorur
   - Mesajlar sadece katilimcilar tarafindan okunur
4. **Storage RLS**: Dosya yuklemeleri sadece sohbet katilimcilarina acik

## Temel Ozellikler

| Ozellik | Aciklama | Teknoloji |
|---------|----------|-----------|
| Ilac Tarama | Kamera ile kutu fotografi → otomatik form doldurma | Gemini 2.0 Flash API |
| Doz Takibi | Sabah/Ogle/Aksam togle, uyum yuzdesi | dose_logs + schedules |
| SKT Uyarilari | Renk kodlu badge (kritik <30g, uyari <90g) | Client-side hesaplama |
| Doktor-Hasta | Davet sistemi (pending→active→ended) | doctor_patients tablosu |
| Recete Yazma | Doktor ilac + not + miktar ekler | medicines + schedules INSERT |
| Mesajlasma | Gercek zamanli chat + dosya eki | Supabase Realtime + Storage |
| Bildirimler | Mesaj geldiginde otomatik bildirim | PostgreSQL Trigger |
| Haftalik Grafik | Hover ile gun bazli detay | Client-side chart |

## Deployment

- **Platform**: Vercel (Production)
- **URL**: https://med-asistan.vercel.app
- **Environment Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `RESEND_API_KEY`
