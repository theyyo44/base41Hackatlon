"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Check, Trash2, Loader2, X, Pencil, FileText, Save, Sun, Sunset, Moon } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { daysUntil, expiryStatus, trDate } from "@/lib/helpers";
import { toast } from "sonner";

type Filter = "all" | "active" | "passive" | "expiring";

type Medicine = {
  id: string;
  name: string;
  active_ingredient: string | null;
  dosage: string | null;
  expiry_date: string | null;
  quantity: number;
  is_active: boolean;
  schedules: { id: string; times: string[]; notes: string | null }[];
};

export default function InventoryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [editMed, setEditMed] = useState<Medicine | null>(null);
  const [editForm, setEditForm] = useState({ name: "", activeIngredient: "", dosage: "", quantity: 1, expiryDate: "", times: [] as string[] });
  const [editSaving, setEditSaving] = useState(false);

  const timeSlots = [
    { key: "sabah", label: "Sabah", time: "09:00", icon: Sun },
    { key: "ogle", label: "Öğle", time: "14:00", icon: Sunset },
    { key: "aksam", label: "Akşam", time: "20:00", icon: Moon },
  ] as const;

  useEffect(() => {
    loadMedicines();
  }, []);

  async function loadMedicines() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("medicines")
      .select("id, name, active_ingredient, dosage, expiry_date, quantity, is_active, schedules(id, times, notes)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setMedicines(data as Medicine[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let xs = medicines;
    if (filter === "active") xs = xs.filter((m) => m.is_active);
    if (filter === "passive") xs = xs.filter((m) => !m.is_active);
    if (filter === "expiring") xs = xs.filter((m) => m.expiry_date && daysUntil(m.expiry_date) < 90);
    if (q.trim()) {
      const qq = q.toLowerCase();
      xs = xs.filter(
        (m) =>
          m.name.toLowerCase().includes(qq) ||
          (m.active_ingredient || "").toLowerCase().includes(qq)
      );
    }
    return xs;
  }, [medicines, q, filter]);

  async function toggleActive(id: string) {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;
    const newVal = !med.is_active;
    const supabase = createClient();
    const { error } = await supabase
      .from("medicines")
      .update({ is_active: newVal })
      .eq("id", id);
    if (error) {
      toast.error("Güncelleme başarısız");
      return;
    }
    setMedicines((ms) => ms.map((m) => (m.id === id ? { ...m, is_active: newVal } : m)));
    toast.success(newVal ? `${med.name} aktifleştirildi` : `${med.name} pasifleştirildi`);
  }

  async function deleteMed(id: string) {
    const med = medicines.find((m) => m.id === id);
    if (!med || deletingIds.includes(id)) return;

    setDeletingIds((ids) => [...ids, id]);
    const response = await fetch(`/api/medicines/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      toast.error(data?.error || "Silme başarısız");
      setDeletingIds((ids) => ids.filter((x) => x !== id));
      return;
    }

    setMedicines((ms) => ms.filter((m) => m.id !== id));
    setDeletingIds((ids) => ids.filter((x) => x !== id));
    if (editMed?.id === id) setEditMed(null);
    toast.success(`${med.name} silindi`);
  }

  function openEdit(m: Medicine) {
    setEditMed(m);
    const allTimes = m.schedules?.flatMap((s) => s.times.map((t) => t.toString().slice(0, 5))) || [];
    setEditForm({
      name: m.name,
      activeIngredient: m.active_ingredient || "",
      dosage: m.dosage || "",
      quantity: m.quantity,
      expiryDate: m.expiry_date || "",
      times: allTimes,
    });
  }

  async function saveEdit() {
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
        expiry_date: editForm.expiryDate || null,
      })
      .eq("id", editMed.id);

    if (!error && editMed.schedules?.length > 0) {
      const schedId = editMed.schedules[0].id;
      await supabase.from("schedules").update({ times: editForm.times }).eq("id", schedId);
    }

    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      toast.success(`${editForm.name} güncellendi`);
      setEditMed(null);
      loadMedicines();
    }
    setEditSaving(false);
  }

  const filters: [Filter, string][] = [["all", "Tümü"], ["active", "Aktif"], ["passive", "Pasif"], ["expiring", "SKT yakın"]];

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
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">Envanter</h1>
          <p className="text-muted-foreground text-base m-0">
            Toplam {medicines.length} ilaç · {medicines.filter((m) => m.is_active).length} aktif kullanımda
          </p>
        </div>
        <Link href="/dashboard/add-medicine" className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors">
          <Plus className="w-[18px] h-[18px]" /> İlaç Ekle
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-[18px] flex-wrap">
        <div className="flex-1 min-w-[240px] flex items-center gap-2.5 px-4 py-3 bg-card border border-border rounded-xl">
          <Search className="w-[18px] h-[18px] text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İlaç adı veya etken madde ara..." className="border-none outline-none bg-transparent w-full text-[15px]" />
        </div>
        {filters.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2.5 rounded-full font-semibold text-sm border transition-colors ${
              filter === k ? "bg-brand-soft border-[oklch(0.88_0.05_220)] text-brand-ink" : "bg-card border-border text-muted-foreground hover:border-foreground/20"
            }`}
          >{l}</button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["İlaç", "Dozaj", "Adet", "SKT", "Durum", ""].map((h, i) => (
                <th key={i} className="text-left px-[18px] py-3.5 text-xs font-bold tracking-wider uppercase text-muted-foreground bg-secondary border-b border-border"
                  style={i === 0 ? { width: "32%" } : i === 5 ? { width: 110 } : {}}
                >{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-10">
                {medicines.length === 0 ? (
                  <>Henüz ilaç eklenmemiş. <Link href="/dashboard/add-medicine" className="text-brand font-bold hover:underline">İlaç ekleyin</Link></>
                ) : "Hiçbir ilaç bulunamadı."}
              </td></tr>
            ) : filtered.map((m) => {
              const days = m.expiry_date ? daysUntil(m.expiry_date) : 999;
              const status = expiryStatus(days);
              const timesPerDay = m.schedules?.reduce((sum, s) => sum + (s.times?.length || 0), 0) || 0;
              const deleting = deletingIds.includes(m.id);
              const doctorNote = m.schedules?.find((s) => s.notes)?.notes;
              return (
                <tr key={m.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-[18px] py-4 border-b border-border">
                    <div className="flex items-center gap-3.5">
                      <div className="w-[46px] h-[46px] rounded-[11px] flex items-center justify-center font-extrabold text-base shrink-0 bg-brand-soft text-brand-ink">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold">{m.name}</div>
                        <div className="text-[13px] text-muted-foreground">{m.active_ingredient || "—"}</div>
                        {doctorNote && (
                          <div className="flex items-center gap-1 mt-1 text-[12px] text-[oklch(0.50_0.10_220)]">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{doctorNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-[18px] py-4 border-b border-border text-[15px]">
                    {m.dosage || "-"}
                    {timesPerDay > 0 && <div className="text-[13px] text-muted-foreground">{timesPerDay}x / gün</div>}
                  </td>
                  <td className="px-[18px] py-4 border-b border-border text-[15px]">
                    <strong>{m.quantity}</strong>
                    <div className="text-[13px] text-muted-foreground">kalan</div>
                  </td>
                  <td className="px-[18px] py-4 border-b border-border text-[15px]">
                    {m.expiry_date ? (
                      <>
                        {trDate(new Date(m.expiry_date))}
                        <div className="mt-0.5">
                          {status === "critical" && <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-soft text-rose-ink">{days} gün</span>}
                          {status === "warn" && <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-soft text-amber-ink">{days} gün</span>}
                          {status === "ok" && <span className="text-[13px] text-muted-foreground">{days} gün</span>}
                        </div>
                      </>
                    ) : "-"}
                  </td>
                  <td className="px-[18px] py-4 border-b border-border">
                    {m.is_active
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-mint-soft text-mint-ink"><Check className="w-3 h-3" /> Aktif</span>
                      : <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">Pasif</span>}
                  </td>
                  <td className="px-[18px] py-4 border-b border-border">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => openEdit(m)} title="Düzenle"
                        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-brand-soft hover:text-brand-ink transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(m.id)} title={m.is_active ? "Pasifleştir" : "Aktifleştir"}
                        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMed(m.id)} title="Sil" disabled={deleting}
                        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-soft hover:text-rose-ink transition-colors disabled:opacity-50 disabled:pointer-events-none">
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editMed && (
        <div className="fixed inset-0 z-50 grid place-items-center p-5" style={{ background: "oklch(0.2 0.03 245 / 0.45)", animation: "fadeIn .15s ease" }} onClick={() => setEditMed(null)}>
          <div className="bg-card border border-border rounded-[20px] p-7 w-full max-w-[520px] shadow-[0_18px_50px_-20px_oklch(0.4_0.05_245/0.30)] max-h-[90vh] overflow-y-auto" style={{ animation: "popIn .2s ease" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-[22px] tracking-[-0.01em] m-0">İlaç Düzenle</h3>
              <button onClick={() => setEditMed(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Doctor note display */}
            {editMed.schedules?.some((s) => s.notes) && (
              <div className="flex items-start gap-2.5 p-3.5 bg-[oklch(0.96_0.03_220)] border border-[oklch(0.88_0.06_220)] rounded-xl mb-5 mt-3">
                <FileText className="w-4 h-4 shrink-0 mt-0.5 text-[oklch(0.50_0.10_220)]" />
                <div>
                  <div className="text-xs font-bold text-[oklch(0.50_0.10_220)] mb-0.5">Doktor Notu</div>
                  <div className="text-sm text-[oklch(0.35_0.04_245)] leading-relaxed">
                    {editMed.schedules.find((s) => s.notes)?.notes}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">İlaç Adı *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Etken Madde</label>
                  <input
                    type="text"
                    value={editForm.activeIngredient}
                    onChange={(e) => setEditForm((f) => ({ ...f, activeIngredient: e.target.value }))}
                    className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Dozaj</label>
                  <input
                    type="text"
                    value={editForm.dosage}
                    onChange={(e) => setEditForm((f) => ({ ...f, dosage: e.target.value }))}
                    className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Miktar</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, quantity: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Son Kullanma Tarihi</label>
                  <input
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Kullanım Saatleri</label>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map((slot) => {
                    const active = editForm.times.includes(slot.time);
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => setEditForm((f) => ({
                          ...f,
                          times: f.times.includes(slot.time)
                            ? f.times.filter((t) => t !== slot.time)
                            : [...f.times, slot.time].sort(),
                        }))}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-bold transition-all text-sm ${
                          active
                            ? "bg-[oklch(0.96_0.04_165)] border-[oklch(0.68_0.12_165)] text-[oklch(0.38_0.10_165)]"
                            : "bg-card border-border text-muted-foreground hover:border-[oklch(0.58_0.13_220)]/40"
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
            </div>

            <div className="flex gap-2.5 justify-end mt-6">
              <button
                onClick={() => setEditMed(null)}
                className="px-[22px] py-[13px] rounded-xl bg-card border border-border font-bold hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all min-h-[48px]"
              >
                İptal
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="inline-flex items-center gap-2 px-[22px] py-[13px] rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold shadow-[0_6px_14px_-6px_oklch(0.58_0.13_220)] hover:bg-[oklch(0.50_0.14_225)] transition-all disabled:opacity-60 min-h-[48px]"
              >
                {editSaving ? (
                  <div className="w-4 h-4 border-[2.5px] border-white/35 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Save className="w-4 h-4" /> Kaydet</>
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
