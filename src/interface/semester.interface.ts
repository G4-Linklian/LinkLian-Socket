export interface semesterFields {
    semester_id?: number
    inst_id?: number
    semester?: string
    start_date?: Date
    end_date?: Date
    flag_valid?: boolean
    status?: string
    offset?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';

    subject_id?: number;
}