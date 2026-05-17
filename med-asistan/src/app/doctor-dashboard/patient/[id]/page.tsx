"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Phone,
  AlertCircle,
  Bell,
  Plus,
  FileText,
  Check,
  X,
  Clock,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Pencil,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { adherenceStatus } from "@/lib/doctor-constants";

type Medicine = {
  id: string;
  name: string;
  active_ingredient: string | null;
  dosage: string | null;
  scheduleNotes: string | null;
  quantity: number;
  is_active: boolean;
  times: string[];
  scheduleId: string | null;
  adherence: number;
};

type Note = {
  id: string;
  content: string;
  created_at: string;
};

type DoseDetail = { medicineName: string; time: string; taken: boolean };
type WeekDay = { label: string; date: string; taken: number; total: number; details: DoseDetail[] };
type TodayDose = { medicineName: string; dosage: string | null; time: string; taken: boolean };

const AVATAR_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626",
  "#7c3aed", "#2563eb", "#0d9488", "#ca8a04", "#e11d48",
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const router = useRouter();
  const [patient, setPatient] = useState<{
    full_name: string;
    email: string;
    phone: string | null;
    emergency_contact: string | null;
  } | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [overallAdherence, setOverallAdherence] = useState(0);
  const [todayDoses, setTodayDoses] = useState<TodayDose[]>([]);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [showPrescribe, setShowPrescribe] = useState(false);
  const [prescForm, setPrescForm] = useState({
    name: "",
    activeIngredient: "",
    dosage: "1 tablet",
    quantity: 1,
    times: ["09:00"],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    notes: "",
  });
  const [prescSaving, setPrescSaving] = useState(false);

  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [editForm, setEditForm] = useState({ name: "", activeIngredient: "", dosage: "", quantity: 1, notes: "", times: [] as string[] });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  async function loadPatient() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setHours(23, 59, 59, 999);

    const [relResult, profileResult, medsResult, logsResult, notesResult] = await Promise.all([
      supabase
        .from("doctor_patients")
        .select("id")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .eq("status", "active")
        .single(),
      supabase
        .from("profiles")
        .select("full_name, email, phone, emergency_contact")
        .eq("id", patientId)
        .single(),
      supabase
        .from("medicines")
        .select("id, name, active_ingredient, dosage, quantity, is_active, schedules(id, times, notes)")
        .eq("user_id", patientId)
        .eq("is_active", true),
      supabase
        .from("dose_logs")
        .select("medicine_id, scheduled_at")
        .eq("user_id", patientId)
        .eq("status", "taken")
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString()),
      supabase
        .from("doctor_notes")
        .select("id, content, created_at")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    ]);

    if (!relResult.data) {
      toast.error("Bu hastaya erişim izniniz yok.");
      router.push("/doctor-dashboard");
      return;
    }

    if (profileResult.data) setPatient(profileResult.data);
    if (notesResult.data) setNotes(notesResult.data);

    const medsList = medsResult.data
      ? medsResult.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          active_ingredient: m.active_ingredient,
          dosage: m.dosage,
          scheduleNotes: m.schedules?.[0]?.notes || null,
          quantity: m.quantity ?? 0,
          is_active: m.is_active,
          times: (m.schedules?.[0]?.times || []) as string[],
          scheduleId: m.schedules?.[0]?.id || null,
          adherence: 0,
        }))
      : [];

    const dayLabels = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const week: WeekDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      week.push({
        label: dayLabels[d.getDay()],
        date: d.toISOString().slice(0, 10),
        taken: 0,
        total: 0,
        details: [],
      });
    }

    const logs = logsResult.data;

    const logSet = new Set(
      (logs || []).map((l) => {
        const d = new Date(l.scheduled_at);
        const dateStr = d.toISOString().slice(0, 10);
        const timeStr = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false });
        return `${dateStr}_${l.medicine_id}_${timeStr}`;
      })
    );

    let totalAll = 0;
    let takenAll = 0;
    const medAdherenceMap = new Map<string, { taken: number; total: number }>();
    const todayStr = today.toISOString().slice(0, 10);
    const todayList: TodayDose[] = [];

    for (const day of week) {
      for (const m of medsList) {
        const dosesPerDay = m.times.length;
        day.total += dosesPerDay;
        totalAll += dosesPerDay;

        if (!medAdherenceMap.has(m.id)) medAdherenceMap.set(m.id, { taken: 0, total: 0 });
        const ma = medAdherenceMap.get(m.id)!;
        ma.total += dosesPerDay;

        for (const t of m.times) {
          const timeStr = t.slice(0, 5);
          const key = `${day.date}_${m.id}_${timeStr}`;
          const isTaken = logSet.has(key);
          if (isTaken) {
            day.taken++;
            takenAll++;
            ma.taken++;
          }
          day.details.push({ medicineName: m.name, time: timeStr, taken: isTaken });
          if (day.date === todayStr) {
            todayList.push({ medicineName: m.name, dosage: m.dosage, time: timeStr, taken: isTaken });
          }
        }
      }
    }

    todayList.sort((a, b) => a.time.localeCompare(b.time));

    const updatedMeds = medsList.map((m) => {
      const ma = medAdherenceMap.get(m.id);
      return { ...m, adherence: ma && ma.total > 0 ? Math.round((ma.taken / ma.total) * 100) : 0 };
    });

    setMedicines(updatedMeds);
    setWeekData(week);
    setTodayDoses(todayList);
    setOverallAdherence(totalAll > 0 ? Math.round((takenAll / totalAll) * 100) : 0);

    setLoading(false);
  }

  async function prescribeMedicine() {
    if (!prescForm.name.trim()) {
      toast.error("İlaç adı gerekli");
      return;
    }
    setPrescSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: med, error: medError } = await supabase
      .from("medicines")
      .insert({
        user_id: patientId,
        name: prescForm.name.trim(),
        active_ingredient: prescForm.activeIngredient.trim() || null,
        dosage: prescForm.dosage.trim() || null,
        quantity: prescForm.quantity,
        is_active: true,
        prescribed_by: user.id,
      })
      .select("id")
      .single();

    if (medError || !med) {
      toast.error("İlaç eklenemedi: " + (medError?.message || "Bilinmeyen hata"));
      setPrescSaving(false);
      return;
    }

    let scheduleId: string | null = null;
    if (prescForm.times.length > 0) {
      const { data: sched } = await supabase.from("schedules").insert({
        medicine_id: med.id,
        user_id: patientId,
        times: prescForm.times,
        start_date: prescForm.startDate,
        end_date: prescForm.endDate || null,
        notes: prescForm.notes.trim() || null,
      }).select("id").single();
      scheduleId = sched?.id ?? null;
    }

    if (scheduleId && prescForm.times.length > 0) {
      const today = new Date();
      const doseRows = prescForm.times.map((t) => {
        const [h, m] = t.split(":").map(Number);
        const scheduledAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0);
        return {
          user_id: patientId,
          medicine_id: med.id,
          schedule_id: scheduleId,
          scheduled_at: scheduledAt.toISOString(),
          status: "pending" as const,
        };
      });
      await supabase.from("dose_logs").insert(doseRows);
    }

    toast.success(`${prescForm.name} reçete edildi`);
    setShowPrescribe(false);
    setPrescForm({
      name: "",
      activeIngredient: "",
      dosage: "1 tablet",
      quantity: 1,
      times: ["09:00"],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      notes: "",
    });
    setPrescSaving(false);
    loadPatient();
  }

  function openEditMed(m: Medicine) {
    setEditMed(m);
    setEditForm({
      name: m.name,
      activeIngredient: m.active_ingredient || "",
      dosage: m.dosage || "",
      quantity: m.quantity,
      notes: m.scheduleNotes || "",
      times: m.times.map((t) => t.slice(0, 5)),
    });
  }

  async function saveEditMed() {
    if (!editMed || !editForm.name.trim()) {
      toast.error("İlaç adı gerekli");
      return;
    }
    setEditSaving(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("medicines")
      .update({
        name: editForm.name.trim(),
        active_ingredient: editForm.activeIngredient.trim() || null,
        dosage: editForm.dosage.trim() || null,
        quantity: editForm.quantity,
      })
      .eq("id", editMed.id);

    if (!error && editMed.scheduleId) {
      await supabase
        .from("schedules")
        .update({ times: editForm.times, notes: editForm.notes.trim() || null })
        .eq("id", editMed.scheduleId);
    }

    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      toast.success(`${editForm.name} güncellendi`);
      setEditMed(null);
      loadPatient();
    }
    setEditSaving(false);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setNoteSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("doctor_notes").insert({
      doctor_id: user.id,
      patient_id: patientId,
      content: newNote.trim(),
    });

    if (error) {
      toast.error("Not eklenemedi: " + error.message);
    } else {
      toast.success("Not eklendi");
      setNewNote("");
      loadPatient();
    }
    setNoteSaving(false);
  }

  const timeSlots = [
    { key: "sabah", label: "Sabah", time: "09:00", icon: Sun },
    { key: "ogle", label: "Öğle", time: "14:00", icon: Sunset },
    { key: "aksam", label: "Akşam", time: "20:00", icon: Moon },
  ] as const;

  function togglePrescTime(time: string) {
    setPrescForm((f) => ({
      ...f,
      times: f.times.includes(time)
        ? f.times.filter((t) => t !== time)
        : [...f.times, time].sort(),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-[oklch(0.55_0.13_165)]/30 border-t-[oklch(0.55_0.13_165)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return <div className="text-center py-20 text-[oklch(0.58_0.018_245)]">Hasta bulunamadı.</div>;
  }

  const avatarColor = getAvatarColor(patient.full_name);
  const initials = getInitials(patient.full_name);
  const adhStatus = adherenceStatus(overallAdherence);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2.5 mb-[18px] text-sm">
        <button
          onClick={() => router.push("/doctor-dashboard")}
          className="inline-flex items-center gap-1.5 px-3.5 py-[9px] rounded-[9px] bg-card border border-border font-semibold text-sm hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Hastalarım
        </button>
        <span className="text-[oklch(0.72_0.015_245)]">/</span>
        <span className="font-semibold text-[oklch(0.58_0.018_245)]">{patient.full_name}</span>
      </div>

      {/* Patient detail head */}
      <div className="flex flex-wrap items-center gap-[22px] p-[26px] bg-card border border-border rounded-2xl mb-[22px]">
        <div
          className="w-[76px] h-[76px] rounded-[20px] flex items-center justify-center font-extrabold text-[26px] shrink-0"
          style={{ background: avatarColor + "22", color: avatarColor }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[30px] font-extrabold tracking-[-0.02em] leading-none m-0 mb-1.5">
            {patient.full_name}
          </h1>
          <div className="flex flex-wrap gap-4 text-[15px] text-[oklch(0.58_0.018_245)]">
            {patient.phone && (
              <span className="flex items-center gap-1.5">ğŸ“ {patient.phone}</span>
            )}
            {patient.emergency_contact && (
              <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {patient.emergency_contact}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[46px] font-extrabold tracking-[-0.03em] leading-none"
            style={{
              color:
                adhStatus === "ok"
                  ? "oklch(0.38 0.10 165)"
                  : adhStatus === "warn"
                  ? "oklch(0.45 0.12 60)"
                  : "oklch(0.45 0.16 25)",
            }}
          >
            %{overallAdherence}
          </div>
          <div className="text-[13px] text-[oklch(0.58_0.018_245)] mt-1 font-semibold">7 günlük uyum</div>
        </div>
      </div>

      {/* Today's doses */}
      {todayDoses.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-[22px]">
          <h3 className="text-lg font-bold tracking-[-0.01em] m-0 mb-4">Bugünkü Dozlar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {todayDoses.map((d, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  d.taken
                    ? "bg-[oklch(0.97_0.03_165)] border-[oklch(0.85_0.08_165)]"
                    : "bg-[oklch(0.97_0.02_25)] border-[oklch(0.88_0.06_25)]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    d.taken
                      ? "bg-[oklch(0.68_0.12_165)] text-white"
                      : "bg-[oklch(0.88_0.06_25)] text-[oklch(0.50_0.14_25)]"
                  }`}
                >
                  {d.taken ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{d.medicineName}</div>
                  <div className="text-xs text-[oklch(0.58_0.018_245)]">{d.dosage}</div>
                </div>
                <div className="font-mono text-sm font-bold text-[oklch(0.50_0.02_245)]">{d.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two column grid: left (meds + week chart) | right (quick actions + activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Active meds card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-[-0.01em] m-0">Aktif İlaçlar</h3>
            </div>
            {medicines.length === 0 ? (
              <div className="text-center py-8 text-[oklch(0.58_0.018_245)]">
                Hastanın aktif ilacı bulunmuyor.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-bold uppercase tracking-[0.06em] text-[oklch(0.58_0.018_245)] pb-3 pl-0">İlaç</th>
                    <th className="text-left text-xs font-bold uppercase tracking-[0.06em] text-[oklch(0.58_0.018_245)] pb-3">Doz</th>
                    <th className="text-left text-xs font-bold uppercase tracking-[0.06em] text-[oklch(0.58_0.018_245)] pb-3">Saatler</th>
                    <th className="text-right text-xs font-bold uppercase tracking-[0.06em] text-[oklch(0.58_0.018_245)] pb-3">Uyum</th>
                    <th className="text-right text-xs font-bold uppercase tracking-[0.06em] text-[oklch(0.58_0.018_245)] pb-3 pr-0" style={{width:50}}></th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((m) => {
                    const mAdh = adherenceStatus(m.adherence);
                    return (
                      <tr key={m.id} className="border-t border-border hover:bg-[oklch(0.975_0.008_220)]">
                        <td className="py-4 pl-0">
                          <div className="flex items-center gap-3.5">
                            <div className="w-[46px] h-[46px] rounded-[11px] bg-[oklch(0.96_0.025_220)] text-[oklch(0.32_0.10_225)] flex items-center justify-center font-extrabold text-base shrink-0">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold">{m.name}</div>
                              <div className="text-[13px] text-[oklch(0.58_0.018_245)]">{m.active_ingredient || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-[15px]">
                          <div>{m.dosage}</div>
                          {m.scheduleNotes && (
                            <div className="text-[12px] text-[oklch(0.58_0.018_245)] mt-1 line-clamp-2">
                              Not: {m.scheduleNotes}
                            </div>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex gap-1 flex-wrap">
                            {m.times.map((t) => (
                              <span
                                key={t}
                                className="font-mono text-[13px] bg-[oklch(0.975_0.008_220)] px-2 py-0.5 rounded-md font-semibold"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 text-right font-bold" style={{
                          color: mAdh === "ok" ? "oklch(0.38 0.10 165)" : mAdh === "warn" ? "oklch(0.45 0.12 60)" : "oklch(0.45 0.16 25)"
                        }}>
                          %{m.adherence}
                        </td>
                        <td className="py-4 pr-0 text-right">
                          <button onClick={() => openEditMed(m)} title="Düzenle" className="w-8 h-8 rounded-lg flex items-center justify-center text-[oklch(0.58_0.018_245)] hover:bg-[oklch(0.96_0.025_220)] hover:text-[oklch(0.32_0.10_225)] transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Week adherence chart */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-[-0.01em] m-0">Son 7 Gün Uyum Tablosu</h3>
            </div>
            <div className="grid grid-cols-7 gap-2.5">
              {weekData.map((day, i) => {
                const pct = day.total > 0 ? Math.round((day.taken / day.total) * 100) : 0;
                const status = adherenceStatus(pct);
                const isToday = day.date === new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={i}
                    className={`relative flex flex-col items-center gap-2 p-3.5 pb-3 bg-[oklch(0.975_0.008_220)] border rounded-[14px] cursor-pointer transition-all ${
                      isToday ? "border-[oklch(0.68_0.12_220)] ring-2 ring-[oklch(0.68_0.12_220)]/20" : "border-border"
                    } hover:border-[oklch(0.68_0.12_220)]`}
                    onMouseEnter={() => setHoveredDay(i)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <div className="text-xs font-bold text-[oklch(0.58_0.018_245)] tracking-[0.04em] uppercase">
                      {day.label}
                    </div>
                    <div className="w-7 h-[90px] bg-card border border-border rounded-lg relative overflow-hidden flex items-end">
                      <div
                        className="w-full rounded-t-md rounded-b-[4px] transition-all duration-400"
                        style={{
                          height: `${Math.max(pct, 5)}%`,
                          background:
                            status === "ok"
                              ? "oklch(0.68 0.12 165)"
                              : status === "warn"
                              ? "oklch(0.78 0.13 75)"
                              : "oklch(0.65 0.17 22)",
                        }}
                      />
                    </div>
                    <div
                      className="text-[13px] font-bold"
                      style={{
                        color:
                          status === "ok"
                            ? "oklch(0.38 0.10 165)"
                            : status === "warn"
                            ? "oklch(0.45 0.12 60)"
                            : "oklch(0.45 0.16 25)",
                      }}
                    >
                      %{pct}
                    </div>
                    {hoveredDay === i && day.details.length > 0 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[220px] bg-[oklch(0.18_0.02_260)] text-white rounded-xl p-3 shadow-xl pointer-events-none" style={{ animation: "popIn .15s ease" }}>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[oklch(0.18_0.02_260)]" />
                        <div className="text-xs font-bold mb-2 text-[oklch(0.75_0.02_220)]">{day.label} â€” {day.date}</div>
                        <div className="flex flex-col gap-1.5">
                          {[...day.details].sort((a, b) => a.time.localeCompare(b.time)).map((d, di) => (
                            <div key={di} className="flex items-center gap-2 text-xs">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                d.taken ? "bg-[oklch(0.68_0.12_165)]" : "bg-[oklch(0.50_0.14_25)]"
                              }`}>
                                {d.taken ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                              </span>
                              <span className="font-mono text-[oklch(0.70_0.02_220)]">{d.time}</span>
                              <span className="truncate">{d.medicineName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-[18px] p-3.5 bg-[oklch(0.975_0.008_220)] rounded-xl flex items-center gap-3">
              <Sparkles className="w-[18px] h-[18px] shrink-0" />
              <div className="text-sm text-[oklch(0.42_0.022_245)]">
                {adhStatus === "ok"
                  ? "Hastanız ilaçlarını düzenli olarak alıyor. Mevcut tedavi planına devam edebilirsiniz."
                  : adhStatus === "warn"
                  ? "Hastanız bazı dozları kaçırıyor. Bir sonraki kontrolde nedenini sorabilirsiniz."
                  : "Uyum oranı kritik seviyede. Hastanızı en kısa sürede aramanız önerilir."}
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-[18px]">
          {/* Quick actions */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold tracking-[-0.01em] m-0 mb-4">Hızlı Eylemler</h3>
            <div className="flex flex-col gap-2">
              <button className="flex items-center gap-2.5 px-[22px] py-[13px] rounded-xl bg-card border border-border font-bold hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all justify-start min-h-[48px]">
                <Bell className="w-4 h-4" /> Hatırlatma gönder
              </button>
              <button
                onClick={() => setShowPrescribe(true)}
                className="flex items-center gap-2.5 px-[22px] py-[13px] rounded-xl bg-card border border-border font-bold hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all justify-start min-h-[48px]"
              >
                <Plus className="w-4 h-4" /> Reçeteye ilaç ekle
              </button>
              <button className="flex items-center gap-2.5 px-[22px] py-[13px] rounded-xl bg-card border border-border font-bold hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all justify-start min-h-[48px]">
                <FileText className="w-4 h-4" /> Notlarım
              </button>
            </div>
          </div>

          {/* Last activity */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold tracking-[-0.01em] m-0 mb-4">Son Aktivite</h3>
            <div className="flex flex-col gap-3 text-sm">
              {notes.length === 0 && medicines.length === 0 ? (
                <div className="text-center py-4 text-[oklch(0.58_0.018_245)]">Henüz aktivite yok.</div>
              ) : (
                <>
                  {medicines.slice(0, 2).map((m) => (
                    <div key={m.id} className="flex gap-2.5 items-start">
                      <div className="w-8 h-8 rounded-[9px] bg-[oklch(0.96_0.025_220)] text-[oklch(0.32_0.10_225)] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold">{m.name} eklendi</div>
                        <div className="text-[13px] text-[oklch(0.58_0.018_245)]">Reçete ile</div>
                      </div>
                    </div>
                  ))}
                  {notes.slice(0, 2).map((n) => (
                    <div key={n.id} className="flex gap-2.5 items-start">
                      <div className="w-8 h-8 rounded-[9px] bg-[oklch(0.96_0.04_165)] text-[oklch(0.38_0.10_165)] flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold truncate max-w-[200px]">{n.content.slice(0, 40)}{n.content.length > 40 ? "…" : ""}</div>
                        <div className="text-[13px] text-[oklch(0.58_0.018_245)]">
                          {new Date(n.created_at).toLocaleDateString("tr-TR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Doctor notes */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold tracking-[-0.01em] m-0 mb-4">Doktor Notları</h3>
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Bu hasta hakkında not ekleyin..."
              className="w-full px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all resize-none mb-3"
            />
            <div className="flex justify-end mb-4">
              <button
                onClick={addNote}
                disabled={noteSaving || !newNote.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold text-sm disabled:opacity-60 shadow-[0_6px_14px_-6px_oklch(0.58_0.13_220)] hover:bg-[oklch(0.50_0.14_225)] transition-all"
              >
                <FileText className="w-4 h-4" /> Not Ekle
              </button>
            </div>
            {notes.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {notes.map((n) => (
                  <div key={n.id} className="p-3.5 bg-[oklch(0.975_0.008_220)] rounded-xl">
                    <p className="text-[15px] leading-relaxed m-0 mb-1.5">{n.content}</p>
                    <div className="text-xs text-[oklch(0.58_0.018_245)] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(n.created_at).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Medicine Modal */}
      {editMed && (
        <div className="fixed inset-0 z-50 grid place-items-center p-5" style={{ background: "oklch(0.2 0.03 245 / 0.45)", animation: "fadeIn .15s ease" }} onClick={() => setEditMed(null)}>
          <div className="bg-card border border-border rounded-[20px] p-7 w-full max-w-[520px] shadow-[0_18px_50px_-20px_oklch(0.4_0.05_245/0.30)] max-h-[90vh] overflow-y-auto" style={{ animation: "popIn .2s ease" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[22px] tracking-[-0.01em] m-0">İlaç Düzenle</h3>
              <button onClick={() => setEditMed(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[oklch(0.58_0.018_245)] hover:bg-[oklch(0.975_0.008_220)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[oklch(0.42_0.022_245)] text-sm m-0 mb-[22px]">{editMed.name} bilgilerini düzenleyin.</p>

            <div className="flex flex-col gap-2 mb-[18px]">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">İlaç Adı *</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all" />
            </div>

            <div className="grid grid-cols-3 gap-3.5 mb-[18px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Etken Madde</label>
                <input type="text" value={editForm.activeIngredient} onChange={(e) => setEditForm((f) => ({ ...f, activeIngredient: e.target.value }))}
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Doz</label>
                <input type="text" value={editForm.dosage} onChange={(e) => setEditForm((f) => ({ ...f, dosage: e.target.value }))}
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Miktar</label>
                <input type="number" min={0} value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all" />
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Kullanım Saatleri</label>
              <div className="grid grid-cols-3 gap-3">
                {timeSlots.map((slot) => {
                  const active = editForm.times.includes(slot.time);
                  return (
                    <button key={slot.key} type="button"
                      onClick={() => setEditForm((f) => ({ ...f, times: f.times.includes(slot.time) ? f.times.filter((t) => t !== slot.time) : [...f.times, slot.time].sort() }))}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                        active ? "bg-[oklch(0.96_0.04_165)] border-[oklch(0.68_0.12_165)] text-[oklch(0.38_0.10_165)]" : "bg-card border-border text-[oklch(0.58_0.018_245)] hover:border-[oklch(0.58_0.13_220)]/40"
                      }`}>
                      <slot.icon className="w-5 h-5" />
                      <span>{slot.label}</span>
                      <span className="text-xs opacity-70">{slot.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>


            <div className="flex flex-col gap-2 mb-6">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Ilac Notu</label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Orn. Yemekten sonra, ac karnina almayin"
                className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all resize-none"
              />
            </div>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setEditMed(null)}
                className="px-[22px] py-[13px] rounded-xl bg-card border border-border font-bold hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all min-h-[48px]">
                İptal
              </button>
              <button onClick={saveEditMed} disabled={editSaving}
                className="inline-flex items-center gap-2 px-[22px] py-[13px] rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold shadow-[0_6px_14px_-6px_oklch(0.58_0.13_220)] hover:bg-[oklch(0.50_0.14_225)] transition-all disabled:opacity-60 min-h-[48px]">
                {editSaving ? <div className="w-4 h-4 border-[2.5px] border-white/35 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescribe Modal */}
      {showPrescribe && (
        <div className="fixed inset-0 z-50 grid place-items-center p-5" style={{ background: "oklch(0.2 0.03 245 / 0.45)", animation: "fadeIn .15s ease" }} onClick={() => setShowPrescribe(false)}>
          <div className="bg-card border border-border rounded-[20px] p-7 w-full max-w-[520px] shadow-[0_18px_50px_-20px_oklch(0.4_0.05_245/0.30)] max-h-[90vh] overflow-y-auto" style={{ animation: "popIn .2s ease" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-[22px] tracking-[-0.01em] m-0 mb-2">Yeni İlaç Reçete Et</h3>
            <p className="text-[oklch(0.42_0.022_245)] text-sm m-0 mb-[22px]">Hastaya yeni ilaç ekleyin.</p>

            <div className="flex flex-col gap-2 mb-[18px]">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">İlaç Adı *</label>
              <input
                type="text"
                value={prescForm.name}
                onChange={(e) => setPrescForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Örn. Parol 500mg"
                className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-3.5 mb-[18px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Etken Madde</label>
                <input
                  type="text"
                  value={prescForm.activeIngredient}
                  onChange={(e) => setPrescForm((f) => ({ ...f, activeIngredient: e.target.value }))}
                  placeholder="Parasetamol 500mg"
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Doz</label>
                <input
                  type="text"
                  value={prescForm.dosage}
                  onChange={(e) => setPrescForm((f) => ({ ...f, dosage: e.target.value }))}
                  placeholder="1 tablet"
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Miktar</label>
                <input
                  type="number"
                  min={1}
                  value={prescForm.quantity}
                  onChange={(e) => setPrescForm((f) => ({ ...f, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  placeholder="1"
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-[18px]">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Saatler</label>
              <div className="grid grid-cols-3 gap-3">
                {timeSlots.map((slot) => {
                  const active = prescForm.times.includes(slot.time);
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => togglePrescTime(slot.time)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                        active
                          ? "bg-[oklch(0.96_0.04_165)] border-[oklch(0.68_0.12_165)] text-[oklch(0.38_0.10_165)]"
                          : "bg-card border-border text-[oklch(0.58_0.018_245)] hover:border-[oklch(0.58_0.13_220)]/40"
                      }`}
                    >
                      <slot.icon className="w-5 h-5" />
                      <span>{slot.label}</span>
                      <span className="text-xs opacity-70">{slot.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Başlangıç</label>
                <input
                  type="date"
                  value={prescForm.startDate}
                  onChange={(e) => setPrescForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Bitiş (opsiyonel)</label>
                <input
                  type="date"
                  value={prescForm.endDate}
                  onChange={(e) => setPrescForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Not (opsiyonel)</label>
              <textarea
                rows={2}
                value={prescForm.notes}
                onChange={(e) => setPrescForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Örn. Yemeklerden sonra alınmalı, aç karnına içilmemeli..."
                className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all resize-none"
              />
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowPrescribe(false)}
                className="px-[22px] py-[13px] rounded-xl bg-card border border-border font-bold hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all min-h-[48px]"
              >
                İptal
              </button>
              <button
                onClick={prescribeMedicine}
                disabled={prescSaving}
                className="inline-flex items-center gap-2 px-[22px] py-[13px] rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold shadow-[0_6px_14px_-6px_oklch(0.58_0.13_220)] hover:bg-[oklch(0.50_0.14_225)] transition-all disabled:opacity-60 min-h-[48px]"
              >
                {prescSaving ? (
                  <div className="w-4 h-4 border-[2.5px] border-white/35 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Reçete Et
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}
