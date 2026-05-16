import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Gecersiz ilac kimligi" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Oturum bulunamadi" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase yonetici anahtari yapilandirilmamis" },
      { status: 500 }
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: medicine, error: medicineError } = await admin
    .from("medicines")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (medicineError || !medicine) {
    return NextResponse.json({ error: "Ilac bulunamadi" }, { status: 404 });
  }

  const { data: schedules, error: schedulesLoadError } = await admin
    .from("schedules")
    .select("id")
    .eq("medicine_id", id)
    .eq("user_id", user.id);

  if (schedulesLoadError) {
    return NextResponse.json(
      { error: `Kullanim plani okunamadi: ${schedulesLoadError.message}` },
      { status: 500 }
    );
  }

  const scheduleIds = schedules?.map((schedule) => schedule.id) ?? [];

  if (scheduleIds.length > 0) {
    const { error: doseLogsError } = await admin
      .from("dose_logs")
      .delete()
      .in("schedule_id", scheduleIds);

    if (doseLogsError && doseLogsError.code !== "PGRST205") {
      return NextResponse.json(
        { error: `Doz kayitlari silinemedi: ${doseLogsError.message}` },
        { status: 500 }
      );
    }
  }

  const { error: schedulesError } = await admin
    .from("schedules")
    .delete()
    .eq("medicine_id", id)
    .eq("user_id", user.id);

  if (schedulesError) {
    return NextResponse.json(
      { error: `Kullanim plani silinemedi: ${schedulesError.message}` },
      { status: 500 }
    );
  }

  const { error: medicineDeleteError } = await admin
    .from("medicines")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (medicineDeleteError) {
    return NextResponse.json(
      { error: `Ilac silinemedi: ${medicineDeleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
