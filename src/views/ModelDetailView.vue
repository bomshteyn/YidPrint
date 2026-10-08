<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <p v-if="loadError" class="py-16 text-center text-zinc-500">{{ loadError }}</p>
    <template v-else-if="detail">
      <!-- Breadcrumbs -->
      <nav aria-label="Breadcrumb">
        <ol role="list" class="flex items-center gap-1.5 text-sm/6 text-zinc-500">
          <li><router-link to="/models" class="hover:text-zinc-950">Models</router-link></li>
          <li><ChevronRightIcon class="size-4 text-zinc-400" /></li>
          <li>
            <router-link :to="`/models?category=${detail.model.category_slug}`" class="hover:text-zinc-950">{{ categoryName }}</router-link>
          </li>
        </ol>
      </nav>

      <div
        v-if="detail.model.status !== 'approved'"
        class="mt-4 rounded-lg border px-4 py-3 text-sm/6"
        :class="detail.model.status === 'rejected' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-800'"
      >
        <StatusBadge :status="detail.model.status" />
        <span class="ml-2">This model is not publicly visible.</span>
        <p v-if="detail.model.reject_reason" class="mt-1">Reason: {{ detail.model.reject_reason }}</p>
      </div>

      <div class="mt-6 grid gap-x-12 gap-y-10 lg:grid-cols-[7fr_5fr]">
        <!-- Gallery -->
        <div class="flex flex-col gap-4">
          <div class="relative">
            <ModelViewer v-if="view === '3d' && previewFile" :url="previewFile.url" :filename="previewFile.filename" />
            <img
              v-else-if="currentImage"
              :src="currentImage.url"
              :alt="detail.model.title"
              class="aspect-square w-full rounded-2xl bg-zinc-100 object-cover outline-1 -outline-offset-1 outline-black/5"
            />
            <div v-else class="grid aspect-square w-full place-items-center rounded-2xl bg-zinc-100 text-zinc-400">No photos</div>
            <div v-if="previewFile" class="absolute top-4 left-4 flex gap-1 rounded-lg bg-white/90 p-1 ring-1 ring-black/5 shadow-sm backdrop-blur">
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-md py-1 pr-2.5 pl-1.5 text-sm/6 font-medium"
                :class="view === 'photos' ? 'bg-zinc-950/5 text-zinc-950' : 'text-zinc-600 hover:text-zinc-950'"
                @click="view = 'photos'"
              >
                <PhotoIcon class="size-4" :class="view === 'photos' ? 'text-zinc-700' : 'text-zinc-500'" />Photos
              </button>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-md py-1 pr-2.5 pl-1.5 text-sm/6 font-medium"
                :class="view === '3d' ? 'bg-zinc-950/5 text-zinc-950' : 'text-zinc-600 hover:text-zinc-950'"
                @click="view = '3d'"
              >
                <CubeIcon class="size-4" :class="view === '3d' ? 'text-zinc-700' : 'text-zinc-500'" />3D view
              </button>
            </div>
          </div>
          <ul v-if="images.length > 1" role="list" class="grid grid-cols-5 gap-3">
            <li v-for="(img, i) in images" :key="img.id">
              <button
                type="button"
                :aria-label="`Photo ${i + 1}`"
                class="block w-full rounded-lg"
                :class="img.id === selectedImage && view === 'photos' ? 'outline-2 outline-offset-2 outline-blue-600' : 'hover:opacity-80'"
                @click="selectedImage = img.id; view = 'photos'"
              >
                <img :src="img.url" :alt="img.filename" class="aspect-square w-full rounded-lg object-cover outline-1 -outline-offset-1 outline-black/5" />
              </button>
            </li>
          </ul>
        </div>

        <!-- Right column -->
        <div class="flex flex-col">
          <p class="flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 py-1 pr-2.5 pl-1.5 text-sm/6 font-medium text-emerald-800 sm:text-[0.8125rem]/5">
            <CheckBadgeIcon class="size-4 text-emerald-600" />
            Reviewed by YidPrint
          </p>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight text-balance">{{ detail.model.title }}</h1>
          <router-link :to="`/u/${detail.creator.username}`" class="mt-4 flex w-fit items-center gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-semibold text-blue-800 outline-1 -outline-offset-1 outline-blue-900/10">{{ creatorInitials }}</span>
            <div class="min-w-0">
              <p class="text-sm/6 font-medium">{{ detail.creator.display_name }}</p>
              <p class="text-sm/6 text-zinc-500 sm:text-[0.8125rem]/5">@{{ detail.creator.username }}</p>
            </div>
          </router-link>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="flex items-center gap-2 rounded-lg bg-blue-700 py-2.5 pr-4 pl-3 text-base/6 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 sm:text-sm/6"
              :disabled="zipping || !modelFiles.length"
              @click="downloadAll"
            >
              <ArrowDownTrayIcon class="size-4 text-white" />
              {{ zipping ? 'Building zip…' : 'Download all files' }}
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg py-2.5 pr-3 pl-2.5 text-base/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50 sm:text-sm/6"
              @click="toggleLike"
            >
              <HeartIcon class="size-4" :class="detail.liked_by_me ? 'text-red-500' : 'text-zinc-400'" />
              <span class="tabular-nums">{{ detail.model.likes_count.toLocaleString() }}</span>
            </button>
            <router-link
              v-if="isOwner"
              :to="`/models/${detail.model.slug}/edit`"
              class="flex items-center gap-1.5 rounded-lg py-2.5 px-3 text-base/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50 sm:text-sm/6"
            >
              Edit
            </router-link>
          </div>
          <p class="mt-3 text-sm/6 text-zinc-500 tabular-nums">
            {{ detail.model.downloads_count.toLocaleString() }} downloads
            <template v-if="detail.model.published_at"> · Published {{ new Date(detail.model.published_at).toLocaleDateString() }}</template>
            · {{ detail.model.license }}
          </p>

          <h2 class="mt-10 text-base/7 font-semibold">Files</h2>
          <ul role="list" class="mt-2 divide-y divide-zinc-950/5 border-y border-zinc-950/5">
            <li v-for="f in modelFiles" :key="f.id" class="flex items-center gap-3 py-3">
              <CubeIcon class="size-4 shrink-0 text-zinc-400" />
              <p class="min-w-0 flex-1 truncate text-base/6 sm:text-sm/6">{{ f.filename }}</p>
              <p class="shrink-0 text-sm/6 text-zinc-500 tabular-nums">{{ formatSize(f.size) }}</p>
              <a :href="f.download_url" :aria-label="`Download ${f.filename}`" class="relative shrink-0 rounded-md p-1 hover:bg-zinc-950/5">
                <ArrowDownTrayIcon class="size-4 text-zinc-500" />
                <span class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true"></span>
              </a>
            </li>
          </ul>

          <template v-if="settings">
            <h2 class="mt-10 text-base/7 font-semibold">Print settings</h2>
            <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <div v-for="(v, k) in settings" :key="k" class="flex flex-col gap-0.5">
                <dt class="text-sm/6 text-zinc-500 capitalize">{{ String(k).replace(/_/g, ' ') }}</dt>
                <dd class="text-base/6 font-medium sm:text-sm/6">{{ v }}</dd>
              </div>
            </dl>
          </template>
        </div>
      </div>

      <!-- About + trust -->
      <div class="mt-16 grid gap-x-12 gap-y-10 border-t border-zinc-950/5 pt-10 lg:grid-cols-[7fr_5fr]">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">About this model</h2>
          <div class="mt-4 flex max-w-[65ch] flex-col gap-4 text-base/7 text-pretty text-zinc-700">
            <p class="whitespace-pre-wrap">{{ detail.model.description }}</p>
          </div>
          <ul v-if="detail.model.tags.length" role="list" class="mt-6 flex flex-wrap gap-2">
            <li v-for="t in detail.model.tags" :key="t">
              <router-link :to="`/models?q=${encodeURIComponent(t)}`" class="block rounded-full bg-zinc-950/5 px-2.5 py-1 text-sm/6 text-zinc-700 hover:bg-zinc-950/10">{{ t }}</router-link>
            </li>
          </ul>
        </div>
        <aside class="flex flex-col gap-6">
          <div class="rounded-xl bg-zinc-50 p-6">
            <h2 class="flex items-center gap-2 text-base/7 font-semibold">
              <ShieldCheckIcon class="size-4 text-emerald-600" />
              Why you can trust this page
            </h2>
            <p class="mt-2 text-base/7 text-pretty text-zinc-600 sm:text-sm/6">
              Every file, photo and description on YidPrint is checked by a reviewer against our
              <router-link to="/guidelines" class="font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2 hover:decoration-blue-700">kosher guidelines</router-link>
              before it's published.
            </p>
          </div>
          <button type="button" class="flex w-fit items-center gap-1.5 text-sm/6 text-zinc-500 hover:text-zinc-950" @click="reportOpen = true">
            <FlagIcon class="size-4 text-zinc-400" />
            Report this model
          </button>
        </aside>
      </div>

      <!-- More from creator -->
      <section v-if="moreFromCreator.length" class="mt-16 border-t border-zinc-950/5 pt-10">
        <div class="flex items-end justify-between gap-4">
          <h2 class="text-xl font-semibold tracking-tight text-balance text-zinc-950">More from {{ detail.creator.display_name }}</h2>
          <router-link :to="`/u/${detail.creator.username}`" class="flex shrink-0 items-center gap-1 text-sm/6 font-medium text-blue-700 hover:text-blue-800">
            View all<ChevronRightIcon class="size-4" />
          </router-link>
        </div>
        <div class="mt-6"><ModelGrid :models="moreFromCreator" /></div>
      </section>
    </template>
    <SkeletonGrid v-else :count="4" />

    <!-- Report dialog -->
    <div v-if="reportOpen" class="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4" @click.self="reportOpen = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-semibold">Report this model</h2>
        <div class="mt-4 flex flex-col gap-2">
          <label v-for="r in reportPresets" :key="r" class="flex items-center gap-2 text-sm/6">
            <input type="radio" name="report-reason" :value="r" v-model="reportReason" class="accent-blue-700" />
            {{ r }}
          </label>
        </div>
        <textarea
          v-model="reportNote"
          rows="3"
          placeholder="Anything else we should know? (optional)"
          class="mt-4 w-full rounded-lg border border-zinc-300 p-2 text-sm/6"
        />
        <p v-if="reportDone" class="mt-2 text-sm/6 text-emerald-700">Report submitted. Thank you.</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm/6 text-zinc-600 hover:bg-zinc-50" @click="reportOpen = false">Cancel</button>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-3 py-1.5 text-sm/6 font-medium text-white disabled:opacity-50"
            :disabled="!reportReason"
            @click="sendReport"
          >
            Submit report
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { zip } from 'fflate';
import {
  ChevronRightIcon, PhotoIcon, CubeIcon, CheckBadgeIcon, ShieldCheckIcon,
  ArrowDownTrayIcon, HeartIcon, FlagIcon,
} from '@heroicons/vue/16/solid';
import { api, formatSize, initials, type Category, type ModelSummary } from '../lib/api';
import ModelViewer from '../components/ModelViewer.vue';
import ModelGrid from '../components/ModelGrid.vue';
import SkeletonGrid from '../components/SkeletonGrid.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { currentUser } from '../lib/auth';

type Detail = Awaited<ReturnType<typeof api.getModel>>;

const route = useRoute();
const detail = ref<Detail | null>(null);
const loadError = ref('');
const categories = ref<Category[]>([]);
const moreFromCreator = ref<ModelSummary[]>([]);
const view = ref<'photos' | '3d'>('photos');
const selectedImage = ref('');
const reportOpen = ref(false);
const reportReason = ref('');
const reportNote = ref('');
const reportDone = ref(false);
const zipping = ref(false);

const reportPresets = ["Not kosher", "Doesn't print", 'Copied design', 'Other'];

const images = computed(() => detail.value?.files.filter((f) => f.kind === 'image') ?? []);
const modelFiles = computed(() => detail.value?.files.filter((f) => f.kind === 'model') ?? []);
const currentImage = computed(() => images.value.find((i) => i.id === selectedImage.value) ?? images.value[0] ?? null);
const previewFile = computed(() => modelFiles.value.find((f) => /\.(stl|3mf|obj)$/i.test(f.filename)) ?? null);
const settings = computed(() => {
  const s = detail.value?.model.print_settings;
  return s && Object.keys(s).length ? s : null;
});
const categoryName = computed(
  () => categories.value.find((c) => c.slug === detail.value?.model.category_slug)?.name ?? detail.value?.model.category_slug
);
const creatorInitials = computed(() => initials(detail.value?.creator.display_name ?? '?'));
const isOwner = computed(() => currentUser.value && detail.value && currentUser.value.id === detail.value.model.user_id);

async function load() {
  detail.value = null;
  loadError.value = '';
  try {
    detail.value = await api.getModel(route.params.slug as string);
    selectedImage.value = images.value[0]?.id ?? '';
    const profile = await api.userProfile(detail.value.creator.username);
    moreFromCreator.value = profile.models.filter((m) => m.slug !== detail.value!.model.slug).slice(0, 4);
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Not found';
  }
}

async function toggleLike() {
  if (!currentUser.value) return alert('Sign in to like models.');
  if (!detail.value) return;
  if (detail.value.liked_by_me) {
    await api.unlike(detail.value.model.id);
    detail.value.model.likes_count--;
    detail.value.liked_by_me = false;
  } else {
    await api.like(detail.value.model.id);
    detail.value.model.likes_count++;
    detail.value.liked_by_me = true;
  }
}

async function sendReport() {
  if (!detail.value || !reportReason.value) return;
  const reason = reportNote.value.trim() ? `${reportReason.value}: ${reportNote.value.trim()}` : reportReason.value;
  await api.report(detail.value.model.id, reason);
  reportDone.value = true;
  setTimeout(() => { reportOpen.value = false; reportDone.value = false; }, 1200);
}

async function downloadAll() {
  if (!detail.value) return;
  zipping.value = true;
  try {
    const entries: Record<string, Uint8Array> = {};
    for (const f of modelFiles.value) {
      const res = await fetch(f.url);
      entries[f.filename] = new Uint8Array(await res.arrayBuffer());
    }
    const zipped = await new Promise<Uint8Array>((resolve, reject) =>
      zip(entries, (err, data) => (err ? reject(err) : resolve(data)))
    );
    const blob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${detail.value.model.slug}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  } finally {
    zipping.value = false;
  }
}

watch(() => route.params.slug, load);
onMounted(async () => {
  load();
  categories.value = (await api.categories()).categories;
});
</script>
