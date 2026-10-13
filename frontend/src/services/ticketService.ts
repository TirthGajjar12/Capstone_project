import { api } from './api';
import { Ticket, Asset, User } from '../types';

/**
 * Ticket API calls — matches the FastAPI `/tickets` router.
 */
export const ticketService = {
  async getAll(status?: string, search?: string): Promise<Ticket[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<Ticket[]>(`/tickets/${query}`);
    return response.data;
  },

  async getById(id: number): Promise<Ticket> {
    const response = await api.get<Ticket>(`/tickets/${id}`);
    return response.data;
  },

  async create(data: Partial<Ticket>): Promise<Ticket> {
    const response = await api.post<Ticket>('/tickets/', data);
    return response.data;
  },

  async update(id: number, data: Partial<Ticket>): Promise<Ticket> {
    const response = await api.put<Ticket>(`/tickets/${id}`, data);
    return response.data;
  },

  async assign(id: number, userId: number) {
    const response = await api.post(`/tickets/${id}/assign`, { assigned_to_id: userId });
    return response.data;
  },

  async updateStatus(id: number, status: string, comment?: string) {
    const response = await api.patch(`/tickets/${id}/status`, { status, comment });
    return response.data;
  },

  async resolve(id: number, resolution: string) {
    const response = await api.post(`/tickets/${id}/resolve`, { resolution_notes: resolution });
    return response.data;
  },

  async close(id: number) {
    const response = await api.post(`/tickets/${id}/close`);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  },
};

/**
 * Asset API calls — matches the FastAPI `/assets` router.
 */
export const assetService = {
  async getAll(status?: string): Promise<Asset[]> {
    const params = new URLSearchParams();
    if (status) params.append('asset_status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get<Asset[]>(`/assets/${query}`);
    return response.data;
  },

  async getById(id: string): Promise<Asset> {
    const response = await api.get<Asset>(`/assets/${id}`);
    return response.data;
  },

  async create(data: Partial<Asset>): Promise<Asset> {
    const response = await api.post<Asset>('/assets/', data);
    return response.data;
  },

  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    const response = await api.put<Asset>(`/assets/${id}`, data);
    return response.data;
  },

  async assign(id: string, userId: number) {
    const response = await api.post(`/assets/${id}/assign`, { user_id: userId });
    return response.data;
  },

  async returnAsset(id: string) {
    const response = await api.post(`/assets/${id}/return`);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/assets/${id}`);
    return response.data;
  },
};

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/auth/users');
    return response.data;
  },
};