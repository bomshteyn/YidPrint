<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold tracking-tight text-zinc-950">Reports</h1>
    <p v-if="error" class="mt-6 text-sm/6 text-red-600">{{ error }}</p>
    <ul v-else-if="reports.length" role="list" class="mt-8 divide-y divide-zinc-950/5 border-y border-zinc-950/5">
      <li v-for="r in reports" :key="r.id" class="flex items-center gap-4 py-4">
        <FlagIcon class="size-5 shrink-0" :class="r.resolved_at ? 'text-zinc-300' : 'text-red-500'" />
        <div class="min-w-0 flex-1">
          <router-link :to="`/models/${r.model_slug}`" class="font-medium text-blue-700 hover:underline">{{ r.model_title }}</router-link>
          <p class="text-sm/6 text-zinc-600">{{ r.reason }}</p>
          <p class="text-xs text-zinc-400">
            {{ r.reporter_username ?? 'anonymous' }} · {{ new Date(r.created_at).toLocaleString() }}
          </p>
        </div>
        <span v-if="r.resolved_at" class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Resolved</span>
        <button
          v-else
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50"
          @click="resolve(r.id)"
        >
          Resolve
        </button>
      </li>
    </ul>
    <div v-else class="mt-8 rounded-xl border border-dashed border-zinc-300 py-16 text-center text-zinc-600">No reports.</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { FlagIcon } from '@heroicons/vue/16/solid';
import { api } from '../lib/api';

type Report = Awaited<ReturnType<typeof api.adminReports>>['reports'][number];
const reports = ref<Report[]>([]);
const error = ref('');

async function resolve(id: string) {
  await api.adminResolveReport(id);
  const r = reports.value.find((x) => x.id === id);
  if (r) r.resolved_at = Date.now();
}

onMounted(async () => {
  try {
    reports.value = (await api.adminReports()).reports;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed';
  }
});
</script>
