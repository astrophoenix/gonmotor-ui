import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ProveedoresList from './components/ProveedoresList.vue';
import ProveedorEdit from './components/ProveedorEdit.vue';
import ProveedorDetail from './components/ProveedorDetail.vue';

export function mountProveedores(element, pinia = createPinia()) {
  createApp(ProveedoresList).use(pinia).mount(element);
}

export function mountProveedorEdit(element, pinia = createPinia()) {
  createApp(ProveedorEdit).use(pinia).mount(element);
}

export function mountProveedorDetail(element, pinia = createPinia()) {
  createApp(ProveedorDetail).use(pinia).mount(element);
}
