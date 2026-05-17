-- Supabase SQL Editor'da çalıştır
-- Doktorların kendi hastalarının verilerini görebilmesi için RLS politikaları
-- doctor_patients tablosundaki aktif ilişkilere dayanır

-- Önce varsa eski politikaları düşür
DROP POLICY IF EXISTS "Doctors can view their patients profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can view patient medicines" ON medicines;
DROP POLICY IF EXISTS "Doctors can view patient schedules" ON schedules;
DROP POLICY IF EXISTS "Doctors can view patient dose_logs" ON dose_logs;

-- 1) PROFILES
CREATE POLICY "Doctors can view their patients profiles"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = profiles.id
    AND doctor_patients.status = 'active'
  )
);

-- 2) MEDICINES
CREATE POLICY "Doctors can view patient medicines"
ON medicines FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = medicines.user_id
    AND doctor_patients.status = 'active'
  )
);

-- 3) SCHEDULES
CREATE POLICY "Doctors can view patient schedules"
ON schedules FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = schedules.user_id
    AND doctor_patients.status = 'active'
  )
);

-- 4) DOSE_LOGS - okuma
CREATE POLICY "Doctors can view patient dose_logs"
ON dose_logs FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = dose_logs.user_id
    AND doctor_patients.status = 'active'
  )
);

-- =============================================
-- YAZMA POLİTİKALARI (doktor reçete yazarken)
-- =============================================

-- 5) MEDICINES - doktor hastasına ilaç ekleyebilsin
DROP POLICY IF EXISTS "Doctors can insert patient medicines" ON medicines;
CREATE POLICY "Doctors can insert patient medicines"
ON medicines FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = medicines.user_id
    AND doctor_patients.status = 'active'
  )
);

-- 6) SCHEDULES - doktor hastasına program ekleyebilsin
DROP POLICY IF EXISTS "Doctors can insert patient schedules" ON schedules;
CREATE POLICY "Doctors can insert patient schedules"
ON schedules FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = schedules.user_id
    AND doctor_patients.status = 'active'
  )
);

-- 7) DOSE_LOGS - doktor hastası için doz kaydı oluşturabilsin
DROP POLICY IF EXISTS "Doctors can insert patient dose_logs" ON dose_logs;
CREATE POLICY "Doctors can insert patient dose_logs"
ON dose_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = dose_logs.user_id
    AND doctor_patients.status = 'active'
  )
);

-- =============================================
-- GÜNCELLEME POLİTİKALARI (doktor ilaç düzenlerken)
-- =============================================

-- 8) MEDICINES - doktor hastasının ilacını güncelleyebilsin
DROP POLICY IF EXISTS "Doctors can update patient medicines" ON medicines;
CREATE POLICY "Doctors can update patient medicines"
ON medicines FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = medicines.user_id
    AND doctor_patients.status = 'active'
  )
);

-- 9) SCHEDULES - doktor hastasının programını güncelleyebilsin
DROP POLICY IF EXISTS "Doctors can update patient schedules" ON schedules;
CREATE POLICY "Doctors can update patient schedules"
ON schedules FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = schedules.user_id
    AND doctor_patients.status = 'active'
  )
);
