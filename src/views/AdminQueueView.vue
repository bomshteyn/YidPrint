<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold tracking-tight text-zinc-950">
      Review queue <span class="ml-1 text-base font-normal text-zinc-500">{{ models.length }} pending</span>
    </h1>
    <p v-if="error" class="mt-6 text-sm/6 text-red-600">{{ error }}</p>
    <div v-else-if="loading" class="mt-8"><SkeletonGrid :count="4" /></div>
    <ul v-else-if="models.length" role="list" class="mt-8 divide-y divide-zinc-950/5 border-y border-zinc-950/5">
      <li v-for="m in models" :key="m.id" class="flex items-center gap-4 py-4">
        <img v-if="m.cover_url" :src="m.cover_url" :alt="m.title" class="size-14 rounded-lg object-cover outline-1 -outline-offset-1 outline-black/5" />
        <div v-else class="grid size-14 place-items-center rounded-lg bg-zinc-100 text-xs text-zinc-400">No image</div>
        <div class="min-w-0 flex-1">
          <p class="font-medium text-zinc-950">{{ m.title }}</p>
          <p class="truncate text-sm/6 text-zinc-500">
            by {{ m.creator_display_name ?? m.creator_username }} · submitted {{ new Date(m.created_at).toLocaleString() }}
          </p>
        </div>
        <router-link :to="`/admin/models/${m.id}`" class="rounded-lg bg-blue-700 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-blue-800">
          Review
        </router-link>
      </li>
    </ul>
    <div v-else class="mt-8 rounded-xl border border-dashed border-zinc-300 py-16 text-center text-zinc-600">
      Queue is empty — everything's reviewed.
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, type ModelSummary } from '../lib/api';
import SkeletonGrid from '../components/SkeletonGrid.vue';

const models = ref<ModelSummary[]>([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    models.value = (await api.adminQueue()).models;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed';
  } finally {
    loading.value = false;
  }
});
</script>
