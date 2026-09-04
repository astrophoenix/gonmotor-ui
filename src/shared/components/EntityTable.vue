<script setup>
const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingText: {
    type: String,
    default: 'Cargando...',
  },
  emptyText: {
    type: String,
    default: 'No se encontraron registros.',
  },
  rowKey: {
    type: String,
    default: 'id',
  },
  emptyColspan: {
    type: Number,
    default: 0,
  },
  showPagination: {
    type: Boolean,
    default: false,
  },
  previousUrl: {
    type: String,
    default: null,
  },
  nextUrl: {
    type: String,
    default: null,
  },
  paginationDisabled: {
    type: Boolean,
    default: false,
  },
  rangeLabel: {
    type: String,
    default: '',
  },
  previousText: {
    type: String,
    default: 'Anterior',
  },
  nextText: {
    type: String,
    default: 'Siguiente',
  },
});

const emit = defineEmits(['page-change']);

const colspan = Math.max(props.emptyColspan, props.columns.length);
</script>

<template>
  <div>
    <div class="flex flex-col">
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full align-middle">
          <div class="overflow-hidden shadow">
            <table class="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
              <thead class="bg-gray-200 dark:bg-gray-900">
                <tr>
                  <th
                    v-for="column in columns"
                    :key="typeof column === 'string' ? column : column.key"
                    scope="col"
                    class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900"
                    :class="typeof column === 'object' ? column.thClass : ''"
                  >
                    {{ typeof column === 'string' ? column : column.label }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                <tr v-if="loading">
                  <td :colspan="colspan" class="p-4 text-center text-gray-500 dark:text-gray-400">
                    {{ loadingText }}
                  </td>
                </tr>
                <tr v-else-if="!items.length">
                  <td :colspan="colspan" class="p-4 text-center text-gray-500 dark:text-gray-400">
                    {{ emptyText }}
                  </td>
                </tr>
                <template v-else>
                  <slot
                    name="row"
                    v-for="(item, index) in items"
                    :key="item[rowKey]"
                    :item="item"
                    :index="index"
                  ></slot>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showPagination"
      class="sticky bottom-0 right-0 items-center w-full p-4 bg-white border-t border-gray-200 sm:flex sm:justify-between dark:bg-gray-800 dark:border-gray-700"
    >
      <span class="mb-4 text-sm text-gray-500 sm:mb-0 dark:text-gray-400">{{ rangeLabel }}</span>
      <div class="flex items-center space-x-3">
        <button
          type="button"
          :disabled="!previousUrl || paginationDisabled"
          :title="previousText"
          :aria-label="previousText"
          class="inline-flex items-center p-2.5 text-primary-700 border border-primary-700 rounded-full hover:bg-primary-100 focus:ring-4 focus:outline-none focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 dark:focus:ring-primary-800"
          @click="emit('page-change', -1)"
        >
          <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 1 1 5m0 0 4 4M1 5h12"/>
          </svg>
          <span class="sr-only">{{ previousText }}</span>
        </button>
        <button
          type="button"
          :disabled="!nextUrl || paginationDisabled"
          :title="nextText"
          :aria-label="nextText"
          class="inline-flex items-center p-2.5 text-primary-700 border border-primary-700 rounded-full hover:bg-primary-100 focus:ring-4 focus:outline-none focus:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 dark:focus:ring-primary-800"
          @click="emit('page-change', 1)"
        >
          <svg class="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 1l4 4-4 4M13 5H1"/>
          </svg>
          <span class="sr-only">{{ nextText }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
