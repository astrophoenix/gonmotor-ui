import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ClientsList from './components/ClientsList.vue';
import ClientEdit from './components/ClientEdit.vue';

export function mountClients(element, pinia = createPinia()) {
  createApp(ClientsList).use(pinia).mount(element);
}

export function mountClientEdit(element, pinia = createPinia()) {
  createApp(ClientEdit).use(pinia).mount(element);
}
