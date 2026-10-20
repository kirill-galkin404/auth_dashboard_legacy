import { createRouter, createWebHashHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import * as api from './api';
import { username } from './auth';

export function createAppRouter(history = createWebHashHistory()) {
  const router = createRouter({
    history,
    routes: [
      { path: '/login', component: LoginView },
      { path: '/dashboard', component: DashboardView },
      { path: '/:pathMatch(.*)*', redirect: '/login' }
    ]
  });

  router.beforeEach(async (to) => {
    if (to.path !== '/dashboard') return true;
    try {
      const res = await api.me();
      username.value = res.username;
      return true;
    } catch (e) {
      return '/login';
    }
  });

  return router;
}
