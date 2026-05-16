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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { adherenceStatus } from "@/lib/doctor-constants";

type Medicine = {
  id: string;
  name: string;
  active_ingredient: string | null;
  dosage: string | null;
  is_active: boolean;
  times: string[];
};

type Note = {
  id: string;
  content: string;
  created_at: string;
};

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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"meds" | "notes">("meds");

  // Prescribe modal
  const [showPrescribe, setShowPrescribe] = useState(false);
  const [prescForm, setPrescForm] = useState({
    name: "",
    activeIngredient: "",
    dosage: "1 tablet",
    times: ["09:00"],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  });
  const [prescSaving, setPrescSaving] = useState(false);

  // Notes
  const [newNote, setNewNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    loadPatient();
  }, [patientId]);

  async function loadPatient() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Verify doctor-patient relationship
    const { data: rel } = await supabase
      .from("doctor_patients")
      .select("id")
      .eq("doctor_id", user.id)
      .eq("patient_id", patientId)
      .eq("status", "active")
      .single();

    if (!rel) {
      toast.error("Bu hastaya erişim izniniz yok.");
      router.push("/doctor-dashboard");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, emergency_contact")
      .eq("id", patientId)
      .single();
    if (profile) setPatient(profile);

    const { data: meds } = await supabase
      .from("medicines")
      .select("id, name, active_ingredient, dosage, is_active, schedules(times)")
      .eq("user_id", patientId)
      .eq("is_active", true);

    if (meds) {
      setMedicines(
        meds.map((m: any) => ({
          id: m.id,
          name: m.name,
          active_ingredient: m.active_ingredient,
          dosage: m.dosage,
          is_active: m.is_active,
          times: m.schedules?.[0]?.times || [],
        }))
      );
    }

    const { data: doctorNotes } = await supabase
      .from("doctor_notes")
      .select("id, content, created_at")
      .eq("doctor_id", user.id)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (doctorNotes) setNotes(doctorNotes);

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

    if (prescForm.times.length > 0) {
      await supabase.from("schedules").insert({
        medicine_id: med.id,
        user_id: patientId,
        times: prescForm.times,
        start_date: prescForm.startDate,
        end_date: prescForm.endDate || null,
      });
    }

    toast.success(`${prescForm.name} reçete edildi`);
    setShowPrescribe(false);
    setPrescForm({
      name: "",
      activeIngredient: "",
      dosage: "1 tablet",
      times: ["09:00"],
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
    });
    setPrescSaving(false);
    loadPatient();
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
    return <div className="text-center py-20 text-muted-foreground">Hasta bulunamadı.</div>;
  }

  const initials = patient.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm">
        <button
          onClick={() => router.push("/doctor-dashboard")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Hastalarım
        </button>
        <span className="text-muted-foreground/50">/</span>
        <span className="font-semibold text-muted-foreground">{patient.full_name}</span>
      </div>

      {/* Patient header */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex flex-wrap items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[oklch(0.94_0.04_240)] text-[oklch(0.45_0.15_240)] flex items-center justify-center font-extrabold text-xl">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-extrabold tracking-tight m-0 mb-1">{patient.full_name}</h1>
          <div className="flex flex-wrap gap-4 text-[15px] text-muted-foreground">
            {patient.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> {patient.phone}
              </span>
            )}
            {patient.emergency_contact && (
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {patient.emergency_contact}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit mb-6">
        <button
          onClick={() => setTab("meds")}
          className={`px-5 py-2.5 rounded-[10px] text-sm font-bold transition-all ${
            tab === "meds" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          Aktif İlaçlar ({medicines.length})
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`px-5 py-2.5 rounded-[10px] text-sm font-bold transition-all ${
            tab === "notes" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          Notlarım ({notes.length})
        </button>
      </div>

      {tab === "meds" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold">Aktif İlaçlar</h2>
            <button
              onClick={() => setShowPrescribe(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] text-white font-bold text-sm shadow-md hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" /> Reçeteye İlaç Ekle
            </button>
          </div>

          {medicines.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
              Hastanın aktif ilacı bulunmuyor.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">İlaç</th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Doz</th>
                    <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Saatler</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[11px] bg-[oklch(0.94_0.04_220)] text-[oklch(0.45_0.14_220)] flex items-center justify-center font-bold text-sm">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.active_ingredient || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">{m.dosage}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {m.times.map((t) => (
                            <span
                              key={t}
                              className="px-2.5 py-1 rounded-md bg-secondary text-xs font-bold font-mono"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div>
          <h2 className="text-lg font-extrabold mb-4">Doktor Notları</h2>
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Bu hasta hakkında not ekleyin..."
              className="w-full px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all resize-none mb-3"
            />
            <div className="flex justify-end">
              <button
                onClick={addNote}
                disabled={noteSaving || !newNote.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] text-white font-bold text-sm disabled:opacity-60"
              >
                <FileText className="w-4 h-4" /> Not Ekle
              </button>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Henüz not eklenmemiş.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map((n) => (
                <div key={n.id} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-[15px] leading-relaxed mb-2">{n.content}</p>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
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
      )}

      {/* Prescribe Modal */}
      {showPrescribe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPrescribe(false)}>
          <div className="bg-card border border-border rounded-2xl p-7 w-full max-w-[520px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-5">Yeni İlaç Reçete Et</h3>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-bold text-muted-foreground">İlaç Adı *</label>
              <input
                type="text"
                value={prescForm.name}
                onChange={(e) => setPrescForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Örn. Parol 500mg"
                className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground">Etken Madde</label>
                <input
                  type="text"
                  value={prescForm.activeIngredient}
                  onChange={(e) => setPrescForm((f) => ({ ...f, activeIngredient: e.target.value }))}
                  placeholder="Parasetamol 500mg"
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground">Doz</label>
                <input
                  type="text"
                  value={prescForm.dosage}
                  onChange={(e) => setPrescForm((f) => ({ ...f, dosage: e.target.value }))}
                  placeholder="1 tablet"
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-bold text-muted-foreground">Saatler</label>
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
                          ? "bg-[oklch(0.95_0.04_165)] border-[oklch(0.55_0.13_165)] text-[oklch(0.35_0.12_165)]"
                          : "bg-card border-border text-muted-foreground hover:border-[oklch(0.55_0.13_165)]/40"
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

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground">Başlangıç</label>
                <input
                  type="date"
                  value={prescForm.startDate}
                  onChange={(e) => setPrescForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground">Bitiş (opsiyonel)</label>
                <input
                  type="date"
                  value={prescForm.endDate}
                  onChange={(e) => setPrescForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowPrescribe(false)}
                className="px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors"
              >
                İptal
              </button>
              <button
                onClick={prescribeMedicine}
                disabled={prescSaving}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] text-white font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-60"
              >
                {prescSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    </div>
  );
}
