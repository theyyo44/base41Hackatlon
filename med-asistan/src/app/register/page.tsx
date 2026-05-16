"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Mail, Lock, User, Phone, ShieldPlus, ArrowRight, Camera, Bell, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergency, setEmergency] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }

    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }

    if (password !== passwordConfirm) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const msg = error.message.includes("already registered")
        ? "Bu email zaten kayıtlı"
        : error.message;
      toast.error(msg);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        emergency_contact: emergency.trim() || null,
      });

      if (profileError) {
        toast.error("Profil oluşturulurken hata oluştu");
      }
    }

    toast.success("Hesap oluşturuldu!");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Left - Brand side */}
      <div className="hidden lg:flex flex-col justify-between px-[7vw] py-14 bg-card">
        {/* Brand */}
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-md shadow-brand/30">
            <Heart className="w-[22px] h-[22px] text-white fill-white" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight">MedAsistan</div>
            <div className="text-xs text-muted-foreground font-medium">Ev İlaç Takip Sistemi</div>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <h1 className="text-[clamp(38px,4.4vw,60px)] font-extrabold tracking-tighter leading-[1.05] mb-5 animate-slide-up">
            Sağlığınız <em className="not-italic text-brand">kontrolünüzde.</em>
          </h1>
          <p className="text-[19px] text-muted-foreground leading-[1.5] mb-8 max-w-[540px] animate-slide-up delay-100">
            Hemen ücretsiz hesap oluşturun ve ilaçlarınızı akıllıca yönetmeye başlayın.
            Doz hatırlatmaları, SKT uyarıları ve yapay zeka desteği.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-[18px] max-w-[620px]">
            {[
              { icon: Camera, title: "Fotoğrafla ekle", desc: "Kutunun resmini çek, ilaç bilgisi otomatik dolsun." },
              { icon: Bell, title: "Akıllı hatırlatma", desc: "Doz zamanı bildirim, telefon veya SMS." },
              { icon: Shield, title: "Aile bağlantısı", desc: "Yakınlarınız kullanımınızı takip edebilsin." },
            ].map((f, i) => (
              <div key={f.title} className={`flex flex-col gap-2 animate-slide-up delay-${(i + 2) * 100}`}>
                <div className="w-[42px] h-[42px] rounded-xl bg-brand-soft text-brand-ink flex items-center justify-center">
                  <f.icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-[15px] m-0">{f.title}</h4>
                <p className="text-[13px] text-muted-foreground leading-[1.45] m-0">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-[18px] text-[13px] text-muted-foreground animate-fade-in delay-500">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> KVKK uyumlu</span>
          <span>·</span>
          <span>Sağlık Bakanlığı protokolüne uygun</span>
        </div>
      </div>

      {/* Right - Register form */}
      <div
        className="relative flex items-center justify-center px-6 py-14 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, oklch(0.94 0.06 220) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, oklch(0.96 0.05 165) 0%, transparent 50%), oklch(0.96 0.025 220)",
        }}
      >
        <div className="w-full max-w-[460px] bg-card border border-border rounded-2xl p-8 shadow-lg z-10 animate-pop-in">
          {/* Mobile brand */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-md shadow-brand/30">
              <Heart className="w-[22px] h-[22px] text-white fill-white" />
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight">MedAsistan</div>
              <div className="text-xs text-muted-foreground font-medium">Ev İlaç Takip Sistemi</div>
            </div>
          </div>

          <h2 className="text-[28px] font-extrabold tracking-tight mb-1 animate-slide-up delay-100">Kayıt Ol</h2>
          <p className="text-muted-foreground text-[15px] mb-7 animate-slide-up delay-200">Ücretsiz hesap oluşturun</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="animate-slide-up delay-200">
              <label className="text-sm font-bold mb-1.5 block">Ad Soyad *</label>
              <div className="flex items-center gap-2.5 px-4 py-[13px] bg-white border-[1.5px] border-border rounded-xl transition-all input-glow">
                <User className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ayşe Yılmaz"
                  className="border-none outline-none bg-transparent w-full text-[16px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 animate-slide-up delay-200">
              <div>
                <label className="text-sm font-bold mb-1.5 block">Email *</label>
                <div className="flex items-center gap-2.5 px-4 py-[13px] bg-white border-[1.5px] border-border rounded-xl transition-all input-glow">
                  <Mail className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="border-none outline-none bg-transparent w-full text-[16px]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold mb-1.5 block">Telefon *</label>
                <div className="flex items-center gap-2.5 px-4 py-[13px] bg-white border-[1.5px] border-border rounded-xl transition-all input-glow">
                  <Phone className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0555 123 45 67"
                    className="border-none outline-none bg-transparent w-full text-[16px]"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="animate-slide-up delay-300">
              <label className="text-sm font-bold mb-1.5 block">Acil Durum Kontağı</label>
              <div className="flex items-center gap-2.5 px-4 py-[13px] bg-white border-[1.5px] border-border rounded-xl transition-all input-glow">
                <ShieldPlus className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={emergency}
                  onChange={(e) => setEmergency(e.target.value)}
                  placeholder="İsim · Telefon (opsiyonel)"
                  className="border-none outline-none bg-transparent w-full text-[16px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 animate-slide-up delay-300">
              <div>
                <label className="text-sm font-bold mb-1.5 block">Şifre *</label>
                <div className="flex items-center gap-2.5 px-4 py-[13px] bg-white border-[1.5px] border-border rounded-xl transition-all input-glow">
                  <Lock className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="border-none outline-none bg-transparent w-full text-[16px]"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold mb-1.5 block">Tekrar *</label>
                <div className="flex items-center gap-2.5 px-4 py-[13px] bg-white border-[1.5px] border-border rounded-xl transition-all input-glow">
                  <Lock className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••"
                    className="border-none outline-none bg-transparent w-full text-[16px]"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="animate-slide-up delay-400 mt-2 flex items-center justify-center gap-2.5 px-5 py-[17px] rounded-[14px] bg-brand text-white font-bold text-[17px] shadow-[0_6px_14px_-6px] shadow-brand hover:bg-brand-2 transition-all min-h-[56px] disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Hesap Oluştur
                  <ArrowRight className="w-[18px] h-[18px]" />
                </>
              )}
            </button>
          </form>

          <div className="animate-slide-up delay-500">
            <p className="text-center text-sm text-muted-foreground mt-6">
              Zaten hesabın var mı?{" "}
              <Link href="/login" className="text-brand font-bold hover:underline">
                Giriş yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
