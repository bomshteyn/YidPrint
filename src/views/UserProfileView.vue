<template>
  <div v-if="profile">
    <h1 class="text-2xl font-bold">{{ profile.user.display_name }}</h1>
    <p class="mt-1 text-sm text-zinc-500">@{{ profile.user.username }}</p>
    <h2 class="mt-8 mb-3 font-semibold">Models</h2>
    <ModelGrid :models="profile.models" />
  </div>
  <p v-else class="text-zinc-500">User not found.</p>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../lib/api';
import ModelGrid from '../components/ModelGrid.vue';

type Profile = Awaited<ReturnType<typeof api.userProfile>>;
const route = useRoute();
const profile = ref<Profile | null>(null);

onMounted(async () => {
  try {
    profile.value = await api.userProfile(route.params.username as string);
  } catch {
    profile.value = null;
  }
});
</script>
