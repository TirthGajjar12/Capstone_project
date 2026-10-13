export type Role = 'ADMIN' | 'SUPPORT' | 'EMPLOYEE';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Access' | 'Other';

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED' | 'LOST';

export interface User {
  id: number;
  employee_id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Asset {
  id: number;
  asset_tag?: string;
  asset_id?: string;
  asset_type: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date?: string;
  status: AssetStatus;
  assigned_to_id?: number | null;
  assigned_to?: number | User | null;
  assigned_to_name?: string | null;
}

export interface Ticket {
  id: number;
  ticket_id?: string;
  ticket_number?: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_by?: number | User;
  created_by_id?: number;
  created_by_name?: string;
  assigned_to?: number | User | null;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  asset_id?: number | null;
  asset?: Asset | null;
  resolution?: string | null;
  resolution_notes?: string | null;
  closed_date?: string | null;
  closed_at?: string | null;
  created_at: string;
  sla_deadline: string | null;
  sla_breached?: boolean;
}

export interface ActivityLog {
  id: number;
  action: string;
  details: string;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export interface TicketHistory {
  id: number;
  ticket_id: number;
  old_status: string | null;
  new_status: string;
  changed_by: number;
  changed_by_name?: string;
  comment: string | null;
  created_at: string;
}

export interface WebSocketMessage {
  type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'ticket_resolved' | 'ticket_closed' | 'asset_updated' | 'activity';
  data: Ticket | Asset | ActivityLog;
  timestamp: string;
}