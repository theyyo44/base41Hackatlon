-- MedAsistan: Doctor-Patient Messaging
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES auth.users NOT NULL,
  patient_id uuid REFERENCES auth.users NOT NULL,
  sender_id uuid REFERENCES auth.users NOT NULL,
  message text NOT NULL CHECK (char_length(trim(message)) > 0),
  attachment_url text,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  read_at timestamp,
  created_at timestamp DEFAULT now()
);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_path text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_type text;

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON chat_messages (doctor_id, patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread
  ON chat_messages (doctor_id, patient_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "chat_select_participants_only" ON chat_messages
    FOR SELECT USING (auth.uid() = doctor_id OR auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "chat_insert_active_relation_only" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert_linked_relation_only" ON chat_messages;
CREATE POLICY "chat_insert_linked_relation_only" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = doctor_id
      OR auth.uid() = patient_id
    )
    AND EXISTS (
      SELECT 1
      FROM doctor_patients dp
      WHERE dp.doctor_id = chat_messages.doctor_id
        AND dp.patient_id = chat_messages.patient_id
        AND dp.status IN ('active', 'accepted')
    )
  );

DO $$ BEGIN
  CREATE POLICY "chat_update_read_at_receiver_only" ON chat_messages
    FOR UPDATE USING (
      (auth.uid() = doctor_id OR auth.uid() = patient_id)
      AND auth.uid() <> sender_id
    )
    WITH CHECK (
      (auth.uid() = doctor_id OR auth.uid() = patient_id)
      AND auth.uid() <> sender_id
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow patients to read connected active doctors' profile names
DO $$ BEGIN
  CREATE POLICY "Hasta bagli doktor profilini okur" ON profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1
        FROM doctor_patients dp
        WHERE dp.patient_id = auth.uid()
          AND dp.doctor_id = profiles.id
          AND dp.status IN ('active', 'accepted')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Chat file bucket and access rules
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Chat participants can read files" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'chat-files'
      AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR EXISTS (
          SELECT 1
          FROM doctor_patients dp
          WHERE dp.status IN ('active', 'accepted')
            AND (
              (dp.doctor_id = auth.uid() AND dp.patient_id::text = split_part(name, '/', 1))
              OR (dp.patient_id = auth.uid() AND dp.doctor_id::text = split_part(name, '/', 1))
            )
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Chat participants can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'chat-files'
      AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR split_part(name, '/', 2) = auth.uid()::text
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
