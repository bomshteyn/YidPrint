<template>
  <div class="mx-auto max-w-sm px-4 py-16">
    <div class="flex flex-col items-center">
      <LogoMark class="size-10" />
      <h1 class="mt-4 text-2xl font-semibold tracking-tight">Create your account</h1>
      <p class="mt-2 text-center text-sm/6 text-zinc-500">
        Share printable designs with the community — every model is reviewed before it's published.
      </p>
    </div>
    <form class="mt-8 space-y-4 rounded-2xl bg-white p-6 ring-1 ring-zinc-950/10 shadow-sm" @submit.prevent="submit">
      <input v-model="email" type="email" required placeholder="Email" autocomplete="email" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
      <input v-model="username" required placeholder="Username" autocomplete="username" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
      <input v-model="displayName" placeholder="Display name" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
      <input v-model="password" type="password" required minlength="8" placeholder="Password (min 8 chars)" autocomplete="new-password" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm/6 text-red-700">{{ error }}</p>
      <button class="w-full rounded-lg bg-blue-700 py-2.5 text-sm/6 font-semibold text-white hover:bg-blue-800 disabled:opacity-50" :disabled="busy">
        Register
      </button>
      <p class="text-center text-sm/6 text-zinc-500">
        Already have an account? <router-link to="/login" class="font-medium text-blue-700 hover:underline">Sign in</router-link>
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../lib/api';
import { currentUser } from '../lib/auth';
import LogoMark from '../components/LogoMark.vue';

const router = useRouter();
const email = ref('');
const username = ref('');
const displayName = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
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
  } finally {
    busy.value = false;
  }
}
</script>
