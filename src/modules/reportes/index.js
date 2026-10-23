import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RentabilidadView from './components/RentabilidadView.vue';
import ResumenNegocioView from './components/ResumenNegocioView.vue';

export function mountReportesRentabilidad(element, pinia = createPinia()) {
  createApp(RentabilidadView).use(pinia).mount(element);
}

export function mountResumenNegocio(element, pinia = createPinia()) {
  createApp(ResumenNegocioView).use(pinia).mount(element);
}

export { RentabilidadView, ResumenNegocioView };
