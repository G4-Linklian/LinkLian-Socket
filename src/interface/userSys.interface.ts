export interface UserSysFields {
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
  inst_id?: number;
  flag_valid?: boolean;
  status?: string;
  profile_pic?: string | null;
  created_at?: string;
  updated_at?: string;
}