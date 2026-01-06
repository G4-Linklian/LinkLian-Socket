export interface programFields {
    program_id?: number;
    inst_id?: number;
    program_name?: string;
    program_type?: string;
    parent_id?: number;
    remark?: string;
    flag_valid?: boolean;
    created_at?: string;
    updated_at?: string;
    tree_type?: string | "root" | "twig" | "leaf";
    children_count?: boolean;
    total_count?: number;
    inst_type?: string;
    offset?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    parent_ids?: number;
    keyword?: string;
    user_sys_id?: number;
}