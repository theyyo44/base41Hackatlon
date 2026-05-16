"use client";

import { useState, useMemo } from "react";
import {
  Pill,
  Clock,
  AlertTriangle,
  Bell,
  Check,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  mockMedicines,
  getTodayDoses,
  daysUntil,
  expiryStatus,
  trDate,
  trWeekday,
} from "@/lib/mock-data";
import { toast } from "sonner";

export default function DashboardPage() {
  const [takenIds, setTakenIds] = useState<string[]>(["m1-08:00", "m6-08:00"]);
  const doses = useMemo(() => getTodayDoses(mockMedicines, takenIds), [takenIds]);
  const activeMeds = mockMedicines.filter((m) => m.isActive);
  const taken = doses.filter((d) => d.taken).length;
  const total = doses.length;
  const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;
  const expiringSoon = mockMedicines
    .filter((m) => daysUntil(m.expiryDate) < 90)
    .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));
  const today = new Date();

  function toggleDose(id: string) {
    setTakenIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
    const dose = doses.find((d) => d.id === id);
    if (dose) {
      toast.success(
        dose.taken ? "İşaret kaldırıldı" : `${dose.med.name} alındı olarak işaretlendi`
      );
    }
  }

  return (
    <div className="w-full">
      {/* Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-7 gap-4 sm:gap-6 w-full">
        <div className="min-w-0">
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">
            Günaydın, Ayşe 👋
          </h1>
          <p className="text-muted-foreground text-base m-0">
            Bugün {trDate(today)} — {trWeekday(today)}. Bugün {total} doz almanız gerekiyor.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:ml-auto">
          <Link
            href="/dashboard/notifications"
            className="relative w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:border-border hover:text-foreground transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-[9px] right-[9px] w-[9px] h-[9px] rounded-full bg-rose border-2 border-card" />
          </Link>
          <Link
            href="/dashboard/add-medicine"
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold text-base shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors"
          >
            <Plus className="w-[18px] h-[18px]" /> İlaç Ekle
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[18px] mb-6">
        <StatCard
          icon={<Pill className="w-[22px] h-[22px]" />}
          tone="blue"
          num={activeMeds.length}
          label="Aktif ilaç"
          foot={<><Check className="w-3.5 h-3.5" /> Düzenli kullanım</>}
        />
        <StatCard
          icon={<Clock className="w-[22px] h-[22px]" />}
          tone="mint"
          num={`${taken}/${total}`}
          label="Bugünkü doz"
          foot={<>Uyum oranı: %{adherence}</>}
        />
        <StatCard
          icon={<AlertTriangle className="w-[22px] h-[22px]" />}
          tone="amber"
          num={expiringSoon.length}
          label="SKT uyarısı"
          foot={<>90 gün içinde bozulacak</>}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] gap-5">
        {/* Today's doses */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg tracking-tight m-0">Bugünkü dozlar</h3>
              <div className="text-[13px] text-muted-foreground mt-0.5">Aldığınız dozları işaretleyin</div>
            </div>
            <Link href="/dashboard/schedule" className="text-muted-foreground text-sm font-semibold hover:text-brand transition-colors">
              Takvimi gör →
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {doses.map((d, i) => {
              const isNext = !d.taken && doses.slice(0, i).every((x) => x.taken);
              return (
                <div
                  key={d.id}
                  className={`grid grid-cols-[78px_1fr_auto] gap-4 items-center px-4 py-3.5 rounded-[14px] border transition-all ${
                    d.taken
                      ? "bg-secondary/60 border-border opacity-55"
                      : isNext
                      ? "bg-brand-soft border-[oklch(0.88_0.05_220)]"
                      : "bg-secondary border-border"
                  }`}
                >
                  <div className="font-extrabold text-xl tracking-tight">{d.time}</div>
                  <div>
                    <div className={`font-bold text-base ${d.taken ? "line-through decoration-muted-foreground" : ""}`}>
                      {d.med.name}{" "}
                      <span className="text-muted-foreground font-medium text-sm">· {d.med.dosage}</span>
                    </div>
                    <div className="text-[13px] text-muted-foreground">{d.med.notes}</div>
                  </div>
                  <button
                    onClick={() => toggleDose(d.id)}
                    className={`w-[42px] h-[42px] rounded-full border-2 flex items-center justify-center transition-colors ${
                      d.taken
                        ? "bg-mint border-mint text-white"
                        : "border-border bg-card text-muted-foreground hover:border-mint hover:text-mint-ink"
                    }`}
                  >
                    <Check className="w-[18px] h-[18px]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Expiry warnings */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg tracking-tight m-0">SKT uyarıları</h3>
              <Link href="/dashboard/inventory" className="text-muted-foreground text-sm font-semibold hover:text-brand transition-colors">
                Tümü →
              </Link>
            </div>
            {expiringSoon.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Yaklaşan son kullanım tarihi yok.</div>
            ) : (
              <div>
                {expiringSoon.slice(0, 4).map((m) => {
                  const days = daysUntil(m.expiryDate);
                  const status = expiryStatus(days);
                  return (
                    <div key={m.id} className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl">
                      <div
                        className={`shrink-0 w-[54px] text-center py-1.5 rounded-[10px] font-extrabold text-sm ${
                          status === "critical"
                            ? "bg-rose-soft text-rose-ink"
                            : status === "warn"
                            ? "bg-amber-soft text-amber-ink"
                            : "bg-mint-soft text-mint-ink"
                        }`}
                      >
                        {days}g
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px]">{m.name}</div>
                        <div className="text-[13px] text-muted-foreground">
                          SKT: {trDate(new Date(m.expiryDate))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly insight card */}
          <div
            className="rounded-2xl p-6 border"
            style={{
              background: "linear-gradient(140deg, oklch(0.96 0.025 220), oklch(0.96 0.04 165))",
              borderColor: "oklch(0.9 0.04 200)",
            }}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-[14px] bg-mint-soft text-mint-ink flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[17px] m-0 mb-1.5">Haftalık uyum: %94</h3>
                <p className="text-sm text-muted-foreground leading-relaxed m-0 mb-3">
                  Geçen hafta ilaçlarınızı zamanında almakta harikaydınız. Devam edin!
                </p>
                <Link
                  href="/dashboard/schedule"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-soft text-brand-ink font-bold text-sm hover:bg-[oklch(0.94_0.03_220)] transition-colors"
                >
                  Detayları gör
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  num,
  label,
  foot,
}: {
  icon: React.ReactNode;
  tone: string;
  num: string | number;
  label: string;
  foot: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    blue: "bg-brand-soft text-brand-ink",
    mint: "bg-mint-soft text-mint-ink",
    amber: "bg-amber-soft text-amber-ink",
    rose: "bg-rose-soft text-rose-ink",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-[22px] flex flex-col gap-4">
      <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div>
        <div className="text-[40px] font-extrabold tracking-tighter leading-none">{num}</div>
        <div className="text-[15px] text-muted-foreground font-semibold">{label}</div>
        <div className="text-[13px] text-muted-foreground flex items-center gap-1.5 mt-0.5">{foot}</div>
      </div>
    </div>
  );
}
