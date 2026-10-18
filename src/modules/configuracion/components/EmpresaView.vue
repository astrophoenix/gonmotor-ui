<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { FileText } from 'lucide-vue-next';
import { empresaConfigService } from '../services/empresaConfigService';
import Alert from '../../../shared/components/Alert.vue';
import ImageField from '../../../shared/components/ImageField.vue';
import FormSaveActions from '../../../shared/components/FormSaveActions.vue';
import {
  sanitizeNombre,
  sanitizeEmail,
  sanitizeTelefono,
  sanitizeIdentificacion,
  sanitizeObservaciones,
} from '../../../shared/utils/sanitize';

const CONDICIONES_MAX = 1000;

const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const formErrors = ref({});

const empresaId = ref(null);
const logoFile = ref(null);
const logoImageKey = ref(0);
const logoError = ref('');
const logoRemoved = ref(false);


const form = reactive({
  nombre_comercial: '',
  razon_social: '',
  ruc: '',
  email_contacto: '',
  telefono: '',
  logo: '',
  condiciones: '',
});

function onCondicionesInput() {
  form.condiciones = sanitizeObservaciones(form.condiciones).slice(0, CONDICIONES_MAX);
}

const currentLogoUrl = computed(() => (logoRemoved.value ? '' : form.logo));

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function validateForm() {
  formErrors.value = {};
  const errors = {};

  if (!form.nombre_comercial || !form.nombre_comercial.trim()) {
    errors.nombre_comercial = 'El nombre comercial es obligatorio.';
  }

  if (!form.razon_social || !form.razon_social.trim()) {
    errors.razon_social = 'La razón social es obligatoria.';
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

  if ((form.condiciones || '').length > CONDICIONES_MAX) {
    errors.condiciones = `Las condiciones admiten máximo ${CONDICIONES_MAX} caracteres.`;
  }

  if (logoError.value) {
    errors.logo = logoError.value;
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

function onLogoUpload(file) {
  if (!file) return;
  logoError.value = '';
  logoFile.value = file;
  logoRemoved.value = false;
}

function onLogoRemove() {
  logoFile.value = null;
  logoError.value = '';
  // Si ya existía logo en el servidor, se marca para eliminación.
  logoRemoved.value = Boolean(form.logo);
}

async function loadEmpresa() {
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
      condiciones: data.condiciones || '',
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
    formData.append('condiciones', sanitizeObservaciones(form.condiciones || '').trim());

    if (logoFile.value) {
      formData.append('logo', logoFile.value);
    } else if (logoRemoved.value) {
      formData.append('logo', '');
    }

    await empresaConfigService.updateEmpresa(empresaId.value, formData);
    successMessage.value = 'Datos de la empresa actualizados correctamente.';
    logoFile.value = null;
    logoRemoved.value = false;
    await loadEmpresa();
    logoImageKey.value += 1;
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
  <!--div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <span class="text-gray-500 dark:text-gray-400">Configuración</span></li>
        <li class="text-gray-400">/ <span class="dark:text-gray-400">Empresa</span></li>
      </ol>
    </nav>
  </div-->

    <div class="grid grid-cols-1 w-full max-w-4xl mx-auto px-4 pt-6 xl:gap-4 dark:bg-gray-900">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />

      <div class="p-4 mb-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <h3 class="mb-4 text-xl font-semibold dark:text-white">
          <span class="inline-flex items-center gap-2">
            <FileText class="w-6 h-6 text-gray-800 dark:text-white" />
            Información Empresa
          </span>
        </h3>
        <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando...</div>
        <!--div v-if="isLoading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Cargando configuración de empresa...</div-->
        <form v-else novalidate @submit.prevent="submit">
          <div class="grid grid-cols-6 gap-6">
            <div class="col-span-6 sm:col-span-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                  <label for="nombre_comercial" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Nombre comercial <span class="text-accent-500">*</span>
                  </label>
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
                  <label for="razon_social" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Razón social <span class="text-accent-500">*</span>
                  </label>
                  <input
                    id="razon_social"
                    v-model="form.razon_social"
                    maxlength="200"
                    @input="form.razon_social = sanitizeNombre(form.razon_social)"
                    :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.razon_social ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
                  >
                  <p v-if="formErrors.razon_social" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.razon_social }}</p>
                </div>
                <div>
                  <label for="ruc" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    RUC <span class="text-accent-500">*</span>
                  </label>
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
                  <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Teléfono <span class="text-accent-500">*</span>
                  </label>
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
                  <label for="email_contacto" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Correo electrónico <span class="text-accent-500">*</span>
                  </label>
                  <input
                    id="email_contacto"
                    v-model="form.email_contacto"
                    type="email"
                    maxlength="254"
                    @input="form.email_contacto = sanitizeEmail(form.email_contacto)"
                    :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.email_contacto ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']">
                  <p v-if="formErrors.email_contacto" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.email_contacto }}</p>
                </div>
              </div>
            </div>

            <div class="col-span-6 sm:col-span-2 w-full max-w-xs">
              <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Logo</label>
              <ImageField
                :key="logoImageKey"
                :image-url="currentLogoUrl"
                perfil="logo"
                hint="JPG, PNG, WebP o SVG. Máximo 2 MB"
                alt="Logotipo de la empresa"
                empty-label="Subir logotipo"
                aspect="landscape"
                :error="logoError"
                @upload="onLogoUpload"
                @remove="onLogoRemove"
              />
            </div>

            <div class="col-span-6">
              <label for="condiciones" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Condiciones de la cotización
              </label>
              <textarea
                id="condiciones"
                v-model="form.condiciones"
                rows="5"
                :maxlength="CONDICIONES_MAX"
                placeholder="Una condición por línea. Ej.: Si el total supera los $500, se requiere un anticipo del 60%."
                @input="onCondicionesInput"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.condiciones ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              ></textarea>
              <div class="flex justify-between gap-4 mt-2">
                <p v-if="formErrors.condiciones" class="text-sm text-red-600 dark:text-red-500">{{ formErrors.condiciones }}</p>
                <p v-else class="text-xs text-gray-500 dark:text-gray-400">
                  Se imprimen en el PDF de cada cotización, después de la validez.
                </p>
                <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{{ form.condiciones.length }}/{{ CONDICIONES_MAX }}</span>
              </div>
            </div>

            <div class="col-span-6">
              <FormSaveActions
                :is-loading="isSaving"
                :is-edit-mode="true"
                cancel-href="/configuracion/empresa/"
                :on-submit="submit"
              />
            </div>

            <!--div class="flex justify-start col-span-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
            </div-->
          </div>
        </form>
      </div>
    </div>
</template>