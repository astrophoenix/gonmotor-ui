<script setup>
import { computed, useSlots } from 'vue';
import { FilePen, FilePlusCorner } from 'lucide-vue-next';

/**
 * Encabezado estándar de las pantallas de creación / edición.
 *
 * Unifica breadcrumb, botón «volver», icono de acción (+ = crear, lápiz =
 * editar), título, datos secundarios del registro (número + estado) y acciones,
 * para que todos los formularios se lean igual. No contiene lógica por entidad.
 *
 * Slots:
 * - `badges`: insignias del registro guardado (estado, prioridad…).
 * - `actions`: botones de acción y `FormSaveActions`.
 */
const props = defineProps({
  /** Ruta del listado de la entidad (botón «volver al listado»). */
  backHref: { type: String, required: true },
  /** Migas de pan: `[{ label, href? }]`. El último ítem es la página actual. */
  breadcrumb: { type: Array, default: () => [] },
  /** Entidad, p. ej. «Recepción». Se usa para derivar el título si falta `title`. */
  entity: { type: String, required: true },
  /** Título explícito, p. ej. «Nueva recepción». Si se omite: «Nueva <entity>». */
  title: { type: String, default: '' },
  /** Número del registro guardado; se omite mientras es nuevo. */
  recordNumber: { type: String, default: '' },
  isEditMode: { type: Boolean, default: false },
});

const slots = useSlots();

/** El icono representa la ACCIÓN (+ crear / lápiz editar), nunca la entidad. */
const accion = computed(() => (props.isEditMode
  ? {
      icon: FilePen,
      verbo: 'Editar',
      pista: 'Editando un registro ya guardado',
      color: 'text-primary-blue-500 dark:text-primary-blue-100',
      iconSize: 'w-5 h-5',
    }
  : {
      icon: FilePlusCorner,
      verbo: 'Nueva',
      pista: 'Registro sin guardar: se asignará su número al crearlo',
      color: 'text-primary-blue-500 dark:text-primary-blue-100',
      iconSize: 'w-5 h-5',
    }));

const heading = computed(() => props.title || `${accion.value.verbo} ${props.entity}`);

const showRecordNumber = computed(() => props.isEditMode && !!props.recordNumber);
const showSeparator = computed(() => showRecordNumber.value && !!slots.badges);
const hasDetails = computed(() => showRecordNumber.value || !!slots.badges);
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav v-if="breadcrumb.length" class="mb-3" aria-label="Breadcrumb">
      <ol class="inline-flex flex-wrap items-center gap-x-1 text-sm font-medium md:gap-x-2">
        <li
          v-for="(crumb, index) in breadcrumb"
          :key="`${index}-${crumb.label}`"
          class="inline-flex items-center gap-x-1 md:gap-x-2">
          <span v-if="index > 0" class="text-gray-400" aria-hidden="true">/</span>
          <a
            v-if="crumb.href"
            :href="crumb.href"
            class="text-gray-700 hover:text-primary-600 dark:text-gray-300">{{ crumb.label }}</a>
          <span v-else class="text-gray-500 dark:text-gray-400">{{ crumb.label }}</span>
        </li>
      </ol>
    </nav>

    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="flex flex-1 min-w-0 items-start gap-3">
        <component
          :is="accion.icon"
          class="shrink-0 mt-1.5"
          :class="[accion.iconSize, accion.color]"
          :title="accion.pista"
          aria-hidden="true"
        />

        <div class="min-w-0">
          <h1 class="text-lg font-semibold leading-8 text-gray-900 sm:text-xl dark:text-white">{{ heading }}</h1>
          <div v-if="hasDetails" class="flex flex-wrap items-center gap-2" :class="showRecordNumber ? 'mt-1' : ''">
            <span v-if="showRecordNumber" class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ recordNumber }}</span>
            <span v-if="showSeparator" class="text-sm text-gray-400" aria-hidden="true">&bull;</span>
            <slot name="badges" />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 ml-auto">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
