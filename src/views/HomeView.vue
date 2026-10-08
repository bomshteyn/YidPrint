<template>
  <div class="space-y-10">
    <section>
      <h1 class="text-2xl font-bold">YidPrint</h1>
      <p class="mt-1 text-zinc-600">Printable 3D models for the frum community — every design reviewed before it goes live.</p>
    </section>

    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Popular</h2>
        <router-link to="/models" class="text-sm text-blue-700 hover:underline">Browse all →</router-link>
      </div>
      <ModelGrid :models="popular" />
    </section>

    <section>
      <h2 class="mb-3 text-lg font-semibold">Newest</h2>
      <ModelGrid :models="newest" />
    </section>

    <section>
      <h2 class="mb-3 text-lg font-semibold">Categories</h2>
      <div class="flex flex-wrap gap-2">
        <router-link
          v-for="c in categories"
          :key="c.slug"
          :to="`/models?category=${c.slug}`"
          class="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-blue-700 hover:text-blue-700"
        >
          {{ c.name }} <span class="text-zinc-400">({{ c.count }})</span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, type Category, type ModelSummary } from '../lib/api';
import ModelGrid from '../components/ModelGrid.vue';

const popular = ref<ModelSummary[]>([]);
const newest = ref<ModelSummary[]>([]);
const categories = ref<Category[]>([]);

onMounted(async () => {
  const [p, n, c] = await Promise.all([
    api.listModels({ sort: 'popular' }),
    api.listModels({ sort: 'new' }),
    api.categories(),
  ]);
  popular.value = p.models.slice(0, 8);
  newest.value = n.models.slice(0, 8);
  categories.value = c.categories;
});
</script>
