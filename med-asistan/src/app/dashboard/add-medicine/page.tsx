"use client";

import { useState } from "react";
import { Camera, Pencil, Sparkles, Clock, X, Check, Bell } from "lucide-react";
import { toast } from "sonner";
import { trDate } from "@/lib/mock-data";

export default function AddMedicinePage() {
  const [step, setStep] = useState<"choose" | "photo" | "form">("choose");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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

  function fakeOCR() {
    setPhotoBusy(true);
    setTimeout(() => {
      setForm((f) => ({
        ...f,
        name: "Parol",
        activeIngredient: "Parasetamol 500mg",
        dosage: "1 tablet",
        expiryDate: "2026-12-15",
        quantity: 20,
      }));
      setPhotoBusy(false);
      setStep("form");
      toast.success("Fotoğraf analiz edildi — bilgiler dolduruldu");
    }, 1600);
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("İlaç adı gerekli");
      return;
    }
    toast.success(`${form.name} envantere eklendi`);
    setForm({
      name: "", activeIngredient: "", dosage: "1 tablet", expiryDate: "",
      quantity: 1, isActive: true, notes: "", times: ["08:00"],
      startDate: new Date().toISOString().slice(0, 10), endDate: "",
    });
    setStep("choose");
  }

  return (
    <div>
      {/* Topbar */}
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
              İlaç kutusunun fotoğrafını çekin. Yapay zeka isim, etken madde ve son kullanım tarihini otomatik okusun.
            </p>
            <div className="mt-[18px] inline-flex items-center gap-1.5 text-brand font-bold text-sm">
              <Sparkles className="w-3.5 h-3.5" /> Önerilen
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
        <div className="max-w-[720px]">
          <div
            className={`border-2 border-dashed rounded-[18px] p-9 text-center cursor-pointer transition-all ${
              dragOver ? "border-brand bg-brand-soft" : "border-muted-foreground/30 bg-secondary hover:border-brand/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); fakeOCR(); }}
            onClick={fakeOCR}
          >
            {photoBusy ? (
              <>
                <div className="w-[72px] h-[72px] rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-3.5 text-brand animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg m-0 mb-1.5">Fotoğraf analiz ediliyor…</h4>
                <p className="text-muted-foreground text-sm m-0">Yapay zeka kutunun üzerindeki bilgileri okuyor.</p>
              </>
            ) : (
              <>
                <div className="w-[72px] h-[72px] rounded-full bg-card border border-border flex items-center justify-center mx-auto mb-3.5 text-brand">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg m-0 mb-1.5">Fotoğraf çekin veya yükleyin</h4>
                <p className="text-muted-foreground text-sm m-0">
                  Sürükle-bırak yapabilir veya tıklayarak seçebilirsiniz.<br />JPG, PNG · Max 10 MB
                </p>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-5 flex-wrap">
            <button onClick={fakeOCR} disabled={photoBusy} className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors disabled:opacity-50">
              <Camera className="w-[18px] h-[18px]" /> Kameradan Çek
            </button>
            <button onClick={() => setStep("form")} className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors">
              Elle Girmeye Geç
            </button>
            <button onClick={() => setStep("choose")} className="ml-auto inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors">
              Geri
            </button>
          </div>

          <div className="bg-brand-soft border border-[oklch(0.9_0.04_220)] rounded-2xl p-5 mt-6">
            <div className="flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-brand-ink shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">İpucu:</strong> Kutuyu iyi aydınlatılmış bir alana koyun ve yazıların net görünmesine dikkat edin. Sistem ilaç adı, etken madde, dozaj ve SKT bilgilerini otomatik tanır.
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
              <input
                type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="Örn. Parol 500mg"
                className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-[18px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Etken Madde</label>
                <input
                  type="text" value={form.activeIngredient} onChange={(e) => set("activeIngredient", e.target.value)}
                  placeholder="Parasetamol 500mg"
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Doz</label>
                <input
                  type="text" value={form.dosage} onChange={(e) => set("dosage", e.target.value)}
                  placeholder="1 tablet"
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mb-[18px]">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Son Kullanım Tarihi</label>
                <input
                  type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-muted-foreground">Adet (kalan)</label>
                <input
                  type="number" value={form.quantity} onChange={(e) => set("quantity", parseInt(e.target.value || "0", 10))}
                  min={0}
                  className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all"
                />
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
              <textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)}
                placeholder="Örn. Yemeklerden 30 dakika önce alın"
                className="px-4 py-3 border-[1.5px] border-border rounded-xl bg-card text-base outline-none focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all resize-none" />
            </div>

            <div className="flex items-center gap-3 py-3.5 border-t border-border">
              <span className="font-semibold">Aktif kullanım</span>
              <button
                onClick={() => set("isActive", !form.isActive)}
                className={`relative w-[46px] h-[26px] rounded-full transition-colors ${form.isActive ? "bg-brand" : "bg-muted-foreground/30"}`}
              >
                <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-[left] ${form.isActive ? "left-[23px]" : "left-[3px]"}`} />
              </button>
              <span className="text-sm text-muted-foreground ml-auto">
                {form.isActive ? "Bu ilaç şu anda kullanılıyor" : "Sadece envantere ekle"}
              </span>
            </div>

            <div className="flex gap-2.5 mt-[18px] justify-end">
              <button onClick={() => setStep("choose")} className="px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors">İptal</button>
              <button onClick={submit} className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-brand text-white font-bold shadow-md shadow-brand/30 hover:bg-brand-2 transition-colors">
                <Check className="w-[18px] h-[18px]" /> Kaydet
              </button>
            </div>
          </div>

          {/* Preview sidebar */}
          <div className="flex flex-col gap-[18px]">
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
                <span className="font-semibold">{form.expiryDate ? trDate(new Date(form.expiryDate)) : "—"}</span>
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
