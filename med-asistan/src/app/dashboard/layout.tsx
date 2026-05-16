import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName: string | null = null;
  let userEmail: string | null = null;

  if (user) {
    userEmail = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    userName = profile?.full_name ?? null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-screen">
      <Sidebar userName={userName} userEmail={userEmail} />
      <main className="min-w-0 w-full pt-14 md:pt-0 px-5 py-9 md:px-11 md:py-9">
        {children}
      </main>
    </div>
  );
}
