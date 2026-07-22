// Types mirroring the JSON response shapes verified directly against
// server/app.js. No shared contract artefact exists in this repo to
// import from (see plan risk: "No contract artefact available") — these
// types are hand-derived from the live routes and must be revisited if
// the backend response shapes ever change.

export interface LoginSuccessResponse {
  ok: true;
  username: string;
}

export interface LoginErrorResponse {
  ok: false;
  error: string;
}

export type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

export interface LogoutResponse {
  ok: true;
}

export interface MeResponse {
  username: string;
}

export interface Kpis {
  revenue: number;
  users: number;
  orders: number;
  conversion: string;
}

export interface Transaction {
  id: number;
  customer: string;
  amount: number;
  status: string;
  date: string;
}

export interface DashboardData {
  kpis: Kpis;
  transactions: Transaction[];
}
