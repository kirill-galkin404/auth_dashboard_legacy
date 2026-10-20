<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import * as api from '../api';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await api.login(username.value, password.value);
    await router.push('/dashboard');
  } catch (e) {
    error.value = 'Invalid username or password';
  }
}
</script>

<template>
  <div class="login-box">
    <h1>Sign in</h1>
    <form @submit.prevent="submit">
      <input v-model="username" type="text" placeholder="Username" autofocus>
      <input v-model="password" type="password" placeholder="Password">
      <button type="submit">Log in</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <p class="hint">admin / admin123</p>
  </div>
</template>
