"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Mail, Lock, LogIn, Check, Camera, Bell, Shield, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email veya şifre hatalı";
  if (msg.includes("Email not confirmed")) return "Email adresiniz onaylanmamış. Lütfen yeni hesap oluşturun veya yöneticinize başvurun";
  if (msg.includes("User not found")) return "Bu email ile kayıtlı kullanıcı bulunamadı";
  if (msg.includes("Too many requests")) return "Çok fazla deneme yaptınız, lütfen bekleyin";
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      toast.error(translateError(error.message));
      setLoading(false);
      return;
    }

    toast.success("Giriş başarılı!");
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Left - Brand side */}
      <div
        className="hidden lg:flex flex-col justify-between px-[7vw] py-14 bg-card"
      >
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
            İlaçlarınızı <em className="not-italic text-brand">kolayca</em> takip edin, hiçbir dozu kaçırmayın.
          </h1>
          <p className="text-[19px] text-muted-foreground leading-[1.5] mb-8 max-w-[540px] animate-slide-up delay-100">
            Aile büyükleriniz için tasarlandı, herkes için uygundur. İlaç kutusunun
            fotoğrafını çekin, sistem sizin için doldursun.
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

      {/* Right - Login form + preview card */}
      <div
        className="relative flex items-center justify-center px-6 py-14 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, oklch(0.94 0.06 220) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, oklch(0.96 0.05 165) 0%, transparent 50%), oklch(0.96 0.025 220)",
        }}
      >
        {/* Login card */}
        <div className="w-full max-w-[420px] bg-card border border-border rounded-2xl p-8 shadow-lg z-10 animate-pop-in">
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

          <h2 className="text-[28px] font-extrabold tracking-tight mb-1 animate-slide-up delay-100">Giriş Yap</h2>
          <p className="text-muted-foreground text-[15px] mb-7 animate-slide-up delay-200">Hesabınıza giriş yaparak devam edin</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="animate-slide-up delay-200">
              <label className="text-sm font-bold mb-1.5 block">Email</label>
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

            <div className="animate-slide-up delay-300">
              <label className="text-sm font-bold mb-1.5 block">Şifre</label>
              <div className="flex items-center gap-2.5 px-4 py-[13px] bg-white border-[1.5px] border-border rounded-xl transition-all input-glow">
                <Lock className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-none outline-none bg-transparent w-full text-[16px]"
                  minLength={6}
                  required
                />
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
                  Giriş Yap
                  <ArrowRight className="w-[18px] h-[18px]" />
                </>
              )}
            </button>
          </form>

          <div className="animate-slide-up delay-500">
            <p className="text-center text-sm text-muted-foreground mt-6">
              Hesabın yok mu?{" "}
              <Link href="/register" className="text-brand font-bold hover:underline">
                Hesap Oluştur
              </Link>
            </p>
          </div>
        </div>

        {/* Floating preview card (decorative, hidden on small screens) */}
        <div className="hidden xl:block absolute -bottom-6 -right-4 w-[340px] animate-float opacity-40 pointer-events-none">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-lg rotate-[6deg]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-[38px] h-[38px] rounded-[11px] bg-mint-soft text-mint-ink flex items-center justify-center">
                <Check className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="font-bold text-base">Bugünkü dozlar</div>
                <div className="text-xs text-muted-foreground">4 doz · 3 tamamlandı</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/60 opacity-55">
                <span className="font-extrabold text-sm">08:00</span>
                <span className="text-sm line-through">Parol 500mg</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-soft border border-[oklch(0.88_0.05_220)]">
                <span className="font-extrabold text-sm">12:00</span>
                <span className="text-sm font-semibold">Aspirin Cardio</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
