<template>
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    <ModelCard v-for="m in models" :key="m.id" :model="m" :show-status="showStatus" />
  </div>
  <p v-if="!models.length" class="py-8 text-center text-sm text-zinc-500">No models found.</p>
</template>

<script setup lang="ts">
import type { ModelSummary } from '../lib/api';
import ModelCard from './ModelCard.vue';

withDefaults(defineProps<{ models: ModelSummary[]; showStatus?: boolean }>(), { showStatus: false });
</script>
