export type CommunicationType =
  | 'MTOP'
  | 'TRAVEL_ORDER'
  | 'SB_RESOLUTION'
  | 'SB_ORDINANCE'
  | 'APPLICATION_LEAVE'
  | 'MEMO'
  | 'NOTICE_HEARING'
  | 'INVITATION'
  | 'ENDORSEMENT'
  | 'DSSC'
  | 'MADAC'
  | 'DOE'
  | 'SOLICITATION'
  | 'TENT_REQUEST'
  | 'OTHER';

export type CommunicationStatus =
  | 'RECEIVED'
  | 'RELEASED'
  | 'COMPLETED'
  | 'PULLED_OUT';

export interface Communication {
  id: string;
  title: string;
  communication_type: CommunicationType;
  status: CommunicationStatus;
  reference_no: string | null;
  date_received: string | null;
  date_logged: string | null;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  created_by: string | null;
  created_by_name: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateCommunicationDTO {
  title: string;
  communication_type: CommunicationType;
  status?: CommunicationStatus;
  reference_no?: string;
  date_received?: string;
  file?: File;
}

export interface UpdateCommunicationDTO {
  id: number;
  payload: FormData;
}

export interface CommunicationFilters {
  page?: number;
  limit?: number;
  search?: string;
  communication_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface CommunicationFilterOptions {
  communication_types: CommunicationType[];
  statuses: CommunicationStatus[];
}