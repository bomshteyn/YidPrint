<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold">Review queue</h1>
    <ul class="divide-y divide-zinc-100 rounded-md border border-zinc-200">
      <li v-for="m in models" :key="m.id" class="flex items-center gap-4 px-4 py-3">
        <img v-if="m.cover_url" :src="m.cover_url" class="h-12 w-12 rounded object-cover" />
        <div v-else class="h-12 w-12 rounded bg-zinc-100" />
        <div class="flex-1">
          <p class="font-medium">{{ m.title }}</p>
          <p class="text-xs text-zinc-500">by {{ m.creator_display_name ?? m.creator_username }} · {{ new Date(m.created_at).toLocaleString() }}</p>
        </div>
        <router-link :to="`/admin/models/${m.id}`" class="rounded-md bg-blue-700 px-3 py-1.5 text-sm text-white">Review</router-link>
      </li>
    </ul>
    <p v-if="!models.length" class="py-8 text-center text-sm text-zinc-500">Queue is empty.</p>
    <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, type ModelSummary } from '../lib/api';

const models = ref<ModelSummary[]>([]);
const error = ref('');

onMounted(async () => {
  try {
    models.value = (await api.adminQueue()).models;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed';
  }
});
</script>
