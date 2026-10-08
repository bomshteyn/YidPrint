<template>
  <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="cls">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();
const label = computed(() =>
  ({ draft: 'Draft', pending: 'Pending review', approved: 'Published', rejected: 'Rejected' })[props.status] ?? props.status
);
const cls = computed(
  () =>
    ({
      draft: 'bg-zinc-100 text-zinc-600',
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    })[props.status] ?? 'bg-zinc-100 text-zinc-600'
);
</script>
