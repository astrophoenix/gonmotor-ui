import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RepuestosList from './components/RepuestosList.vue';

export function mountRepuestos(element, pinia = createPinia()) {
  createApp(RepuestosList).use(pinia).mount(element);
}