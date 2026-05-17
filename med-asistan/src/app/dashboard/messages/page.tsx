/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/database.types";

type Conversation = {
  doctorId: string;
  doctorName: string;
};

export default function PatientMessagesPage() {
  const supabase = createClient();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.doctorId === selectedDoctorId) || null,
    [conversations, selectedDoctorId]
  );

  const loadMessages = async (currentPatientId: string, doctorId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, doctor_id, patient_id, sender_id, message, attachment_url, attachment_path, attachment_name, attachment_type, read_at, created_at")
      .eq("doctor_id", doctorId)
      .eq("patient_id", currentPatientId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Mesajlar alinamadi: " + error.message);
      return;
    }

    setMessages((data || []) as ChatMessage[]);
  };

  const markAsRead = async (currentPatientId: string, doctorId: string) => {
    await supabase
      .from("chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("doctor_id", doctorId)
      .eq("patient_id", currentPatientId)
      .neq("sender_id", currentPatientId)
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
    setPatientId(user.id);

    const { data: relations, error } = await supabase
      .from("doctor_patients")
      .select("doctor_id")
      .eq("patient_id", user.id)
      .eq("status", "active");

    if (error) {
      toast.error("Doktor listesi alinamadi: " + error.message);
      setLoading(false);
      return;
    }

    const doctorIds = Array.from(new Set((relations || []).map((r) => r.doctor_id).filter(Boolean)));
    if (doctorIds.length === 0) {
      setConversations([]);
      setSelectedDoctorId(null);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", doctorIds);

    const nameMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));
    const list = doctorIds.map((id) => ({
      doctorId: id,
      doctorName: nameMap.get(id) ? `Dr. ${nameMap.get(id)}` : "Doktor",
    }));

    setConversations(list);
    setSelectedDoctorId((prev) => prev || list[0]?.doctorId || null);
    setLoading(false);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !selectedFile) || !patientId || !selectedDoctorId) return;

    setUploading(true);

    let attachmentUrl: string | null = null;
    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentType: string | null = null;

    if (selectedFile) {
      const ext = selectedFile.name.includes(".") ? selectedFile.name.split(".").pop() : "bin";
      const safeExt = ext?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
      const fileName = `${crypto.randomUUID()}.${safeExt}`;
      const path = `${patientId}/${selectedDoctorId}/${fileName}`;

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

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      doctor_id: selectedDoctorId,
      patient_id: patientId,
      sender_id: patientId,
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
      doctor_id: selectedDoctorId,
      patient_id: patientId,
      sender_id: patientId,
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
    if (patientId && selectedDoctorId) {
      loadMessages(patientId, selectedDoctorId);
      markAsRead(patientId, selectedDoctorId);
    }
  }, [patientId, selectedDoctorId]);

  useEffect(() => {
    if (!patientId || !selectedDoctorId) return;

    const channel = supabase
      .channel(`patient-chat-${patientId}-${selectedDoctorId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (row.patient_id === patientId && row.doctor_id === selectedDoctorId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              const cleaned = row.sender_id === patientId
                ? prev.filter((m) => !m.id.startsWith("temp-") || m.message !== row.message)
                : prev;
              return [...cleaned, row];
            });
            if (row.sender_id !== patientId) {
              markAsRead(patientId, selectedDoctorId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, selectedDoctorId, supabase]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Yukleniyor...</div>;
  }

  return (
    <div>
      <h1 className="text-[32px] font-extrabold tracking-[-0.02em] leading-none m-0 mb-6">Mesajlar</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 min-h-[620px]">
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-sm font-semibold text-muted-foreground px-2 py-2">Doktorlarim</div>
          <div className="flex flex-col gap-1">
            {conversations.length === 0 && <div className="p-3 text-sm text-muted-foreground">Aktif doktor baglantisi yok.</div>}
            {conversations.map((c) => (
              <button
                key={c.doctorId}
                onClick={() => setSelectedDoctorId(c.doctorId)}
                className={`text-left px-3 py-2.5 rounded-xl font-semibold transition-colors ${
                  selectedDoctorId === c.doctorId ? "bg-brand-soft text-brand-ink" : "hover:bg-secondary"
                }`}
              >
                {c.doctorName}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="pb-3 border-b border-border font-bold">{selectedConversation?.doctorName || "Sohbet secin"}</div>

          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 min-h-[420px]">
            {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Henuz mesaj yok.</div>}
            {messages.map((m) => {
              const mine = m.sender_id === patientId;
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
                    {new Date(m.created_at + (m.created_at.endsWith("Z") || m.created_at.includes("+") ? "" : "Z")).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
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
              className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background outline-none focus:border-brand"
              disabled={!selectedDoctorId}
            />
            <label className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border cursor-pointer hover:bg-secondary">
              <Paperclip className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={!selectedDoctorId || uploading}
              />
            </label>
            <button
              onClick={sendMessage}
              disabled={!selectedDoctorId || (!text.trim() && !selectedFile) || uploading}
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


