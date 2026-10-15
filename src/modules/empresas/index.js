import { createApp } from 'vue';
import { createPinia } from 'pinia';
import EmpresasList from './components/EmpresasList.vue';

export function mountEmpresas(element, pinia = createPinia()) {
  createApp(EmpresasList).use(pinia).mount(element);
}
