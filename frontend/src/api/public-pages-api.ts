// API utilities for public-facing pages
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/vmo-logs`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Communications
export const fetchCommunications = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  communication_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}) => {
  const response = await api.get('/api/ajax-communications', { params: { ...params } });
  return response.data;
};

export const fetchCommunicationsFilters = async () => {
  const response = await api.get('/api/communications/filter-options');
  return response.data;
};

export default api;