import { createApp } from 'vue';
import { createPinia } from 'pinia';
import DashboardV2 from './components/DashboardV2.vue';

export function mountDashboardV2(element, pinia = createPinia()) {
  createApp(DashboardV2).use(pinia).mount(element);
}
