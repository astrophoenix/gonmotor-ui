import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RecordatoriosPanel from './components/RecordatoriosPanel.vue';

export function mountNotificaciones(element, pinia = createPinia()) {
  createApp(RecordatoriosPanel).use(pinia).mount(element);
}