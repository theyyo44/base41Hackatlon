-- MedAsistan: Doctor System Migration
-- Run this in Supabase SQL Editor

-- 1. Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'patient';

-- 2. Add prescribed_by column to medicines
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS prescribed_by uuid REFERENCES auth.users;

-- 3. Create doctor_notes table
CREATE TABLE IF NOT EXISTS doctor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES auth.users NOT NULL,
  patient_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now()
);

ALTER TABLE doctor_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doktor kendi notlarını yönetir" ON doctor_notes
  FOR ALL USING (auth.uid() = doctor_id);

-- 4. Create doctor_profiles table if not exists
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  title text DEFAULT 'Dr.',
  full_name text NOT NULL,
  specialty text NOT NULL,
  hospital text,
  license_no text UNIQUE NOT NULL,
  phone text,
  bio text,
  is_verified boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doktor kendi profilini yönet" ON doctor_profiles
  FOR ALL USING (auth.uid() = id);

-- 5. Create doctor_patients table if not exists
CREATE TABLE IF NOT EXISTS doctor_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES auth.users NOT NULL,
  patient_id uuid REFERENCES auth.users,
  invited_email text NOT NULL,
  invitation_note text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked')),
  sent_at timestamp DEFAULT now(),
  responded_at timestamp,
  UNIQUE(doctor_id, invited_email)
);

ALTER TABLE doctor_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doktor kendi hastalarını görür" ON doctor_patients
  FOR SELECT USING (auth.uid() = doctor_id OR auth.uid() = patient_id);
CREATE POLICY "Doktor davet gönderebilir" ON doctor_patients
  FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Hasta daveti kabul/red edebilir" ON doctor_patients
  FOR UPDATE USING (auth.uid() = patient_id);
CREATE POLICY "Doktor daveti iptal edebilir" ON doctor_patients
  FOR DELETE USING (auth.uid() = doctor_id);

-- 6. Allow doctors to read their active patients' medicines and schedules
-- (skip if already exists)
DO $$ BEGIN
  CREATE POLICY "Doktor bağlı hastalarının ilaçlarını okur" ON medicines
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM doctor_patients dp
        WHERE dp.doctor_id = auth.uid()
          AND dp.patient_id = medicines.user_id
          AND dp.status = 'accepted'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Doktor bağlı hastalarının planlarını okur" ON schedules
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM doctor_patients dp
        WHERE dp.doctor_id = auth.uid()
          AND dp.patient_id = schedules.user_id
          AND dp.status = 'accepted'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Allow doctors to insert medicines for their active patients
DO $$ BEGIN
  CREATE POLICY "Doktor hastasına ilaç ekleyebilir" ON medicines
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM doctor_patients dp
        WHERE dp.doctor_id = auth.uid()
          AND dp.patient_id = medicines.user_id
          AND dp.status = 'accepted'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Doktor hastasına plan ekleyebilir" ON schedules
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM doctor_patients dp
        WHERE dp.doctor_id = auth.uid()
          AND dp.patient_id = schedules.user_id
          AND dp.status = 'accepted'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Allow doctors to read their active patients' profiles
DO $$ BEGIN
  CREATE POLICY "Doktor bağlı hastalarının profilini okur" ON profiles
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM doctor_patients dp
        WHERE dp.doctor_id = auth.uid()
          AND dp.patient_id = profiles.id
          AND dp.status = 'accepted'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Allow profiles insert for new users
DO $$ BEGIN
  CREATE POLICY "Kendi profilini oluştur" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
