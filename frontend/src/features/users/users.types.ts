export interface User {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    user_type: 'Admin' | 'Member' | 'Staff' | 'Uploader' | 'Tracker';
    middle_name: string;
    prefix: string;
    suffix: string;
    email: string;
    phone: string;
    member_id: number;
    last_login: string;
}

export interface ProfileResponse {
    success: boolean;
    message: string;
    data: Partial<User>;
}

export interface CreateUserDTO {
    user_id: string;
    first_name: string;
    last_name: string;
    user_type: 'Admin' | 'Member' | 'Staff' | 'Uploader' | 'Tracker';
    middle_name?: string;
    prefix?: string;
    suffix?: string;
    email?: string;
    phone?: string;
    member_id?: number;
    password?: string; // Add this
}

export interface UpdateUserDTO {
  id: number;
  payload: Partial<CreateUserDTO>;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
}