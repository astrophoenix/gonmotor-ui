<template>
  <div class="flex items-center ml-3 relative">
    <div>
      <button
        type="button"
        class="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600"
        :aria-expanded="isOpen"
        @click="toggleDropdown"
      >
        <span class="sr-only">Open user menu</span>
        <img class="w-8 h-8 rounded-full" src="https://flowbite.com/docs/images/people/profile-picture-5.jpg" alt="user photo">
      </button>
    </div>
    <div
      :class="['absolute right-0 top-full mt-2 z-50 w-48 text-base list-none bg-white divide-y divide-gray-100 rounded shadow dark:bg-gray-700 dark:divide-gray-600', { 'hidden': !isOpen }]"
    >
      <div class="px-4 py-3" role="none">
        <div class="flex items-center gap-2">
          <CircleUser class="w-4 h-4 text-gray-400" />
          <p class="text-sm text-gray-900 dark:text-white" role="none">
            {{ fullName }}
          </p>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <Mail class="w-4 h-4 text-gray-400" />
          <p class="text-sm font-medium text-gray-900 truncate dark:text-gray-300" role="none">
            {{ email }}
          </p>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <Building2 class="w-4 h-4 text-gray-400" />
          <p class="text-sm font-medium text-gray-900 truncate dark:text-gray-300" role="none">
            {{ enterpriseName }}
          </p>
        </div>
      </div>
      <ul class="py-1" role="none">
        <li>
          <a 
            href="/perfil/" 
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white" 
            role="menuitem"
          >
            Editar perfil
          </a>
        </li>
        <li>
          <a href="#" @click.prevent="handleSignout" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white" role="menuitem">Sign out</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CircleUser, Mail, Building2 } from 'lucide-vue-next';
import { useAuthStore } from '../../modules/auth/stores/authStore';

const authStore = useAuthStore();
const isOpen = ref(false);

const fullName = computed(() => {
  const user = authStore.user || {};
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.username || '';
});

const email = computed(() => authStore.user?.email || '');

const enterpriseName = computed(() => authStore.user?.empresa_nombre || '');

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function handleSignout() {
  authStore.logout();
  window.location.href = '/authentication/sign-in/';
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    closeDropdown();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleClickOutside);
});

function handleClickOutside(event) {
  const el = document.getElementById('user-menu-app');
  if (el && !el.contains(event.target)) {
    closeDropdown();
  }
}
</script>
