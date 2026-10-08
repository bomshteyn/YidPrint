<template>
  <span class="w-fit rounded-full px-2 py-0.5 text-xs font-medium" :class="cls">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();
const label = computed(
  () => ({ draft: 'Draft', pending: 'In review', approved: 'Live', rejected: 'Needs changes' })[props.status] ?? props.status
);
const cls = computed(
  () =>
    ({
      draft: 'bg-zinc-100 text-zinc-600',
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    })[props.status] ?? 'bg-zinc-100 text-zinc-600'
);
</script>
