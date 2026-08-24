import { createApp } from 'vue';
import { createPinia } from 'pinia';
import VehiclesList from './components/VehiclesList.vue';
import VehicleEdit from './components/VehicleEdit.vue';

export function mountVehicles(element, pinia = createPinia()) {
  createApp(VehiclesList).use(pinia).mount(element);
}

export function mountVehicleEdit(element, pinia = createPinia()) {
  createApp(VehicleEdit).use(pinia).mount(element);
}
