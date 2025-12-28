export interface sectionFields {
    section_id?: number;
    subject_id?: number;
    semester_id?: number;
    section_name?: string;
    flag_valid?: boolean;

    schedule_id?: number;
    day_of_week?: number;
    start_time?: Date;
    end_time?: Date;
    room_location_id?: number;

    user_sys_id?: number;

    role_id? : number;
    role_name?: string;
    role_type?: string;

    position?: string;
}