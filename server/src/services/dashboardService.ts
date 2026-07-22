import { DashboardResponse, Transaction } from '../types';

const CUSTOMER_NAMES = [
  'Acme',
  'Globex',
  'Initech',
  'Umbrella',
  'Soylent',
  'Hooli',
  'Stark',
  'Wayne',
];
const STATUSES: Array<Transaction['status']> = ['paid', 'pending', 'failed'];
const TRANSACTION_COUNT = 10;
const DAY_MS = 86400000;

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class DashboardService {
  /**
   * Same synthetic-data contract as the legacy handler: random KPIs and
   * transactions, unchanged in shape or behavior, just relocated out of
   * the route handler.
   */
  getDashboard(): DashboardResponse {
    const transactions: Transaction[] = [];
    for (let i = 0; i < TRANSACTION_COUNT; i++) {
      transactions.push({
        id: i + 1,
        customer: `${CUSTOMER_NAMES[rnd(0, CUSTOMER_NAMES.length - 1)]} Inc`,
        amount: rnd(50, 5000),
        status: STATUSES[rnd(0, STATUSES.length - 1)],
        date: new Date(Date.now() - rnd(0, 30) * DAY_MS).toISOString().slice(0, 10),
      });
    }

    return {
      kpis: {
        revenue: rnd(10000, 99999),
        users: rnd(100, 9999),
        orders: rnd(50, 2000),
        conversion: `${(Math.random() * 10).toFixed(2)}%`,
      },
      transactions,
    };
  }
}
