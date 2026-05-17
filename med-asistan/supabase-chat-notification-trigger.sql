-- Mesaj geldiginde otomatik bildirim olusturma trigger'i
-- Supabase SQL Editor'da calistirin

-- Realtime icin chat_messages tablosunu ekle
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Timestamp kolonunu timestamptz yap (saat dilimi sorunu icin)
ALTER TABLE chat_messages ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE chat_messages ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE chat_messages ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE 'UTC';

-- Mesaj geldiginde bildirim olusturan fonksiyon
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id UUID;
BEGIN
  -- Alici kim? Gonderen doktorsa alici hasta, gonderenasta alici doktor
  IF NEW.sender_id = NEW.doctor_id THEN
    receiver_id := NEW.patient_id;
  ELSE
    receiver_id := NEW.doctor_id;
  END IF;

  -- Gonderen ismini al
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Bildirim olustur
  INSERT INTO notifications (user_id, type, title, message, is_read)
  VALUES (
    receiver_id,
    'message',
    'Yeni mesaj: ' || COALESCE(sender_name, 'Bilinmeyen'),
    LEFT(NEW.message, 100),
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'i olustur
DROP TRIGGER IF EXISTS on_new_chat_message ON chat_messages;
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();
