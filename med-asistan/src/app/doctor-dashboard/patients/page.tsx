"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adherenceStatus } from "@/lib/doctor-constants";

type Patient = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  adherence: number;
  medsCount: number;
  lastSeen: string | null;
  color: string;
  status: string;
};

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

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadPatients();
  }, []);

  async function loadPatients() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: relations } = await supabase
      .from("doctor_patients")
      .select("patient_id, status")
      .eq("doctor_id", user.id)
      .in("status", ["active", "pending"]);

    if (relations && relations.length > 0) {
      const ids = relations.map((r) => r.patient_id);
      const statusMap = new Map(relations.map((r) => [r.patient_id, r.status]));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", ids);

      const list: Patient[] = [];
      for (const p of profiles || []) {
        const { count } = await supabase
          .from("medicines")
          .select("id", { count: "exact", head: true })
          .eq("user_id", p.id)
          .eq("is_active", true);

        const name = p.full_name || "İsimsiz";
        list.push({
          id: p.id,
          full_name: name,
          email: p.email || "",
          phone: p.phone,
          adherence: 0,
          medsCount: count ?? 0,
          lastSeen: null,
          color: getAvatarColor(name),
          status: statusMap.get(p.id) || "active",
        });
      }
      setPatients(list);
    }
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let xs = patients;
    if (filter === "critical") xs = xs.filter((p) => p.adherence < 65);
    if (filter === "warn") xs = xs.filter((p) => p.adherence >= 65 && p.adherence < 85);
    if (filter === "ok") xs = xs.filter((p) => p.adherence >= 85);
    if (q.trim()) {
      const qq = q.toLowerCase();
      xs = xs.filter((p) => p.full_name.toLowerCase().includes(qq));
    }
    return xs;
  }, [patients, q, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-[oklch(0.55_0.13_165)]/30 border-t-[oklch(0.55_0.13_165)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Topbar */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none m-0 mb-1">
            Hastalarım
          </h1>
          <p className="text-[oklch(0.58_0.018_245)] text-base m-0">
            {patients.length} kayıtlı hasta
          </p>
        </div>
      </div>

      {/* Toolbar: search + filter chips */}
      <div className="flex flex-wrap items-center gap-3 mb-[18px]">
        <div className="flex-1 min-w-[240px] flex items-center gap-2.5 px-4 py-3 bg-card border border-border rounded-xl">
          <Search className="w-[18px] h-[18px] text-[oklch(0.58_0.018_245)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hasta adı ara..."
            className="border-none outline-none bg-transparent w-full text-[15px]"
          />
        </div>
        {([
          ["all", "Tümü"],
          ["critical", "Kritik"],
          ["warn", "Dikkat"],
          ["ok", "İyi"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm border transition-all ${
              filter === k
                ? "bg-[oklch(0.96_0.025_220)] border-[oklch(0.88_0.05_220)] text-[oklch(0.32_0.10_225)]"
                : "bg-card border-border text-[oklch(0.42_0.022_245)] hover:border-[oklch(0.85_0.018_220)]"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Patient grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-[oklch(0.58_0.018_245)]">
          Filtreyle eşleşen hasta bulunamadı.
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
          {filtered.map((p) => {
            const isPending = p.status === "pending";
            const adhStatus = adherenceStatus(p.adherence);
            return (
              <button
                key={p.id}
                onClick={() => !isPending && router.push(`/doctor-dashboard/patient/${p.id}`)}
                className={`text-left bg-card border rounded-2xl p-5 flex flex-col gap-3.5 transition-all ${
                  isPending
                    ? "border-dashed border-[oklch(0.85_0.04_80)] opacity-80 cursor-default"
                    : "border-border cursor-pointer hover:border-[oklch(0.58_0.13_220)] hover:-translate-y-0.5 hover:shadow-[0_4px_18px_-8px_oklch(0.4_0.05_245/0.18)]"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-[50px] h-[50px] rounded-[14px] flex items-center justify-center font-extrabold text-[17px] shrink-0"
                    style={{ background: p.color + "22", color: p.color }}
                  >
                    {getInitials(p.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base tracking-[-0.01em]">{p.full_name}</div>
                    <div className="text-[13px] text-[oklch(0.58_0.018_245)]">
                      {isPending ? "Davet bekleniyor" : `${p.medsCount} ilaç`}
                    </div>
                  </div>
                  {isPending ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)]">
                      <Clock className="w-3 h-3" /> Bekliyor
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        adhStatus === "ok"
                          ? "bg-[oklch(0.96_0.04_165)] text-[oklch(0.38_0.10_165)]"
                          : adhStatus === "warn"
                          ? "bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)]"
                          : "bg-[oklch(0.97_0.025_25)] text-[oklch(0.45_0.16_25)]"
                      }`}
                    >
                      %{p.adherence}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-[oklch(0.58_0.018_245)]">
                    <Clock className="w-3.5 h-3.5" /> {isPending ? "Henüz kabul edilmedi" : `Son aktivite: ${p.lastSeen || "—"}`}
                  </span>
                  {!isPending && (
                    <span className="text-[oklch(0.58_0.13_220)] font-bold text-sm inline-flex items-center gap-1">
                      Detay <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
