/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/database.types";

type Conversation = {
  patientId: string;
  patientName: string;
};

export default function DoctorMessagesPage() {
  const supabase = createClient();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.patientId === selectedPatientId) || null,
    [conversations, selectedPatientId]
  );

  const loadMessages = async (currentDoctorId: string, patientId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, doctor_id, patient_id, sender_id, message, attachment_url, attachment_path, attachment_name, attachment_type, read_at, created_at")
      .eq("doctor_id", currentDoctorId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Mesajlar alinamadi: " + error.message);
      return;
    }

    setMessages((data || []) as ChatMessage[]);
  };

  const markAsRead = async (currentDoctorId: string, patientId: string) => {
    await supabase
      .from("chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("doctor_id", currentDoctorId)
      .eq("patient_id", patientId)
      .neq("sender_id", currentDoctorId)
      .is("read_at", null);
  };

  const loadConversations = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setDoctorId(user.id);

    const { data: relations, error } = await supabase
      .from("doctor_patients")
      .select("patient_id")
      .eq("doctor_id", user.id)
      .eq("status", "active");

    if (error) {
      toast.error("Hasta listesi alinamadi: " + error.message);
      setLoading(false);
      return;
    }

    const patientIds = (relations || []).map((r) => r.patient_id).filter(Boolean);
    if (patientIds.length === 0) {
      setConversations([]);
      setSelectedPatientId(null);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", patientIds);

    const list = (profiles || []).map((p) => ({
      patientId: p.id,
      patientName: p.full_name || "Isimsiz Hasta",
    }));

    setConversations(list);
    setSelectedPatientId((prev) => prev || list[0]?.patientId || null);
    setLoading(false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !selectedFile) || !doctorId || !selectedPatientId) return;

    setUploading(true);

    let attachmentUrl: string | null = null;
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentType: string | null = null;

    if (selectedFile) {
      const ext = selectedFile.name.includes(".") ? selectedFile.name.split(".").pop() : "bin";
      const safeExt = ext?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
      const fileName = `${crypto.randomUUID()}.${safeExt}`;
      const path = `${doctorId}/${selectedPatientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("chat-files").upload(path, selectedFile, {
        contentType: selectedFile.type || "application/octet-stream",
        upsert: false,
      });

      if (uploadError) {
        toast.error("Dosya yuklenemedi: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: signed } = await supabase.storage.from("chat-files").createSignedUrl(path, 60 * 60 * 24 * 7);
      attachmentUrl = signed?.signedUrl || null;
      attachmentPath = path;
      attachmentName = selectedFile.name;
      attachmentType = selectedFile.type || "application/octet-stream";
    }

    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      doctor_id: doctorId,
      patient_id: selectedPatientId,
      sender_id: doctorId,
      message: trimmed || "Dosya gonderildi",
      attachment_url: attachmentUrl,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSelectedFile(null);

    const { error } = await supabase.from("chat_messages").insert({
      doctor_id: doctorId,
      patient_id: selectedPatientId,
      sender_id: doctorId,
      message: trimmed || "Dosya gonderildi",
      attachment_url: attachmentUrl,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
    });

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(trimmed);
      toast.error("Mesaj gonderilemedi: " + error.message);
    }
    setUploading(false);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (doctorId && selectedPatientId) {
      loadMessages(doctorId, selectedPatientId);
      markAsRead(doctorId, selectedPatientId);
    }
  }, [doctorId, selectedPatientId]);

  useEffect(() => {
    if (!doctorId || !selectedPatientId) return;

    const channel = supabase
      .channel(`doctor-chat-${doctorId}-${selectedPatientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (row.doctor_id === doctorId && row.patient_id === selectedPatientId) {
            setMessages((prev) => [...prev, row]);
            if (row.sender_id !== doctorId) {
              markAsRead(doctorId, selectedPatientId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, selectedPatientId, supabase]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Yukleniyor...</div>;
  }

  return (
    <div>
      <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none m-0 mb-6">Mesajlar</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 min-h-[620px]">
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-sm font-semibold text-muted-foreground px-2 py-2">Aktif Hastalar</div>
          <div className="flex flex-col gap-1">
            {conversations.length === 0 && <div className="p-3 text-sm text-muted-foreground">Aktif hasta yok.</div>}
            {conversations.map((c) => (
              <button
                key={c.patientId}
                onClick={() => setSelectedPatientId(c.patientId)}
                className={`text-left px-3 py-2.5 rounded-xl font-semibold transition-colors ${
                  selectedPatientId === c.patientId ? "bg-[oklch(0.95_0.04_165)] text-[oklch(0.35_0.12_165)]" : "hover:bg-secondary"
                }`}
              >
                {c.patientName}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="pb-3 border-b border-border font-bold">{selectedConversation?.patientName || "Sohbet secin"}</div>

          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 min-h-[420px]">
            {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Henuz mesaj yok.</div>}
            {messages.map((m) => {
              const mine = m.sender_id === doctorId;
              return (
                <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${mine ? "ml-auto bg-brand text-white" : "bg-secondary"}`}>
                  <div>{m.message}</div>
                  {m.attachment_url && (
                    m.attachment_type?.startsWith("image/") ? (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer">
                        <img src={m.attachment_url} alt={m.attachment_name || "Ek"} className="mt-2 rounded-lg max-h-48 object-cover" />
                      </a>
                    ) : (
                      <a href={m.attachment_url} target="_blank" rel="noreferrer" className={`mt-2 inline-flex items-center gap-1 underline ${mine ? "text-white" : "text-brand"}`}>
                        <Paperclip className="w-3.5 h-3.5" /> {m.attachment_name || "Dosyayi ac"}
                      </a>
                    )
                  )}
                  <div className={`text-[11px] mt-1 ${mine ? "text-white/80" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Mesajinizi yazin..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-[oklch(0.55_0.13_165)]"
              disabled={!selectedPatientId}
            />
            <label className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border cursor-pointer hover:bg-secondary">
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={!selectedPatientId || uploading}
              />
            </label>
            <button
              onClick={sendMessage}
              disabled={!selectedPatientId || (!text.trim() && !selectedFile) || uploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {uploading ? "Gonderiliyor" : "Gonder"}
            </button>
          </div>
          {selectedFile && <div className="text-xs text-muted-foreground mt-2">Secilen dosya: {selectedFile.name}</div>}
        </div>
      </div>
    </div>
  );
}


