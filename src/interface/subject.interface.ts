export interface subjectFields {
    subject_id?: bigint;
    learning_area_id?: bigint;
    subject_code?: string;
    name_th?: string;
    name_en?: string;
    credit?: number;
    hour_per_week?: number;
    flag_valid?: boolean;
    inst_id?: number
    offset?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';

    keyword?: string;

    // created_at?: string;
    // updated_at?: string;

    // inst_name_th?: string;
    // inst_name_en?: string;

    // learning_area_name?: string

    // semester_id?: number
    // semester?: string
    // start_date?: Date
    // end_date?: Date
}