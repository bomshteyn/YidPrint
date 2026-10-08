<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold">Reports</h1>
    <ul class="divide-y divide-zinc-100 rounded-md border border-zinc-200">
      <li v-for="r in reports" :key="r.id" class="flex items-center gap-4 px-4 py-3">
        <div class="flex-1">
          <router-link :to="`/models/${r.model_slug}`" class="font-medium text-blue-700 hover:underline">{{ r.model_title }}</router-link>
          <p class="text-sm text-zinc-600">{{ r.reason }}</p>
          <p class="text-xs text-zinc-400">
            {{ r.reporter_username ?? 'anonymous' }} · {{ new Date(r.created_at).toLocaleString() }}
          </p>
        </div>
        <span v-if="r.resolved_at" class="text-xs text-green-700">Resolved</span>
        <button v-else class="rounded-md border border-zinc-300 px-3 py-1 text-sm" @click="resolve(r.id)">Resolve</button>
      </li>
    </ul>
    <p v-if="!reports.length" class="py-8 text-center text-sm text-zinc-500">No reports.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../lib/api';

type Report = Awaited<ReturnType<typeof api.adminReports>>['reports'][number];
const reports = ref<Report[]>([]);

async function resolve(id: string) {
  await api.adminResolveReport(id);
  const r = reports.value.find((x) => x.id === id);
  if (r) r.resolved_at = Date.now();
}

onMounted(async () => {
  reports.value = (await api.adminReports()).reports;
});
</script>
