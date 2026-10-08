<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-6 text-2xl font-bold">Upload a model</h1>
    <p class="mb-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
      Every model is reviewed by our team before it's published. Please read the
      <router-link to="/guidelines" class="text-blue-700 hover:underline">community guidelines</router-link>.
    </p>

    <ModelForm @change="(f) => Object.assign(meta, f)" />

    <div class="mt-6 space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium">Model files (STL, 3MF, OBJ, STEP)</label>
        <input type="file" multiple accept=".stl,.3mf,.obj,.step,.stp" @change="pickModels" />
        <ul class="mt-2 space-y-1 text-sm text-zinc-600">
          <li v-for="(f, i) in modelFiles" :key="i">{{ f.name }} — {{ formatSize(f.size) }}</li>
        </ul>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">Images (JPG, PNG, WebP — first becomes the cover)</label>
        <input type="file" multiple accept="image/*" @change="pickImages" />
        <ul class="mt-2 space-y-1 text-sm text-zinc-600">
          <li v-for="(f, i) in imageFiles" :key="i">{{ f.name }} — {{ formatSize(f.size) }}</li>
        </ul>
      </div>
    </div>

    <div v-if="progress" class="mt-4 text-sm text-zinc-600">{{ progress }}</div>
    <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>

    <div class="mt-6 flex gap-3">
      <button
        class="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        :disabled="busy"
        @click="save(true)"
      >
        Submit for review
      </button>
      <button class="rounded-md border border-zinc-300 px-4 py-2 text-sm" :disabled="busy" @click="save(false)">
        Save draft
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, formatSize } from '../lib/api';
import { resizeImage } from '../lib/image';
import { currentUser } from '../lib/auth';
import ModelForm from '../components/ModelForm.vue';

const router = useRouter();
const meta = ref<Record<string, unknown>>({ print_settings: {} });
const modelFiles = ref<File[]>([]);
const imageFiles = ref<File[]>([]);
const busy = ref(false);
const progress = ref('');
const error = ref('');

function pickModels(e: Event) {
  modelFiles.value = [...((e.target as HTMLInputElement).files ?? [])];
}
function pickImages(e: Event) {
  imageFiles.value = [...((e.target as HTMLInputElement).files ?? [])];
}

async function save(submit: boolean) {
  error.value = '';
  if (!currentUser.value) {
    router.push('/login');
    return;
  }
  busy.value = true;
  try {
    const { model } = await api.createModel(meta.value);
    for (const f of modelFiles.value) {
      progress.value = `Uploading ${f.name}…`;
      await api.uploadFile(model.id, 'model', f, f.name, (p) => (progress.value = `Uploading ${f.name}… ${p}%`));
    }
    for (const f of imageFiles.value) {
      progress.value = `Processing ${f.name}…`;
      const webp = await resizeImage(f);
      const name = f.name.replace(/\.\w+$/, '') + '.webp';
      progress.value = `Uploading ${name}…`;
      await api.uploadFile(model.id, 'image', webp, name, (p) => (progress.value = `Uploading ${name}… ${p}%`));
    }
    if (submit) {
      progress.value = 'Submitting for review…';
      await api.submitModel(model.id);
    }
    router.push(`/models/${model.slug}`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed';
  } finally {
    busy.value = false;
    progress.value = '';
  }
}
</script>
