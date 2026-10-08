<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="text-2xl font-semibold tracking-tight text-zinc-950">Browse models</h1>

    <div class="mt-6 flex flex-col gap-4">
      <div class="relative max-w-md">
        <MagnifyingGlassIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          v-model="q"
          type="search"
          aria-label="Search models"
          placeholder="Search models…"
          class="w-full rounded-lg bg-zinc-950/[0.03] py-2 pr-3 pl-9 text-sm/6 ring-1 ring-zinc-950/10 placeholder:text-zinc-500 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600"
          @keyup.enter="apply"
        />
      </div>

      <nav aria-label="Categories" class="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        <button
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-sm/6 font-medium"
          :class="!category ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-950/10 hover:text-zinc-950'"
          @click="setCategory('')"
        >
          All models
        </button>
        <button
          v-for="c in categories"
          :key="c.slug"
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-sm/6 font-medium"
          :class="category === c.slug ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-950/10 hover:text-zinc-950'"
          @click="setCategory(c.slug)"
        >
          {{ c.name }}
        </button>
      </nav>

      <div class="flex items-center justify-between gap-4">
        <div class="flex rounded-lg bg-zinc-950/5 p-0.5 text-sm/6 font-medium">
          <button
            type="button"
            class="rounded-md px-3 py-1"
            :class="sort === 'popular' ? 'bg-white shadow-sm text-zinc-950' : 'text-zinc-600 hover:text-zinc-950'"
            @click="setSort('popular')"
          >
            Popular
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1"
            :class="sort === 'new' ? 'bg-white shadow-sm text-zinc-950' : 'text-zinc-600 hover:text-zinc-950'"
            @click="setSort('new')"
          >
            New
          </button>
        </div>
        <p v-if="!loading" class="text-sm/6 text-zinc-500 tabular-nums">{{ total }} model{{ total === 1 ? '' : 's' }}</p>
      </div>
    </div>

    <div class="mt-8">
      <SkeletonGrid v-if="loading" />
      <ModelGrid v-else-if="models.length" :models="models" />
      <div v-else class="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
        <p class="text-zinc-700">No models match {{ describeFilters }}.</p>
        <button type="button" class="mt-3 text-sm/6 font-medium text-blue-700 hover:underline" @click="clearFilters">
          Clear filters
        </button>
      </div>
    </div>

    <nav v-if="pages > 1" aria-label="Pagination" class="mt-10 flex justify-center gap-1">
      <button
        v-for="p in pages"
        :key="p"
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm/6 font-medium"
        :class="p === page ? 'bg-zinc-950 text-white' : 'text-zinc-700 hover:bg-zinc-950/5'"
        @click="go(p)"
      >
        {{ p }}
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MagnifyingGlassIcon } from '@heroicons/vue/16/solid';
import { api, type Category, type ModelSummary } from '../lib/api';
import ModelGrid from '../components/ModelGrid.vue';
import SkeletonGrid from '../components/SkeletonGrid.vue';

const route = useRoute();
const router = useRouter();
const q = ref((route.query.q as string) ?? '');
const category = ref((route.query.category as string) ?? '');
const sort = ref((route.query.sort as string) === 'new' ? 'new' : 'popular');
const page = ref(Math.max(1, parseInt((route.query.page as string) ?? '1', 10) || 1));
const pages = ref(1);
const total = ref(0);
const models = ref<ModelSummary[]>([]);
const categories = ref<Category[]>([]);
const loading = ref(true);

const describeFilters = computed(() => {
  const parts: string[] = [];
  if (q.value) parts.push(`“${q.value}”`);
  if (category.value) parts.push(categories.value.find((c) => c.slug === category.value)?.name ?? category.value);
  return parts.length ? parts.join(' in ') : 'your filters';
});

async function load() {
  loading.value = true;
  try {
    const res = await api.listModels({ q: q.value, category: category.value, sort: sort.value, page: page.value });
    models.value = res.models;
    pages.value = res.pages || 1;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function syncUrl() {
  router.replace({
    query: {
      q: q.value || undefined,
      category: category.value || undefined,
      sort: sort.value !== 'popular' ? sort.value : undefined,
      page: page.value > 1 ? String(page.value) : undefined,
    },
  });
}

function apply() {
  page.value = 1;
  syncUrl();
  load();
}
function setCategory(c: string) {
  category.value = c;
  apply();
}
function setSort(s: string) {
  sort.value = s;
  apply();
}
function go(p: number) {
  page.value = p;
  syncUrl();
  load();
}
function clearFilters() {
  q.value = '';
  category.value = '';
  apply();
}

// External search-box navigation updates ?q
watch(
  () => route.query.q,
  (v) => {
    const nv = (v as string) ?? '';
    if (nv !== q.value) {
      q.value = nv;
      apply();
    }
  }
);

onMounted(async () => {
  load();
  categories.value = (await api.categories()).categories;
});
</script>
