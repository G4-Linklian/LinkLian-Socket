export interface CreateUserPayload {
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  phone?: string | null;
  role_id: number;
  code: string;
  edu_lev_id: number;
  institution_id: number;
  last_login?: string | null;
}

export interface UserFields {
  user_sys_id?: number;
  email?: string;
  password?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  phone?: string | null;
  role_id?: number;
  code?: string;
  edu_lev_id?: number;
  institution_id?: number;
  flag_valid?: boolean;
  created_at?: string;
  updated_at?: string;
}
