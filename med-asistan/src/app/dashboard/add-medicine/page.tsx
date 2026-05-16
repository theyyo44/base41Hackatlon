"use client";

import { useState, useRef } from "react";
import { Camera, Pencil, Sparkles, Clock, X, Check, Bell, Upload, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { trDate } from "@/lib/helpers";

export default function AddMedicinePage() {
  const router = useRouter();
  const [step, setStep] = useState<"choose" | "photo" | "form">("choose");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [expiryPreview, setExpiryPreview] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [expiryBase64, setExpiryBase64] = useState<string | null>(null);

  const coverRef = useRef<HTMLInputElement>(null);
  const expiryRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    activeIngredient: "",
    dosage: "1 tablet",
    expiryDate: "",
    quantity: 1,
    isActive: true,
    notes: "",
    times: ["08:00"],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addTime() {
    const t = prompt("Saat (örn. 08:00):", "12:00");
    if (t && /^\d{1,2}:\d{2}$/.test(t)) set("times", [...form.times, t]);
  }

  function removeTime(i: number) {
    set("times", form.times.filter((_, j) => j !== i));
  }

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "cover" | "expiry"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Dosya 10MB'dan küçük olmalı");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === "cover") {
        setCoverPreview(result);
        setCoverBase64(result);
      } else {
        setExpiryPreview(result);
        setExpiryBase64(result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function analyzePhotos() {
    if (!coverBase64 || !expiryBase64) {
      toast.error("Lütfen her iki fotoğrafı da yükleyin");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-medicine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverImage: coverBase64,
          expiryImage: expiryBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Analiz başarısız");
        setAnalyzing(false);
        return;
      }
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        activeIngredient: data.activeIngredient || f.activeIngredient,
        dosage: data.dosage || f.dosage,
        expiryDate: data.expiryDate || f.expiryDate,
        quantity: data.quantity || f.quantity,
      }));
      toast.success("Fotoğraflar analiz edildi — bilgiler dolduruldu");
      setStep("form");
    } catch {
      toast.error("Analiz sırasında bir hata oluştu");
    }
    setAnalyzing(false);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("İlaç adı gerekli");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Oturum bulunamadı");
      setSaving(false);
      return;
    }

    const { data: med, error: medError } = await supabase
      .from("medicines")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        active_ingredient: form.activeIngredient.trim() || null,
        dosage: form.dosage.trim() || null,
        expiry_date: form.expiryDate || null,
        quantity: form.quantity,
        is_active: form.isActive,
      })
      .select("id")
      .single();

    if (medError || !med) {
      toast.error("İlaç kaydedilemedi: " + (medError?.message || "Bilinmeyen hata"));
      setSaving(false);
      return;
    }

    if (form.times.length > 0) {
      const { error: schedError } = await supabase.from("schedules").insert({
        medicine_id: med.id,
        user_id: user.id,
        times: form.times,
        start_date: form.startDate,
        end_date: form.endDate || null,
        notes: form.notes.trim() || null,
      });
      if (schedError) {
        toast.error("Kullanım planı kaydedilemedi: " + schedError.message);
      }
    }

    toast.success(`${form.name} envantere eklendi`);
    setSaving(false);
    router.push("/dashboard/inventory");
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">Yeni İlaç Ekle</h1>
        <p className="text-muted-foreground text-base m-0">Kutunun fotoğrafını çekin veya bilgileri elle girin</p>
      </div>

      {/* Step: Choose */}
      {step === "choose" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] max-w-[880px]">
          <button
            onClick={() => setStep("photo")}
            className="text-left bg-card border border-border rounded-2xl p-8 hover:border-brand transition-colors"
          >
            <div className="w-14 h-14 rounded-[14px] bg-brand-soft text-brand-ink flex items-center justify-center mb-[18px]">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-xl m-0 mb-1.5">Fotoğrafla Ekle</h3>
            <p className="text-muted-foreground text-[15px] leading-relaxed m-0">
              İlaç kutusunun kapak ve SKT fotoğrafını çekin. Yapay zeka bilgileri otomatik okusun.
            </p>
            <div className="mt-[18px] inline-flex items-center gap-1.5 text-brand font-bold text-sm">
              <Sparkles className="w-3.5 h-3.5" /> Gemini AI ile analiz
            </div>
          </button>
          <button
            onClick={() => setStep("form")}
            className="text-left bg-card border border-border rounded-2xl p-8 hover:border-brand transition-colors"
          >
            <div className="w-14 h-14 rounded-[14px] bg-mint-soft text-mint-ink flex items-center justify-center mb-[18px]">
              <Pencil className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-xl m-0 mb-1.5">Elle Gir</h3>
            <p className="text-muted-foreground text-[15px] leading-relaxed m-0">
              İlaç bilgilerini, doz miktarını ve kullanım planını adım adım manuel olarak doldurun.
            </p>
          </button>
        </div>
      )}

      {/* Step: Photo */}
      {step === "photo" && (
        <div className="max-w-[780px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] mb-6">
            {/* Cover photo */}
            <div>
              <label className="text-sm font-bold text-muted-foreground mb-2 block">
                1. Kapak / Ön Yüz
              </label>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "cover")}
              />
              {coverPreview ? (
                <div className="relative rounded-[18px] overflow-hidden border-2 border-brand bg-secondary">
                  <img src={coverPreview} alt="Kapak" className="w-full h-[220px] object-cover" />
                  <button
                    onClick={() => { setCoverPreview(null); setCoverBase64(null); if (coverRef.current) coverRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    Kapak fotoğrafı
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => coverRef.current?.click()}
                  className="w-full h-[220px] border-2 border-dashed border-muted-foreground/30 rounded-[18px] bg-secondary hover:border-brand/50 transition-all flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-brand">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Kapak fotoğrafı</div>
                    <div className="text-xs text-muted-foreground">Tıkla veya kamerayla çek</div>
                  </div>
                </button>
              )}
            </div>

            {/* Expiry photo */}
            <div>
              <label className="text-sm font-bold text-muted-foreground mb-2 block">
                2. Son Kullanma Tarihi
              </label>
              <input
                ref={expiryRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "expiry")}
              />
              {expiryPreview ? (
                <div className="relative rounded-[18px] overflow-hidden border-2 border-brand bg-secondary">
                  <img src={expiryPreview} alt="SKT" className="w-full h-[220px] object-cover" />
                  <button
                    onClick={() => { setExpiryPreview(null); setExpiryBase64(null); if (expiryRef.current) expiryRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                    SKT fotoğrafı
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => expiryRef.current?.click()}
                  className="w-full h-[220px] border-2 border-dashed border-muted-foreground/30 rounded-[18px] bg-secondary hover:border-brand/50 transition-all flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-amber">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">SKT fotoğrafı</div>
                    <div className="text-xs text-muted-foreground">Tıkla veya kamerayla çek</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={analyzePhotos}
              disabled={analyzing || !coverBase64 || !expiryBase64}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analiz ediliyor…
                </>
              ) : (
                <>
                  <Sparkles className="w-[18px] h-[18px]" /> Fotoğrafları Analiz Et
                </>
              )}
            </button>
            <button
              onClick={() => setStep("form")}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors"
            >
              Elle Girmeye Geç
            </button>
            <button
              onClick={() => { setStep("choose"); setCoverPreview(null); setExpiryPreview(null); setCoverBase64(null); setExpiryBase64(null); }}
              className="ml-auto inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors"
            >
              Geri
            </button>
          </div>

          {/* Tips */}
          <div className="bg-brand-soft border border-[oklch(0.9_0.04_220)] rounded-2xl p-5 mt-6">
            <div className="flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-brand-ink shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">İpucu:</strong> İyi aydınlatılmış bir ortamda çekin.
                Birinci fotoğrafta ilaç adı ve etken madde, ikinci fotoğrafta son kullanma tarihi net görünmeli.
                Gemini AI bilgileri otomatik tanıyacak.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Form */}
      {step === "form" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start max-w-[1100px]">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-bold text-lg m-0 mb-[18px]">İlaç Bilgileri</h3>
            <div className="flex flex-col gap-2 mb-[18px]">
              <label className="text-sm font-bold text-muted-foreground">İlaç Adı *</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Örn. Parol 500mg"
                className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-3.5 mb-[18px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Etken Madde</label>
                <input type="text" value={form.activeIngredient} onChange={(e) => set("activeIngredient", e.target.value)} placeholder="Parasetamol 500mg"
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Doz</label>
                <input type="text" value={form.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="1 tablet"
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5 mb-[18px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Son Kullanım Tarihi</label>
                <input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Adet (kalan)</label>
                <input type="number" value={form.quantity} onChange={(e) => set("quantity", parseInt(e.target.value || "0", 10))} min={0}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all" />
              </div>
            </div>

            <h3 className="font-bold text-lg m-0 mb-[18px] mt-6 pt-6 border-t border-border">Kullanım Planı</h3>
            <div className="flex flex-col gap-2 mb-[18px]">
              <label className="text-sm font-bold text-muted-foreground">Günde alınacak saatler</label>
              <div className="flex flex-wrap gap-2.5 items-center">
                {form.times.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-brand-soft text-brand-ink rounded-full font-bold text-[15px]">
                    <Clock className="w-3.5 h-3.5" /> {t}
                    <button onClick={() => removeTime(i)} className="opacity-65 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
                <button onClick={addTime} className="px-4 py-2.5 border-[1.5px] border-dashed border-muted-foreground/40 rounded-full text-muted-foreground font-semibold text-sm hover:border-brand hover:text-brand transition-colors">
                  + Saat Ekle
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3.5 mb-[18px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Başlangıç</label>
                <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Bitiş (opsiyonel)</label>
                <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all" />
              </div>
            </div>
            <div className="flex flex-col gap-2 mb-[18px]">
              <label className="text-sm font-bold text-muted-foreground">Notlar</label>
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Örn. Yemeklerden 30 dakika önce alın"
                className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all resize-none" />
            </div>
            <div className="flex items-center gap-3 py-3.5 border-t border-border">
              <span className="font-semibold">Aktif kullanım</span>
              <button onClick={() => set("isActive", !form.isActive)}
                className={`relative w-[46px] h-[26px] rounded-full transition-colors ${form.isActive ? "bg-brand" : "bg-muted-foreground/30"}`}>
                <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-[left] ${form.isActive ? "left-[23px]" : "left-[3px]"}`} />
              </button>
              <span className="text-sm text-muted-foreground ml-auto">
                {form.isActive ? "Bu ilaç şu anda kullanılıyor" : "Sadece envantere ekle"}
              </span>
            </div>
            <div className="flex gap-2.5 mt-[18px] justify-end">
              <button onClick={() => setStep("choose")} className="px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors">İptal</button>
              <button onClick={submit} disabled={saving}
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors disabled:opacity-60">
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Check className="w-[18px] h-[18px]" /> Kaydet</>
                )}
              </button>
            </div>
          </div>

          {/* Preview sidebar */}
          <div className="flex flex-col gap-[18px]">
            {/* Photo previews if available */}
            {(coverPreview || expiryPreview) && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase mb-3.5">Yüklenen Fotoğraflar</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {coverPreview && (
                    <img src={coverPreview} alt="Kapak" className="w-full h-[100px] object-cover rounded-xl" />
                  )}
                  {expiryPreview && (
                    <img src={expiryPreview} alt="SKT" className="w-full h-[100px] object-cover rounded-xl" />
                  )}
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase mb-3.5">Önizleme</div>
              <div className="flex items-center gap-3.5 mb-3.5">
                <div className="w-14 h-14 rounded-[11px] bg-brand-soft text-brand-ink flex items-center justify-center font-extrabold text-xl shrink-0">
                  {(form.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-extrabold text-lg">{form.name || "İlaç adı"}</div>
                  <div className="text-sm text-muted-foreground">{form.activeIngredient || "Etken madde"}</div>
                </div>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2.5 text-sm">
                <span className="text-muted-foreground">Doz:</span>
                <span className="font-semibold">{form.dosage}</span>
                <span className="text-muted-foreground">Saatler:</span>
                <span className="font-semibold">{form.times.join(", ")}</span>
                <span className="text-muted-foreground">Adet:</span>
                <span className="font-semibold">{form.quantity}</span>
                <span className="text-muted-foreground">SKT:</span>
                <span className="font-semibold">{form.expiryDate && !isNaN(new Date(form.expiryDate).getTime()) ? trDate(new Date(form.expiryDate)) : "—"}</span>
                <span className="text-muted-foreground">Durum:</span>
                <span className={`font-semibold ${form.isActive ? "text-mint-ink" : "text-muted-foreground"}`}>
                  {form.isActive ? "Aktif kullanımda" : "Pasif"}
                </span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="text-[13px] font-bold tracking-widest text-muted-foreground uppercase mb-3.5">Hatırlatma</div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Bell className="w-[18px] h-[18px]" />
                Her doz saatinden 10 dakika önce bildirim alacaksınız.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
