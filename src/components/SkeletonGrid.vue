<template>
  <ul class="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
    <li v-for="i in count" :key="i" class="animate-pulse">
      <div class="aspect-square w-full rounded-xl bg-zinc-100"></div>
      <div class="mt-3 h-4 w-3/4 rounded bg-zinc-100"></div>
      <div class="mt-2 h-3 w-1/2 rounded bg-zinc-100"></div>
    </li>
  </ul>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 8 });
</script>
