"use client";

import { useState, useMemo } from "react";
import { Search, Plus, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { mockMedicines, daysUntil, expiryStatus, trDate } from "@/lib/mock-data";
import { toast } from "sonner";

type Filter = "all" | "active" | "passive" | "expiring";

export default function InventoryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [medicines, setMedicines] = useState(mockMedicines);

  const filtered = useMemo(() => {
    let xs = medicines;
    if (filter === "active") xs = xs.filter((m) => m.isActive);
    if (filter === "passive") xs = xs.filter((m) => !m.isActive);
    if (filter === "expiring") xs = xs.filter((m) => daysUntil(m.expiryDate) < 90);
    if (q.trim()) {
      const qq = q.toLowerCase();
      xs = xs.filter((m) => m.name.toLowerCase().includes(qq) || m.activeIngredient.toLowerCase().includes(qq));
    }
    return xs;
  }, [medicines, q, filter]);

  function toggleActive(id: string) {
    setMedicines((ms) => ms.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)));
    const med = medicines.find((m) => m.id === id);
    if (med) toast.success(med.isActive ? `${med.name} pasifleştirildi` : `${med.name} aktifleştirildi`);
  }

  function deleteMed(id: string) {
    const med = medicines.find((m) => m.id === id);
    setMedicines((ms) => ms.filter((m) => m.id !== id));
    if (med) toast.success(`${med.name} silindi`);
  }

  const filters: [Filter, string][] = [["all", "Tümü"], ["active", "Aktif"], ["passive", "Pasif"], ["expiring", "SKT yakın"]];

  return (
    <div>
      <div className="flex items-center justify-between mb-7 gap-6">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">Envanter</h1>
          <p className="text-muted-foreground text-base m-0">
            Toplam {medicines.length} ilaç · {medicines.filter((m) => m.isActive).length} aktif kullanımda
          </p>
        </div>
        <Link href="/dashboard/add-medicine" className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors">
          <Plus className="w-[18px] h-[18px]" /> İlaç Ekle
        </Link>
      </div>

      {/* Toolbar */}
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

      {/* Table */}
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
              <tr><td colSpan={6} className="text-center text-muted-foreground py-10">Hiçbir ilaç bulunamadı.</td></tr>
            ) : filtered.map((m) => {
              const days = daysUntil(m.expiryDate);
              const status = expiryStatus(days);
              return (
                <tr key={m.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-[18px] py-4 border-b border-border">
                    <div className="flex items-center gap-3.5">
                      <div className="w-[46px] h-[46px] rounded-[11px] flex items-center justify-center font-extrabold text-base shrink-0"
                        style={{ background: m.color + "22", color: m.color }}>{m.name.charAt(0)}</div>
                      <div>
                        <div className="font-bold">{m.name}</div>
                        <div className="text-[13px] text-muted-foreground">{m.activeIngredient}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-[18px] py-4 border-b border-border text-[15px]">
                    {m.dosage}
                    <div className="text-[13px] text-muted-foreground">{m.times.length}× / gün</div>
                  </td>
                  <td className="px-[18px] py-4 border-b border-border text-[15px]">
                    <strong>{m.quantity}</strong>
                    <div className="text-[13px] text-muted-foreground">kalan</div>
                  </td>
                  <td className="px-[18px] py-4 border-b border-border text-[15px]">
                    {trDate(new Date(m.expiryDate))}
                    <div className="mt-0.5">
                      {status === "critical" && <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-soft text-rose-ink">{days} gün</span>}
                      {status === "warn" && <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-soft text-amber-ink">{days} gün</span>}
                      {status === "ok" && <span className="text-[13px] text-muted-foreground">{days} gün</span>}
                    </div>
                  </td>
                  <td className="px-[18px] py-4 border-b border-border">
                    {m.isActive
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-mint-soft text-mint-ink"><Check className="w-3 h-3" /> Aktif</span>
                      : <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">Pasif</span>}
                  </td>
                  <td className="px-[18px] py-4 border-b border-border">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => toggleActive(m.id)} title={m.isActive ? "Pasifleştir" : "Aktifleştir"}
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
