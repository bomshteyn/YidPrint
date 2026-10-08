<template>
  <div v-if="detail" class="mx-auto max-w-2xl">
    <h1 class="mb-6 text-2xl font-bold">Edit — {{ detail.model.title }}</h1>
    <p
      v-if="detail.model.status === 'approved'"
      class="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      Saving changes will return this model to the review queue and hide it until re-approved.
    </p>

    <ModelForm :model="detail.model" @change="(f) => Object.assign(meta, f)" />

    <h2 class="mt-8 mb-2 font-semibold">Files</h2>
    <ul class="divide-y divide-zinc-100 rounded-md border border-zinc-200 text-sm">
      <li v-for="f in detail.files" :key="f.id" class="flex items-center gap-3 px-3 py-2">
        <img v-if="f.kind === 'image'" :src="f.url" class="h-10 w-10 rounded object-cover" />
        <span class="flex-1 truncate">{{ f.filename }}</span>
        <label v-if="f.kind === 'image'" class="text-xs text-zinc-500">
          <input
            type="radio"
            name="cover"
            :checked="detail.model.cover_file_id === f.id"
            @change="setCover(f.id)"
          />
          cover
        </label>
        <button class="text-red-600 hover:underline" @click="removeFile(f.id)">Delete</button>
      </li>
    </ul>

    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-sm font-medium">Add model files</label>
        <input type="file" multiple accept=".stl,.3mf,.obj,.step,.stp" @change="addModels" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">Add images</label>
        <input type="file" multiple accept="image/*" @change="addImages" />
      </div>
    </div>

    <div v-if="progress" class="mt-4 text-sm text-zinc-600">{{ progress }}</div>
    <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>

    <div class="mt-6 flex gap-3">
      <button class="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" :disabled="busy" @click="saveMeta">
        Save changes
      </button>
      <button class="rounded-md border border-zinc-300 px-4 py-2 text-sm" :disabled="busy" @click="resubmit">
        Submit for review
      </button>
      <button class="ml-auto text-sm text-red-600 hover:underline" :disabled="busy" @click="deleteModel">
        Delete model
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../lib/api';
import { resizeImage } from '../lib/image';
import ModelForm from '../components/ModelForm.vue';

type Detail = Awaited<ReturnType<typeof api.getModel>>;

const route = useRoute();
const router = useRouter();
const detail = ref<Detail | null>(null);
const meta = ref<Record<string, unknown>>({});
const busy = ref(false);
const progress = ref('');
const error = ref('');

async function load() {
  detail.value = await api.getModel(route.params.slug as string);
}

async function saveMeta() {
  busy.value = true;
  error.value = '';
  try {
    await api.patchModel(detail.value!.model.id, meta.value);
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed';
  } finally {
    busy.value = false;
  }
}

async function setCover(fileId: string) {
  await api.patchModel(detail.value!.model.id, { cover_file_id: fileId });
  await load();
}

async function removeFile(fileId: string) {
  await api.deleteFile(detail.value!.model.id, fileId);
  await load();
}

async function addModels(e: Event) {
  for (const f of [...((e.target as HTMLInputElement).files ?? [])]) {
    progress.value = `Uploading ${f.name}…`;
    await api.uploadFile(detail.value!.model.id, 'model', f, f.name);
  }
  progress.value = '';
  await load();
}

async function addImages(e: Event) {
  for (const f of [...((e.target as HTMLInputElement).files ?? [])]) {
    progress.value = `Processing ${f.name}…`;
    const webp = await resizeImage(f);
    await api.uploadFile(detail.value!.model.id, 'image', webp, f.name.replace(/\.\w+$/, '') + '.webp');
  }
  progress.value = '';
  await load();
}

async function resubmit() {
  busy.value = true;
  try {
    await api.submitModel(detail.value!.model.id);
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Submit failed';
  } finally {
    busy.value = false;
  }
}

async function deleteModel() {
  if (!confirm('Delete this model and all its files?')) return;
  await api.deleteModel(detail.value!.model.id);
  router.push('/me');
}

onMounted(load);
</script>
