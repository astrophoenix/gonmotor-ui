import { createApp } from 'vue';
import { createPinia } from 'pinia';
import CitasView from './components/CitasView.vue';

export function mountCitas(element, pinia = createPinia()) {
  createApp(CitasView).use(pinia).mount(element);
}
