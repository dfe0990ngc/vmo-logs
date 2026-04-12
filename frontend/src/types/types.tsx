import { Member } from "@/features/members/members.types";
import { Ordinance } from "@/features/ordinances/ordinances.types";
import { Resolution } from "@/features/resolutions/resolutions.types";

// Union Types and Enums
export type UserRole = 'Admin' | 'Member' | 'Staff';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type EntityStatus = 'active' | 'inactive' | 'draft';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type ID = string | number;
export type Timestamp = string; // ISO 8601 format

export interface Pagination {
  current_page: number, 
  per_page: number;
  total: number;
  total_pages: number;
}

export interface GlobalFilters{
  search?: string;
  page?: number;
  limit?: number;
}

export interface User {
  id: string;
  user_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  user_type: string;
  phone: string;
  prefix: string;
  suffix: string;
  avatar: string;
  email: string;
  last_login: string;
  member_id: string;
  updated_at: string;
  created_at: string;
}

export type AppDocument = {
  id: number;
  document_number: string;
  title?: string;
};

export interface DocumentComboboxProps {
  label: string;
  value: number;
  documents: AppDocument[];
  isFetching?: boolean;
  search: string;
  open: boolean;
  disabled?: boolean;
  error?: string;
  copiedId?: number | null;
  isDownloading?: boolean;
  onSearchChange: (v: string) => void;
  onOpenChange: (v: boolean) => void;
  // Passes the full doc object so the caller can pin it synchronously
  onSelect: (id: number, doc: AppDocument | null) => void;
  onCopyTitle?: (doc: AppDocument) => void;
  onDownload?: (id: number) => void;
}

export interface MemberComboboxProps {
  label: string;
  value: number;
  members: Member[];
  isFetching?: boolean;
  search: string;
  open: boolean;
  disabled?: boolean;
  error?: string;
  copiedId?: number | null;
  onSearchChange: (v: string) => void;
  onOpenChange: (v: boolean) => void;
  onSelect: (id: number, member: Member | null) => void;
}

export interface ResolutionComboboxProps {
  label: string;
  value: number;
  resolutions: Resolution[];
  isFetching?: boolean;
  search: string;
  open: boolean;
  disabled?: boolean;
  error?: string;
  onSearchChange: (v: string) => void;
  onOpenChange: (v: boolean) => void;
  onSelect: (id: number, resolution: Resolution | null) => void;
}

export interface OrdinanceComboboxProps {
  label: string;
  value: number;
  ordinances: Ordinance[];
  isFetching?: boolean;
  search: string;
  open: boolean;
  disabled?: boolean;
  error?: string;
  onSearchChange: (v: string) => void;
  onOpenChange: (v: boolean) => void;
  onSelect: (id: number, ordinance: Ordinance | null) => void;
}