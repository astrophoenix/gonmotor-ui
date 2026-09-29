<script setup>
import { CarFront, ClipboardPlus, UserPlus } from 'lucide-vue-next';
import ConsultaPlaca from './ConsultaPlaca.vue';

const BTN = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded shadow-xs focus:ring-4';
const BTN_PRIMARIO = `${BTN} text-white bg-brand-500 hover:bg-brand-600 focus:ring-brand-500/20`;
const BTN_SECUNDARIO = `${BTN} text-heading bg-white border border-default-medium hover:bg-neutral-secondary-medium focus:ring-brand-500/20 dark:bg-gray-800`;
</script>

<template>
  <section class="p-4 mb-4 bg-neutral-primary-soft shadow-xs rounded-base border border-default">
    <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <h2 class="text-lg font-semibold text-heading">Accesos rápidos</h2>
        <p class="text-sm text-body">Atajos para lo que más se hace en el taller.</p>
      </div>

      <nav class="flex flex-wrap gap-2" aria-label="Accesos rápidos del dashboard">
        <a href="/crud/recepciones/agregar/" :class="BTN_PRIMARIO">
          <ClipboardPlus class="w-4 h-4" aria-hidden="true" />
          Nueva recepción
        </a>
        <a href="/crud/clientes/agregar/" :class="BTN_SECUNDARIO">
          <UserPlus class="w-4 h-4" aria-hidden="true" />
          Nuevo cliente
        </a>
        <a href="/crud/vehiculos/agregar/" :class="BTN_SECUNDARIO">
          <CarFront class="w-4 h-4" aria-hidden="true" />
          Nuevo vehículo
        </a>
      </nav>
    </div>

    <ConsultaPlaca />
  </section>
</template>
