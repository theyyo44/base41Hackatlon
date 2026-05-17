"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, User, Shield, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { SPECIALTIES } from "@/lib/doctor-constants";

export default function DoctorOnboardingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    specialty: "",
    hospital: "",
    license_no: "",
    bio: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.specialty || !form.license_no.trim()) {
      toast.error("Lütfen uzmanlık alanı ve lisans numarasını girin.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Oturum bulunamadı");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("doctor_profiles").upsert({
      id: user.id,
      specialty: form.specialty,
      hospital: form.hospital.trim() || null,
      license_no: form.license_no.trim(),
      bio: form.bio.trim() || null,
    });

    if (error) {
      toast.error("Profil kaydedilemedi: " + error.message);
      setSaving(false);
      return;
    }

    toast.success("Doktor profiliniz oluşturuldu!");
    router.push("/doctor-dashboard");
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — info panel */}
      <div
        className="hidden lg:flex flex-col justify-center px-[7vw] py-14"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, oklch(0.94 0.06 165) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, oklch(0.96 0.05 200) 0%, transparent 50%), oklch(0.96 0.025 200)",
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] flex items-center justify-center shadow-lg mb-6">
          <Activity className="w-[26px] h-[26px] text-white" />
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border text-xs font-bold text-muted-foreground w-fit mb-5">
          Doktor onboarding · 1/1
        </span>
        <h1 className="text-[clamp(32px,3.5vw,48px)] font-extrabold tracking-tighter leading-[1.1] mb-4">
          Hesabınızı tamamlayalım
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-[480px] mb-10">
          Hastalarınızla bağlantı kurmadan önce birkaç mesleki bilgiye ihtiyacımız var.
        </p>

        <div className="flex flex-col gap-5 max-w-[420px]">
          {[
            {
              icon: User,
              title: "Hasta bağlama",
              desc: "E-posta ile davet gönderin, hastalarınız tek tıkla bağlansın.",
            },
            {
              icon: Activity,
              title: "Uyum takibi",
              desc: "Hangi ilacın ne zaman alındığını gerçek zamanlı görün.",
            },
            {
              icon: Shield,
              title: "KVKK uyumlu",
              desc: "Sadece sizinle paylaşılan veriler size görünür.",
            },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-card/80 border border-border flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-[oklch(0.55_0.13_165)]" />
              </div>
              <div>
                <h4 className="font-bold text-[15px] mb-0.5">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-snug">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center px-6 py-14 bg-card">
        <form
          onSubmit={submit}
          className="w-full max-w-[520px] bg-card border border-border rounded-2xl p-8"
        >
          <h2 className="text-[22px] font-extrabold tracking-tight mb-1">Mesleki Bilgiler</h2>
          <p className="text-sm text-muted-foreground mb-6">Yıldızlı (*) alanlar zorunludur.</p>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-xs font-bold text-muted-foreground">Uzmanlık Alanı *</label>
            <select
              value={form.specialty}
              onChange={(e) => set("specialty", e.target.value)}
              className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
            >
              <option value="">Seçiniz…</option>
              {SPECIALTIES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-xs font-bold text-muted-foreground">Çalıştığı Hastane / Klinik</label>
            <input
              type="text"
              value={form.hospital}
              onChange={(e) => set("hospital", e.target.value)}
              placeholder="Acıbadem Maslak Hastanesi"
              className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-xs font-bold text-muted-foreground">Lisans Numarası *</label>
            <input
              type="text"
              value={form.license_no}
              onChange={(e) => set("license_no", e.target.value)}
              placeholder="TR-DR-123456"
              className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
            />
            <span className="text-[11px] text-muted-foreground">Tabip Odası kayıt numaranız.</span>
          </div>

          <div className="flex flex-col gap-1.5 mb-6">
            <label className="text-xs font-bold text-muted-foreground">Hakkımda (opsiyonel)</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Hastalarınız sizi nasıl tanıyabilir?"
              className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[oklch(0.55_0.13_165)] to-[oklch(0.50_0.14_200)] text-white font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-60"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-[18px] h-[18px]" /> Profili Tamamla ve Panele Git
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
