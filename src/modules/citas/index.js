import { createApp } from 'vue';
import { createPinia } from 'pinia';
import AppointmentsView from './components/AppointmentsView.vue';

export function mountCitas(element, pinia = createPinia()) {
  createApp(AppointmentsView).use(pinia).mount(element);
}