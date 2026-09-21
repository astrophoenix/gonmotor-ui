import { createApp } from 'vue';
import { createPinia } from 'pinia';
import CotizacionesList from './components/CotizacionesList.vue';
import CotizacionEdit from './components/CotizacionEdit.vue';
import CotizacionDetail from './components/CotizacionDetail.vue';

export function mountCotizaciones(element, pinia = createPinia()) {
  createApp(CotizacionesList).use(pinia).mount(element);
}

export function mountCotizacionEdit(element, pinia = createPinia()) {
  createApp(CotizacionEdit).use(pinia).mount(element);
}

export function mountCotizacionDetail(element, pinia = createPinia()) {
  createApp(CotizacionDetail).use(pinia).mount(element);
}