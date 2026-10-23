import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RecepcionesList from './components/RecepcionesList.vue';
import RecepcionDetail from './components/RecepcionDetail.vue';
import RecepcionEdit from './components/RecepcionEdit.vue';

export function mountRecepciones(element, pinia = createPinia()) {
  element.classList.add('patio-screen');
  createApp(RecepcionesList).use(pinia).mount(element);
}

export function mountRecepcionDetail(element, pinia = createPinia()) {
  element.classList.add('patio-screen');
  createApp(RecepcionDetail).use(pinia).mount(element);
}

export function mountRecepcionEdit(element, pinia = createPinia()) {
  element.classList.add('patio-screen');
  createApp(RecepcionEdit).use(pinia).mount(element);
}
