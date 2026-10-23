import { createApp } from 'vue';
import { createPinia } from 'pinia';
import OrdenesList from './components/OrdenesList.vue';
import OrdenDetail from './components/OrdenDetail.vue';
import OrdenEdit from './components/OrdenEdit.vue';

export function mountOrdenes(element, pinia = createPinia()) {
  element.classList.add('patio-screen');
  createApp(OrdenesList).use(pinia).mount(element);
}

export function mountOrdenDetail(element, pinia = createPinia()) {
  element.classList.add('patio-screen');
  createApp(OrdenDetail).use(pinia).mount(element);
}

export function mountOrdenEdit(element, pinia = createPinia()) {
  element.classList.add('patio-screen');
  createApp(OrdenEdit).use(pinia).mount(element);
}