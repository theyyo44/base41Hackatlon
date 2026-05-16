"use client";

import { useState } from "react";
import { Pill, AlertTriangle, Clock, Sparkles, Check } from "lucide-react";
import { mockNotifications, type Notification } from "@/lib/mock-data";
import { toast } from "sonner";

const iconMap = {
  pill: Pill,
  warn: AlertTriangle,
  clock: Clock,
  spark: Sparkles,
  check: Check,
};

const colorMap = {
  blue: "bg-brand-soft text-brand-ink",
  amber: "bg-amber-soft text-amber-ink",
  rose: "bg-rose-soft text-rose-ink",
  mint: "bg-mint-soft text-mint-ink",
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(mockNotifications);
  const unread = notifs.filter((n) => n.unread).length;

  function markAllRead() {
    setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
    toast.success("Tüm bildirimler okundu sayıldı");
  }

  function markOneRead(id: string) {
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }

  return (
    <div>
      {/* Topbar */}
      <div className="flex items-center justify-between mb-7 gap-6">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">Bildirimler</h1>
          <p className="text-muted-foreground text-base m-0">
            {unread ? `${unread} okunmamış bildirim var` : "Tüm bildirimler okundu"}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors">
            Tümünü okundu say
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex flex-col gap-2.5">
        {notifs.map((n) => {
          const Icon = iconMap[n.icon];
          return (
            <button
              key={n.id}
              onClick={() => markOneRead(n.id)}
              className={`w-full text-left flex items-start gap-3.5 px-[18px] py-4 rounded-[14px] border transition-all ${
                n.unread
                  ? "bg-brand-soft border-[oklch(0.88_0.05_220)]"
                  : "bg-card border-border"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorMap[n.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base m-0 mb-1">{n.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed m-0">{n.message}</p>
                <div className="text-xs text-muted-foreground font-semibold mt-1.5">{n.time}</div>
              </div>
              {n.unread && (
                <div className="w-[9px] h-[9px] rounded-full bg-brand shrink-0 mt-1.5 ml-auto" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
