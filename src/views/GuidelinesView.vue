<template>
  <div class="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-semibold tracking-tight text-balance text-zinc-950">Kosher guidelines</h1>
    <p class="mt-4 text-base/7 text-pretty text-zinc-600">
      Every model on YidPrint is reviewed by our team before it's published. To keep YidPrint a place the whole
      family can browse, we don't publish:
    </p>
    <ul role="list" class="mt-8 space-y-3">
      <li v-for="rule in rules" :key="rule" class="flex items-start gap-3 rounded-xl bg-zinc-50 px-4 py-3">
        <XMarkIcon class="mt-0.5 size-4 shrink-0 text-red-500" />
        <span class="text-base/7 text-zinc-700 sm:text-sm/6">{{ rule }}</span>
      </li>
    </ul>
    <p class="mt-8 text-base/7 text-pretty text-zinc-600 sm:text-sm/6">
      Questions or edge cases? <router-link to="/upload" class="font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2">Upload</router-link>
      and a reviewer will take a look — if it can't be published, we'll tell you why.
    </p>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/16/solid';

const rules = [
  'Photos or renders that show people',
  'Symbols or objects of other religions',
  'Immodest or inappropriate content',
  'Weapons or weapon parts',
  'Content that mocks Torah, the Jewish people, or anyone else',
  "Designs you don't have the rights to share",
];
</script>
