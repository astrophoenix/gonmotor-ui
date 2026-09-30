import { createApp } from 'vue';
import { createPinia } from 'pinia';
import CitasView from '../citas/components/CitasView.vue';

/** El calendario es una vista más de la pantalla unificada de citas. */
export function mountCalendario(element, pinia = createPinia()) {
  createApp(CitasView).use(pinia).mount(element);
}
