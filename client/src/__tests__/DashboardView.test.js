import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';

vi.mock('../api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  dashboard: vi.fn()
}));

import * as api from '../api';
import { username } from '../auth';
import DashboardView from '../views/DashboardView.vue';

const payload = {
  kpis: { revenue: '$1,000', users: 42, orders: 7, conversion: '3.5%' },
  transactions: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    customer: `Customer ${i + 1}`,
    amount: `$${(i + 1) * 10}`,
    status: 'paid',
    date: '2024-01-01'
  }))
};

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/dashboard', component: DashboardView }
    ]
  });
  router.push('/dashboard');
  await router.isReady();
  const wrapper = mount(DashboardView, { global: { plugins: [router] } });
  return { router, wrapper };
}

const button = (wrapper, label) => wrapper.findAll('button').find((b) => b.text() === label);
const apiError = (status) => Object.assign(new Error('x'), { status });

describe('DashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    username.value = 'admin';
  });

  it('renders nothing but the header before data loads, then KPIs and 10 rows', async () => {
    let resolve;
    api.dashboard.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { wrapper } = await setup();
    expect(wrapper.find('.kpis').exists()).toBe(false);
    expect(wrapper.find('table').exists()).toBe(false);
    expect(wrapper.text()).toContain('admin');

    resolve(payload);
    await flushPromises();
    const text = wrapper.find('.kpis').text();
    for (const label of ['Revenue', 'Users', 'Orders', 'Conversion']) {
      expect(text).toContain(label);
    }
    expect(text).toContain('$1,000');
    expect(wrapper.findAll('tbody tr')).toHaveLength(10);
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual(['#', 'Customer', 'Amount', 'Status', 'Date']);
  });

  it('Refresh triggers a second api.dashboard call', async () => {
    api.dashboard.mockResolvedValue(payload);
    const { wrapper } = await setup();
    await flushPromises();
    expect(api.dashboard).toHaveBeenCalledTimes(1);
    await button(wrapper, 'Refresh').trigger('click');
    await flushPromises();
    expect(api.dashboard).toHaveBeenCalledTimes(2);
  });

  it('Log out calls api.logout and routes to /login', async () => {
    api.dashboard.mockResolvedValue(payload);
    api.logout.mockResolvedValue({ ok: true });
    const { wrapper, router } = await setup();
    await flushPromises();
    await button(wrapper, 'Log out').trigger('click');
    await flushPromises();
    expect(api.logout).toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('a 401 on initial load routes to /login', async () => {
    api.dashboard.mockRejectedValue(apiError(401));
    const { wrapper, router } = await setup();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('a 401 on Refresh clears data and routes to /login', async () => {
    api.dashboard.mockResolvedValueOnce(payload).mockRejectedValueOnce(apiError(401));
    const { wrapper, router } = await setup();
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(10);
    await button(wrapper, 'Refresh').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(wrapper.find('table').exists()).toBe(false);
  });

  it('a non-401 failure does not redirect', async () => {
    api.dashboard.mockRejectedValue(apiError(500));
    const { router } = await setup();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/dashboard');
  });
});
