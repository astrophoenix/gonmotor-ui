import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RentabilidadView from './components/RentabilidadView.vue';

export function mountReportesRentabilidad(element, pinia = createPinia()) {
  createApp(RentabilidadView).use(pinia).mount(element);
}

export { RentabilidadView };
