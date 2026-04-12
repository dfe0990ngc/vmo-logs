import { del, get, post, put } from "@/api/requests";
import { CreateUserDTO, ProfileResponse, UpdateUserDTO, User, UserFilters } from "./users.types";
import { PaginatedResponse } from "@/types/types";

export const fetchUsers = (filters: UserFilters) => {
  const params = new URLSearchParams(
    Object.entries(filters).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== "") {
        acc[key] = String(val);
      }
      return acc;
    }, {} as Record<string, string>)
  );

  return get<PaginatedResponse<User>>(`/api/users?${params}`);
};


export const createUser = (dto: CreateUserDTO) =>
  post<User>("/api/users", dto);

export const updateUser = ({ id, payload }: UpdateUserDTO) =>
  put<User>(`/api/users/${id}`, payload);

export const deleteUser = (id:number) =>
  del(`/api/users/${id}`);

export const getMe = () => {
  return get<ProfileResponse>(`/api/me`);
};