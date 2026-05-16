export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  created_at: string;
};

export type Medicine = {
  id: string;
  user_id: string;
  name: string;
  active_ingredient: string | null;
  dosage: string | null;
  expiry_date: string | null;
  quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type Schedule = {
  id: string;
  medicine_id: string;
  user_id: string;
  times: string[];
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
};
