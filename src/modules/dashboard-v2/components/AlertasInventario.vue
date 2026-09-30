<script setup>
import { AlertTriangle, PackageX, PackageSearch } from 'lucide-vue-next';

const props = defineProps({
  /** [{ id, codigo, nombre, stock_actual, stock_minimo, unidad_medida, agotado }] */
  items: { type: Array, default: () => [] },
  alertas: { type: Number, default: 0 },
  agotados: { type: Number, default: 0 },
  cargando: { type: Boolean, default: false },
});
</script>

<template>
  <section class="bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex flex-col gap-3 px-4 py-3 border-b border-default-medium sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-heading">
          <PackageSearch class="w-5 h-5 text-accent-500" aria-hidden="true" />
          Alertas de inventario
        </h2>
        <p class="mt-0.5 text-xs text-body">
          {{ alertas }} repuestos por debajo del mínimo
          <template v-if="agotados"> · {{ agotados }} agotados</template>
        </p>
      </div>
      <a
        href="/crud/repuestos/"
        class="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-primary-600 hover:underline dark:text-primary-400"
      >
        Ver repuestos
      </a>
    </div>

    <div class="p-4">
      <div v-if="cargando" class="space-y-2" aria-hidden="true">
        <div v-for="indice in 3" :key="indice" class="h-8 border rounded-base border-default bg-neutral-primary-soft animate-pulse" />
      </div>

      <p v-else-if="!props.items.length" class="text-sm text-body">
        Ningún repuesto está por debajo del stock mínimo.
      </p>

      <ul v-else class="space-y-2">
        <li
          v-for="item in props.items"
          :key="item.id"
          class="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-base"
          :class="item.agotado
            ? 'bg-accent-100/50 border-accent-400/40 dark:bg-accent-600/20'
            : 'bg-amber-50/60 border-amber-400/40 dark:bg-amber-900/20'"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-heading">
              {{ item.nombre }}
              <span class="ml-1 text-xs font-normal text-body">{{ item.codigo }}</span>
            </p>
            <p class="text-xs text-body">
              Stock actual {{ item.stock_actual }} / mínimo {{ item.stock_minimo }}
              <template v-if="item.unidad_medida"> · {{ item.unidad_medida }}</template>
            </p>
          </div>

          <span
            v-if="item.agotado"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-accent-100 text-accent-600 dark:bg-accent-600/30 dark:text-accent-400"
          >
            <PackageX class="w-3.5 h-3.5" aria-hidden="true" />
            Agotado
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          >
            <AlertTriangle class="w-3.5 h-3.5" aria-hidden="true" />
            Reponer
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
