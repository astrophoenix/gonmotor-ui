import { createApp } from 'vue';
import { createPinia } from 'pinia';
import InspeccionesList from './components/InspeccionesList.vue';
import InspeccionEdit from './components/InspeccionEdit.vue';

export function mountInspecciones(element, pinia = createPinia()) {
  createApp(InspeccionesList).use(pinia).mount(element);
}

export function mountInspeccionEdit(element, pinia = createPinia()) {
  createApp(InspeccionEdit).use(pinia).mount(element);
}
