<script setup>
import { computed, ref } from 'vue';
import { Bell } from 'lucide-vue-next';
import GlobalSearch from './GlobalSearch.vue';
import TallerSelect from './TallerSelect.vue';
import UserMenu from './UserMenu.vue';
import { construirMigas } from '../config/breadcrumb';
import { useAuthStore } from '../../modules/auth/stores/authStore';

const props = defineProps({
  /** `title` de la página, inyectado por Hugo en el punto de montaje. */
  pageTitle: { type: String, default: '' },
});

const authStore = useAuthStore();

/** `true` si se debe mostrar el selector de taller.

 * La administración (puede operar sin taller, «Todos») siempre lo ve; el resto
 * solo cuando tiene más de un taller permitido.
 */
const mostrarSelectorTaller = computed(() => {
  if (authStore.user?.es_admin_talleres) return true;
  const total = authStore.user?.talleres_count;
  if (!Number.isFinite(total)) return true;
  return total > 1;
});

const cambiandoTaller = ref(false);

function onTallerChange(taller) {
  authStore.setTaller(taller);
  cambiandoTaller.value = true;
  const id = taller?.id;
  window.location.assign(id ? `/?sucursal=${id}` : '/');
}

const migas = computed(() => construirMigas(window.location.pathname, props.pageTitle));
const ultimaMiga = computed(() => {
  const lista = migas.value;
  return lista.length ? lista[lista.length - 1].label : props.pageTitle;
});

function esUltima(indice) {
  return indice === migas.value.length - 1;
}

function claseCrumble(indice) {
  return esUltima(indice)
    ? 'font-medium text-brand-900 dark:text-white'
    : 'text-ink-soft dark:text-brand-300';
}
</script>

<template>
  <div class="relative flex w-full min-w-0 items-center gap-3 mt-2">
    <!-- Breadcrumb (desktop) -->
    <nav class="hidden min-w-0 flex-1 items-center lg:flex" aria-label="Breadcrumb">
      <ol class="flex min-w-0 items-center gap-2 text-sm">
        <li
          v-for="(miga, indice) in migas"
          :key="`${indice}-${miga.label}`"
          class="flex min-w-0 items-center gap-2"
        >
          <span v-if="indice > 0" class="text-brand-300 dark:text-brand-300" aria-hidden="true">/</span>
          <a
            v-if="miga.href && !esUltima(indice)"
            :href="miga.href"
            class="truncate text-ink-soft transition-colors hover:text-brand-900 dark:text-brand-300 dark:hover:text-white"
          >
            {{ miga.label }}
          </a>
          <span v-else class="truncate" :class="claseCrumble(indice)">{{ miga.label }}</span>
        </li>
      </ol>
    </nav>

    <!-- Breadcrumb (móvil): solo el último nivel -->
    <span class="min-w-0 flex-1 truncate text-sm font-medium text-brand-900 lg:hidden dark:text-white">
      {{ ultimaMiga }}
    </span>

    <div class="flex shrink-0 items-center gap-1.5">
      <GlobalSearch />

      <!-- Taller activo -->
      <TallerSelect
        v-if="mostrarSelectorTaller"
        :model-value="authStore.tallerId"
        :nombre="authStore.tallerNombre"
        :permitir-todos="authStore.user?.es_admin_talleres"
        variante="topbar"
        alinear="right"
        confirmar
        :cambiando="cambiandoTaller"
        @change="onTallerChange"
      />

      <!-- Notificaciones -->
      <a
        href="/notificaciones/"
        class="inline-flex items-center justify-center rounded-lg p-2 text-ink-soft transition-colors hover:bg-surface hover:text-brand-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300 dark:hover:bg-brand-800 dark:hover:text-white"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <Bell class="h-5 w-5" aria-hidden="true" />
      </a>

      <!-- Perfil -->
      <UserMenu />
    </div>
  </div>
</template>
