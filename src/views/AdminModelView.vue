<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <p v-if="error && !detail" class="py-16 text-center text-zinc-500">{{ error }}</p>
    <template v-else-if="detail">
      <div class="flex items-center justify-between gap-4">
        <nav aria-label="Breadcrumb">
          <ol role="list" class="flex items-center gap-1.5 text-sm/6 text-zinc-500">
            <li><router-link to="/admin" class="hover:text-zinc-950">Review queue</router-link></li>
            <li><ChevronRightIcon class="size-4 text-zinc-400" /></li>
            <li class="text-zinc-950">{{ detail.model.title }}</li>
          </ol>
        </nav>
        <StatusBadge :status="detail.model.status" />
      </div>

      <div class="mt-6 grid gap-x-12 gap-y-10 lg:grid-cols-[7fr_5fr]">
        <div class="flex flex-col gap-4">
          <ModelViewer v-if="previewFile" :url="previewFile.url" :filename="previewFile.filename" />
          <ul v-if="images.length" role="list" class="grid grid-cols-3 gap-3">
            <li v-for="img in images" :key="img.id">
              <img :src="img.url" :alt="img.filename" class="aspect-square w-full rounded-lg object-cover outline-1 -outline-offset-1 outline-black/5" />
            </li>
          </ul>
        </div>

        <div class="flex flex-col">
          <h1 class="text-3xl font-semibold tracking-tight text-balance">{{ detail.model.title }}</h1>
          <p class="mt-2 text-sm/6 text-zinc-500">
            by {{ detail.creator.display_name }} (@{{ detail.creator.username }}, {{ detail.creator.email }})<br />
            {{ categoryName }} · {{ detail.model.license }} · submitted {{ new Date(detail.model.created_at).toLocaleString() }}
          </p>
          <ul v-if="detail.model.tags.length" class="mt-3 flex flex-wrap gap-1.5">
            <li v-for="t in detail.model.tags" :key="t" class="rounded-full bg-zinc-950/5 px-2.5 py-1 text-xs text-zinc-700">{{ t }}</li>
          </ul>
          <p class="mt-4 whitespace-pre-wrap text-sm/6 text-zinc-700">{{ detail.model.description }}</p>

          <h2 class="mt-8 text-base/7 font-semibold">Files</h2>
          <ul role="list" class="mt-2 divide-y divide-zinc-950/5 border-y border-zinc-950/5">
            <li v-for="f in detail.files" :key="f.id" class="flex items-center gap-3 py-3">
              <component :is="f.kind === 'model' ? CubeIcon : PhotoIcon" class="size-4 shrink-0 text-zinc-400" />
              <p class="min-w-0 flex-1 truncate text-sm/6">{{ f.filename }}</p>
              <p class="shrink-0 text-sm/6 text-zinc-500 tabular-nums">{{ formatSize(f.size) }}</p>
              <a :href="f.download_url" :aria-label="`Download ${f.filename}`" class="rounded-md p-1 hover:bg-zinc-950/5">
                <ArrowDownTrayIcon class="size-4 text-zinc-500" />
              </a>
            </li>
          </ul>

          <!-- Sticky action bar -->
          <div class="sticky bottom-4 mt-8 flex gap-3 rounded-xl bg-white/90 p-3 shadow-lg ring-1 ring-zinc-950/10 backdrop-blur">
            <button
              type="button"
              class="flex-1 rounded-lg bg-emerald-700 py-2.5 text-sm/6 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              :disabled="busy"
              @click="approve"
            >
              Approve
            </button>
            <button
              type="button"
              class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm/6 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              :disabled="busy"
              @click="rejectOpen = true"
            >
              Reject
            </button>
            <button
              v-if="detail.model.status === 'approved'"
              type="button"
              class="rounded-lg px-3 py-2.5 text-sm/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50 disabled:opacity-50"
              :disabled="busy"
              @click="rejectOpen = true; rejectingFor = 'unpublish'"
            >
              Unpublish
            </button>
          </div>
          <p v-if="error" class="mt-2 text-sm/6 text-red-600">{{ error }}</p>
        </div>
      </div>
    </template>
    <div v-else class="py-16"><SkeletonGrid :count="4" /></div>

    <!-- Reject dialog -->
    <div v-if="rejectOpen" class="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4" @click.self="rejectOpen = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 class="text-lg font-semibold">{{ rejectingFor === 'unpublish' ? 'Unpublish' : 'Reject' }} — {{ detail?.model.title }}</h2>
        <div class="mt-4 flex flex-col gap-2">
          <label v-for="r in rejectPresets" :key="r" class="flex items-center gap-2 text-sm/6">
            <input type="checkbox" :value="r" v-model="rejectReasons" class="accent-blue-700" />
            {{ r }}
          </label>
        </div>
        <textarea
          v-model="rejectNote"
          rows="3"
          placeholder="Note to the creator (optional)"
          class="mt-4 w-full rounded-lg border border-zinc-300 p-2 text-sm/6"
        />
        <p v-if="rejectError" class="mt-2 text-sm/6 text-red-600">{{ rejectError }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm/6 text-zinc-600 hover:bg-zinc-50" @click="rejectOpen = false">Cancel</button>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-3 py-1.5 text-sm/6 font-medium text-white disabled:opacity-50"
            :disabled="!rejectReasons.length && !rejectNote.trim()"
            @click="reject"
          >
            {{ rejectingFor === 'unpublish' ? 'Unpublish' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronRightIcon, CubeIcon, PhotoIcon, ArrowDownTrayIcon } from '@heroicons/vue/16/solid';
import { api, formatSize, type Category } from '../lib/api';
import ModelViewer from '../components/ModelViewer.vue';
import SkeletonGrid from '../components/SkeletonGrid.vue';
import StatusBadge from '../components/StatusBadge.vue';

type Detail = Awaited<ReturnType<typeof api.adminGetModel>>;

const route = useRoute();
const router = useRouter();
const detail = ref<Detail | null>(null);
const categories = ref<Category[]>([]);
const busy = ref(false);
const error = ref('');
const rejectOpen = ref(false);
const rejectingFor = ref<'reject' | 'unpublish'>('reject');
const rejectReasons = ref<string[]>([]);
const rejectNote = ref('');
const rejectError = ref('');

const rejectPresets = [
  'People shown in photos',
  'Symbols of other religions',
  'Immodest or inappropriate',
  'Weapon or weapon part',
  'Mocks Torah or people',
  'Copied or not your design',
  "Low quality or doesn't print",
];

const images = computed(() => detail.value?.files.filter((f) => f.kind === 'image') ?? []);
const previewFile = computed(
  () => detail.value?.files.find((f) => f.kind === 'model' && /\.(stl|3mf|obj)$/i.test(f.filename)) ?? null
);
const categoryName = computed(
  () => categories.value.find((c) => c.slug === detail.value?.model.category_slug)?.name ?? detail.value?.model.category_slug
);

async function nextInQueue() {
  const { models } = await api.adminQueue();
  const next = models.find((m) => m.id !== detail.value?.model.id);
  if (next) router.push(`/admin/models/${next.id}`);
  else router.push('/admin');
}

async function approve() {
  busy.value = true;
  error.value = '';
  try {
    await api.adminApprove(detail.value!.model.id);
    await nextInQueue();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed';
    busy.value = false;
  }
}

async function reject() {
  const reason = [...rejectReasons.value, rejectNote.value.trim()].filter(Boolean).join('; ');
  if (!reason) {
    rejectError.value = 'Pick a reason or add a note.';
    return;
  }
  busy.value = true;
  rejectError.value = '';
  try {
    if (rejectingFor.value === 'unpublish') await api.adminUnpublish(detail.value!.model.id, reason);
    else await api.adminReject(detail.value!.model.id, reason);
    await nextInQueue();
  } catch (e) {
    rejectError.value = e instanceof Error ? e.message : 'Failed';
    busy.value = false;
  }
}

async function load() {
  try {
    detail.value = await api.adminGetModel(route.params.id as string);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Not found';
  }
}

watch(
  () => route.params.id,
  () => {
    if (route.params.id) load();
  }
);

onMounted(async () => {
  load();
  categories.value = (await api.categories()).categories;
});
</script>
