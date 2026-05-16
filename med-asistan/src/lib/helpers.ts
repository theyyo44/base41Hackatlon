export const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
export const TR_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const TR_DAYS_FULL = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export function trDate(d: Date): string {
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function trWeekday(d: Date): string {
  return TR_DAYS_FULL[(d.getDay() + 6) % 7];
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
