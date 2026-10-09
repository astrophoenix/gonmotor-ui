import { createApp } from 'vue';
import { createPinia } from 'pinia';
import UsuariosList from './components/UsuariosList.vue';

export function mountUsuarios(element, pinia = createPinia()) {
  createApp(UsuariosList).use(pinia).mount(element);
}