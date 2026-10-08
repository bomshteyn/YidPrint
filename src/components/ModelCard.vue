<template>
  <li class="group relative">
    <router-link :to="`/models/${model.slug}`">
      <img
        v-if="model.cover_url"
        :src="model.cover_url"
        :alt="model.title"
        loading="lazy"
        class="aspect-square w-full rounded-xl bg-zinc-100 object-cover outline-1 -outline-offset-1 outline-black/5 group-hover:opacity-90"
      />
      <div v-else class="grid aspect-square w-full place-items-center rounded-xl bg-zinc-100 text-sm text-zinc-400 outline-1 -outline-offset-1 outline-black/5">No image</div>
      <div class="mt-3 flex flex-col gap-1.5">
        <h3 class="text-base/6 font-medium text-zinc-950 sm:text-sm/6">{{ model.title }}</h3>
        <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <span class="grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-[0.5625rem] font-semibold text-blue-800 outline-1 -outline-offset-1 outline-blue-900/10">{{ creatorInitials }}</span>
            <p class="truncate text-sm/6 text-zinc-600 sm:text-[0.8125rem]/5">{{ creatorName }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-3 text-sm/6 text-zinc-500 tabular-nums sm:text-[0.8125rem]/5">
            <span class="flex items-center gap-1"><HeartIcon class="size-4 text-zinc-400" />{{ formatCount(model.likes_count) }}</span>
            <span class="flex items-center gap-1"><ArrowDownTrayIcon class="size-4 text-zinc-400" />{{ formatCount(model.downloads_count) }}</span>
          </div>
        </div>
      </div>
      <StatusBadge v-if="showStatus" :status="model.status" class="absolute top-2 left-2" />
    </router-link>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { HeartIcon, ArrowDownTrayIcon } from '@heroicons/vue/16/solid';
import { formatCount, initials, type ModelSummary } from '../lib/api';
import StatusBadge from './StatusBadge.vue';

const props = withDefaults(defineProps<{ model: ModelSummary; showStatus?: boolean }>(), { showStatus: false });
const creatorName = computed(() => props.model.creator_display_name || props.model.creator_username || '');
const creatorInitials = computed(() => initials(creatorName.value || '?'));
</script>
