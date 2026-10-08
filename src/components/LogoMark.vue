<template>
  <svg viewBox="0 0 32 32" :class="$props.class" aria-hidden="true">
    <path class="fill-blue-700" d="M16 2 28 9v14l-12 7L4 23V9z" />
    <path class="fill-white" d="M16 8.5 22.5 12.2v7.6L16 23.5l-6.5-3.7v-7.6z" opacity=".95" />
    <path class="fill-blue-700" d="M16 11.6 19.8 13.8v4.4L16 20.4l-3.8-2.2v-4.4z" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ class?: string }>();
</script>
