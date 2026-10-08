<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold tracking-tight">Edit — {{ detail?.model.title ?? '…' }}</h1>
    <div class="mt-8">
      <UploadWizard v-if="detail" :existing="detail" :on-files-changed="load" />
      <p v-else-if="error" class="text-zinc-500">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../lib/api';
import UploadWizard from '../components/UploadWizard.vue';

type Detail = Awaited<ReturnType<typeof api.getModel>>;

const route = useRoute();
const detail = ref<Detail | null>(null);
const error = ref('');

async function load() {
  try {
    detail.value = await api.getModel(route.params.slug as string);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Not found';
  }
}

onMounted(load);
</script>
