import { createApp } from 'vue';
import { createPinia } from 'pinia';
import LoginForm from './components/LoginForm.vue';
import RegisterForm from './components/RegisterForm.vue';
import ProfileEdit from './components/ProfileEdit.vue';

export function mountLogin(element, pinia = createPinia()) {
  createApp(LoginForm)
    .use(pinia)
    .mount(element);
}

export function mountRegister(element, pinia = createPinia()) {
  createApp(RegisterForm)
    .use(pinia)
    .mount(element);
}

export function mountProfileEdit(element, pinia = createPinia()) {
  createApp(ProfileEdit)
    .use(pinia)
    .mount(element);
}
