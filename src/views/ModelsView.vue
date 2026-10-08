<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <input
        v-model="q"
        type="search"
        placeholder="Search…"
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        @keyup.enter="apply"
      />
      <select v-model="category" class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" @change="apply">
        <option value="">All categories</option>
        <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
      </select>
      <select v-model="sort" class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" @change="apply">
        <option value="popular">Popular</option>
        <option value="new">Newest</option>
      </select>
      <button class="rounded-md bg-blue-700 px-3 py-1.5 text-sm text-white" @click="apply">Search</button>
    </div>

    <ModelGrid :models="models" />

    <div v-if="pages > 1" class="mt-8 flex justify-center gap-2">
      <button
        v-for="p in pages"
        :key="p"
        class="rounded-md px-3 py-1 text-sm"
        :class="p === page ? 'bg-blue-700 text-white' : 'border border-zinc-300 text-zinc-700'"
        @click="go(p)"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, type Category, type ModelSummary } from '../lib/api';
import ModelGrid from '../components/ModelGrid.vue';

const route = useRoute();
const router = useRouter();
const q = ref((route.query.q as string) ?? '');
const category = ref((route.query.category as string) ?? '');
const sort = ref((route.query.sort as string) ?? 'popular');
const page = ref(1);
const pages = ref(1);
const models = ref<ModelSummary[]>([]);
const categories = ref<Category[]>([]);

async function load() {
  const res = await api.listModels({ q: q.value, category: category.value, sort: sort.value, page: page.value });
  models.value = res.models;
  pages.value = res.pages || 1;
}

function apply() {
  page.value = 1;
  router.replace({ query: { q: q.value || undefined, category: category.value || undefined, sort: sort.value } });
  load();
}

function go(p: number) {
  page.value = p;
  load();
}

watch(() => route.query.q, (v) => {
  q.value = (v as string) ?? '';
  apply();
});

onMounted(async () => {
  load();
  categories.value = (await api.categories()).categories;
});
</script>
