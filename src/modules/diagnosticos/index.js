import { createApp } from 'vue';
import { createPinia } from 'pinia';
import DiagnosticoEdit from './components/DiagnosticoEdit.vue';

export function mountDiagnosticoEdit(element, pinia = createPinia()) {
  createApp(DiagnosticoEdit).use(pinia).mount(element);
}
