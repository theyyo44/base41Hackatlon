export const SPECIALTIES = [
  "Dahiliye",
  "Kardiyoloji",
  "Endokrinoloji",
  "Aile Hekimliği",
  "Nöroloji",
  "Psikiyatri",
  "Üroloji",
  "Göğüs Hastalıkları",
  "Romatoloji",
  "Geriatri",
  "Ortopedi",
  "Dermatoloji",
  "Göz Hastalıkları",
  "KBB",
  "Genel Cerrahi",
];

export function adherenceStatus(score: number): "ok" | "warn" | "critical" {
  if (score >= 85) return "ok";
  if (score >= 65) return "warn";
  return "critical";
}
