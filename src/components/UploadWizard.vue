<template>
  <div>
    <!-- Success screen -->
    <div v-if="done" class="mx-auto max-w-md py-16 text-center">
      <div class="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50">
        <CheckIcon class="size-7 text-emerald-600" />
      </div>
      <h2 class="mt-6 text-2xl font-semibold tracking-tight">Thanks! Your model is in review</h2>
      <p class="mt-2 text-zinc-600">We'll publish it once it's approved.</p>
      <div class="mt-8 flex justify-center gap-3">
        <router-link to="/me" class="rounded-lg bg-blue-700 px-4 py-2.5 text-sm/6 font-semibold text-white hover:bg-blue-800">My models</router-link>
        <button type="button" class="rounded-lg px-4 py-2.5 text-sm/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50" @click="reset">Upload another</button>
      </div>
    </div>

    <template v-else>
      <!-- Step indicator -->
      <ol class="mb-8 flex items-center gap-2 text-sm/6 font-medium">
        <template v-for="(s, i) in ['Files', 'Photos & details', 'Review & submit']" :key="s">
          <li class="flex items-center gap-2" :class="i === step ? 'text-zinc-950' : 'text-zinc-400'">
            <span
              class="grid size-6 place-items-center rounded-full text-xs font-semibold"
              :class="i < step ? 'bg-emerald-100 text-emerald-800' : i === step ? 'bg-blue-700 text-white' : 'bg-zinc-100 text-zinc-500'"
            >
              <CheckIcon v-if="i < step" class="size-3.5" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="max-sm:hidden">{{ s }}</span>
          </li>
          <li v-if="i < 2" class="h-px flex-1 bg-zinc-200" aria-hidden="true"></li>
        </template>
      </ol>

      <p
        v-if="existing && existing.model.status === 'approved'"
        class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm/6 text-amber-800"
      >
        Saving changes sends this model back to review — it will be hidden until re-approved.
      </p>

      <!-- STEP 1: model files -->
      <section v-if="step === 0">
        <h2 class="text-lg font-semibold">Model files</h2>
        <p class="mt-1 text-sm/6 text-zinc-600">STL, 3MF, OBJ or STEP — up to 25 MB each.</p>
        <div
          class="mt-4 grid place-items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition"
          :class="dragOver === 'model' ? 'border-blue-600 bg-blue-50' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'"
          @dragover.prevent="dragOver = 'model'"
          @dragleave="dragOver = ''"
          @drop.prevent="onDrop($event, 'model')"
        >
          <ArrowUpTrayIcon class="size-8 text-zinc-400" />
          <p class="mt-3 text-sm/6 text-zinc-600">Drag files here, or</p>
          <label class="mt-2 cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50">
            Browse files
            <input type="file" multiple accept=".stl,.3mf,.obj,.step,.stp" class="hidden" @change="pickModels" />
          </label>
        </div>
        <ul class="mt-4 divide-y divide-zinc-950/5 border-y border-zinc-950/5">
          <li v-for="f in modelFiles" :key="f.key" class="flex items-center gap-3 py-3">
            <CubeIcon class="size-4 shrink-0 text-zinc-400" />
            <p class="min-w-0 flex-1 truncate text-sm/6">{{ f.name }}</p>
            <p class="text-sm/6 text-zinc-500 tabular-nums">{{ formatSize(f.size) }}</p>
            <button type="button" :aria-label="`Remove ${f.name}`" class="relative rounded-md p-1 hover:bg-zinc-950/5" @click="removePending('model', f.key)">
              <XMarkIcon class="size-4 text-zinc-500" />
              <span class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true"></span>
            </button>
          </li>
          <li v-for="f in existingModelFiles" :key="f.id" class="flex items-center gap-3 py-3">
            <CubeIcon class="size-4 shrink-0 text-zinc-400" />
            <p class="min-w-0 flex-1 truncate text-sm/6">{{ f.filename }} <span class="text-xs text-zinc-400">(uploaded)</span></p>
            <p class="text-sm/6 text-zinc-500 tabular-nums">{{ formatSize(f.size) }}</p>
            <button type="button" :aria-label="`Delete ${f.filename}`" class="relative rounded-md p-1 hover:bg-zinc-950/5" @click="deleteStored(f.id)">
              <XMarkIcon class="size-4 text-zinc-500" />
              <span class="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden" aria-hidden="true"></span>
            </button>
          </li>
        </ul>
        <div v-if="firstPreviewable" class="mt-4">
          <ModelViewer :url="firstPreviewable.url" :filename="firstPreviewable.name" />
        </div>
      </section>

      <!-- STEP 2: photos + details -->
      <section v-else-if="step === 1">
        <h2 class="text-lg font-semibold">Photos</h2>
        <p class="mt-1 text-sm/6 text-zinc-600">Photos of the printed result work best. JPG/PNG/WebP — resized to 1600px WebP before upload. Click a thumbnail to make it the cover.</p>
        <div
          class="mt-4 grid place-items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition"
          :class="dragOver === 'image' ? 'border-blue-600 bg-blue-50' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'"
          @dragover.prevent="dragOver = 'image'"
          @dragleave="dragOver = ''"
          @drop.prevent="onDrop($event, 'image')"
        >
          <PhotoIcon class="size-8 text-zinc-400" />
          <p class="mt-3 text-sm/6 text-zinc-600">Drag photos here, or</p>
          <label class="mt-2 cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50">
            Browse photos
            <input type="file" multiple accept="image/*" class="hidden" @change="pickImages" />
          </label>
        </div>
        <ul class="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          <li v-for="(img, i) in imageFiles" :key="img.key">
            <button
              type="button"
              :aria-label="`Photo ${i + 1}`"
              class="relative block w-full rounded-lg"
              :class="i === coverIndex ? 'outline-2 outline-offset-2 outline-blue-600' : 'hover:opacity-80'"
              @click="coverIndex = i"
            >
              <img :src="img.url" class="aspect-square w-full rounded-lg object-cover outline-1 -outline-offset-1 outline-black/5" />
              <span v-if="i === coverIndex" class="absolute top-1 left-1 rounded-md bg-blue-700 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">Cover</span>
            </button>
            <button type="button" class="mt-1 text-xs text-zinc-500 hover:text-red-600" @click="removePending('image', img.key)">Remove</button>
          </li>
          <li v-for="f in existingImageFiles" :key="f.id">
            <button
              type="button"
              class="relative block w-full rounded-lg"
              :class="coverId === f.id ? 'outline-2 outline-offset-2 outline-blue-600' : 'hover:opacity-80'"
              @click="coverId = f.id"
            >
              <img :src="f.url" class="aspect-square w-full rounded-lg object-cover outline-1 -outline-offset-1 outline-black/5" />
              <span v-if="coverId === f.id" class="absolute top-1 left-1 rounded-md bg-blue-700 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">Cover</span>
            </button>
            <button type="button" class="mt-1 text-xs text-zinc-500 hover:text-red-600" @click="deleteStored(f.id)">Delete</button>
          </li>
        </ul>

        <div class="mt-8 space-y-4">
          <div>
            <label class="mb-1 block text-sm/6 font-medium">Title</label>
            <input v-model="meta.title" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
          </div>
          <div>
            <label class="mb-1 block text-sm/6 font-medium">Description</label>
            <textarea v-model="meta.description" rows="4" placeholder="What is it? How does it print?" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm/6 font-medium">Category</label>
              <select v-model="meta.category_slug" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:outline-blue-600">
                <option value="" disabled>Select…</option>
                <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm/6 font-medium">License</label>
              <select v-model="meta.license" class="w-full rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10 focus:bg-white focus:outline-2 focus:outline-blue-600">
                <option value="" disabled>Select…</option>
                <option v-for="l in LICENSES" :key="l" :value="l">{{ l }}</option>
              </select>
              <p v-if="meta.license" class="mt-1 text-xs/5 text-zinc-500">{{ LICENSE_DESCRIPTIONS[meta.license] }}</p>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm/6 font-medium">Tags</label>
            <div class="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-950/[0.03] px-3 py-2 ring-1 ring-zinc-950/10 focus-within:bg-white">
              <span v-for="(t, i) in meta.tags" :key="t" class="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                {{ t }}
                <button type="button" :aria-label="`Remove tag ${t}`" @click="meta.tags.splice(i, 1)"><XMarkIcon class="size-3" /></button>
              </span>
              <input
                v-model="tagInput"
                placeholder="Type + Enter"
                class="min-w-24 flex-1 bg-transparent py-0.5 text-sm/6 focus:outline-none"
                @keydown.enter.prevent="addTag"
                @keydown.,.prevent="addTag"
              />
            </div>
          </div>
          <fieldset class="rounded-xl border border-zinc-200 p-4">
            <legend class="px-1 text-sm/6 font-medium">Print settings (optional)</legend>
            <div class="grid gap-3 sm:grid-cols-3">
              <input v-model="meta.print_settings.material" placeholder="Material (e.g. PLA)" class="rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10" />
              <input v-model="meta.print_settings.layer_height" placeholder="Layer height" class="rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10" />
              <input v-model="meta.print_settings.infill" placeholder="Infill" class="rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10" />
              <input v-model="meta.print_settings.supports" placeholder="Supports" class="rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10" />
              <input v-model="meta.print_settings.print_time" placeholder="Print time" class="rounded-lg border-0 bg-zinc-950/[0.03] px-3 py-2 text-sm/6 ring-1 ring-zinc-950/10" />
            </div>
          </fieldset>
        </div>
      </section>

      <!-- STEP 3: review & submit -->
      <section v-else>
        <h2 class="text-lg font-semibold">Review & submit</h2>
        <dl class="mt-4 grid gap-x-6 gap-y-3 rounded-xl bg-zinc-50 p-5 text-sm/6 sm:grid-cols-2">
          <div><dt class="text-zinc-500">Title</dt><dd class="font-medium">{{ meta.title || '—' }}</dd></div>
          <div><dt class="text-zinc-500">Category</dt><dd class="font-medium">{{ categories.find((c) => c.slug === meta.category_slug)?.name ?? '—' }}</dd></div>
          <div><dt class="text-zinc-500">License</dt><dd class="font-medium">{{ meta.license || '—' }}</dd></div>
          <div><dt class="text-zinc-500">Files</dt><dd class="font-medium">{{ modelFiles.length + existingModelFiles.length }} model, {{ imageFiles.length + existingImageFiles.length }} photos</dd></div>
        </dl>
        <label class="mt-6 flex items-start gap-2 text-sm/6">
          <input v-model="agree" type="checkbox" class="mt-1 accent-blue-700" />
          <span>
            My model follows the
            <router-link to="/guidelines" class="font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2" target="_blank">YidPrint kosher guidelines</router-link>
          </span>
        </label>

        <ul v-if="uploadProgress.length" class="mt-4 space-y-2">
          <li v-for="p in uploadProgress" :key="p.name" class="text-sm/6">
            <div class="flex justify-between"><span>{{ p.name }}</span><span class="tabular-nums text-zinc-500">{{ p.pct }}%</span></div>
            <div class="mt-1 h-1.5 rounded-full bg-zinc-100"><div class="h-1.5 rounded-full bg-blue-700 transition-all" :style="{ width: p.pct + '%' }"></div></div>
          </li>
        </ul>
      </section>

      <p v-if="error" class="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm/6 text-red-700">{{ error }}</p>

      <!-- Nav buttons -->
      <div class="mt-8 flex items-center gap-3">
        <button v-if="step > 0" type="button" class="rounded-lg px-4 py-2.5 text-sm/6 font-medium ring-1 ring-zinc-950/10 hover:bg-zinc-50" :disabled="busy" @click="step--">Back</button>
        <div class="flex-1"></div>
        <button type="button" class="rounded-lg px-4 py-2.5 text-sm/6 font-medium text-zinc-600 hover:bg-zinc-50" :disabled="busy" @click="save(false)">
          Save draft
        </button>
        <button
          v-if="step < 2"
          type="button"
          class="rounded-lg bg-blue-700 px-4 py-2.5 text-sm/6 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          :disabled="busy"
          @click="next"
        >
          Continue
        </button>
        <button
          v-else
          type="button"
          class="rounded-lg bg-blue-700 px-4 py-2.5 text-sm/6 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          :disabled="busy || !agree"
          @click="save(true)"
        >
          {{ busy ? 'Uploading…' : 'Submit for review' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowUpTrayIcon, CubeIcon, PhotoIcon, XMarkIcon, CheckIcon } from '@heroicons/vue/16/solid';
import { api, formatSize, LICENSES, LICENSE_DESCRIPTIONS, type Category, type ModelDetail, type ModelFile } from '../lib/api';
import { resizeImage } from '../lib/image';
import { currentUser } from '../lib/auth';
import ModelViewer from './ModelViewer.vue';

type ExistingFile = ModelFile;

const props = defineProps<{
  existing?: { model: ModelDetail; files: ExistingFile[] } | null;
  onFilesChanged?: () => Promise<void>;
}>();

const router = useRouter();
const step = ref(0);
const done = ref(false);
const busy = ref(false);
const error = ref('');
const agree = ref(false);
const dragOver = ref('');
const categories = ref<Category[]>([]);
const tagInput = ref('');
const coverIndex = ref(0);
const coverId = ref<string | null>(null);
const uploadProgress = ref<{ name: string; pct: number }[]>([]);

interface PendingFile { key: string; name: string; size: number; blob: Blob; url: string }
let keyCounter = 0;
const modelFiles = ref<PendingFile[]>([]);
const imageFiles = ref<PendingFile[]>([]);

const meta = reactive({
  title: '',
  description: '',
  category_slug: '',
  license: '',
  tags: [] as string[],
  print_settings: { material: '', layer_height: '', infill: '', supports: '', print_time: '' } as Record<string, string>,
});

const existingModelFiles = computed(() => props.existing?.files.filter((f) => f.kind === 'model') ?? []);
const existingImageFiles = computed(() => props.existing?.files.filter((f) => f.kind === 'image') ?? []);
const firstPreviewable = computed(() => modelFiles.value.find((f) => /\.(stl|3mf|obj)$/i.test(f.name)) ?? null);

const MODEL_EXTS = ['stl', '3mf', 'obj', 'step', 'stp'];
const MAX_MODEL = 25 * 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024;

function ext(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function pickModels(e: Event) {
  addModels([...((e.target as HTMLInputElement).files ?? [])]);
  (e.target as HTMLInputElement).value = '';
}
function pickImages(e: Event) {
  addImages([...((e.target as HTMLInputElement).files ?? [])]);
  (e.target as HTMLInputElement).value = '';
}
function onDrop(e: DragEvent, kind: 'model' | 'image') {
  dragOver.value = '';
  const files = [...(e.dataTransfer?.files ?? [])];
  if (kind === 'model') addModels(files);
  else addImages(files);
}

function addModels(files: File[]) {
  for (const f of files) {
    if (!MODEL_EXTS.includes(ext(f.name))) {
      error.value = `"${f.name}" — only STL, 3MF, OBJ or STEP files are accepted.`;
      continue;
    }
    if (f.size > MAX_MODEL) {
      error.value = `"${f.name}" is over the 25 MB limit.`;
      continue;
    }
    modelFiles.value.push({ key: `m${keyCounter++}`, name: f.name, size: f.size, blob: f, url: URL.createObjectURL(f) });
  }
}

async function addImages(files: File[]) {
  for (const f of files) {
    if (!f.type.startsWith('image/')) {
      error.value = `"${f.name}" is not an image.`;
      continue;
    }
    try {
      const webp = await resizeImage(f);
      if (webp.size > MAX_IMAGE) {
        error.value = `"${f.name}" is over the 5 MB limit after resizing.`;
        continue;
      }
      const name = f.name.replace(/\.\w+$/, '') + '.webp';
      imageFiles.value.push({ key: `i${keyCounter++}`, name, size: webp.size, blob: webp, url: URL.createObjectURL(webp) });
    } catch {
      error.value = `Couldn't process "${f.name}".`;
    }
  }
}

function removePending(kind: 'model' | 'image', key: string) {
  const list = kind === 'model' ? modelFiles : imageFiles;
  const i = list.value.findIndex((f) => f.key === key);
  if (i >= 0) {
    URL.revokeObjectURL(list.value[i].url);
    list.value.splice(i, 1);
  }
}

async function deleteStored(fileId: string) {
  if (!props.existing) return;
  await api.deleteFile(props.existing.model.id, fileId);
  await props.onFilesChanged?.();
}

function addTag() {
  const t = tagInput.value.trim();
  if (t && !meta.tags.includes(t)) meta.tags.push(t);
  tagInput.value = '';
}

function validateStep(): boolean {
  error.value = '';
  if (step.value === 0 && !modelFiles.value.length && !existingModelFiles.value.length) {
    error.value = 'Add at least one model file (STL, 3MF, OBJ or STEP).';
    return false;
  }
  if (step.value === 1) {
    if (!imageFiles.value.length && !existingImageFiles.value.length) { error.value = 'Add at least one photo.'; return false; }
    if (!meta.title.trim()) { error.value = 'Title is required.'; return false; }
    if (!meta.category_slug) { error.value = 'Pick a category.'; return false; }
    if (!meta.license) { error.value = 'Pick a license.'; return false; }
  }
  return true;
}

function next() {
  if (validateStep()) step.value++;
}

function metaPayload() {
  const ps = Object.fromEntries(Object.entries(meta.print_settings).filter(([, v]) => v));
  return {
    title: meta.title.trim(),
    description: meta.description,
    category_slug: meta.category_slug,
    tags: meta.tags,
    license: meta.license,
    print_settings: ps,
  };
}

async function save(submit: boolean) {
  error.value = '';
  if (!currentUser.value) {
    router.push('/login');
    return;
  }
  if (submit && !validateAll()) return;
  busy.value = true;
  uploadProgress.value = [];
  try {
    // 1. create or update metadata
    let modelId: string;
    if (props.existing) {
      modelId = props.existing.model.id;
      const patch = { ...metaPayload() };
      if (coverId.value) (patch as Record<string, unknown>).cover_file_id = coverId.value;
      await api.patchModel(modelId, patch);
    } else {
      if (!meta.title.trim()) { error.value = 'Title is required.'; step.value = 1; busy.value = false; return; }
      const { model } = await api.createModel(metaPayload());
      modelId = model.id;
    }
    // 2. upload pending files with progress
    for (const f of modelFiles.value) {
      const p = reactive({ name: f.name, pct: 0 });
      uploadProgress.value.push(p);
      await api.uploadFile(modelId, 'model', f.blob, f.name, (pct) => (p.pct = pct));
    }
    for (const f of imageFiles.value) {
      const p = reactive({ name: f.name, pct: 0 });
      uploadProgress.value.push(p);
      await api.uploadFile(modelId, 'image', f.blob, f.name, (pct) => (p.pct = pct));
    }
    // new model: cover = first uploaded image if none selected
    // (server picks the first image at submit time anyway)
    if (submit) {
      await api.submitModel(modelId);
      done.value = true;
    } else {
      router.push('/me');
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong';
  } finally {
    busy.value = false;
  }
}

function validateAll(): boolean {
  step.value = 0;
  if (!validateStep()) return false;
  step.value = 1;
  if (!validateStep()) { step.value = 1; return false; }
  step.value = 2;
  if (!agree.value) { error.value = 'Please confirm your model follows the guidelines.'; return false; }
  return true;
}

function reset() {
  done.value = false;
  step.value = 0;
  agree.value = false;
  modelFiles.value.forEach((f) => URL.revokeObjectURL(f.url));
  imageFiles.value.forEach((f) => URL.revokeObjectURL(f.url));
  modelFiles.value = [];
  imageFiles.value = [];
  Object.assign(meta, {
    title: '', description: '', category_slug: '', license: '', tags: [],
    print_settings: { material: '', layer_height: '', infill: '', supports: '', print_time: '' },
  });
}

onMounted(async () => {
  categories.value = (await api.categories()).categories;
  if (props.existing) {
    const m = props.existing.model;
    meta.title = m.title;
    meta.description = m.description;
    meta.category_slug = m.category_slug;
    meta.license = m.license;
    meta.tags = [...m.tags];
    Object.assign(meta.print_settings, m.print_settings);
    coverId.value = m.cover_file_id;
  }
});
</script>
