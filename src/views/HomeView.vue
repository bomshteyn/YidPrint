<template>
  <div>
    <!-- Hero -->
    <section class="py-12 sm:py-20">
      <div class="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p class="flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 py-1 pr-2.5 pl-1.5 text-sm/6 font-medium text-emerald-800 sm:text-[0.8125rem]/5">
            <ShieldCheckIcon class="size-4 text-emerald-600" />
            Every model reviewed before it's published
          </p>
          <h1 class="mt-6 max-w-[20ch] text-5xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-6xl">
            Kosher 3D models for the frum printing community
          </h1>
          <p class="mt-6 max-w-[48ch] text-lg text-pretty text-zinc-600">
            Free STL and 3MF files for Shabbos, Yom Tov, mezuzahs, chinuch and everyday life. Browse with your
            family, knowing a person checked every model first.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <router-link
              to="/models"
              class="rounded-lg bg-blue-700 px-4 py-2.5 text-base/6 font-semibold text-white hover:bg-blue-800 sm:text-sm/6"
              >Browse models</router-link
            >
            <router-link to="/upload" class="flex items-center gap-1 text-base/6 font-semibold text-zinc-950 hover:text-blue-700 sm:text-sm/6">
              Share your design<ChevronRightIcon class="size-4" />
            </router-link>
          </div>
          <dl class="mt-12 grid max-w-md grid-cols-3 gap-6">
            <div class="flex flex-col gap-1">
              <dt class="text-sm/6 text-zinc-600">Models</dt>
              <dd class="text-2xl font-semibold tracking-tight tabular-nums">{{ stats ? stats.models.toLocaleString() : '—' }}</dd>
            </div>
            <div class="flex flex-col gap-1 border-l border-zinc-950/10 pl-6">
              <dt class="text-sm/6 text-zinc-600">Creators</dt>
              <dd class="text-2xl font-semibold tracking-tight tabular-nums">{{ stats ? stats.creators.toLocaleString() : '—' }}</dd>
            </div>
            <div class="flex flex-col gap-1 border-l border-zinc-950/10 pl-6">
              <dt class="text-sm/6 text-zinc-600">Downloads</dt>
              <dd class="text-2xl font-semibold tracking-tight tabular-nums">{{ stats ? formatCount(stats.downloads) : '—' }}</dd>
            </div>
          </dl>
        </div>
        <div class="grid grid-cols-2 gap-4 sm:gap-6">
          <img
            v-for="(m, i) in heroModels"
            :key="m.id"
            :src="m.cover_url ?? ''"
            :alt="m.title"
            class="aspect-square w-full rounded-2xl bg-zinc-100 object-cover outline-1 -outline-offset-1 outline-black/5"
            :class="{ 'translate-y-6': i % 2 === 1 }"
          />
        </div>
      </div>
    </section>

    <!-- Category chips -->
    <section class="border-y border-zinc-950/5 bg-zinc-50/60">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Categories" class="-mx-4 flex gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none]">
          <router-link to="/models" class="shrink-0 rounded-full bg-zinc-950 px-3 py-1.5 text-sm/6 font-medium text-white">All models</router-link>
          <router-link
            v-for="c in categories"
            :key="c.slug"
            :to="`/models?category=${c.slug}`"
            class="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm/6 font-medium text-zinc-700 ring-1 ring-zinc-950/10 hover:text-zinc-950 hover:ring-zinc-950/20"
            >{{ c.name }}</router-link
          >
        </nav>
      </div>
    </section>

    <!-- Popular -->
    <section class="py-12 sm:py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between gap-4">
          <h2 class="text-xl font-semibold tracking-tight text-balance text-zinc-950">Popular this week</h2>
          <router-link to="/models?sort=popular" class="flex shrink-0 items-center gap-1 text-sm/6 font-medium text-blue-700 hover:text-blue-800">
            View all<ChevronRightIcon class="size-4" />
          </router-link>
        </div>
        <div class="mt-6">
          <SkeletonGrid v-if="loading" />
          <ModelGrid v-else :models="popular" />
        </div>
      </div>
    </section>

    <!-- Chanukah collection banner -->
    <section class="pb-12 sm:pb-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid items-center gap-8 overflow-hidden rounded-2xl bg-blue-950 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p class="text-sm/6 font-medium text-blue-300">Collection</p>
            <h2 class="mt-2 max-w-[24ch] text-3xl font-semibold tracking-tight text-balance text-white">Get ready for Chanukah</h2>
            <p class="mt-4 max-w-[48ch] text-base/7 text-pretty text-blue-100">
              Menorahs, dreidels, oil-cup holders and gelt boxes, ready to print in time for the first night.
            </p>
            <router-link to="/models?category=chanukah" class="mt-8 flex w-fit items-center gap-1 text-sm/6 font-semibold text-white hover:text-blue-200">
              See the collection<ChevronRightIcon class="size-4" />
            </router-link>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <img
              v-for="m in chanukahModels"
              :key="m.id"
              :src="m.cover_url ?? ''"
              :alt="m.title"
              class="aspect-square w-full rounded-xl object-cover outline-1 -outline-offset-1 outline-white/10"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- New -->
    <section class="pb-12 sm:pb-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between gap-4">
          <h2 class="text-xl font-semibold tracking-tight text-balance text-zinc-950">New this week</h2>
          <router-link to="/models?sort=new" class="flex shrink-0 items-center gap-1 text-sm/6 font-medium text-blue-700 hover:text-blue-800">
            View all<ChevronRightIcon class="size-4" />
          </router-link>
        </div>
        <div class="mt-6">
          <SkeletonGrid v-if="loading" :count="4" />
          <ModelGrid v-else :models="newest" />
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="border-t border-zinc-950/5 py-12 sm:py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="max-w-[35ch] text-3xl font-semibold tracking-tight text-balance">How YidPrint keeps it kosher</h2>
        <p class="mt-4 max-w-[56ch] text-base/7 text-pretty text-zinc-600">
          Anyone can share a design, but nothing goes live until our team has looked at every file and photo.
        </p>
        <ol role="list" class="mt-10 grid gap-8 sm:grid-cols-3">
          <li v-for="s in steps" :key="s.n" class="flex flex-col gap-2 border-t border-zinc-950/10 pt-6">
            <p class="text-sm/6 font-semibold text-blue-700 tabular-nums">{{ s.n }}</p>
            <h3 class="text-base/7 font-semibold">{{ s.title }}</h3>
            <p class="text-base/7 text-pretty text-zinc-600 sm:text-sm/6">{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ChevronRightIcon, ShieldCheckIcon } from '@heroicons/vue/16/solid';
import { api, formatCount, type Category, type ModelSummary } from '../lib/api';
import ModelGrid from '../components/ModelGrid.vue';
import SkeletonGrid from '../components/SkeletonGrid.vue';

const popular = ref<ModelSummary[]>([]);
const newest = ref<ModelSummary[]>([]);
const categories = ref<Category[]>([]);
const stats = ref<{ models: number; creators: number; downloads: number } | null>(null);
const loading = ref(true);

const heroModels = computed(() => popular.value.filter((m) => m.cover_url).slice(0, 4));
const chanukahModels = computed(() =>
  popular.value.filter((m) => m.category_slug === 'chanukah' && m.cover_url).slice(0, 3)
);

const steps = [
  { n: '01', title: 'Upload your model', text: 'Add your STL or 3MF files, photos of the print, and the settings you used.' },
  { n: '02', title: 'We review it', text: 'A reviewer checks the files, photos and description against our kosher guidelines.' },
  { n: '03', title: 'It goes live', text: 'Once approved, your model is published for the whole community to download and print.' },
];

onMounted(async () => {
  try {
    const [p, n, c, s] = await Promise.all([
      api.listModels({ sort: 'popular' }),
      api.listModels({ sort: 'new' }),
      api.categories(),
      api.stats(),
    ]);
    popular.value = p.models.slice(0, 8);
    newest.value = n.models.slice(0, 8);
    categories.value = c.categories;
    stats.value = s;
  } finally {
    loading.value = false;
  }
});
</script>
