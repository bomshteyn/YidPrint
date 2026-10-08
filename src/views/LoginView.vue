<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-6 text-2xl font-bold">Sign in</h1>
    <form class="space-y-4" @submit.prevent="submit">
      <input v-model="email" type="email" required placeholder="Email" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      <input v-model="password" type="password" required placeholder="Password" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button class="w-full rounded-md bg-blue-700 py-2 text-sm font-medium text-white">Sign in</button>
    </form>
    <p class="mt-4 text-sm text-zinc-500">
      No account? <router-link to="/register" class="text-blue-700 hover:underline">Register</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../lib/api';
import { currentUser } from '../lib/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    const { user } = await api.login({ email: email.value, password: password.value });
    currentUser.value = user;
    router.push('/me');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed';
  }
}
</script>
