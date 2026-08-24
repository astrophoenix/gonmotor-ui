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
          <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>
          <p class="text-sm text-gray-900 dark:text-white" role="none">
            {{ fullName }}
          </p>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
          <p class="text-sm font-medium text-gray-900 truncate dark:text-gray-300" role="none">
            {{ email }}
          </p>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clip-rule="evenodd"></path></svg>
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
