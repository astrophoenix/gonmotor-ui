import { createApp } from 'vue';
import { createPinia } from 'pinia';
import CuentasPorCobrarList from './components/CuentasPorCobrarList.vue';

export function mountCuentasPorCobrar(element, pinia = createPinia()) {
  createApp(CuentasPorCobrarList).use(pinia).mount(element);
}
