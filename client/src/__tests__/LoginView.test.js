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
import LoginView from '../views/LoginView.vue';

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/dashboard', component: { template: '<div>dash</div>' } }
    ]
  });
  router.push('/login');
  await router.isReady();
  const wrapper = mount(LoginView, { global: { plugins: [router] } });
  return { router, wrapper };
}

async function submit(wrapper, user = 'admin', pass = 'admin123') {
  const inputs = wrapper.findAll('input');
  await inputs[0].setValue(user);
  await inputs[1].setValue(pass);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('LoginView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the credentials hint and no error initially', async () => {
    const { wrapper } = await setup();
    expect(wrapper.text()).toContain('admin / admin123');
    expect(wrapper.find('.error').exists()).toBe(false);
  });

  it('calls api.login and routes to /dashboard on success', async () => {
    api.login.mockResolvedValue({ ok: true });
    const { wrapper, router } = await setup();
    await submit(wrapper);
    expect(api.login).toHaveBeenCalledWith('admin', 'admin123');
    expect(router.currentRoute.value.path).toBe('/dashboard');
  });

  it('shows invalid credentials message on 401 and stays on /login', async () => {
    api.login.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    const { wrapper, router } = await setup();
    await submit(wrapper, 'admin', 'wrong');
    expect(wrapper.find('.error').text()).toBe('Invalid username or password');
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('shows a different server error message on 500 and on network failure', async () => {
    api.login.mockRejectedValue(Object.assign(new Error('x'), { status: 500 }));
    const { wrapper, router } = await setup();
    await submit(wrapper);
    expect(wrapper.find('.error').text()).toBe('Server error, please try again');
    expect(wrapper.find('.error').text()).not.toBe('Invalid username or password');

    api.login.mockRejectedValue(Object.assign(new Error('Network error'), { status: 0 }));
    await submit(wrapper);
    expect(wrapper.find('.error').text()).toBe('Server error, please try again');
    expect(router.currentRoute.value.path).toBe('/login');
  });
});
