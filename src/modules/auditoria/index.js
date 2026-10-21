import { createApp } from 'vue';
import AuditoriaList from './components/AuditoriaList.vue';

export function mountAuditoria(element, pinia) {
  createApp(AuditoriaList).use(pinia).mount(element);
}
