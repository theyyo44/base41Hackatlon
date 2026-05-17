"use client";

import { useState, useEffect } from "react";
import { Bell, Loader2, Stethoscope, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
};

type DoctorInvite = {
  id: string;
  doctorName: string;
  note: string | null;
  invited_at: string;
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return d.toLocaleDateString("tr-TR");
}

function typeColor(type: string): string {
  switch (type) {
    case "dose": return "bg-brand-soft text-brand-ink";
    case "expiry": return "bg-amber-soft text-amber-ink";
    case "stock": return "bg-rose-soft text-rose-ink";
    default: return "bg-mint-soft text-mint-ink";
  }
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [invites, setInvites] = useState<DoctorInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const unread = notifs.filter((n) => !n.is_read).length;

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setNotifs(data);

      // Fetch pending doctor invites
      const { data: pendingInvites } = await supabase
        .from("doctor_patients")
        .select("id, doctor_id, notes, invited_at")
        .eq("patient_id", user.id)
        .eq("status", "pending");

      if (pendingInvites && pendingInvites.length > 0) {
        const doctorIds = pendingInvites.map((i) => i.doctor_id);
        const { data: doctors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", doctorIds);
        const doctorMap = new Map(
          (doctors || []).map((d) => [d.id, d.full_name || "Doktor"])
        );
        setInvites(
          pendingInvites.map((i) => ({
            id: i.id,
            doctorName: `Dr. ${doctorMap.get(i.doctor_id) || "Doktor"}`,
            note: i.notes,
            invited_at: i.invited_at,
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, []);

  async function respondInvite(inviteId: string, accept: boolean) {
    const supabase = createClient();
    const { error } = await supabase
      .from("doctor_patients")
      .update({
        status: accept ? "active" : "ended",
        accepted_at: accept ? new Date().toISOString() : null,
        ended_at: accept ? null : new Date().toISOString(),
      })
      .eq("id", inviteId);
    if (error) {
      toast.error("İşlem başarısız: " + error.message);
      return;
    }
    toast.success(accept ? "Davet kabul edildi!" : "Davet reddedildi.");
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }

  async function markAllRead() {
    const supabase = createClient();
    const unreadIds = notifs.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    if (error) {
      toast.error("Güncelleme başarısız");
      return;
    }
    setNotifs((ns) => ns.map((n) => ({ ...n, is_read: true })));
    toast.success("Tüm bildirimler okundu sayıldı");
  }

  async function markOneRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  const totalUnread = unread + invites.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-7 gap-6">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight m-0 mb-1">Bildirimler</h1>
          <p className="text-muted-foreground text-base m-0">
            {totalUnread ? `${totalUnread} okunmamış bildirim var` : "Tüm bildirimler okundu"}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="px-5 py-3 rounded-xl bg-card border border-border font-bold hover:bg-secondary transition-colors">
            Tümünü okundu say
          </button>
        )}
      </div>

      {/* Doctor invites */}
      {invites.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center gap-4 px-[18px] py-4 rounded-[14px] border bg-gradient-to-r from-[oklch(0.95_0.04_165)] to-[oklch(0.96_0.03_200)] border-[oklch(0.88_0.06_165)]"
            >
              <div className="w-11 h-11 rounded-xl bg-[oklch(0.55_0.13_165)] text-white flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <h4 className="font-bold text-base m-0">{inv.doctorName} sizi izlemek istiyor</h4>
                {inv.note && (
                  <p className="text-muted-foreground text-sm leading-snug m-0 mt-0.5">{inv.note}</p>
                )}
                <div className="text-xs text-muted-foreground font-semibold mt-1">{timeAgo(inv.invited_at)}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => respondInvite(inv.id, true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[oklch(0.55_0.13_165)] text-white font-bold text-sm hover:opacity-90 transition-all"
                >
                  <Check className="w-4 h-4" /> Kabul Et
                </button>
                <button
                  onClick={() => respondInvite(inv.id, false)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border font-bold text-sm hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" /> Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifs.length === 0 && invites.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Henüz bildirim yok</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notifs.map((n) => (
            <button
              key={n.id}
              onClick={() => markOneRead(n.id)}
              className={`w-full text-left flex items-start gap-3.5 px-[18px] py-4 rounded-[14px] border transition-all ${
                !n.is_read
                  ? "bg-brand-soft border-[oklch(0.88_0.05_220)]"
                  : "bg-card border-border"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${typeColor(n.type)}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-base m-0 mb-1">{n.title}</h4>
                {n.message && <p className="text-muted-foreground text-sm leading-relaxed m-0">{n.message}</p>}
                <div className="text-xs text-muted-foreground font-semibold mt-1.5">{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && (
                <div className="w-[9px] h-[9px] rounded-full bg-brand shrink-0 mt-1.5 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
