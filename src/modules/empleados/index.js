import { createApp } from 'vue';
import { createPinia } from 'pinia';
import EmpleadosList from './components/EmpleadosList.vue';
import EmpleadoDetail from './components/EmpleadoDetail.vue';

export function mountEmpleados(element, pinia = createPinia()) {
  createApp(EmpleadosList).use(pinia).mount(element);
}

export function mountEmpleadoDetail(element, pinia = createPinia()) {
  createApp(EmpleadoDetail).use(pinia).mount(element);
}
