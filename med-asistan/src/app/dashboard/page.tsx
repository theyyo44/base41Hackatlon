"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Pill,
  Clock,
  AlertTriangle,
  Bell,
  Check,
  Plus,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trDate, trWeekday, daysUntil, expiryStatus } from "@/lib/helpers";
import { toast } from "sonner";

type MedicineWithSchedule = {
  id: string;
  name: string;
  active_ingredient: string | null;
  dosage: string | null;
  expiry_date: string | null;
  quantity: number;
  is_active: boolean;
  schedules: {
    id: string;
    times: string[];
    notes: string | null;
  }[];
};

type DoseItem = {
  id: string;
  medicineId: string;
  name: string;
  dosage: string | null;
  notes: string | null;
  time: string;
  taken: boolean;
};

export default function DashboardPage() {
  const [medicines, setMedicines] = useState<MedicineWithSchedule[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [takenIds, setTakenIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setUserName(profile?.full_name || user.user_metadata?.full_name || "Kullanıcı");

      const { data: meds } = await supabase
        .from("medicines")
        .select("id, name, active_ingredient, dosage, expiry_date, quantity, is_active, schedules(id, times, notes)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (meds) setMedicines(meds as MedicineWithSchedule[]);
      setLoading(false);
    }
    load();
  }, []);

  const doses = useMemo(() => {
    const list: DoseItem[] = [];
    medicines.filter((m) => m.is_active).forEach((m) => {
      m.schedules?.forEach((s) => {
        s.times?.forEach((t) => {
          list.push({
            id: `${m.id}-${t}`,
            medicineId: m.id,
            name: m.name,
            dosage: m.dosage,
            notes: s.notes,
            time: t.slice(0, 5),
            taken: takenIds.includes(`${m.id}-${t}`),
          });
        });
      });
    });
    list.sort((a, b) => a.time.localeCompare(b.time));
    return list;
  }, [medicines, takenIds]);

  const activeMeds = medicines.filter((m) => m.is_active);
  const taken = doses.filter((d) => d.taken).length;
  const total = doses.length;
  const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;
  const expiringSoon = medicines
    .filter((m) => m.expiry_date && daysUntil(m.expiry_date) < 90)
    .sort((a, b) => daysUntil(a.expiry_date!) - daysUntil(b.expiry_date!));
  const today = new Date();

  function toggleDose(id: string) {
    setTakenIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
    const dose = doses.find((d) => d.id === id);
    if (dose) {
      toast.success(
        dose.taken ? "İşaret kaldırıldı" : `${dose.name} alındı olarak işaretlendi`
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-7 gap-4 sm:gap-6 w-full">
        <div className="min-w-0">
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">
            Merhaba, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-base m-0">
            Bugün {trDate(today)} — {trWeekday(today)}.{" "}
            {total > 0
              ? `Bugün ${total} doz almanız gerekiyor.`
              : "Henüz ilaç planınız yok."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:ml-auto">
          <Link
            href="/dashboard/notifications"
            className="relative w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:border-border hover:text-foreground transition-colors"
          >
            <Bell className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard/add-medicine"
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold text-base shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors"
          >
            <Plus className="w-[18px] h-[18px]" /> İlaç Ekle
          </Link>
        </div>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] gap-5">
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
          {doses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Henüz aktif ilaç planınız yok.{" "}
              <Link href="/dashboard/add-medicine" className="text-brand font-bold hover:underline">İlaç ekleyin</Link>
            </div>
          ) : (
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
                        {d.name}{" "}
                        {d.dosage && <span className="text-muted-foreground font-medium text-sm">· {d.dosage}</span>}
                      </div>
                      {d.notes && <div className="text-[13px] text-muted-foreground">{d.notes}</div>}
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
          )}
        </div>

        <div className="flex flex-col gap-5">
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
                  const days = daysUntil(m.expiry_date!);
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
                          SKT: {trDate(new Date(m.expiry_date!))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
                <h3 className="font-bold text-[17px] m-0 mb-1.5">Haftalık uyum: %{adherence}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed m-0 mb-3">
                  {adherence >= 80
                    ? "İlaçlarınızı düzenli almaya devam edin!"
                    : adherence > 0
                    ? "Dozlarınızı zamanında almayı unutmayın."
                    : "İlaç ekleyerek takibe başlayın."}
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
