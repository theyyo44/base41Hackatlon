"use server";

import { createClient } from "@/lib/supabase/server";

export async function findPatientByEmail(email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadi" };

  const trimmedEmail = email.trim().toLowerCase();

  // Try RPC function first (searches auth.users too)
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc("find_user_by_email", { lookup_email: trimmedEmail });

  if (!rpcError && rpcResult && rpcResult.length > 0) {
    return { patientId: rpcResult[0].user_id, name: rpcResult[0].user_name };
  }

  // Fallback: direct profiles search
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", trimmedEmail)
    .single();

  if (profile) return { patientId: profile.id, name: profile.full_name };

  return { error: "Bu e-posta ile kayitli hasta bulunamadi. Hastanin uygulamaya kayit olmasi gerekiyor." };
}

export async function sendDoctorInvite(patientId: string, note: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadi" };

  const { error } = await supabase.from("doctor_patients").insert({
    doctor_id: user.id,
    patient_id: patientId,
    status: "pending",
    notes: note.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "Bu hastaya zaten davet gonderilmis." };
    return { error: "Davet gonderilemedi: " + error.message };
  }

  return { success: true };
}
