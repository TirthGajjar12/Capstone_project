import { api } from './api';
import { Ticket, Asset, User } from '../types';

/**
 * Ticket API calls — matches the FastAPI `/tickets` router.
 */
export const ticketService = {
  async getAll(status?: string, search?: string, skip?: number, limit?: number): Promise<Ticket[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (skip !== undefined && skip !== null) params.append('skip', String(skip));
    if (limit !== undefined && limit !== null) params.append('limit', String(limit));
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



  async assign(id: number, userId: number) {
    const response = await api.post(`/tickets/${id}/assign`, { assigned_to_id: userId });
    return response.data;
  },

  async updateStatus(id: number, status: string, comment?: string) {
    const response = await api.patch(`/tickets/${id}/status`, { status, comment });
    return response.data;
  },

  async resolve(id: number, resolution: string, assetId?: number) {
    const payload: { resolution_notes: string; asset_id?: number } = { resolution_notes: resolution };
    if (assetId) payload.asset_id = assetId;
    const response = await api.post(`/tickets/${id}/resolve`, payload);
    return response.data;
  },

  async close(id: number) {
    const response = await api.post(`/tickets/${id}/close`);
    return response.data;
  },


};

/**
 * Asset API calls — matches the FastAPI `/assets` router.
 */
export const assetService = {
  async getAll(status?: string, type?: string, search?: string, skip?: number, limit?: number): Promise<Asset[]> {
    const params = new URLSearchParams();
    if (status) params.append('asset_status', status);
    if (type && type !== 'ALL') params.append('asset_type', type);
    if (search) params.append('search', search);
    if (skip !== undefined && skip !== null) params.append('skip', String(skip));
    if (limit !== undefined && limit !== null) params.append('limit', String(limit));
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



  async assign(id: string, userId: number) {
    const response = await api.post(`/assets/${id}/assign`, { user_id: userId });
    return response.data;
  },

  async returnAsset(id: string) {
    const response = await api.post(`/assets/${id}/return`);
    return response.data;
  },



  async requestAsset(data: {
    asset_type: string;
    reason: string;
  }): Promise<Ticket> {
    // Rule-based automatic priority assignment (ITIL compliant):
    // Peripherals (Mouse, Keyboard, Dock, Cable, Headset) -> LOW (3-5 business days)
    // Monitors & Displays -> MEDIUM (2 business days)
    // Laptops & Workstations -> MEDIUM
    const typeUpper = (data.asset_type || '').toUpperCase();
    let autoPriority: 'LOW' | 'MEDIUM' = 'LOW';
    if (typeUpper.includes('LAPTOP') || typeUpper.includes('COMPUTER') || typeUpper.includes('WORKSTATION')) {
      autoPriority = 'MEDIUM';
    } else if (typeUpper.includes('MONITOR') || typeUpper.includes('DISPLAY') || typeUpper.includes('SCREEN')) {
      autoPriority = 'MEDIUM';
    } else {
      autoPriority = 'LOW';
    }

    const payload: Partial<Ticket> = {
      title: `Hardware Request: ${data.asset_type}`,
      description: `Requested Equipment: ${data.asset_type}\nReason / Justification: ${data.reason}\nFulfillment Policy: Standard Auto-Triage (${autoPriority} Priority)`,
      category: 'Hardware',
      priority: autoPriority,
    };
    return ticketService.create(payload);
  },
};

export const userService = {
  async getAll(role?: string): Promise<User[]> {
    const params = new URLSearchParams();
    params.append('limit', '100');
    if (role) params.append('role', role);
    const response = await api.get<User[]>(`/auth/users?${params.toString()}`);
    return response.data;
  },

  async search(query: string = '', limit: number = 50, role?: string): Promise<User[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.append('search', query.trim());
    if (role) params.append('role', role);
    params.append('limit', String(limit));
    const response = await api.get<User[]>(`/auth/users?${params.toString()}`);
    return response.data;
  },
};