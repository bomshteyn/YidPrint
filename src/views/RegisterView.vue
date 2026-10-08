<template>
  <div class="mx-auto max-w-sm">
    <h1 class="mb-6 text-2xl font-bold">Create account</h1>
    <form class="space-y-4" @submit.prevent="submit">
      <input v-model="email" type="email" required placeholder="Email" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      <input v-model="username" required placeholder="Username" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      <input v-model="displayName" placeholder="Display name" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      <input v-model="password" type="password" required minlength="8" placeholder="Password (min 8 chars)" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button class="w-full rounded-md bg-blue-700 py-2 text-sm font-medium text-white">Register</button>
    </form>
    <p class="mt-4 text-sm text-zinc-500">
      Already have an account? <router-link to="/login" class="text-blue-700 hover:underline">Sign in</router-link>
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
const username = ref('');
const displayName = ref('');
const password = ref('');
const error = ref('');

async function submit() {
  error.value = '';
  try {
    const { user } = await api.register({
      email: email.value,
      password: password.value,
      username: username.value,
      display_name: displayName.value || username.value,
    });
    currentUser.value = user;
    router.push('/me');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Registration failed';
  }
}
</script>
