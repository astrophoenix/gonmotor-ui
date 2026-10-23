import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ComprasList from './components/ComprasList.vue';

export function mountCompras(element, pinia = createPinia()) {
  createApp(ComprasList).use(pinia).mount(element);
}
