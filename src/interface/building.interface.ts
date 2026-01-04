export interface buildingFields {
    building_id?: number;
    inst_id: number;
    building_name?: string;
    building_no?: string;
    room_format?: string;
    room_remark?: string;

    room_location_id?: number;
    room_number?: string;
    floor?: string;
    remark?: string;
    flag_valid?: boolean;

    offset?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}