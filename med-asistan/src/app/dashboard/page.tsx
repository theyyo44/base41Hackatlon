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
  Stethoscope,
  X,
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
  scheduleId: string;
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
  const [pendingInvites, setPendingInvites] = useState<
    { id: string; doctorName: string; note: string | null }[]
  >([]);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setUserName(profile?.full_name || user.user_metadata?.full_name || "KullanÃ„Â±cÃ„Â±");

      const { data: meds } = await supabase
        .from("medicines")
        .select("id, name, active_ingredient, dosage, expiry_date, quantity, is_active, schedules(id, times, notes)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (meds) setMedicines(meds as MedicineWithSchedule[]);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: logs, error: logsError } = await supabase
        .from("dose_logs")
        .select("medicine_id, scheduled_at")
        .eq("user_id", user.id)
        .eq("status", "taken")
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString());

      if (!logsError && logs) {
        setTakenIds(logs.map((l) => {
          const time = new Date(l.scheduled_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
          return `${l.medicine_id}-${time}`;
        }));
      }

      // Fetch pending doctor invites
      const { data: invites } = await supabase
        .from("doctor_patients")
        .select("id, doctor_id, notes")
        .eq("patient_id", user.id)
        .eq("status", "pending");

      if (invites && invites.length > 0) {
        const doctorIds = invites.map((i) => i.doctor_id);
        const { data: doctors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", doctorIds);
        const doctorMap = new Map(
          (doctors || []).map((d) => [d.id, `Dr. ${d.full_name}`])
        );
        setPendingInvites(
          invites.map((i) => ({
            id: i.id,
            doctorName: doctorMap.get(i.doctor_id) || "Doktor",
            note: i.notes,
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  const doses = useMemo(() => {
    const list: DoseItem[] = [];
    medicines.filter((m) => m.is_active).forEach((m) => {
      m.schedules?.forEach((s) => {
        s.times?.forEach((t) => {
          const timeStr = t.slice(0, 5);
          list.push({
            id: `${m.id}-${timeStr}`,
            medicineId: m.id,
            scheduleId: s.id,
            name: m.name,
            dosage: m.dosage,
            notes: s.notes,
            time: timeStr,
            taken: takenIds.includes(`${m.id}-${timeStr}`),
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

  async function adjustMedicineQuantity(medicineId: string, delta: number) {
    const supabase = createClient();
    const { data: med, error: readError } = await supabase
      .from("medicines")
      .select("id, quantity")
      .eq("id", medicineId)
      .single();

    if (readError || !med) return;

    const nextQuantity = Math.max(0, (med.quantity ?? 0) + delta);
    const { error: updateError } = await supabase
      .from("medicines")
      .update({ quantity: nextQuantity })
      .eq("id", medicineId);

    if (!updateError) {
      setMedicines((prev) =>
        prev.map((m) => (m.id === medicineId ? { ...m, quantity: nextQuantity } : m))
      );
    }
  }

  async function toggleDose(id: string) {
    const dose = doses.find((d) => d.id === id);
    if (!dose || !userId) return;

    const wasTaken = takenIds.includes(id);
    setTakenIds((ids) =>
      wasTaken ? ids.filter((x) => x !== id) : [...ids, id]
    );

    const supabase = createClient();

    const today = new Date();
    const [h, m] = dose.time.split(":").map(Number);
    const scheduledAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);

    if (wasTaken) {
      const { error } = await supabase
        .from("dose_logs")
        .update({ status: "pending", taken_at: null })
        .eq("user_id", userId)
        .eq("medicine_id", dose.medicineId)
        .eq("scheduled_at", scheduledAt.toISOString());
      if (error) {
        toast.error("Ã„Â°Ã…Å¸aret kaldÃ„Â±rma baÃ…Å¸arÃ„Â±sÃ„Â±z: " + error.message);
      } else {
        await adjustMedicineQuantity(dose.medicineId, +1);
        toast.success("Ã„Â°Ã…Å¸aret kaldÃ„Â±rÃ„Â±ldÃ„Â±");
      }
    } else {
      const { data: existing } = await supabase
        .from("dose_logs")
        .select("id, status")
        .eq("user_id", userId)
        .eq("medicine_id", dose.medicineId)
        .eq("scheduled_at", scheduledAt.toISOString())
        .maybeSingle();

      let error;
      let shouldDecreaseQuantity = false;
      if (existing) {
        shouldDecreaseQuantity = existing.status !== "taken";
        ({ error } = await supabase
          .from("dose_logs")
          .update({ status: "taken", taken_at: new Date().toISOString() })
          .eq("id", existing.id));
      } else {
        shouldDecreaseQuantity = true;
        ({ error } = await supabase.from("dose_logs").insert({
          user_id: userId,
          medicine_id: dose.medicineId,
          schedule_id: dose.scheduleId,
          scheduled_at: scheduledAt.toISOString(),
          status: "taken",
          taken_at: new Date().toISOString(),
        }));
      }
      if (error) {
        toast.error("KayÃ„Â±t baÃ…Å¸arÃ„Â±sÃ„Â±z: " + error.message);
      } else {
        if (shouldDecreaseQuantity) {
          await adjustMedicineQuantity(dose.medicineId, -1);
        }
        toast.success(`${dose.name} alÃ„Â±ndÃ„Â± olarak iÃ…Å¸aretlendi`);
      }
    }
  }

  async function respondInvite(inviteId: string, accept: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("doctor_patients")
      .update({
        status: accept ? "active" : "ended",
        accepted_at: accept ? new Date().toISOString() : null,
        ended_at: accept ? null : new Date().toISOString(),
      })
      .eq("id", inviteId);
    if (error) {
      toast.error("Ã„Â°Ã…Å¸lem baÃ…Å¸arÃ„Â±sÃ„Â±z: " + error.message);
      return;
    }
    toast.success(accept ? "Davet kabul edildi!" : "Davet reddedildi.");
    setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
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
      {/* Doctor invite banners */}
      {pendingInvites.map((inv) => (
        <div
          key={inv.id}
          className="mb-5 bg-gradient-to-r from-[oklch(0.95_0.04_165)] to-[oklch(0.96_0.03_200)] border border-[oklch(0.88_0.06_165)] rounded-2xl p-5 flex flex-wrap items-center gap-4"
        >
          <div className="w-12 h-12 rounded-[14px] bg-[oklch(0.55_0.13_165)] text-white flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-bold text-[15px]">{inv.doctorName} sizi izlemek istiyor</div>
            {inv.note && (
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{inv.note}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => respondInvite(inv.id, true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[oklch(0.55_0.13_165)] text-white font-bold text-sm"
            >
              <Check className="w-4 h-4" /> Kabul Et
            </button>
            <button
              onClick={() => respondInvite(inv.id, false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border font-bold text-sm hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" /> Reddet
            </button>
          </div>
        </div>
      ))}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-7 gap-4 sm:gap-6 w-full">
        <div className="min-w-0">
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">
            Merhaba, {userName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-base m-0">
            Bugun {trDate(today)} - {trWeekday(today)}.{" "}
            {total > 0
              ? `Bugun ${total} doz almaniz gerekiyor.`
              : "Henuz ilac planiniz yok."}
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
            <Plus className="w-[18px] h-[18px]" /> Ilac Ekle
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[18px] mb-6">
        <StatCard
          icon={<Pill className="w-[22px] h-[22px]" />}
          tone="blue"
          num={activeMeds.length}
          label="Aktif ilac"
          foot={<><Check className="w-3.5 h-3.5" /> Duzenli kullanim</>}
        />
        <StatCard
          icon={<Clock className="w-[22px] h-[22px]" />}
          tone="mint"
          num={`${taken}/${total}`}
          label="Bugunku doz"
          foot={<>Uyum orani: %{adherence}</>}
        />
        <StatCard
          icon={<AlertTriangle className="w-[22px] h-[22px]" />}
          tone="amber"
          num={expiringSoon.length}
          label="SKT uyarisi"
          foot={<>90 gun icinde bozulacak</>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)] gap-5">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg tracking-tight m-0">Bugunku dozlar</h3>
              <div className="text-[13px] text-muted-foreground mt-0.5">Aldiginiz dozlari isaretleyin</div>
            </div>
            <Link href="/dashboard/schedule" className="text-muted-foreground text-sm font-semibold hover:text-brand transition-colors">
              Takvimi gor -&gt;
            </Link>
          </div>
          {doses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Henuz aktif ilac planiniz yok.{" "}
              <Link href="/dashboard/add-medicine" className="text-brand font-bold hover:underline">Ilac ekleyin</Link>
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
                        {d.dosage && <span className="text-muted-foreground font-medium text-sm">- {d.dosage}</span>}
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
              <h3 className="font-bold text-lg tracking-tight m-0">SKT uyarilari</h3>
              <Link href="/dashboard/inventory" className="text-muted-foreground text-sm font-semibold hover:text-brand transition-colors">
                Tumu -&gt;
              </Link>
            </div>
            {expiringSoon.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Yaklasan son kullanma tarihi yok.</div>
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
                <h3 className="font-bold text-[17px] m-0 mb-1.5">Haftalik uyum: %{adherence}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed m-0 mb-3">
                  {adherence >= 80
                    ? "Ilaclarinizi duzenli almaya devam edin!"
                    : adherence > 0
                    ? "Dozlarinizi zamaninda almayi unutmayin."
                    : "Ilac ekleyerek takibe baslayin."}
                </p>
                <Link
                  href="/dashboard/schedule"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-soft text-brand-ink font-bold text-sm hover:bg-[oklch(0.94_0.03_220)] transition-colors"
                >
                  Detaylari gor
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

