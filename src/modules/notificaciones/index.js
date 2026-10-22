import { createApp } from 'vue';
import { createPinia } from 'pinia';
import NotificacionesView from './components/NotificacionesView.vue';

export function mountNotificaciones(element, pinia = createPinia()) {
  createApp(NotificacionesView).use(pinia).mount(element);
}
