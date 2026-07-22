export interface User {
  id: number;
  username: string;
  password: string; // bcrypt hash at rest
}

export interface SessionUser {
  id: number;
  username: string;
}

export interface LoginResponse {
  ok: true;
  username: string;
}

export interface LogoutResponse {
  ok: true;
}

export interface MeResponse {
  username: string;
}

export interface Transaction {
  id: number;
  customer: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: string;
}

export interface DashboardKpis {
  revenue: number;
  users: number;
  orders: number;
  conversion: string;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  transactions: Transaction[];
}

export interface ErrorResponse {
  ok?: false;
  error: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}
