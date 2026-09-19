<script setup>
import { computed } from 'vue';

const props = defineProps({
  total: {
    type: Number,
    required: true,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  nextUrl: {
    type: String,
    default: null,
  },
  previousUrl: {
    type: String,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  itemWord: {
    type: String,
    default: 'registro',
  },
  itemPlural: {
    type: String,
    default: '',
  },
  emptyText: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['page']);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const firstItem = computed(() => (props.total ? (props.currentPage - 1) * props.pageSize + 1 : 0));
const lastItem = computed(() => Math.min(props.currentPage * props.pageSize, props.total));
const pluralWord = computed(() => props.itemPlural || `${props.itemWord}s`);
const itemLabel = computed(() => (props.total === 1 ? props.itemWord : pluralWord.value));

const pageList = computed(() => {
  const pages = totalPages.value;
  const current = props.currentPage;
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => i + 1);
  }
  const candidates = new Set([1, pages, current - 1, current, current + 1]);
  const sorted = Array.from(candidates)
    .filter((page) => page >= 1 && page <= pages)
    .sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const page of sorted) {
    if (page - prev === 2) result.push(prev + 1);
    else if (page - prev > 2) result.push('…');
    result.push(page);
    prev = page;
  }
  return result;
});

function goTo(page) {
  if (props.disabled || page < 1 || page > totalPages.value) return;
  emit('page', page);
}
</script>

<template>
  <nav class="flex items-center flex-column flex-wrap md:flex-row justify-between p-4 gap-3" aria-label="Table navigation">
    <span v-if="total" class="text-sm font-normal text-body mb-4 md:mb-0 block w-full md:inline md:w-auto">
      Mostrando <span class="font-semibold text-heading">{{ firstItem }}-{{ lastItem }}</span> de <span class="font-semibold text-heading">{{ total }}</span> {{ itemLabel }}
    </span>
    <span v-else class="text-sm font-normal text-body mb-4 md:mb-0 block w-full md:inline md:w-auto">{{ emptyText }}</span>
    <ul class="flex -space-x-px text-sm flex-wrap">
      <li>
        <button
          type="button"
          :disabled="!previousUrl || disabled"
          class="flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium rounded-s-base text-sm px-3 h-9 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          @click="goTo(currentPage - 1)"
        >
          Previous
        </button>
      </li>
      <template v-for="item in pageList" :key="item">
        <li v-if="item === '…'">
          <span class="flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium font-medium text-sm px-3 h-9">…</span>
        </li>
        <li v-else>
          <button
            type="button"
            :aria-current="item === currentPage ? 'page' : null"
            class="flex items-center justify-center box-border border font-medium text-sm w-9 h-9 focus:outline-none cursor-pointer"
            :class="item === currentPage ? 'text-fg-brand bg-brand-softer border-default-medium hover:bg-brand-soft hover:text-fg-brand' : 'text-body bg-neutral-secondary-medium border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading'"
            @click="goTo(item)"
          >
            {{ item }}
          </button>
        </li>
      </template>
      <li>
        <button
          type="button"
          :disabled="!nextUrl || disabled"
          class="flex items-center justify-center text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading font-medium rounded-e-base text-sm px-3 h-9 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          @click="goTo(currentPage + 1)"
        >
          Next
        </button>
      </li>
    </ul>
  </nav>
</template>