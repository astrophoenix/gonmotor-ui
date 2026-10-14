import { createApp } from 'vue';
import { createPinia } from 'pinia';
import GastosList from './components/GastosList.vue';

export function mountGastos(element, pinia = createPinia()) {
  createApp(GastosList).use(pinia).mount(element);
}

export { GastosList };
