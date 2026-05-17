"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  Activity,
  Bell,
  Plus,
  Clock,
  ChevronRight,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { adherenceStatus } from "@/lib/doctor-constants";
import { trDate } from "@/lib/helpers";
import { findPatientByEmail, sendDoctorInvite } from "./actions";

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
  notTakenToday: boolean;
};

type Invite = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  status: string;
  invited_at: string;
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

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<{ full_name: string; specialty: string; hospital?: string } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState(
    "Sağlığınızı daha iyi takip edebilmem için bu uygulamayı kullanmanızı rica ederim."
  );
  const [inviteSending, setInviteSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: dp } = await supabase
        .from("doctor_profiles")
        .select("specialty, hospital")
        .eq("id", user.id)
        .single();
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (dp && prof) setDoctor({ full_name: prof.full_name || "Doktor", specialty: dp.specialty || "", hospital: dp.hospital || undefined });

      const { data: relations } = await supabase
        .from("doctor_patients")
        .select("id, patient_id, status, invited_at, notes")
        .eq("doctor_id", user.id);

      if (relations && relations.length > 0) {
        const allPatientIds = relations.map((r) => r.patient_id);
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", allPatientIds);

        const profileMap = new Map(
          (allProfiles || []).map((p) => [p.id, p])
        );

        setInvites(
          relations.map((r) => ({
            id: r.id,
            patient_id: r.patient_id,
            patient_name: profileMap.get(r.patient_id)?.full_name || "İsimsiz",
            patient_email: profileMap.get(r.patient_id)?.email || "",
            status: r.status,
            invited_at: r.invited_at,
          }))
        );

        const visibleIds = relations
          .filter((r) => r.status === "active" || r.status === "pending")
          .map((r) => r.patient_id);
        const statusMap = new Map(relations.map((r) => [r.patient_id, r.status]));

        if (visibleIds.length > 0) {
          const today = new Date();

          const patientList: Patient[] = [];
          for (const pid of visibleIds) {
            const p = profileMap.get(pid);
            if (!p) continue;

            const { count: medsCount } = await supabase
              .from("medicines")
              .select("id", { count: "exact", head: true })
              .eq("user_id", p.id)
              .eq("is_active", true);

            let adherence = 0;
            let hasTodayDoses = false;
            let tookToday = false;
            const pStatus = statusMap.get(p.id) || "active";
            if (pStatus === "active") {
              const { data: medsWithSchedules } = await supabase
                .from("medicines")
                .select("id, schedules(times)")
                .eq("user_id", p.id)
                .eq("is_active", true);

              let totalDoses = 0;
              const medTimes: { medId: string; time: string }[] = [];
              for (const m of medsWithSchedules || []) {
                const times = (m.schedules as any)?.[0]?.times || [];
                for (const t of times) {
                  medTimes.push({ medId: m.id, time: (t as string).slice(0, 5) });
                }
                totalDoses += times.length * 7;
              }

              const todayStart = new Date(today);
              todayStart.setHours(0, 0, 0, 0);
              const todayEnd = new Date(today);
              todayEnd.setHours(23, 59, 59, 999);

              const { count: todayTakenCount } = await supabase
                .from("dose_logs")
                .select("id", { count: "exact", head: true })
                .eq("user_id", p.id)
                .eq("status", "taken")
                .gte("scheduled_at", todayStart.toISOString())
                .lte("scheduled_at", todayEnd.toISOString());

              const dailyDoses = medTimes.length;
              hasTodayDoses = dailyDoses > 0;
              tookToday = (todayTakenCount ?? 0) > 0;

              if (totalDoses > 0) {
                const wStart = new Date(today);
                wStart.setDate(wStart.getDate() - 6);
                wStart.setHours(0, 0, 0, 0);

                const { count: takenCount } = await supabase
                  .from("dose_logs")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", p.id)
                  .eq("status", "taken")
                  .gte("scheduled_at", wStart.toISOString())
                  .lte("scheduled_at", todayEnd.toISOString());

                adherence = Math.round(((takenCount ?? 0) / totalDoses) * 100);
              }
            }

            const name = p.full_name || "İsimsiz";
            patientList.push({
              id: p.id,
              full_name: name,
              email: p.email || "",
              phone: p.phone,
              adherence,
              medsCount: medsCount ?? 0,
              lastSeen: null,
              color: getAvatarColor(name),
              status: pStatus,
              notTakenToday: hasTodayDoses && !tookToday,
            });
          }
          setPatients(patientList);
        }
      }
    } catch (err) {
      // silently handle error
    }
    setLoading(false);
  }

  async function sendInvite() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Geçerli bir e-posta adresi girin.");
      return;
    }
    setInviteSending(true);

    const findResult = await findPatientByEmail(inviteEmail);
    if (findResult.error) {
      toast.error(findResult.error);
      setInviteSending(false);
      return;
    }

    const inviteResult = await sendDoctorInvite(findResult.patientId!, inviteNote);
    if (inviteResult.error) {
      toast.error(inviteResult.error);
      setInviteSending(false);
      return;
    }

    toast.success("Davet gönderildi!");
    setShowInvite(false);
    setInviteEmail("");
    setInviteSending(false);
    loadData();
  }

  const pendingCount = invites.filter((i) => i.status === "pending").length;
  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => a.adherence - b.adherence),
    [patients]
  );
  const lowAdherence = patients.filter((p) => p.adherence < 65).length;
  const notTakenTodayCount = patients.filter((p) => p.notTakenToday).length;
  const avgAdherence = patients.length === 0 ? 0 : Math.round(patients.reduce((s, p) => s + p.adherence, 0) / patients.length);
  const today = new Date();

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
            Merhaba Dr. {doctor?.full_name?.split(" ")[0] || "Doktor"} 👋
          </h1>
          <p className="text-[oklch(0.58_0.018_245)] text-base m-0">
            {doctor?.specialty} · {doctor?.hospital || "Bağımsız"} · Bugün {trDate(today)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/doctor-dashboard/invites")}
            className="relative w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center text-[oklch(0.42_0.022_245)] hover:border-[oklch(0.85_0.018_220)] hover:text-[oklch(0.22_0.025_245)] transition-all"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-[9px] right-[9px] w-[9px] h-[9px] rounded-full bg-[oklch(0.65_0.17_22)] border-2 border-card" />
            )}
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2.5 px-[22px] py-[13px] rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold shadow-[0_6px_14px_-6px_oklch(0.58_0.13_220)] hover:bg-[oklch(0.50_0.14_225)] transition-all"
          >
            <Plus className="w-[18px] h-[18px]" /> Hasta Davet Et
          </button>
        </div>
      </div>

      {/* Stat grid - 4 cols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px] mb-6">
        {[
          {
            icon: Users,
            tone: "bg-[oklch(0.96_0.025_220)] text-[oklch(0.32_0.10_225)]",
            num: patients.length,
            label: "Toplam hasta",
            foot: lowAdherence > 0 ? `${lowAdherence} kritik` : "Hepsi iyi durumda",
          },
          {
            icon: AlertTriangle,
            tone: "bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)]",
            num: notTakenTodayCount,
            label: "Bugün ilaç almayan",
            foot: notTakenTodayCount > 0 ? `${notTakenTodayCount} hasta bugün almadı` : "Herkes ilaçlarını aldı",
          },
          {
            icon: Activity,
            tone: "bg-[oklch(0.96_0.04_165)] text-[oklch(0.38_0.10_165)]",
            num: patients.length > 0 ? `%${avgAdherence}` : "—",
            label: "Genel uyum (7 gün)",
            foot: null,
          },
          {
            icon: Bell,
            tone: "bg-[oklch(0.97_0.025_25)] text-[oklch(0.45_0.16_25)]",
            num: pendingCount,
            label: "Bekleyen davet",
            foot: "Hasta cevabı bekleniyor",
          },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-[22px] flex flex-col gap-4">
            <div className={`w-12 h-12 rounded-[14px] ${s.tone} flex items-center justify-center`}>
              <s.icon className="w-[22px] h-[22px]" />
            </div>
            <div>
              <div className="text-[40px] font-extrabold tracking-[-0.03em] leading-none">{s.num}</div>
              <div className="text-[15px] text-[oklch(0.42_0.022_245)] font-semibold mt-1">{s.label}</div>
              {s.foot && (
                <div className="text-[13px] text-[oklch(0.58_0.018_245)] mt-0.5">{s.foot}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Patients section header */}
      <div className="flex items-center justify-between mt-8 mb-4">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.015em] m-0">Hastalarım</h2>
          <p className="text-sm text-[oklch(0.58_0.018_245)] font-medium mt-0.5">
            Uyum skoruna göre sıralandı — kritik olanlar yukarıda
          </p>
        </div>
        <button
          onClick={() => router.push("/doctor-dashboard/patients")}
          className="px-3.5 py-[9px] rounded-[9px] bg-card border border-border font-semibold text-sm text-[oklch(0.22_0.025_245)] hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all"
        >
          Tümünü gör →
        </button>
      </div>

      {/* Patient cards grid */}
      {patients.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Users className="w-12 h-12 text-[oklch(0.58_0.018_245)]/40 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">Henüz hastanız yok</h3>
          <p className="text-[oklch(0.58_0.018_245)] text-sm mb-4">
            &ldquo;Hasta Davet Et&rdquo; butonuyla hastalarınızı bağlayın.
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold text-sm"
          >
            <Plus className="w-4 h-4" /> Hasta Davet Et
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))" }}>
          {sortedPatients.slice(0, 6).map((p) => {
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      adhStatus === "ok"
                        ? "bg-[oklch(0.96_0.04_165)] text-[oklch(0.38_0.10_165)]"
                        : adhStatus === "warn"
                        ? "bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)]"
                        : "bg-[oklch(0.97_0.025_25)] text-[oklch(0.45_0.16_25)]"
                    }`}>
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

      {/* Pending invites */}
      {pendingCount > 0 && (
        <>
          <div className="flex items-center justify-between mt-9 mb-4">
            <div>
              <h2 className="text-[22px] font-bold tracking-[-0.015em] m-0">Bekleyen davetler</h2>
              <p className="text-sm text-[oklch(0.58_0.018_245)] font-medium mt-0.5">
                {pendingCount} hasta henüz daveti kabul etmedi
              </p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden" style={{ padding: 0 }}>
            {invites
              .filter((i) => i.status === "pending")
              .map((inv, idx, arr) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3.5 px-[22px] py-4"
                  style={{ borderBottom: idx < arr.length - 1 ? "1px solid oklch(0.92 0.012 220)" : "none" }}
                >
                  <div className="w-[38px] h-[38px] rounded-[11px] bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)] flex items-center justify-center">
                    <Bell className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{inv.patient_email || inv.patient_name}</div>
                    <div className="text-[13px] text-[oklch(0.58_0.018_245)]">
                      Gönderildi: {new Date(inv.invited_at).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)]">
                    Bekliyor
                  </span>
                  <button className="px-3.5 py-[9px] rounded-[9px] bg-card border border-border font-semibold text-sm hover:bg-[oklch(0.975_0.008_220)] transition-all">
                    Tekrar Gönder
                  </button>
                </div>
              ))}
          </div>
        </>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 grid place-items-center p-5" style={{ background: "oklch(0.2 0.03 245 / 0.45)", animation: "fadeIn .15s ease" }} onClick={() => setShowInvite(false)}>
          <div className="bg-card border border-border rounded-[20px] p-7 w-full max-w-[520px] shadow-[0_18px_50px_-20px_oklch(0.4_0.05_245/0.30)]" style={{ animation: "popIn .2s ease" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-11 h-11 rounded-[14px] bg-[oklch(0.96_0.025_220)] text-[oklch(0.32_0.10_225)] flex items-center justify-center">
                <Plus className="w-[22px] h-[22px]" />
              </div>
              <div>
                <h3 className="font-bold text-[22px] tracking-[-0.01em] m-0">Yeni Hasta Davet Et</h3>
                <div className="text-[oklch(0.58_0.018_245)] text-sm mt-0.5">
                  Hasta e-posta ile davetinizi kabul edecek.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-[18px]">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Hasta E-postası</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="hasta@eposta.com"
                className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all"
              />
            </div>
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-sm font-bold text-[oklch(0.42_0.022_245)]">Kişisel Not</label>
              <textarea
                rows={3}
                value={inviteNote}
                onChange={(e) => setInviteNote(e.target.value)}
                className="px-4 py-[13px] border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.58_0.13_220)] focus:shadow-[0_0_0_4px_oklch(0.88_0.08_220/0.4)] transition-all resize-none"
              />
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowInvite(false)}
                className="px-[22px] py-[13px] rounded-xl bg-card border border-border font-bold hover:border-[oklch(0.85_0.018_220)] hover:bg-[oklch(0.975_0.008_220)] transition-all min-h-[48px]"
              >
                İptal
              </button>
              <button
                onClick={sendInvite}
                disabled={inviteSending}
                className="inline-flex items-center gap-2.5 px-[22px] py-[13px] rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold shadow-[0_6px_14px_-6px_oklch(0.58_0.13_220)] hover:bg-[oklch(0.50_0.14_225)] transition-all disabled:opacity-60 min-h-[48px]"
              >
                {inviteSending ? (
                  <div className="w-4 h-4 border-[2.5px] border-white/35 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Bell className="w-4 h-4" /> Daveti Gönder
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
