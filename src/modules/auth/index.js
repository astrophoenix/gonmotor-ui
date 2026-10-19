import { createApp } from 'vue';
import { createPinia } from 'pinia';
import LoginForm from './components/LoginForm.vue';
import LoginFormOld from './components/LoginFormOld.vue';
import RegisterForm from './components/RegisterForm.vue';
import ProfileEdit from './components/ProfileEdit.vue';
import ForgotPasswordForm from './components/ForgotPasswordForm.vue';
import ResetPasswordForm from './components/ResetPasswordForm.vue';

export function mountLogin(element, pinia = createPinia()) {
  createApp(LoginForm)
    .use(pinia)
    .mount(element);
}

// Inicio de sesión anterior, conservado como respaldo en /authentication/sign-in-old/.
export function mountLoginOld(element, pinia = createPinia()) {
  createApp(LoginFormOld)
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

export function mountForgotPassword(element, pinia = createPinia()) {
  createApp(ForgotPasswordForm)
    .use(pinia)
    .mount(element);
}

export function mountResetPassword(element, pinia = createPinia()) {
  createApp(ResetPasswordForm)
    .use(pinia)
    .mount(element);
}
