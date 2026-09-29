import { createApp } from 'vue';
import { createPinia } from 'pinia';
import DashboardPrincipal from './components/DashboardPrincipal.vue';

export function mountDashboard(element, pinia = createPinia()) {
  createApp(DashboardPrincipal).use(pinia).mount(element);
}
