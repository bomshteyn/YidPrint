<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-zinc-200">
      <div class="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <router-link to="/" class="text-lg font-bold text-zinc-900">YidPrint</router-link>
        <form class="flex-1 max-w-md" @submit.prevent="doSearch">
          <input
            v-model="query"
            type="search"
            placeholder="Search models…"
            class="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-700 focus:outline-none"
          />
        </form>
        <nav class="ml-auto flex items-center gap-4 text-sm">
          <router-link to="/models" class="text-zinc-700 hover:text-zinc-900">Browse</router-link>
          <router-link to="/guidelines" class="text-zinc-700 hover:text-zinc-900">Guidelines</router-link>
          <router-link
            to="/upload"
            class="rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800"
            >Upload</router-link
          >
          <template v-if="user">
            <router-link v-if="user.role === 'admin'" to="/admin" class="text-zinc-700 hover:text-zinc-900"
              >Admin</router-link
            >
            <div class="relative">
              <button class="font-medium text-zinc-800" @click="menuOpen = !menuOpen">
                {{ user.display_name }}
              </button>
              <div
                v-if="menuOpen"
                class="absolute right-0 z-20 mt-2 w-40 rounded-md border border-zinc-200 bg-white py-1 shadow-md"
              >
                <router-link to="/me" class="block px-3 py-1.5 hover:bg-zinc-50" @click="menuOpen = false"
                  >My models</router-link
                >
                <router-link
                  :to="`/u/${user.username}`"
                  class="block px-3 py-1.5 hover:bg-zinc-50"
                  @click="menuOpen = false"
                  >Profile</router-link
                >
                <router-link
                  v-if="user.role === 'admin'"
                  to="/admin/reports"
                  class="block px-3 py-1.5 hover:bg-zinc-50"
                  @click="menuOpen = false"
                  >Reports</router-link
                >
                <button class="block w-full px-3 py-1.5 text-left hover:bg-zinc-50" @click="doLogout">
                  Sign out
                </button>
              </div>
            </div>
          </template>
          <router-link v-else to="/login" class="text-zinc-700 hover:text-zinc-900">Sign in</router-link>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <slot />
    </main>
    <footer class="border-t border-zinc-200 py-6">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-zinc-500">
        <span>YidPrint — 3D models for the frum community</span>
        <router-link to="/guidelines" class="hover:text-zinc-700">Community guidelines</router-link>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { currentUser as user, loadAuth, logout } from '../lib/auth';

const router = useRouter();
const query = ref('');
const menuOpen = ref(false);

onMounted(loadAuth);

function doSearch() {
  router.push({ path: '/models', query: query.value ? { q: query.value } : {} });
}

async function doLogout() {
  menuOpen.value = false;
  await logout();
  router.push('/');
}
</script>
