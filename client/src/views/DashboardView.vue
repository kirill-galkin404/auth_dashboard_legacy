<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import * as api from '../api';
import { username } from '../auth';

const router = useRouter();
const data = ref(null);

async function load() {
  data.value = await api.dashboard();
}

async function logout() {
  await api.logout();
  await router.push('/login');
}

onMounted(load);
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <div>
        <span>{{ username }}</span>
        <button @click="load">Refresh</button>
        <button @click="logout">Log out</button>
      </div>
    </header>

    <div v-if="data" class="kpis">
      <div class="kpi"><div class="kpi-value">{{ data.kpis.revenue }}</div><div class="kpi-label">Revenue</div></div>
      <div class="kpi"><div class="kpi-value">{{ data.kpis.users }}</div><div class="kpi-label">Users</div></div>
      <div class="kpi"><div class="kpi-value">{{ data.kpis.orders }}</div><div class="kpi-label">Orders</div></div>
      <div class="kpi"><div class="kpi-value">{{ data.kpis.conversion }}</div><div class="kpi-label">Conversion</div></div>
    </div>

    <table v-if="data" class="txns">
      <thead>
        <tr><th>#</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
      </thead>
      <tbody>
        <tr v-for="t in data.transactions" :key="t.id">
          <td>{{ t.id }}</td>
          <td>{{ t.customer }}</td>
          <td>{{ t.amount }}</td>
          <td>{{ t.status }}</td>
          <td>{{ t.date }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
