<template>
  <div v-if="detail">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Review — {{ detail.model.title }}</h1>
      <StatusBadge :status="detail.model.status" />
    </div>
    <p class="mb-6 text-sm text-zinc-500">
      by {{ detail.creator.display_name }} (@{{ detail.creator.username }}, {{ detail.creator.email }}) ·
      category {{ detail.model.category_slug }} · license {{ detail.model.license }}
    </p>

    <div class="grid gap-8 lg:grid-cols-2">
      <div>
        <ModelViewer v-if="previewFile" :url="previewFile.url" :filename="previewFile.filename" />
        <div class="mt-3 grid grid-cols-3 gap-2">
          <img v-for="img in images" :key="img.id" :src="img.url" class="rounded-md border border-zinc-200 object-cover" />
        </div>
      </div>
      <div>
        <p class="whitespace-pre-wrap text-sm text-zinc-700">{{ detail.model.description }}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          <span v-for="t in detail.model.tags" :key="t" class="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{{ t }}</span>
        </div>
        <h3 class="mt-4 font-medium">Files</h3>
        <ul class="mt-2 divide-y divide-zinc-100 rounded-md border border-zinc-200 text-sm">
          <li v-for="f in detail.files" :key="f.id" class="flex items-center gap-3 px-3 py-2">
            <span class="flex-1 truncate">{{ f.filename }}</span>
            <span class="text-xs text-zinc-500">{{ f.kind }} · {{ formatSize(f.size) }}</span>
            <a :href="f.download_url" class="text-blue-700 hover:underline">Download</a>
          </li>
        </ul>

        <textarea
          v-model="reason"
          rows="3"
          placeholder="Reason (required for reject)"
          class="mt-4 w-full rounded-md border border-zinc-300 p-2 text-sm"
        />
        <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
        <div class="mt-3 flex gap-2">
          <button class="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white" @click="act('approve')">Approve</button>
          <button class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white" @click="act('reject')">Reject</button>
          <button
            v-if="detail.model.status === 'approved'"
            class="rounded-md border border-zinc-300 px-4 py-2 text-sm"
            @click="act('unpublish')"
          >
            Unpublish
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, formatSize } from '../lib/api';
import ModelViewer from '../components/ModelViewer.vue';
import StatusBadge from '../components/StatusBadge.vue';

type Detail = Awaited<ReturnType<typeof api.adminGetModel>>;

const route = useRoute();
const router = useRouter();
const detail = ref<Detail | null>(null);
const reason = ref('');
const error = ref('');

const images = computed(() => detail.value?.files.filter((f) => f.kind === 'image') ?? []);
const previewFile = computed(
  () => detail.value?.files.find((f) => f.kind === 'model' && /\.(stl|3mf|obj)$/i.test(f.filename)) ?? null
);

async function act(action: 'approve' | 'reject' | 'unpublish') {
  error.value = '';
  const id = detail.value!.model.id;
  try {
    if (action === 'approve') await api.adminApprove(id);
    else if (action === 'reject') {
      if (!reason.value.trim()) {
        error.value = 'A reason is required to reject.';
        return;
      }
      await api.adminReject(id, reason.value.trim());
    } else await api.adminUnpublish(id, reason.value.trim());
    router.push('/admin');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Action failed';
  }
}

onMounted(async () => {
  detail.value = await api.adminGetModel(route.params.id as string);
});
</script>
