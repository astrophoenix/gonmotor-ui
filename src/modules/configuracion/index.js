import { createApp } from 'vue';
import { createPinia } from 'pinia';
import EmpresaView from './components/EmpresaView.vue';

export function mountEmpresaConfig(element, pinia = createPinia()) {
  createApp(EmpresaView).use(pinia).mount(element);
}