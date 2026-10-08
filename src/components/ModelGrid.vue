<template>
  <ul role="list" class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
    <ModelCard v-for="m in models" :key="m.id" :model="m" :show-status="showStatus" />
  </ul>
</template>

<script setup lang="ts">
import type { ModelSummary } from '../lib/api';
import ModelCard from './ModelCard.vue';

withDefaults(defineProps<{ models: ModelSummary[]; showStatus?: boolean }>(), { showStatus: false });
</script>
