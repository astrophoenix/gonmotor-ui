import { createApp } from 'vue';
import { createPinia } from 'pinia';
import CalendarioView from './components/CalendarioView.vue';

export function mountCalendario(element, pinia = createPinia()) {
  createApp(CalendarioView).use(pinia).mount(element);
}
