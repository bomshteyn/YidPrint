<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex items-end justify-between gap-4">
      <h1 class="text-2xl font-semibold tracking-tight text-zinc-950">My models</h1>
      <router-link to="/upload" class="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-sm/6 font-semibold text-white hover:bg-blue-800">
        <ArrowUpTrayIcon class="size-4" />Upload
      </router-link>
    </div>

    <div v-if="loading" class="mt-8"><SkeletonGrid :count="4" /></div>
    <ul v-else-if="models.length" role="list" class="mt-8 divide-y divide-zinc-950/5 border-y border-zinc-950/5">
      <li v-for="m in models" :key="m.id" class="flex items-center gap-4 py-4">
        <img v-if="m.cover_url" :src="m.cover_url" :alt="m.title" class="size-14 rounded-lg object-cover outline-1 -outline-offset-1 outline-black/5" />
        <div v-else class="grid size-14 place-items-center rounded-lg bg-zinc-100 text-xs text-zinc-400">No image</div>
        <div class="min-w-0 flex-1">
          <router-link :to="`/models/${m.slug}`" class="font-medium text-zinc-950 hover:text-blue-700">{{ m.title }}</router-link>
          <p v-if="m.status === 'rejected' && m.reject_reason" class="mt-0.5 truncate text-sm/6 text-red-600">
            {{ m.reject_reason }}
          </p>
        </div>
        <StatusBadge :status="m.status" />
        <router-link
          :to="`/models/${m.slug}/edit`"
          class="rounded-lg px-3 py-1.5 text-sm/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50"
        >
          {{ m.status === 'rejected' ? 'Edit & resubmit' : 'Edit' }}
        </router-link>
        <button type="button" :aria-label="`Delete ${m.title}`" class="relative rounded-md p-1.5 text-zinc-400 hover:bg-zinc-950/5 hover:text-red-600" @click="del(m.id)">
          <TrashIcon class="size-4" />
          <span class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true"></span>
        </button>
      </li>
    </ul>
    <div v-else class="mt-8 rounded-xl border border-dashed border-zinc-300 py-16 text-center">
      <p class="text-zinc-700">You haven't shared any models yet.</p>
      <router-link to="/upload" class="mt-4 inline-block rounded-lg bg-blue-700 px-4 py-2.5 text-sm/6 font-semibold text-white hover:bg-blue-800">
        Upload your first model
      </router-link>
    </div>

    <!-- Change password -->
    <section class="mt-16 max-w-md border-t border-zinc-950/5 pt-10">
      <h2 class="text-base/7 font-semibold">Change password</h2>
      <form class="mt-4 space-y-3" @submit.prevent="changePassword">
        <input v-model="pwCurrent" type="password" required autocomplete="current-password" placeholder="Current password" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
        <input v-model="pwNew" type="password" required minlength="8" autocomplete="new-password" placeholder="New password (min 8 chars)" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
        <p v-if="pwError" class="text-sm/6 text-red-600">{{ pwError }}</p>
        <p v-if="pwDone" class="text-sm/6 text-emerald-700">Password updated. Other sessions were signed out.</p>
        <button type="submit" class="rounded-lg bg-zinc-950 px-4 py-2 text-sm/6 font-semibold text-white hover:bg-zinc-800" :disabled="pwBusy">
          Update password
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/vue/16/solid';
import { api, type ModelSummary } from '../lib/api';
import { authLoaded, currentUser, loadAuth } from '../lib/auth';
import StatusBadge from '../components/StatusBadge.vue';
import SkeletonGrid from '../components/SkeletonGrid.vue';

const router = useRouter();
const models = ref<ModelSummary[]>([]);
const loading = ref(true);
const pwCurrent = ref('');
const pwNew = ref('');
const pwError = ref('');
const pwDone = ref(false);
const pwBusy = ref(false);

async function del(id: string) {
  if (!confirm('Delete this model?')) return;
  await api.deleteModel(id);
  models.value = models.value.filter((m) => m.id !== id);
}

async function changePassword() {
  pwError.value = '';
  pwDone.value = false;
  pwBusy.value = true;
  try {
    await api.changePassword({ current_password: pwCurrent.value, new_password: pwNew.value });
    pwDone.value = true;
    pwCurrent.value = '';
    pwNew.value = '';
  } catch (e) {
    pwError.value = e instanceof Error ? e.message : 'Failed';
  } finally {
    pwBusy.value = false;
  }
}

onMounted(async () => {
  if (!authLoaded.value) await loadAuth();
  if (!currentUser.value) {
    router.push('/login');
    return;
  }
  try {
    models.value = (await api.myModels()).models;
  } finally {
    loading.value = false;
  }
});
</script>
