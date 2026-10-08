<template>
  <div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold tracking-tight">Upload a model</h1>
    <p class="mt-2 text-sm/6 text-zinc-600">
      Every model is reviewed by our team before it's published — see the
      <router-link to="/guidelines" class="font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2">kosher guidelines</router-link>.
    </p>
    <div class="mt-8"><UploadWizard /></div>
  </div>
</template>

<script setup lang="ts">
import UploadWizard from '../components/UploadWizard.vue';
</script>
