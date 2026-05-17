-- Supabase SQL Editor'da çalıştır
-- dose_logs tablosu: hasta ilaç aldığında kayıt tutar

CREATE TABLE IF NOT EXISTS dose_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medicine_id uuid REFERENCES medicines(id) ON DELETE CASCADE NOT NULL,
  schedule_time text NOT NULL,
  taken_at timestamptz DEFAULT now() NOT NULL,
  dose_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Aynı ilaç + aynı gün + aynı saat için tekrar kayıt olmasın
CREATE UNIQUE INDEX IF NOT EXISTS dose_logs_unique
ON dose_logs (user_id, medicine_id, schedule_time, dose_date);

-- RLS
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

-- Hasta kendi kayıtlarını okuyabilir/yazabilir
CREATE POLICY "Users can manage own dose_logs"
ON dose_logs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Doktor hastasının kayıtlarını okuyabilir
CREATE POLICY "Doctors can view patient dose_logs"
ON dose_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = dose_logs.user_id
    AND doctor_patients.status = 'active'
  )
);
