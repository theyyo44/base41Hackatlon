"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  ArrowRight,
  Camera,
  Bell,
  Shield,
  Check,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type View = "landing" | "login" | "register";

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "Email veya şifre hatalı";
  if (msg.includes("Email not confirmed")) return "Email adresiniz onaylanmamış";
  if (msg.includes("User not found")) return "Bu email ile kayıtlı kullanıcı bulunamadı";
  if (msg.includes("Too many requests")) return "Çok fazla deneme yaptınız, lütfen bekleyin";
  if (msg.includes("already registered")) return "Bu email zaten kayıtlı";
  return msg;
}

export default function LandingPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("landing");
  const [animatingOut, setAnimatingOut] = useState(false);
  const [displayView, setDisplayView] = useState<View>("landing");
  const [loading, setLoading] = useState(false);
  const pendingView = useRef<View>("landing");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  function switchView(next: View) {
    if (next === displayView) return;
    pendingView.current = next;
    setAnimatingOut(true);
  }

  useEffect(() => {
    if (!animatingOut) return;
    const timer = setTimeout(() => {
      setDisplayView(pendingView.current);
      setView(pendingView.current);
      setAnimatingOut(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [animatingOut]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });
    if (error) {
      toast.error(translateError(error.message));
      setLoading(false);
      return;
    }
    toast.success("Giriş başarılı!");
    router.push("/dashboard");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      options: {
        data: { full_name: regName.trim() },
      },
    });
    if (error) {
      toast.error(translateError(error.message));
      setLoading(false);
      return;
    }
    if (!data.session) {
      toast.error("Email onayı gerekiyor. Supabase Dashboard'dan 'Confirm email' seçeneğini kapatın.");
      setLoading(false);
      return;
    }
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
      });
      if (profileError) {
        toast.error("Profil kaydedilemedi: " + profileError.message);
      }
    }
    toast.success("Hesap oluşturuldu!");
    router.push("/dashboard");
  }

  const cardAnimation = animatingOut
    ? "animate-[card-exit_0.2s_ease_both]"
    : "animate-card-enter";

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Left */}
      <div className="bg-card px-[7vw] py-14 flex flex-col justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10 animate-fade-in">
          <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-md shadow-brand/30">
            <Heart className="w-[22px] h-[22px] text-white fill-white" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight">MedAsistan</div>
            <div className="text-xs text-muted-foreground font-medium">Ev İlaç Takip Sistemi</div>
          </div>
        </div>

        {/* Hero */}
        <div>
          <h1 className="text-[clamp(38px,4.4vw,60px)] font-extrabold tracking-tighter leading-[1.05] mb-5 animate-slide-up">
            İlaçlarınızı <em className="not-italic text-brand">kolayca</em> takip edin, hiçbir dozu kaçırmayın.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-[540px] animate-slide-up delay-100">
            Aile büyükleriniz için tasarlandı, herkes için uygundur. İlaç kutusunun
            fotoğrafını çekin, sistem sizin için doldursun. Doz zamanı geldiğinde
            hatırlatma alın.
          </p>

          <div className="flex gap-3 flex-wrap animate-slide-up delay-200">
            <button
              onClick={() => switchView("login")}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-[14px] bg-brand text-white font-bold text-[17px] shadow-lg shadow-brand/30 hover:bg-brand-2 transition-all min-h-[56px] active:scale-[0.97]"
            >
              Giriş Yap
              <ArrowRight className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => switchView("register")}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-[14px] bg-card border border-border font-bold text-[17px] hover:bg-secondary hover:border-[oklch(0.85_0.018_220)] transition-all min-h-[56px] active:scale-[0.97]"
            >
              Hesap Oluştur
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-[18px] mt-12 max-w-[620px]">
            {[
              { icon: Camera, title: "Fotoğrafla ekle", desc: "Kutunun resmini çek, ilaç bilgisi otomatik dolsun." },
              { icon: Bell, title: "Akıllı hatırlatma", desc: "Doz zamanı bildirim, telefon görüşmesi veya SMS." },
              { icon: Shield, title: "Aile bağlantısı", desc: "Yakınlarınız kullanımınızı takip edebilsin." },
            ].map((f, i) => (
              <div key={f.title} className={`flex flex-col gap-2 animate-slide-up delay-${(i + 3) * 100}`}>
                <div className="w-[42px] h-[42px] rounded-xl bg-brand-soft text-brand-ink flex items-center justify-center">
                  <f.icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-[15px]">{f.title}</h4>
                <p className="text-[13px] text-muted-foreground leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-[18px] items-center text-[13px] text-muted-foreground mt-8 animate-fade-in delay-600">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> KVKK uyumlu</span>
          <span>•</span>
          <span>Sağlık Bakanlığı protokolüne uygun</span>
        </div>
      </div>

      {/* Right */}
      <div
        className="hidden lg:flex items-center justify-center p-14 relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, oklch(0.94 0.06 220) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, oklch(0.96 0.05 165) 0%, transparent 50%), oklch(0.96 0.025 220)",
        }}
      >
        {/* Preview card */}
        {displayView === "landing" && (
          <div
            key="preview"
            className={`w-full max-w-[440px] bg-card rounded-3xl p-7 shadow-2xl border border-border -rotate-1 ${cardAnimation}`}
          >
            <div className="flex items-center gap-2.5 mb-[18px]">
              <div className="w-[38px] h-[38px] rounded-[11px] bg-mint-soft text-mint-ink flex items-center justify-center">
                <Check className="w-[18px] h-[18px]" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg m-0">Bugünkü dozlar</h3>
                <div className="text-[13px] text-muted-foreground">4 doz · 3 tamamlandı</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                { time: "08:00", name: "Parol 500mg", meta: "Kahvaltıdan sonra", done: true },
                { time: "08:00", name: "Vitamin D3", meta: "1 damla", done: true },
                { time: "12:00", name: "Aspirin Cardio", meta: "Öğle yemeğinden sonra · 35 dk", done: false, next: true },
                { time: "14:00", name: "Parol 500mg", meta: "Yemekten sonra", done: false },
              ].map((d, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[78px_1fr_auto] gap-4 items-center px-4 py-3.5 rounded-[14px] border transition-all ${
                    d.done
                      ? "bg-secondary/60 border-border opacity-55"
                      : d.next
                      ? "bg-brand-soft border-brand-soft"
                      : "bg-secondary border-border"
                  }`}
                >
                  <div className="font-extrabold text-xl tracking-tight">{d.time}</div>
                  <div>
                    <div className={`font-bold text-base ${d.done ? "line-through decoration-muted-foreground" : ""}`}>{d.name}</div>
                    <div className="text-[13px] text-muted-foreground">{d.meta}</div>
                  </div>
                  <button className={`w-[42px] h-[42px] rounded-full border-2 flex items-center justify-center transition-colors ${
                    d.done
                      ? "bg-mint border-mint text-white"
                      : "border-border bg-card text-muted-foreground"
                  }`}>
                    <Check className="w-[18px] h-[18px]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Login form */}
        {displayView === "login" && (
          <div
            key="login"
            className={`w-full max-w-[420px] bg-card rounded-3xl p-10 shadow-2xl border border-border ${cardAnimation}`}
          >
            <button
              onClick={() => switchView("landing")}
              className="absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-md shadow-brand/30 mb-6">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>

            <h2 className="text-[26px] font-extrabold tracking-tight mb-1">Tekrar hoş geldiniz</h2>
            <p className="text-muted-foreground text-[15px] mb-8">İlaç takibinize devam etmek için giriş yapın.</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div>
                <label className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground mb-3 block">E-POSTA</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ayse.yilmaz@example.com"
                  className="underline-input w-full bg-transparent pb-3 text-[16px] font-medium placeholder:text-muted-foreground/40"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground">ŞİFRE</label>
                  <button type="button" className="text-[13px] font-bold text-brand hover:underline transition-colors">Şifremi unuttum</button>
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="underline-input w-full bg-transparent pb-3 text-[16px] font-medium placeholder:text-muted-foreground/40"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2.5 px-5 py-[17px] rounded-[14px] bg-brand text-white font-bold text-[17px] shadow-[0_6px_14px_-6px] shadow-brand hover:bg-brand-2 transition-all min-h-[56px] disabled:opacity-60 active:scale-[0.97]"
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

            <p className="text-center text-[15px] text-muted-foreground mt-6">
              Hesabınız yok mu?{" "}
              <button onClick={() => switchView("register")} className="text-brand font-bold hover:underline transition-colors">
                Hesap oluşturun
              </button>
            </p>
          </div>
        )}

        {/* Register form */}
        {displayView === "register" && (
          <div
            key="register"
            className={`w-full max-w-[420px] bg-card rounded-3xl p-10 shadow-2xl border border-border ${cardAnimation}`}
          >
            <button
              onClick={() => switchView("landing")}
              className="absolute top-6 right-6 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/80 transition-all active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-md shadow-brand/30 mb-6">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>

            <h2 className="text-[26px] font-extrabold tracking-tight mb-1">Hesap oluşturun</h2>
            <p className="text-muted-foreground text-[15px] mb-8">Bir dakika içinde hazır. E-postanızla başlayın.</p>

            <form onSubmit={handleRegister} className="flex flex-col gap-6">
              <div>
                <label className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground mb-3 block">AD SOYAD</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ayşe Yılmaz"
                  className="underline-input w-full bg-transparent pb-3 text-[16px] font-medium placeholder:text-muted-foreground/40"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground mb-3 block">E-POSTA</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ayse.yilmaz@example.com"
                  className="underline-input w-full bg-transparent pb-3 text-[16px] font-medium placeholder:text-muted-foreground/40"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted-foreground mb-3 block">ŞİFRE</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="underline-input w-full bg-transparent pb-3 text-[16px] font-medium placeholder:text-muted-foreground/40"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2.5 px-5 py-[17px] rounded-[14px] bg-brand text-white font-bold text-[17px] shadow-[0_6px_14px_-6px] shadow-brand hover:bg-brand-2 transition-all min-h-[56px] disabled:opacity-60 active:scale-[0.97]"
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

            <p className="text-center text-[15px] text-muted-foreground mt-6">
              Hesabınız var mı?{" "}
              <button onClick={() => switchView("login")} className="text-brand font-bold hover:underline transition-colors">
                Giriş yapın
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
