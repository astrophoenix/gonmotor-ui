<script setup>
import { onMounted, reactive, ref } from 'vue';
import { empresaConfigService } from '../services/empresaConfigService';
import Alert from '../../../shared/components/Alert.vue';
import {
  sanitizeNombre,
  sanitizeEmail,
  sanitizeTelefono,
  sanitizeIdentificacion,
} from '../../../shared/utils/sanitize';

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const formErrors = ref({});

const empresaId = ref(null);
const logoFile = ref(null);
const logoPreview = ref('');
const logoError = ref('');
const logoRemoved = ref(false);

const MARKETING_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
const LOGO_MAX_SIZE = 2 * 1024 * 1024; // 2MB

const form = reactive({
  nombre_comercial: '',
  razon_social: '',
  ruc: '',
  email_contacto: '',
  telefono: '',
  logo: '',
});

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function validateForm() {
  formErrors.value = {};
  const errors = {};

  if (!form.nombre_comercial || !form.nombre_comercial.trim()) {
    errors.nombre_comercial = 'El nombre comercial es obligatorio.';
  }

  const ruc = form.ruc || '';
  if (!ruc) {
    errors.ruc = 'El RUC es obligatorio.';
  } else if (ruc.length !== 13) {
    errors.ruc = 'El RUC debe contener exactamente 13 dígitos.';
  }

  if (!form.email_contacto || !form.email_contacto.trim()) {
    errors.email_contacto = 'El correo de contacto es obligatorio.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_contacto.trim())) {
    errors.email_contacto = 'Ingresa un correo electrónico válido.';
  }

  if (!form.telefono || !form.telefono.trim()) {
    errors.telefono = 'El teléfono es obligatorio.';
  }

  if (logoError.value) {
    errors.logo = logoError.value;
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function onLogoChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!MARKETING_ALLOWED_TYPES.includes(file.type)) {
    logoError.value = 'Formato no permitido. Solo JPG, PNG, WebP o SVG.';
    return;
  }

  if (file.size > LOGO_MAX_SIZE) {
    logoError.value = 'La imagen supera el tamaño máximo permitido de 2MB.';
    return;
  }

  logoError.value = '';
  logoFile.value = file;
  logoRemoved.value = false;

  if (logoPreview.value) {
    URL.revokeObjectURL(logoPreview.value);
  }
  logoPreview.value = URL.createObjectURL(file);
}

function cancelLogo() {
  if (logoPreview.value) {
    URL.revokeObjectURL(logoPreview.value);
  }
  logoPreview.value = '';
  logoFile.value = null;
  // Si ya existía logo en el servidor, se marca para eliminación.
  logoRemoved.value = Boolean(form.logo);
}

async function loadEmpresa() {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const data = await empresaConfigService.getEmpresa();
    empresaId.value = data.id;
    Object.assign(form, {
      nombre_comercial: data.nombre_comercial || '',
      razon_social: data.razon_social || '',
      ruc: data.ruc || '',
      email_contacto: data.email_contacto || '',
      telefono: data.telefono || '',
      logo: data.logo || '',
    });
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  formErrors.value = {};

  if (!validateForm()) {
    const fields = Object.keys(formErrors.value);
    errorMessage.value = 'Completa correctamente los campos marcados.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!empresaId.value) {
    errorMessage.value = 'No se pudo identificar la empresa a configurar.';
    return;
  }

  isSaving.value = true;
  try {
    const formData = new FormData();
    formData.append('nombre_comercial', form.nombre_comercial);
    formData.append('razon_social', form.razon_social || '');
    formData.append('ruc', form.ruc || '');
    formData.append('email_contacto', form.email_contacto || '');
    formData.append('telefono', form.telefono || '');

    if (logoFile.value) {
      formData.append('logo', logoFile.value);
    } else if (logoRemoved.value) {
      formData.append('logo', '');
    }

    await empresaConfigService.updateEmpresa(empresaId.value, formData);
    successMessage.value = 'Datos de la empresa actualizados correctamente.';
    logoFile.value = null;
    logoRemoved.value = false;
    if (logoPreview.value) {
      URL.revokeObjectURL(logoPreview.value);
      logoPreview.value = '';
    }
    await loadEmpresa();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadEmpresa);
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <span class="text-gray-500 dark:text-gray-400">Configuración</span></li>
        <li class="text-gray-400">/ <span class="dark:text-gray-400">Empresa</span></li>
      </ol>
    </nav>
  </div>

  <div class="p-4">
    <div class="relative max-w-4xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <div v-if="isLoading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Cargando configuración de empresa...</div>

      <form v-else class="space-y-6" novalidate @submit.prevent="submit">
        <div>
          <h4 class="mb-4 text-xl font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m4 8h6m-6-4h6m4-8v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1Z"/>
              </svg>
              Datos de la Empresa
            </span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label for="nombre_comercial" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre comercial *</label>
              <input
                id="nombre_comercial"
                v-model="form.nombre_comercial"
                maxlength="200"
                @input="form.nombre_comercial = sanitizeNombre(form.nombre_comercial)"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.nombre_comercial ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.nombre_comercial" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.nombre_comercial }}</p>
            </div>
            <div class="md:col-span-2">
              <label for="razon_social" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Razón social</label>
              <input
                id="razon_social"
                v-model="form.razon_social"
                maxlength="200"
                @input="form.razon_social = sanitizeNombre(form.razon_social)"
                class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
            </div>
            <div>
              <label for="ruc" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">RUC *</label>
              <input
                id="ruc"
                v-model="form.ruc"
                inputmode="numeric"
                maxlength="13"
                @input="form.ruc = sanitizeIdentificacion(form.ruc, 'R')"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.ruc ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.ruc" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.ruc }}</p>
            </div>
            <div>
              <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono *</label>
              <input
                id="telefono"
                v-model="form.telefono"
                inputmode="numeric"
                maxlength="20"
                @input="form.telefono = sanitizeTelefono(form.telefono)"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.telefono ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.telefono" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.telefono }}</p>
            </div>
            <div class="md:col-span-2">
              <label for="email_contacto" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico de contacto *</label>
              <input
                id="email_contacto"
                v-model="form.email_contacto"
                type="email"
                maxlength="254"
                @input="form.email_contacto = sanitizeEmail(form.email_contacto)"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.email_contacto ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.email_contacto" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.email_contacto }}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 class="mb-4 text-xl font-semibold dark:text-white">
            <span class="inline-flex items-center gap-2">
              <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path fill="currentColor" d="M16 18H8l2.5-6 2 4 1.5-2 2 4Zm-1-8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 3v4a1 1 0 0 1-1 1H5m14-4v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1ZM8 18h8l-2-4-1.5 2-2-4L8 18Zm7-8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
              </svg>

              Logotipo oficial
            </span>
          </h4>
          <div class="flex items-start space-x-6 p-2.5 border border-gray-200 rounded-lg dark:border-gray-700">
            <div class="h-40 w-40 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
              <img
                v-if="logoPreview || (form.logo && !logoRemoved)"
                :src="logoPreview || form.logo"
                class="w-full h-full object-contain"
                alt="Logotipo de la empresa"
              >
              <svg v-if="!logoPreview && (!form.logo || logoRemoved)" class="w-16 h-16 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 5 2-3 3 6z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">JPG, PNG, WebP o SVG. Máximo 2MB</p>
              <div class="flex items-center space-x-3">
                <label class="inline-flex items-center px-4 py-2 text-sm font-medium text-center text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 cursor-pointer">
                  <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path><path d="M9 13h2v5a1 1 0 11-2 0v-5z"></path></svg>
                  Subir
                  <input type="file" class="hidden" accept="image/*" @change="onLogoChange">
                </label>
                <button
                  type="button"
                  :disabled="!logoPreview && !form.logo"
                  @click="cancelLogo"
                  class="inline-flex items-center py-2 px-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-4 h-4 mr-2 -ml-1 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                  </svg>
                  Eliminar
                </button>
              </div>
              <p v-if="logoError" class="mt-3 text-sm text-red-600 dark:text-red-500">{{ logoError }}</p>
              <p v-if="!form.logo && !logoPreview" class="mt-3 text-sm text-gray-500 dark:text-gray-400">Sin logotipo cargado</p>
            </div>
          </div>
        </div>

        <div class="flex justify-start pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            :disabled="isSaving"
            class="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg v-if="isSaving" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            {{ isSaving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>