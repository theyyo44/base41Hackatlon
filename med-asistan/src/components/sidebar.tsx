"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  CalendarDays,
  Bell,
  Heart,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type SidebarProps = {
  userName?: string | null;
  userEmail?: string | null;
  unreadCount?: number;
};

const navItems = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/dashboard/add-medicine", label: "İlaç Ekle", icon: PlusCircle },
  { href: "/dashboard/inventory", label: "Envanter", icon: List },
  { href: "/dashboard/schedule", label: "Takvim", icon: CalendarDays },
  { href: "/dashboard/notifications", label: "Bildirimler", icon: Bell },
];

export function Sidebar({ userName, userEmail, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = userName || "Kullanıcı";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Çıkış yapıldı");
    router.push("/");
  }

  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-md shadow-brand/30">
            <Heart className="w-[18px] h-[18px] text-white fill-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">MedAsistan</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-[280px] bg-card border-r border-border flex flex-col py-7 px-[18px] transition-transform duration-200",
          "md:translate-x-0 md:sticky",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-2.5 mb-1">
          <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center shadow-md shadow-brand/30">
            <Heart className="w-[22px] h-[22px] text-white fill-white" />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight leading-tight">MedAsistan</div>
            <div className="text-xs text-muted-foreground font-medium -mt-0.5">Ev İlaç Takip Sistemi</div>
          </div>
        </div>

        {/* Nav section label */}
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground/60 uppercase px-3 pt-5 pb-1.5">
          Menü
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 mt-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-base font-semibold transition-all",
                  isActive
                    ? "bg-brand-soft text-brand-ink"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute -left-[18px] top-2.5 bottom-2.5 w-1 rounded-r bg-brand" />
                )}
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.href === "/dashboard/notifications" && unreadCount > 0 ? (
                  <span className="ml-auto bg-rose text-white text-[11px] font-bold px-[7px] py-[2px] rounded-full min-w-[20px] text-center">
                    {unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="mt-auto border-t border-border pt-3.5 px-2 flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-mint to-brand text-white flex items-center justify-center font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground truncate">{userEmail || "Demo Hesap"}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </aside>
    </>
  );
}
