"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Clock, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { findPatientByEmail, sendDoctorInvite } from "../actions";

type Invite = {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_email: string;
  status: string;
  invited_at: string;
};

export default function DoctorInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState(
    "Sağlığınızı daha iyi takip edebilmem için bu uygulamayı kullanmanızı rica ederim."
  );
  const [inviteSending, setInviteSending] = useState(false);

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: relations } = await supabase
      .from("doctor_patients")
      .select("id, patient_id, status, invited_at, notes")
      .eq("doctor_id", user.id)
      .order("invited_at", { ascending: false });

    if (relations) {
      const ids = relations.map((r) => r.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const map = new Map((profiles || []).map((p) => [p.id, p]));

      setInvites(
        relations.map((r) => ({
          id: r.id,
          patient_id: r.patient_id,
          patient_name: map.get(r.patient_id)?.full_name || "İsimsiz",
          patient_email: map.get(r.patient_id)?.email || "",
          status: r.status,
          invited_at: r.invited_at,
        }))
      );
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
    loadInvites();
  }

  async function cancelInvite(id: string) {
    const supabase = createClient();
    await supabase.from("doctor_patients").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
    toast.success("Davet iptal edildi.");
    loadInvites();
  }

  const pendingCount = invites.filter((i) => i.status === "pending").length;

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
            Davetler
          </h1>
          <p className="text-[oklch(0.58_0.018_245)] text-base m-0">
            {pendingCount} bekleyen davet
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2.5 px-[22px] py-[13px] rounded-xl bg-[oklch(0.58_0.13_220)] text-white font-bold shadow-[0_6px_14px_-6px_oklch(0.58_0.13_220)] hover:bg-[oklch(0.50_0.14_225)] transition-all"
        >
          <Plus className="w-[18px] h-[18px]" /> Yeni Davet
        </button>
      </div>

      {/* Invites list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden" style={{ padding: 0 }}>
        {invites.length === 0 ? (
          <div className="text-center py-10 text-[oklch(0.58_0.018_245)]">
            Henüz davet göndermediniz.
          </div>
        ) : (
          invites.map((inv, idx) => (
            <div
              key={inv.id}
              className="flex items-center gap-3.5 px-[22px] py-[18px]"
              style={{ borderBottom: idx < invites.length - 1 ? "1px solid oklch(0.92 0.012 220)" : "none" }}
            >
              <div
                className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center ${
                  inv.status === "pending"
                    ? "bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)]"
                    : inv.status === "active"
                    ? "bg-[oklch(0.96_0.04_165)] text-[oklch(0.38_0.10_165)]"
                    : "bg-[oklch(0.97_0.025_25)] text-[oklch(0.45_0.16_25)]"
                }`}
              >
                {inv.status === "pending" ? (
                  <Clock className="w-5 h-5" />
                ) : inv.status === "active" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px]">{inv.patient_email || inv.patient_name}</div>
                <div className="text-[13px] text-[oklch(0.58_0.018_245)]">
                  Gönderildi: {new Date(inv.invited_at).toLocaleDateString("tr-TR")}
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  inv.status === "pending"
                    ? "bg-[oklch(0.97_0.04_80)] text-[oklch(0.45_0.12_60)]"
                    : inv.status === "active"
                    ? "bg-[oklch(0.96_0.04_165)] text-[oklch(0.38_0.10_165)]"
                    : "bg-[oklch(0.97_0.025_25)] text-[oklch(0.45_0.16_25)]"
                }`}
              >
                {inv.status === "pending" ? "Bekliyor" : inv.status === "active" ? "Kabul edildi" : "Reddedildi"}
              </span>
              {inv.status === "pending" && (
                <>
                  <button className="px-3.5 py-[9px] rounded-[9px] bg-card border border-border font-semibold text-sm hover:bg-[oklch(0.975_0.008_220)] transition-all">
                    Tekrar Gönder
                  </button>
                  <button
                    onClick={() => cancelInvite(inv.id)}
                    className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-[oklch(0.58_0.018_245)] hover:bg-[oklch(0.97_0.025_25)] hover:text-[oklch(0.45_0.16_25)] transition-all"
                    title="İptal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

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
