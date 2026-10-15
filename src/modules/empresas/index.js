import { createApp } from 'vue';
import { createPinia } from 'pinia';
import EmpresasList from './components/EmpresasList.vue';
import { useAuthStore } from '../auth/stores/authStore';

export function mountEmpresas(element, pinia = createPinia()) {
  // Exclusivo de la sesión «Registrar una nueva empresa» (sin empresa activa):
  // quien entró por «Ir a empresa» vuelve al dashboard.
  if (useAuthStore(pinia).empresaId) {
    window.location.replace('/');
    return;
  }
  createApp(EmpresasList).use(pinia).mount(element);
}
