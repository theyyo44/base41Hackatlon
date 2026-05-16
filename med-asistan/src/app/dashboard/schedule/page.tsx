"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, Activity, Star, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TR_MONTHS, TR_DAYS } from "@/lib/helpers";

const toneClasses = ["bg-brand-soft text-brand-ink", "bg-mint-soft text-mint-ink", "bg-amber-soft text-amber-ink"];

type MedicineWithSchedule = {
  id: string;
  name: string;
  is_active: boolean;
  schedules: { times: string[] }[];
};

export default function SchedulePage() {
  const [medicines, setMedicines] = useState<MedicineWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("medicines")
        .select("id, name, is_active, schedules(times)")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (data) setMedicines(data as MedicineWithSchedule[]);
      setLoading(false);
    }
    load();
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeMeds = medicines.filter((m) => m.is_active);
  const totalDosesPerDay = activeMeds.reduce((sum, m) => sum + m.schedules.reduce((s, sc) => s + (sc.times?.length || 0), 0), 0);

  function shiftWeek(dir: number) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + dir * 7);
    setWeekStart(d);
  }

  function goToday() {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  }

  const last = new Date(weekStart);
  last.setDate(weekStart.getDate() + 6);
  const monthRange =
    weekStart.getMonth() === last.getMonth()
      ? `${TR_MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${TR_MONTHS[weekStart.getMonth()]} – ${TR_MONTHS[last.getMonth()]} ${last.getFullYear()}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7 gap-6">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">Kullanım Takvimi</h1>
          <p className="text-muted-foreground text-base m-0">Haftalık doz planınız ve geçmiş kayıtlarınız</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => shiftWeek(-1)} className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-[18px] h-[18px]" />
          </button>
          <div className="font-bold min-w-[180px] text-center">{monthRange}</div>
          <button onClick={() => shiftWeek(1)} className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-[18px] h-[18px]" />
          </button>
          <button onClick={goToday} className="px-3.5 py-2 rounded-lg bg-card border border-border font-bold text-sm hover:bg-secondary transition-colors">
            Bugün
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2.5 mb-2">
        {TR_DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-bold tracking-wider uppercase text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2.5 mb-8">
        {days.map((d, di) => {
          const isToday = d.getTime() === today.getTime();
          const isPast = d < today;
          return (
            <div
              key={di}
              className={`bg-card border rounded-[14px] p-3 min-h-[130px] flex flex-col gap-2 ${
                isToday
                  ? "border-brand shadow-[0_0_0_2px] shadow-brand-soft"
                  : "border-border"
              } ${isPast && !isToday ? "opacity-45" : ""}`}
            >
              <div className={`font-extrabold text-lg tracking-tight ${isToday ? "text-brand-ink" : ""}`}>
                {d.getDate()}
              </div>
              {activeMeds.length === 0 ? (
                di === 0 && <div className="text-[11px] text-muted-foreground">Plan yok</div>
              ) : (
                activeMeds.map((m, mi) =>
                  m.schedules?.map((s) =>
                    s.times?.map((t) => (
                      <div
                        key={m.id + t}
                        className={`text-[11px] font-bold px-2 py-[3px] rounded-md flex items-center gap-[5px] overflow-hidden text-ellipsis whitespace-nowrap ${toneClasses[mi % 3]}`}
                        title={`${m.name} · ${t}`}
                      >
                        <span className="font-extrabold">{t.slice(0, 5)}</span>
                        {m.name}
                      </div>
                    ))
                  )
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight m-0">Bu haftaki istatistikler</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Doz uyumu ve geçmiş performans</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[18px]">
        <div className="bg-card border border-border rounded-2xl p-[22px] flex flex-col gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-brand-soft text-brand-ink flex items-center justify-center">
            <Activity className="w-[22px] h-[22px]" />
          </div>
          <div>
            <div className="text-[40px] font-extrabold tracking-tighter leading-none">{activeMeds.length}</div>
            <div className="text-[15px] text-muted-foreground font-semibold">Aktif ilaç</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-[22px] flex flex-col gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-mint-soft text-mint-ink flex items-center justify-center">
            <Check className="w-[22px] h-[22px]" />
          </div>
          <div>
            <div className="text-[40px] font-extrabold tracking-tighter leading-none">{totalDosesPerDay}</div>
            <div className="text-[15px] text-muted-foreground font-semibold">Günlük doz sayısı</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-[22px] flex flex-col gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-amber-soft text-amber-ink flex items-center justify-center">
            <Star className="w-[22px] h-[22px]" />
          </div>
          <div>
            <div className="text-[40px] font-extrabold tracking-tighter leading-none">{totalDosesPerDay * 7}</div>
            <div className="text-[15px] text-muted-foreground font-semibold">Haftalık toplam doz</div>
          </div>
        </div>
      </div>
    </div>
  );
}
