<template>
  <div class="isolate flex min-h-screen flex-col">
    <header class="border-b border-zinc-950/5">
      <div class="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <router-link to="/" aria-label="Homepage" class="flex shrink-0 items-center gap-2">
          <LogoMark class="size-8 shrink-0" />
          <span class="text-lg font-semibold tracking-tight">Yid<span class="text-blue-700">Print</span></span>
        </router-link>

        <form class="min-w-0 flex-1 max-sm:hidden" @submit.prevent="doSearch">
          <div class="relative max-w-md">
            <MagnifyingGlassIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              v-model="query"
              aria-label="Search models"
              placeholder="Search mezuzah cases, menorahs, netilas yadayim…"
              class="w-full rounded-lg bg-zinc-950/[0.03] py-2 pr-3 pl-9 text-sm/6 ring-1 ring-zinc-950/10 placeholder:text-zinc-500 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600"
            />
          </div>
        </form>

        <nav class="flex items-center gap-6 text-sm/6 font-medium text-zinc-700 max-lg:hidden">
          <router-link to="/models" class="hover:text-zinc-950">Models</router-link>
          <router-link to="/models" class="hover:text-zinc-950">Collections</router-link>
          <router-link to="/guidelines" class="hover:text-zinc-950">Kosher guidelines</router-link>
        </nav>

        <div class="flex shrink-0 items-center gap-2 max-sm:ml-auto">
          <router-link
            to="/upload"
            class="flex items-center gap-1.5 rounded-lg py-1.5 pr-3 pl-2 text-sm/6 font-medium text-zinc-950 ring-1 ring-zinc-950/10 hover:bg-zinc-50 max-sm:hidden"
          >
            <ArrowUpTrayIcon class="size-4 text-zinc-500" />
            Upload
          </router-link>

          <router-link
            v-if="user?.role === 'admin'"
            to="/admin"
            class="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm/6 font-medium text-zinc-700 hover:bg-zinc-950/5 hover:text-zinc-950 max-sm:hidden"
          >
            Admin
            <span v-if="pendingCount" class="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">{{ pendingCount }}</span>
          </router-link>

          <template v-if="user">
            <div class="relative">
              <button
                type="button"
                aria-label="Account menu"
                class="relative grid size-8 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-800 outline-1 -outline-offset-1 outline-blue-900/10 hover:opacity-80"
                @click="menuOpen = !menuOpen"
              >
                {{ initials(user.display_name) }}
                <span class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true"></span>
              </button>
              <div
                v-if="menuOpen"
                class="absolute right-0 z-30 mt-2 w-44 rounded-xl bg-white py-1 text-sm/6 shadow-lg ring-1 ring-zinc-950/10"
              >
                <router-link to="/me" class="block px-3 py-1.5 hover:bg-zinc-50" @click="menuOpen = false">My models</router-link>
                <router-link :to="`/u/${user.username}`" class="block px-3 py-1.5 hover:bg-zinc-50" @click="menuOpen = false">Profile</router-link>
                <router-link v-if="user.role === 'admin'" to="/admin" class="block px-3 py-1.5 hover:bg-zinc-50 sm:hidden" @click="menuOpen = false">Admin queue</router-link>
                <router-link v-if="user.role === 'admin'" to="/admin/reports" class="block px-3 py-1.5 hover:bg-zinc-50" @click="menuOpen = false">Reports</router-link>
                <button type="button" class="block w-full px-3 py-1.5 text-left hover:bg-zinc-50" @click="doLogout">Log out</button>
              </div>
            </div>
          </template>
          <router-link
            v-else
            to="/login"
            class="rounded-lg px-3 py-1.5 text-sm/6 font-medium text-zinc-700 hover:bg-zinc-950/5 hover:text-zinc-950 max-sm:hidden"
            >Sign in</router-link
          >

          <button
            type="button"
            aria-label="Search"
            class="relative rounded-lg p-1.5 hover:bg-zinc-950/5 sm:hidden"
            @click="searchOpen = !searchOpen"
          >
            <MagnifyingGlassIcon class="size-5 text-zinc-700" />
            <span class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true"></span>
          </button>
          <button
            type="button"
            aria-label="Open menu"
            class="relative rounded-lg p-1.5 hover:bg-zinc-950/5 lg:hidden"
            @click="navOpen = !navOpen"
          >
            <Bars3Icon v-if="!navOpen" class="size-5 text-zinc-700" />
            <XMarkIcon v-else class="size-5 text-zinc-700" />
            <span class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <!-- Mobile search row -->
      <div v-if="searchOpen" class="border-t border-zinc-950/5 px-4 py-3 sm:hidden">
        <form @submit.prevent="doSearch">
          <div class="relative">
            <MagnifyingGlassIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              v-model="query"
              aria-label="Search models"
              placeholder="Search models…"
              autofocus
              class="w-full rounded-lg bg-zinc-950/[0.03] py-2 pr-3 pl-9 text-base/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600"
            />
          </div>
        </form>
      </div>

      <!-- Mobile nav -->
      <nav v-if="navOpen" class="border-t border-zinc-950/5 px-4 py-3 text-sm/6 font-medium text-zinc-700 lg:hidden">
        <div class="flex flex-col gap-1">
          <router-link to="/models" class="rounded-lg px-3 py-2 hover:bg-zinc-50" @click="navOpen = false">Browse models</router-link>
          <router-link to="/models" class="rounded-lg px-3 py-2 hover:bg-zinc-50" @click="navOpen = false">Collections</router-link>
          <router-link to="/guidelines" class="rounded-lg px-3 py-2 hover:bg-zinc-50" @click="navOpen = false">Kosher guidelines</router-link>
          <router-link to="/upload" class="rounded-lg px-3 py-2 hover:bg-zinc-50" @click="navOpen = false">Upload</router-link>
          <template v-if="user">
            <router-link to="/me" class="rounded-lg px-3 py-2 hover:bg-zinc-50" @click="navOpen = false">My models</router-link>
            <router-link v-if="user.role === 'admin'" to="/admin" class="rounded-lg px-3 py-2 hover:bg-zinc-50" @click="navOpen = false">
              Admin <span v-if="pendingCount" class="ml-1 rounded-full bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">{{ pendingCount }}</span>
            </router-link>
            <button type="button" class="rounded-lg px-3 py-2 text-left hover:bg-zinc-50" @click="doLogout">Log out</button>
          </template>
          <router-link v-else to="/login" class="rounded-lg px-3 py-2 hover:bg-zinc-50" @click="navOpen = false">Sign in</router-link>
        </div>
      </nav>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-zinc-950/5">
      <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div class="flex items-center gap-2">
          <LogoMark class="size-6 shrink-0" />
          <p class="text-sm/6 text-zinc-600">YidPrint. Kosher 3D models, reviewed by people who care.</p>
        </div>
        <nav class="flex flex-wrap gap-x-6 gap-y-2 text-sm/6 text-zinc-600">
          <router-link to="/guidelines" class="hover:text-zinc-950">Kosher guidelines</router-link>
          <router-link to="/upload" class="hover:text-zinc-950">Upload a model</router-link>
          <router-link to="/models" class="hover:text-zinc-950">Browse models</router-link>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MagnifyingGlassIcon, Bars3Icon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/vue/16/solid';
import { api, initials } from '../lib/api';
import { currentUser as user, loadAuth, logout } from '../lib/auth';
import LogoMark from './LogoMark.vue';

const router = useRouter();
const query = ref('');
const menuOpen = ref(false);
const navOpen = ref(false);
const searchOpen = ref(false);
const pendingCount = ref(0);

async function loadPending() {
  if (user.value?.role === 'admin') {
    try {
      pendingCount.value = (await api.adminQueue()).models.length;
    } catch { /* ignore */ }
  }
}

watch(user, loadPending);
onMounted(async () => {
  await loadAuth();
  loadPending();
});

function doSearch() {
  searchOpen.value = false;
  navOpen.value = false;
  router.push({ path: '/models', query: query.value ? { q: query.value } : {} });
}

async function doLogout() {
  menuOpen.value = false;
  navOpen.value = false;
  await logout();
  router.push('/');
}
</script>
