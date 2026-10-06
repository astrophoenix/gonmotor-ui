<script setup>
import { computed, useSlots } from 'vue';
import { FilePen, FilePlusCorner, FolderOpen } from 'lucide-vue-next';

/**
 * Encabezado estándar de las vistas de entidad: listado, detalle y
 * crear/editar. Un solo componente para las tres modalidades.
 *
 * Unifica contenedor, breadcrumb, icono + título, la línea secundaria
 * `número • badges` y el contenedor de acciones. NO contiene lógica por
 * entidad: cada vista mete sus propios botones y avisos en los slots.
 *
 * - `mode="list"`    → el icono es el de la entidad (`icon`); sin línea secundaria.
 * - `mode="detail"`  → icono de acción `FolderOpen`; `recordNumber` + `#badges`.
 * - `mode="edit"`    → icono de acción `FilePen`.
 * - `mode="create"`  → icono de acción `FilePlusCorner`.
 *
 * Slots:
 * - `badges`: insignias del registro guardado (estado, prioridad…).
 * - `actions`: botones propios de la vista (vacío en los listados).
 *
 * El `Alert` de los listados NO va aquí: se renderiza inmediatamente después
 * del componente, fuera del contenedor con `border-b`.
 */
const props = defineProps({
  /** Modalidad de la vista: `list` | `detail` | `edit` | `create`. */
  mode: { type: String, default: 'list' },
  /** Migas de pan: `[{ label, href? }]`. El último ítem es la página actual. */
  breadcrumb: { type: Array, default: () => [] },
  /** Entidad, p. ej. «Recepción». Base para derivar el título si falta `title`. */
  entity: { type: String, default: '' },
  /** Título explícito, p. ej. «Nueva recepción». */
  title: { type: String, default: '' },
  /** Número del registro guardado; vacío mientras es nuevo. */
  recordNumber: { type: String, default: '' },
  /** Icono de entidad/módulo; solo se usa con `mode="list"`. */
  icon: { type: Object, default: null },
});

const slots = useSlots();

/** El icono de detalle/edición representa la ACCIÓN, nunca la entidad. */
const ACCIONES = {
  create: {
    icon: FilePlusCorner,
    verbo: 'Nueva',
    pista: 'Registro sin guardar: se asignará su número al crearlo',
  },
  edit: {
    icon: FilePen,
    verbo: 'Editar',
    pista: 'Editando un registro ya guardado',
  },
  detail: {
    icon: FolderOpen,
    verbo: '',
    pista: 'Registro guardado',
  },
};

const accion = computed(() => ACCIONES[props.mode] || ACCIONES.detail);
const icono = computed(() => (props.mode === 'list' ? props.icon : accion.value.icon));
const pista = computed(() => (props.mode === 'list' ? '' : accion.value.pista));

const heading = computed(() => {
  if (props.title) return props.title;
  const { verbo } = accion.value;
  return verbo ? `${verbo} ${props.entity}` : props.entity;
});

const mostrarNumero = computed(() => !!props.recordNumber && props.mode !== 'create');
const mostrarLinea = computed(() => mostrarNumero.value || !!slots.badges);
const mostrarSeparador = computed(() => mostrarNumero.value && !!slots.badges);
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
            class="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-white">{{ crumb.label }}</a>
          <span v-else class="text-gray-500 dark:text-gray-400">{{ crumb.label }}</span>
        </li>
      </ol>
    </nav>

    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div class="flex flex-1 min-w-0 items-start gap-3">
        <component
          :is="icono"
          v-if="icono"
          class="w-5 h-5 shrink-0 mt-1.5 text-primary-blue-500 dark:text-primary-blue-100"
          :title="pista"
          aria-hidden="true" />

        <div class="min-w-0">
          <h1 class="text-lg font-semibold leading-8 text-gray-900 sm:text-xl dark:text-white">{{ heading }}</h1>
          <div v-if="mostrarLinea" class="flex flex-wrap items-center gap-2 mt-1">
            <span v-if="mostrarNumero" class="font-mono text-sm text-gray-600 dark:text-gray-300">{{ recordNumber }}</span>
            <span v-if="mostrarSeparador" class="text-sm text-gray-400" aria-hidden="true">&bull;</span>
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
