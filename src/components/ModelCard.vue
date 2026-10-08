<template>
  <router-link
    :to="`/models/${model.slug}`"
    class="group block overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:shadow-md"
  >
    <div class="aspect-[4/3] bg-zinc-100">
      <img
        v-if="model.cover_url"
        :src="model.cover_url"
        :alt="model.title"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center text-zinc-400">No image</div>
    </div>
    <div class="p-3">
      <div class="flex items-start justify-between gap-2">
        <h3 class="truncate font-medium text-zinc-900 group-hover:text-blue-700">{{ model.title }}</h3>
        <StatusBadge v-if="showStatus && model.status !== 'approved'" :status="model.status" />
      </div>
      <p v-if="model.creator_display_name || model.creator_username" class="mt-0.5 truncate text-xs text-zinc-500">
        {{ model.creator_display_name || model.creator_username }}
      </p>
      <div class="mt-2 flex items-center gap-3 text-xs text-zinc-500">
        <span>♥ {{ model.likes_count }}</span>
        <span>↓ {{ model.downloads_count }}</span>
        <span class="ml-auto">{{ model.license }}</span>
      </div>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import type { ModelSummary } from '../lib/api';
import StatusBadge from './StatusBadge.vue';

withDefaults(defineProps<{ model: ModelSummary; showStatus?: boolean }>(), { showStatus: false });
</script>
