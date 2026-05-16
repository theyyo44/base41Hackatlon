"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Check, Trash2, Loader2 } from "lucide-react";
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
  schedules: { times: string[] }[];
};

export default function InventoryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("medicines")
        .select("id, name, active_ingredient, dosage, expiry_date, quantity, is_active, schedules(times)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setMedicines(data as Medicine[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let xs = medicines;
    if (filter === "active") xs = xs.filter((m) => m.is_active);
    if (filter === "passive") xs = xs.filter((m) => !m.is_active);
    if (filter === "expiring") xs = xs.filter((m) => m.expiry_date && daysUntil(m.expiry_date) < 90);
    if (q.trim()) {
      const qq = q.toLowerCase();
      xs = xs.filter((m) => m.name.toLowerCase().includes(qq) || (m.active_ingredient || "").toLowerCase().includes(qq));
    }
    return xs;
  }, [medicines, q, filter]);

  async function toggleActive(id: string) {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;
    const newVal = !med.is_active;
    const supabase = createClient();
    const { error } = await supabase.from("medicines").update({ is_active: newVal }).eq("id", id);
    if (error) {
      toast.error("Güncelleme başarısız");
      return;
    }
    setMedicines((ms) => ms.map((m) => (m.id === id ? { ...m, is_active: newVal } : m)));
    toast.success(newVal ? `${med.name} aktifleştirildi` : `${med.name} pasifleştirildi`);
  }

  async function deleteMed(id: string) {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;
    const supabase = createClient();
    await supabase.from("schedules").delete().eq("medicine_id", id);
    const { error } = await supabase.from("medicines").delete().eq("id", id);
    if (error) {
      toast.error("Silme başarısız");
      return;
    }
    setMedicines((ms) => ms.filter((m) => m.id !== id));
    toast.success(`${med.name} silindi`);
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
                  style={i === 0 ? { width: "32%" } : i === 5 ? { width: 80 } : {}}
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
                      </div>
                    </div>
                  </td>
                  <td className="px-[18px] py-4 border-b border-border text-[15px]">
                    {m.dosage || "—"}
                    {timesPerDay > 0 && <div className="text-[13px] text-muted-foreground">{timesPerDay}× / gün</div>}
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
                    ) : "—"}
                  </td>
                  <td className="px-[18px] py-4 border-b border-border">
                    {m.is_active
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-mint-soft text-mint-ink"><Check className="w-3 h-3" /> Aktif</span>
                      : <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">Pasif</span>}
                  </td>
                  <td className="px-[18px] py-4 border-b border-border">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => toggleActive(m.id)} title={m.is_active ? "Pasifleştir" : "Aktifleştir"}
                        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMed(m.id)} title="Sil"
                        className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-rose-soft hover:text-rose-ink transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
