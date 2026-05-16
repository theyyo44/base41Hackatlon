export interface Medicine {
  id: string;
  name: string;
  activeIngredient: string;
  dosage: string;
  expiryDate: string;
  quantity: number;
  isActive: boolean;
  color: string;
  times: string[];
  startDate: string;
  endDate: string | null;
  notes: string;
}

export interface DoseItem {
  id: string;
  med: Medicine;
  time: string;
  taken: boolean;
}

export interface Notification {
  id: string;
  type: "dose" | "expiry" | "stock" | "info";
  title: string;
  message: string;
  unread: boolean;
  time: string;
  icon: "pill" | "warn" | "clock" | "spark" | "check";
  color: "blue" | "amber" | "rose" | "mint";
}

export const mockMedicines: Medicine[] = [
  {
    id: "m1",
    name: "Parol",
    activeIngredient: "Parasetamol 500mg",
    dosage: "1 tablet",
    expiryDate: "2026-08-12",
    quantity: 18,
    isActive: true,
    color: "#4a90d9",
    times: ["08:00", "14:00", "20:00"],
    startDate: "2026-05-01",
    endDate: "2026-05-30",
    notes: "Yemeklerden sonra alın",
  },
  {
    id: "m2",
    name: "Concor",
    activeIngredient: "Bisoprolol 5mg",
    dosage: "1 tablet",
    expiryDate: "2027-02-28",
    quantity: 42,
    isActive: true,
    color: "#5fa97a",
    times: ["09:00"],
    startDate: "2026-01-15",
    endDate: null,
    notes: "Sabah, aç karna",
  },
  {
    id: "m3",
    name: "Glucophage",
    activeIngredient: "Metformin 850mg",
    dosage: "1 tablet",
    expiryDate: "2026-06-04",
    quantity: 25,
    isActive: true,
    color: "#c47a5a",
    times: ["08:30", "20:30"],
    startDate: "2025-12-01",
    endDate: null,
    notes: "Yemekle birlikte",
  },
  {
    id: "m4",
    name: "Aspirin Cardio",
    activeIngredient: "Asetilsalisilik asit 100mg",
    dosage: "1 tablet",
    expiryDate: "2026-05-22",
    quantity: 8,
    isActive: true,
    color: "#d56a8b",
    times: ["12:00"],
    startDate: "2025-09-01",
    endDate: null,
    notes: "Öğle yemeğinden sonra",
  },
  {
    id: "m5",
    name: "Augmentin",
    activeIngredient: "Amoksisilin 875mg",
    dosage: "1 tablet",
    expiryDate: "2028-11-30",
    quantity: 14,
    isActive: false,
    color: "#8a7ac4",
    times: ["08:00", "20:00"],
    startDate: "2026-04-20",
    endDate: "2026-04-30",
    notes: "Sadece doktor önerisiyle",
  },
  {
    id: "m6",
    name: "Vitamin D3",
    activeIngredient: "Kolekalsiferol 1000 IU",
    dosage: "1 damla",
    expiryDate: "2027-09-15",
    quantity: 30,
    isActive: true,
    color: "#d9a93d",
    times: ["08:00"],
    startDate: "2026-01-01",
    endDate: null,
    notes: "Kahvaltıyla birlikte",
  },
];

export const mockNotifications: Notification[] = [
  { id: "n1", type: "dose", title: "Concor için doz zamanı", message: "Saat 09:00 — 1 tablet Concor 5mg almanız gerekiyor.", unread: true, time: "5 dakika önce", icon: "pill", color: "blue" },
  { id: "n2", type: "expiry", title: "Aspirin Cardio yakında bozuluyor", message: "Son kullanım tarihi 22 Mayıs 2026 — sadece 7 gün kaldı.", unread: true, time: "1 saat önce", icon: "warn", color: "amber" },
  { id: "n3", type: "stock", title: "Aspirin Cardio stoğu azaldı", message: "Sadece 8 tablet kaldı. Yenilemek için eczaneyi ziyaret edin.", unread: true, time: "3 saat önce", icon: "pill", color: "rose" },
  { id: "n4", type: "dose", title: "Parol dozu kaçırıldı", message: "Dün akşam 20:00 dozunuz alınmadı olarak işaretlendi.", unread: false, time: "Dün", icon: "clock", color: "rose" },
  { id: "n5", type: "info", title: "Haftalık özet hazır", message: "Geçen hafta ilaçlarınızı %94 oranında zamanında aldınız. Harika gidiyor!", unread: false, time: "2 gün önce", icon: "spark", color: "mint" },
  { id: "n6", type: "dose", title: "Vitamin D3 alındı", message: "Bu sabahki Vitamin D3 dozunuz başarıyla kaydedildi.", unread: false, time: "3 gün önce", icon: "check", color: "mint" },
];

export function getTodayDoses(meds: Medicine[], takenIds: string[]): DoseItem[] {
  const list: DoseItem[] = [];
  meds.filter((m) => m.isActive).forEach((m) => {
    m.times.forEach((t) => {
      list.push({
        id: `${m.id}-${t}`,
        med: m,
        time: t,
        taken: takenIds.includes(`${m.id}-${t}`),
      });
    });
  });
  list.sort((a, b) => a.time.localeCompare(b.time));
  return list;
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
}

export function expiryStatus(days: number): "critical" | "warn" | "ok" {
  if (days < 30) return "critical";
  if (days < 90) return "warn";
  return "ok";
}

export const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const TR_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const TR_DAYS_FULL = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function trDate(d: Date): string {
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function trWeekday(d: Date): string {
  return TR_DAYS_FULL[(d.getDay() + 6) % 7];
}
