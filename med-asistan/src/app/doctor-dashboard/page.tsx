"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  Activity,
  Bell,
  Plus,
  Clock,
  Check,
  X,
  ChevronRight,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { adherenceStatus } from "@/lib/doctor-constants";
import { trDate } from "@/lib/helpers";

type Patient = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  adherence: number;
  medsCount: number;
  lastSeen: string | null;
};

type Invite = {
  id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  invited_at: string;
};

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<{ full_name: string; specialty: string } | null>(null);
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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: dp } = await supabase
      .from("doctor_profiles")
      .select("specialty")
      .eq("id", user.id)
      .single();
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (dp && prof) setDoctor({ full_name: prof.full_name || "Doktor", specialty: dp.specialty || "" });

    const { data: relations } = await supabase
      .from("doctor_patients")
      .select("id, patient_id, status, invited_at, notes")
      .eq("doctor_id", user.id);

    if (relations) {
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
          status: r.status,
          invited_at: r.invited_at,
        }))
      );

      const activeIds = relations
        .filter((r) => r.status === "active")
        .map((r) => r.patient_id);

      if (activeIds.length > 0) {
        const patientList: Patient[] = [];
        for (const pid of activeIds) {
          const p = profileMap.get(pid);
          if (!p) continue;
          const { count: medsCount } = await supabase
            .from("medicines")
            .select("id", { count: "exact", head: true })
            .eq("user_id", p.id)
            .eq("is_active", true);

          patientList.push({
            id: p.id,
            full_name: p.full_name || "İsimsiz",
            email: p.email || "",
            phone: p.phone,
            adherence: 0,
            medsCount: medsCount ?? 0,
            lastSeen: null,
          });
        }
        setPatients(patientList);
      }
    }
    setLoading(false);
  }

  async function sendInvite() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Geçerli bir e-posta adresi girin.");
      return;
    }
    setInviteSending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: patientProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", inviteEmail.trim().toLowerCase())
      .single();

    if (!patientProfile) {
      toast.error("Bu e-posta ile kayıtlı hasta bulunamadı.");
      setInviteSending(false);
      return;
    }

    const { error } = await supabase.from("doctor_patients").insert({
      doctor_id: user.id,
      patient_id: patientProfile.id,
      status: "pending",
      notes: inviteNote.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Bu hastaya zaten davet gönderilmiş.");
      } else {
        toast.error("Davet gönderilemedi: " + error.message);
      }
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">
            Merhaba Dr. {doctor?.full_name?.split(" ")[0] || "Doktor"} 👋
          </h1>
          <p className="text-muted-foreground text-base m-0">
            {doctor?.specialty} · Bugün {trDate(today)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/doctor-dashboard/invites")}
            className="relative w-11 h-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] text-white font-bold shadow-md hover:opacity-90 transition-all"
          >
            <Plus className="w-[18px] h-[18px]" /> Hasta Davet Et
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[18px] mb-8">
        {[
          {
            icon: Users,
            tone: "bg-[oklch(0.94_0.04_240)] text-[oklch(0.45_0.15_240)]",
            num: patients.length,
            label: "Toplam hasta",
          },
          {
            icon: AlertTriangle,
            tone: "bg-[oklch(0.94_0.06_80)] text-[oklch(0.50_0.14_65)]",
            num: 0,
            label: "Bugün ilaç almayan",
          },
          {
            icon: Activity,
            tone: "bg-mint-soft text-mint-ink",
            num: patients.length > 0 ? "—" : "—",
            label: "Genel uyum (7 gün)",
          },
          {
            icon: Bell,
            tone: "bg-[oklch(0.94_0.05_15)] text-[oklch(0.55_0.18_15)]",
            num: pendingCount,
            label: "Bekleyen davet",
          },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5">
            <div className={`w-12 h-12 rounded-[14px] ${s.tone} flex items-center justify-center mb-3`}>
              <s.icon className="w-[22px] h-[22px]" />
            </div>
            <div className="text-[28px] font-extrabold tracking-tight leading-none">{s.num}</div>
            <div className="text-sm text-muted-foreground font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Patients section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Hastalarım</h2>
          <p className="text-sm text-muted-foreground">Aktif hasta listesi</p>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">Henüz hastanız yok</h3>
          <p className="text-muted-foreground text-sm mb-4">
            &ldquo;Hasta Davet Et&rdquo; butonuyla hastalarınızı bağlayın.
          </p>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] text-white font-bold text-sm"
          >
            <Plus className="w-4 h-4" /> Hasta Davet Et
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/doctor-dashboard/patient/${p.id}`)}
              className="text-left bg-card border border-border rounded-2xl p-5 hover:border-[oklch(0.55_0.13_165)]/40 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-[oklch(0.94_0.04_240)] text-[oklch(0.45_0.15_240)] flex items-center justify-center font-bold text-sm">
                  {p.full_name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] truncate">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">{p.medsCount} aktif ilaç</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {p.lastSeen || "Henüz aktivite yok"}
                </span>
                <span className="text-[oklch(0.55_0.13_165)] font-bold text-sm flex items-center gap-1">
                  Detay <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pending invites */}
      {pendingCount > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-extrabold tracking-tight mb-1">Bekleyen Davetler</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {pendingCount} hasta henüz daveti kabul etmedi
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {invites
              .filter((i) => i.status === "pending")
              .map((inv, idx, arr) => (
                <div
                  key={inv.id}
                  className={`flex items-center gap-3.5 px-5 py-4 ${
                    idx < arr.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-[11px] bg-[oklch(0.94_0.06_80)] text-[oklch(0.50_0.14_65)] flex items-center justify-center">
                    <Bell className="w-[18px] h-[18px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[15px]">{inv.patient_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Gönderildi: {new Date(inv.invited_at).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[oklch(0.94_0.06_80)] text-[oklch(0.50_0.14_65)] text-xs font-bold">
                    Bekliyor
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInvite(false)}>
          <div className="bg-card border border-border rounded-2xl p-7 w-full max-w-[520px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-[14px] bg-[oklch(0.94_0.04_240)] text-[oklch(0.45_0.15_240)] flex items-center justify-center">
                <Plus className="w-[22px] h-[22px]" />
              </div>
              <div>
                <h3 className="font-bold text-lg m-0">Yeni Hasta Davet Et</h3>
                <p className="text-sm text-muted-foreground m-0 mt-0.5">
                  Hasta e-posta ile davetinizi kabul edecek.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs font-bold text-muted-foreground">Hasta E-postası</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="hasta@eposta.com"
                className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-xs font-bold text-muted-foreground">Kişisel Not</label>
              <textarea
                rows={3}
                value={inviteNote}
                onChange={(e) => setInviteNote(e.target.value)}
                className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-[oklch(0.55_0.13_165)] focus:ring-4 focus:ring-[oklch(0.55_0.13_165)]/20 transition-all resize-none"
              />
            </div>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowInvite(false)}
                className="px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors"
              >
                İptal
              </button>
              <button
                onClick={sendInvite}
                disabled={inviteSending}
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] text-white font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-60"
              >
                {inviteSending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    </div>
  );
}
