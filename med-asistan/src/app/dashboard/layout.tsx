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
  let unreadCount = 0;

  if (user) {
    userEmail = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    userName = profile?.full_name ?? user.user_metadata?.full_name ?? null;

    if (profile && !profile.email && user.email) {
      await supabase
        .from("profiles")
        .update({ email: user.email })
        .eq("id", user.id);
    }

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    unreadCount = count ?? 0;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-screen">
      <Sidebar userName={userName} userEmail={userEmail} unreadCount={unreadCount} />
      <main className="min-w-0 w-full pt-14 md:pt-0 px-5 py-9 md:px-11 md:py-9">
        {children}
      </main>
    </div>
  );
}
