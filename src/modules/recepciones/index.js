import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RecepcionesList from './components/RecepcionesList.vue';
import RecepcionDetail from './components/RecepcionDetail.vue';
import RecepcionEdit from './components/RecepcionEdit.vue';

export function mountRecepciones(element, pinia = createPinia()) {
  createApp(RecepcionesList).use(pinia).mount(element);
}

export function mountRecepcionDetail(element, pinia = createPinia()) {
  createApp(RecepcionDetail).use(pinia).mount(element);
}

export function mountRecepcionEdit(element, pinia = createPinia()) {
  createApp(RecepcionEdit).use(pinia).mount(element);
}
