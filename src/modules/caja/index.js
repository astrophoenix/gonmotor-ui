import { createApp } from 'vue';
import { createPinia } from 'pinia';
import CajaPage from './components/CajaPage.vue';

export function mountCaja(element, pinia = createPinia()) {
  createApp(CajaPage).use(pinia).mount(element);
}
