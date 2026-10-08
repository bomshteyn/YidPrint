<template>
  <div v-if="detail">
    <div
      v-if="detail.model.status !== 'approved'"
      class="mb-4 rounded-md border px-4 py-3 text-sm"
      :class="detail.model.status === 'rejected' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-800'"
    >
      <StatusBadge :status="detail.model.status" />
      <span class="ml-2">This model is not publicly visible.</span>
      <p v-if="detail.model.reject_reason" class="mt-1">Reason: {{ detail.model.reject_reason }}</p>
    </div>

    <div class="grid gap-8 lg:grid-cols-2">
      <div>
        <ModelViewer v-if="previewFile" :url="previewFile.url" :filename="previewFile.filename" />
        <div class="mt-3 grid grid-cols-4 gap-2">
          <img
            v-for="img in images"
            :key="img.id"
            :src="img.url"
            :alt="img.filename"
            class="aspect-square cursor-pointer rounded-md border object-cover"
            :class="img.id === selectedImage ? 'border-blue-700' : 'border-zinc-200'"
            @click="selectedImage = img.id"
          />
        </div>
        <img
          v-if="images.length"
          :src="images.find((i) => i.id === selectedImage)?.url ?? images[0].url"
          class="mt-3 w-full rounded-lg border border-zinc-200 object-cover"
        />
      </div>

      <div>
        <h1 class="text-2xl font-bold">{{ detail.model.title }}</h1>
        <p class="mt-1 text-sm text-zinc-500">
          by
          <router-link :to="`/u/${detail.creator.username}`" class="text-blue-700 hover:underline">{{
            detail.creator.display_name
          }}</router-link>
          · {{ categoryName }} · {{ detail.model.license }}
        </p>
        <div class="mt-2 flex flex-wrap gap-1">
          <span
            v-for="t in detail.model.tags"
            :key="t"
            class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
            >{{ t }}</span
          >
        </div>

        <p class="mt-4 whitespace-pre-wrap text-sm text-zinc-700">{{ detail.model.description }}</p>

        <div v-if="settings" class="mt-4 rounded-md border border-zinc-200 p-3 text-sm">
          <h3 class="mb-1 font-medium">Print settings</h3>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-600">
            <template v-for="(v, k) in settings" :key="k">
              <dt class="capitalize">{{ String(k).replace(/_/g, ' ') }}</dt>
              <dd>{{ v }}</dd>
            </template>
          </dl>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button
            class="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            :disabled="zipping || !modelFiles.length"
            @click="downloadAll"
          >
            {{ zipping ? 'Building zip…' : 'Download all' }}
          </button>
          <button class="rounded-md border border-zinc-300 px-4 py-2 text-sm" @click="toggleLike">
            {{ detail.liked_by_me ? '♥ Liked' : '♡ Like' }} ({{ detail.model.likes_count }})
          </button>
          <button class="text-sm text-zinc-500 hover:text-red-700" @click="reportOpen = true">Report</button>
        </div>
        <p class="mt-1 text-xs text-zinc-500">{{ detail.model.downloads_count }} downloads</p>

        <div v-if="reportOpen" class="mt-3 rounded-md border border-zinc-200 p-3">
          <textarea
            v-model="reportReason"
            rows="3"
            placeholder="Why are you reporting this model?"
            class="w-full rounded-md border border-zinc-300 p-2 text-sm"
          />
          <div class="mt-2 flex gap-2">
            <button class="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white" @click="sendReport">Submit report</button>
            <button class="text-sm text-zinc-500" @click="reportOpen = false">Cancel</button>
          </div>
          <p v-if="reportDone" class="mt-1 text-sm text-green-700">Report submitted. Thank you.</p>
        </div>

        <h3 class="mt-6 font-medium">Files</h3>
        <ul class="mt-2 divide-y divide-zinc-100 rounded-md border border-zinc-200 text-sm">
          <li v-for="f in detail.files" :key="f.id" class="flex items-center gap-3 px-3 py-2">
            <span class="flex-1 truncate">{{ f.filename }}</span>
            <span class="text-xs text-zinc-500">{{ f.kind }} · {{ formatSize(f.size) }}</span>
            <a :href="f.download_url" class="text-blue-700 hover:underline">Download</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <p v-else-if="loadError" class="text-zinc-500">{{ loadError }}</p>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { zip } from 'fflate';
import { api, formatSize, type Category, type ModelFile } from '../lib/api';
import ModelViewer from '../components/ModelViewer.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { currentUser } from '../lib/auth';

type Detail = Awaited<ReturnType<typeof api.getModel>>;

const route = useRoute();
const detail = ref<Detail | null>(null);
const loadError = ref('');
const categories = ref<Category[]>([]);
const selectedImage = ref('');
const reportOpen = ref(false);
const reportReason = ref('');
const reportDone = ref(false);
const zipping = ref(false);

const images = computed(() => detail.value?.files.filter((f) => f.kind === 'image') ?? []);
const modelFiles = computed(() => detail.value?.files.filter((f) => f.kind === 'model') ?? []);
const previewFile = computed(() => {
  const files = modelFiles.value;
  return files.find((f) => /\.(stl|3mf|obj)$/i.test(f.filename)) ?? null;
});
const settings = computed(() => {
  const s = detail.value?.model.print_settings;
  return s && Object.keys(s).length ? s : null;
});
const categoryName = computed(
  () => categories.value.find((c) => c.slug === detail.value?.model.category_slug)?.name ?? detail.value?.model.category_slug
);

async function load() {
  try {
    detail.value = await api.getModel(route.params.slug as string);
    selectedImage.value = images.value[0]?.id ?? '';
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
  if (!detail.value || !reportReason.value.trim()) return;
  await api.report(detail.value.model.id, reportReason.value.trim());
  reportDone.value = true;
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

onMounted(async () => {
  load();
  categories.value = (await api.categories()).categories;
});
</script>
