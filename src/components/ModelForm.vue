<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium">Title</label>
      <input v-model="form.title" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium">Description</label>
      <textarea v-model="form.description" rows="5" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-sm font-medium">Category</label>
        <select v-model="form.category_slug" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
          <option value="" disabled>Select…</option>
          <option v-for="c in categories" :key="c.slug" :value="c.slug">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium">License</label>
        <select v-model="form.license" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm">
          <option value="" disabled>Select…</option>
          <option v-for="l in LICENSES" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
    </div>
    <div>
      <label class="mb-1 block text-sm font-medium">Tags (comma separated)</label>
      <input v-model="tagsInput" class="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
    </div>

    <fieldset class="rounded-md border border-zinc-200 p-3">
      <legend class="px-1 text-sm font-medium">Print settings</legend>
      <div class="grid gap-3 sm:grid-cols-3">
        <input v-model="form.print_settings.material" placeholder="Material (e.g. PLA)" class="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        <input v-model="form.print_settings.layer_height" placeholder="Layer height" class="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        <input v-model="form.print_settings.infill" placeholder="Infill" class="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        <input v-model="form.print_settings.supports" placeholder="Supports" class="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
        <input v-model="form.print_settings.print_time" placeholder="Print time" class="rounded-md border border-zinc-300 px-3 py-2 text-sm" />
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { api, LICENSES, type Category, type ModelDetail } from '../lib/api';

const props = defineProps<{ model?: ModelDetail | null }>();
const emit = defineEmits<{ (e: 'change', form: Record<string, unknown>): void }>();

const categories = ref<Category[]>([]);
const tagsInput = ref('');

const form = reactive({
  title: '',
  description: '',
  category_slug: '',
  license: '',
  tags: [] as string[],
  print_settings: { material: '', layer_height: '', infill: '', supports: '', print_time: '' } as Record<string, string>,
});

watch(
  () => props.model,
  (m) => {
    if (!m) return;
    form.title = m.title;
    form.description = m.description;
    form.category_slug = m.category_slug;
    form.license = m.license;
    form.tags = m.tags;
    tagsInput.value = m.tags.join(', ');
    Object.assign(form.print_settings, m.print_settings);
  },
  { immediate: true }
);

watch(tagsInput, (v) => {
  form.tags = v.split(',').map((t) => t.trim()).filter(Boolean);
});

watch(form, (f) => emit('change', JSON.parse(JSON.stringify(f))), { deep: true });

onMounted(async () => {
  categories.value = (await api.categories()).categories;
});
</script>
