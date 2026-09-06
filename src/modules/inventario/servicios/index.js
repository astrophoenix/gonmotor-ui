import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ServiciosList from './components/ServiciosList.vue';

export function mountServicios(element, pinia = createPinia()) {
  createApp(ServiciosList).use(pinia).mount(element);
}