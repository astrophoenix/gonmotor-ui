import { createApp } from 'vue';
import { createPinia } from 'pinia';
import EmpleadosList from './components/EmpleadosList.vue';
import EmpleadoEdit from './components/EmpleadoEdit.vue';

export function mountEmpleados(element, pinia = createPinia()) {
  createApp(EmpleadosList).use(pinia).mount(element);
}

export function mountEmpleadoEdit(element, pinia = createPinia()) {
  createApp(EmpleadoEdit).use(pinia).mount(element);
}
