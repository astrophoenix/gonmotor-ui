<template>
  <div class="relative flex items-center">
    <button
      ref="triggerRef"
      type="button"
      class="flex items-center justify-center rounded-full ring-2 ring-brand-100 transition-shadow focus:outline-none focus-visible:ring-brand-500 dark:ring-brand-800"
      :aria-expanded="String(isOpen)"
      aria-haspopup="menu"
      aria-controls="user-menu-panel"
      @click="toggleDropdown"
    >
      <span class="sr-only">Abrir menú de usuario</span>
      <img v-if="avatar" :src="avatar" alt="" class="h-9 w-9 rounded-full object-cover">
      <span
        v-else
        class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white"
        aria-hidden="true"
      >
        {{ iniciales }}
      </span>
    </button>

    <div
      v-show="isOpen"
      id="user-menu-panel"
      ref="panelRef"
      role="menu"
      aria-label="Menú de usuario"
      class="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-line bg-white shadow-lg dark:border-brand-700 dark:bg-brand-900"
    >
      <!-- Cabecera -->
      <div class="flex items-start gap-3 border-b border-brand-100 bg-brand-50 p-3 dark:border-brand-700 dark:bg-brand-800">
        <img v-if="avatar" :src="avatar" alt="" class="h-9 w-9 shrink-0 rounded-full object-cover">
        <span
          v-else
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {{ iniciales }}
        </span>
        <div class="min-w-0">
          <p v-if="fullName" class="line-clamp-2 text-sm font-medium text-ink dark:text-white">
            {{ fullName }}
          </p>
          <p
            v-if="email"
            class="truncate text-xs text-ink-soft dark:text-brand-300"
            :title="email"
          >
            {{ email }}
          </p>
          <span
            v-if="chip"
            class="mt-1.5 inline-block max-w-full truncate rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-700 dark:text-brand-100"
          >
            {{ chip }}
          </span>
        </div>
      </div>

      <!-- Items -->
      <div class="p-1.5">
        <a
          href="/perfil/"
          role="menuitem"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface dark:text-brand-100 dark:hover:bg-brand-800 dark:focus-visible:bg-brand-800"
          @click="cerrar()"
        >
          <User class="h-4 w-4 shrink-0 text-ink-soft dark:text-brand-300" aria-hidden="true" />
          Editar perfil
        </a>

        <button
          type="button"
          role="switch"
          :aria-checked="String(esTemaOscuro)"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface dark:text-brand-100 dark:hover:bg-brand-800 dark:focus-visible:bg-brand-800"
          @click="alternarTema"
        >
          <Moon class="h-4 w-4 shrink-0 text-ink-soft dark:text-brand-300" aria-hidden="true" />
          <span class="flex-1 text-left">Tema oscuro</span>
          <span
            class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
            :class="esTemaOscuro ? 'bg-brand-900 dark:bg-brand-500' : 'bg-line dark:bg-brand-700'"
            aria-hidden="true"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
              :class="esTemaOscuro ? 'translate-x-4' : 'translate-x-0.5'"
            />
          </span>
        </button>
      </div>

      <div class="border-t border-brand-100 p-1.5 dark:border-brand-700">
        <button
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger/10 focus:outline-none focus-visible:bg-danger/10"
          @click="handleSignout"
        >
          <LogOut class="h-4 w-4 shrink-0" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { LogOut, Moon, User } from 'lucide-vue-next';
import { useAuthStore } from '../../modules/auth/stores/authStore';
import { alternarTema, esTemaOscuro } from '../../dark-mode';

const ROLES = {
  ADMIN_SISTEMA: 'Admin. del sistema',
  ADMIN_TALLER: 'Admin. de taller',
  ASESOR: 'Asesor',
  MECANICO: 'Mecánico',
  CAJERO: 'Cajero',
};

const authStore = useAuthStore();
const isOpen = ref(false);
const triggerRef = ref(null);
const panelRef = ref(null);

const avatar = computed(() => authStore.user?.avatar || '');

const fullName = computed(() => {
  const user = authStore.user || {};
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.username || '';
});

const email = computed(() => authStore.user?.email || '');

const iniciales = computed(() => {
  const base = fullName.value || email.value;
  if (!base) return '?';
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();
});

const chip = computed(() => {
  const user = authStore.user || {};
  const rol = ROLES[user.rol] || user.rol || '';
  return [rol, user.empresa_nombre].filter(Boolean).join(' · ');
});

function toggleDropdown() {
  if (isOpen.value) {
    cerrar(false);
  } else {
    isOpen.value = true;
  }
}

function cerrar(enfocar = false) {
  isOpen.value = false;
  if (enfocar) {
    triggerRef.value?.focus();
  }
}

function handleSignout() {
  authStore.logout();
  window.location.href = '/authentication/sign-in/';
}

function handleKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    cerrar(true);
  }
}

function handleClickOutside(event) {
  if (!isOpen.value) return;
  const dentro =
    panelRef.value?.contains(event.target) || triggerRef.value?.contains(event.target);
  if (!dentro) {
    cerrar(false);
  }
}

onMounted(() => {
  authStore.refreshUserFromStorage();
  window.addEventListener('gonmotor:user-updated', syncUserFromStorage);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('gonmotor:user-updated', syncUserFromStorage);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleClickOutside);
});

function syncUserFromStorage() {
  authStore.refreshUserFromStorage();
}
</script>
