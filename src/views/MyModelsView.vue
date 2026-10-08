<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">My models</h1>
      <router-link to="/upload" class="rounded-md bg-blue-700 px-3 py-1.5 text-sm text-white">Upload</router-link>
    </div>
    <ul class="divide-y divide-zinc-100 rounded-md border border-zinc-200">
      <li v-for="m in models" :key="m.id" class="flex items-center gap-4 px-4 py-3">
        <img v-if="m.cover_url" :src="m.cover_url" class="h-12 w-12 rounded object-cover" />
        <div v-else class="h-12 w-12 rounded bg-zinc-100" />
        <div class="flex-1">
          <router-link :to="`/models/${m.slug}`" class="font-medium hover:text-blue-700">{{ m.title }}</router-link>
          <p v-if="m.status === 'rejected' && m.reject_reason" class="text-xs text-red-600">
            Rejected: {{ m.reject_reason }}
          </p>
        </div>
        <StatusBadge :status="m.status" />
        <router-link :to="`/models/${m.slug}/edit`" class="text-sm text-blue-700 hover:underline">Edit</router-link>
        <button class="text-sm text-red-600 hover:underline" @click="del(m.id)">Delete</button>
      </li>
    </ul>
    <p v-if="!models.length" class="py-8 text-center text-sm text-zinc-500">
      Nothing here yet. <router-link to="/upload" class="text-blue-700">Upload your first model.</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, type ModelSummary } from '../lib/api';
import { authLoaded, currentUser } from '../lib/auth';
import StatusBadge from '../components/StatusBadge.vue';

const router = useRouter();
const models = ref<ModelSummary[]>([]);

async function del(id: string) {
  if (!confirm('Delete this model?')) return;
  await api.deleteModel(id);
  models.value = models.value.filter((m) => m.id !== id);
}

onMounted(async () => {
  if (!authLoaded.value) {
    try { const { user } = await api.me(); currentUser.value = user; } catch { /* ignore */ }
    authLoaded.value = true;
  }
  if (!currentUser.value) {
    router.push('/login');
    return;
  }
  models.value = (await api.myModels()).models;
});
</script>
