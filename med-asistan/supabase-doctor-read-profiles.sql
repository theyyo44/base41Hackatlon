-- Supabase SQL Editor'da çalıştır
-- Doktorların kendi hastalarının profillerini görebilmesi için RLS policy

CREATE POLICY "Doctors can view their patients profiles"
ON profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = profiles.id
  )
);
