"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DoctorProfilePage() {
  const [doctor, setDoctor] = useState<{
    full_name: string;
    specialty: string;
    hospital: string | null;
    license_no: string;
    bio: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const { data: dp } = await supabase
      .from("doctor_profiles")
      .select("specialty, hospital, license_no, bio")
      .eq("id", user.id)
      .single();

    if (prof && dp) {
      setDoctor({
        full_name: prof.full_name || "Doktor",
        specialty: dp.specialty || "",
        hospital: dp.hospital,
        license_no: dp.license_no || "",
        bio: dp.bio,
      });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-[3px] border-[oklch(0.55_0.13_165)]/30 border-t-[oklch(0.55_0.13_165)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!doctor) return null;

  const rows = [
    ["Ad Soyad", doctor.full_name],
    ["Uzmanlık", doctor.specialty],
    ["Hastane", doctor.hospital || "—"],
    ["Lisans No", doctor.license_no],
  ];

  return (
    <div>
      {/* Topbar */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none m-0 mb-1">
            Profil
          </h1>
          <p className="text-[oklch(0.58_0.018_245)] text-base m-0">
            Mesleki bilgileriniz ve hesap ayarları
          </p>
        </div>
      </div>

      <div className="max-w-[720px] flex flex-col gap-[18px]">
        {/* Professional info card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold tracking-[-0.01em] m-0 mb-4">Mesleki Bilgiler</h3>
          <div className="grid gap-y-3.5 gap-x-6 text-[15px]" style={{ gridTemplateColumns: "auto 1fr", rowGap: 14, columnGap: 24 }}>
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <span className="text-[oklch(0.58_0.018_245)] font-semibold">{label}</span>
                <span className="font-bold" style={label === "Lisans No" ? { fontFamily: "ui-monospace, 'SF Mono', monospace" } : undefined}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bio card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold tracking-[-0.01em] m-0 mb-4">Hakkımda</h3>
          <p className="text-[oklch(0.42_0.022_245)] leading-relaxed m-0">
            {doctor.bio || "Henüz biyografi eklenmemiş."}
          </p>
        </div>
      </div>
    </div>
  );
}
