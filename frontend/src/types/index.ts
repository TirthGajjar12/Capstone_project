export type Role = 'ADMIN' | 'SUPPORT' | 'EMPLOYEE';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Access' | 'Other';

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED' | 'LOST';

export interface User {
  id: number;
  employee_id?: string;
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
  assignment_mode?: 'AUTO' | 'MANUAL' | null;
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
  resolved_at?: string | null;
  is_sla_breached?: boolean;
  sla_breached?: boolean;
  history?: TicketHistory[];
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
  ticket_id?: number;
  action_type?: string | null;
  previous_status?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  previous_priority?: string | null;
  new_priority?: string | null;
  previous_assignee_id?: number | null;
  previous_assignee_name?: string | null;
  new_assignee_id?: number | null;
  new_assignee_name?: string | null;
  changed_by_id?: number | null;
  changed_by?: number | null;
  changed_by_name?: string | null;
  comment?: string | null;
  created_at: string;
}

/**
 * WebSocket message shape — matches the backend broadcast payload:
 *   { "event": "TICKET_CREATED", "data": { ... } }
 *
 * The `event` field uses the exact string values emitted by websocket_manager.py.
 */
export type WebSocketEventType =
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'TICKET_PRIORITY_UPDATED'
  | 'TICKET_STATUS_UPDATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_RESOLVED'
  | 'TICKET_CLOSED'
  | 'ASSET_UPDATED'
  | 'ACTIVITY';

export interface WebSocketMessage {
  event: WebSocketEventType;
  data: Record<string, unknown>;
}