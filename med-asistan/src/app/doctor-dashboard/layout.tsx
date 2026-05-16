import { DoctorSidebar } from "@/components/doctor/doctor-sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "doctor") redirect("/dashboard");

  const { data: doctorProfile } = await supabase
    .from("doctor_profiles")
    .select("specialty")
    .eq("id", user.id)
    .single();

  if (!doctorProfile) redirect("/doctor-onboarding");

  const doctorName = profile?.role === "doctor"
    ? (await supabase.from("profiles").select("full_name").eq("id", user.id).single()).data?.full_name
    : null;

  const { count: pendingInvites } = await supabase
    .from("doctor_patients")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", user.id)
    .eq("status", "pending");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-screen">
      <DoctorSidebar
        doctorName={doctorName || null}
        specialty={doctorProfile.specialty}
        pendingInvites={pendingInvites ?? 0}
      />
      <main className="min-w-0 w-full pt-14 md:pt-0 px-5 py-9 md:px-11 md:py-9">
        {children}
      </main>
    </div>
  );
}
