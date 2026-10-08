<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <template v-if="profile">
      <div class="flex items-center gap-4">
        <span class="grid size-14 place-items-center rounded-full bg-blue-50 text-lg font-semibold text-blue-800 outline-1 -outline-offset-1 outline-blue-900/10">
          {{ initials(profile.user.display_name) }}
        </span>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">{{ profile.user.display_name }}</h1>
          <p class="text-sm/6 text-zinc-500">@{{ profile.user.username }} · {{ profile.models.length }} model{{ profile.models.length === 1 ? '' : 's' }}</p>
        </div>
      </div>
      <h2 class="mt-10 mb-6 text-lg font-semibold">Models</h2>
      <ModelGrid :models="profile.models" />
      <p v-if="!profile.models.length" class="py-8 text-sm/6 text-zinc-500">No published models yet.</p>
    </template>
    <SkeletonGrid v-else-if="!notFound" :count="4" />
    <p v-else class="py-16 text-center text-zinc-500">User not found.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, initials } from '../lib/api';
import ModelGrid from '../components/ModelGrid.vue';
import SkeletonGrid from '../components/SkeletonGrid.vue';

type Profile = Awaited<ReturnType<typeof api.userProfile>>;
const route = useRoute();
const profile = ref<Profile | null>(null);
const notFound = ref(false);

onMounted(async () => {
  try {
    profile.value = await api.userProfile(route.params.username as string);
  } catch {
    notFound.value = true;
  }
});
</script>
