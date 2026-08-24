<script setup>
import { onMounted, reactive, ref } from 'vue';
import { vehiclesService } from '../services/vehiclesService';
import { request } from '../../../shared/services/httpClient';

const vehicleId = new URLSearchParams(window.location.search).get('id');
const isEditMode = Boolean(vehicleId);
const form = reactive({
  placa: '',
  vin: '',
  numero_motor: '',
  marca: '',
  modelo: '',
  anio: null,
  color: '',
  transmision: 'M',
  combustible: 'GAS',
  tipo: 'AUTO',
  pais_origen: 'EC',
  kilometraje_actual: 0,
  observaciones: '',
  is_active: true,
  empresas: [],
});
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const empresas = ref([]);
const isLoadingEmpresas = ref(false);
const tipos = ref([]);
const paises = ref([]);
const isLoadingChoices = ref(false);
const localImagePreview = ref('');

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

async function loadVehicle() {
  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await vehiclesService.getById(vehicleId);
    Object.assign(form, data);
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
  }
}

async function loadEmpresas() {
  isLoadingEmpresas.value = true;
  try {
    const data = await request('/api/empresas/');
    empresas.value = Array.isArray(data) ? data : (data.results || []);
  } catch (error) {
    console.error('No se pudieron cargar las empresas:', error);
  } finally {
    isLoadingEmpresas.value = false;
  }
}

async function loadChoices() {
  isLoadingChoices.value = true;
  try {
    const data = await request('/api/vehiculos/choices/');
    tipos.value = Array.isArray(data?.tipo) ? data.tipo : [];
    paises.value = Array.isArray(data?.paises) ? data.paises : [];
  } catch (error) {
    console.error('No se pudieron cargar las opciones:', error);
  } finally {
    isLoadingChoices.value = false;
  }
}

function toggleEmpresa(empresaId) {
  const index = form.empresas.indexOf(empresaId);
  if (index === -1) {
    form.empresas.push(empresaId);
  } else {
    form.empresas.splice(index, 1);
  }
}

async function onImageChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  const previousPreview = localImagePreview.value;
  if (previousPreview) {
    URL.revokeObjectURL(previousPreview);
  }

  localImagePreview.value = URL.createObjectURL(file);
  const fd = new FormData();
  fd.append('imagen', file);
  try {
    const data = await request(`/api/vehiculos/${vehicleId}/imagen/`, {
      method: 'POST',
      body: fd,
    });
    form.imagen = data.imagen || form.imagen;
  } catch (error) {
    localImagePreview.value = previousPreview || '';
    showError(error);
  }
}

async function cancelImage() {
  const preview = localImagePreview.value;
  if (preview) {
    URL.revokeObjectURL(preview);
    localImagePreview.value = '';
  }
  try {
    await request(`/api/vehiculos/${vehicleId}/imagen/`, { method: 'DELETE' });
    form.imagen = '';
  } catch (error) {
    showError(error);
  }
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  isSaving.value = true;

  try {
    if (isEditMode) {
      await vehiclesService.update(vehicleId, { ...form });
      successMessage.value = 'Vehículo actualizado correctamente.';
    } else {
      await vehiclesService.create({ ...form });
      successMessage.value = 'Vehículo creado correctamente.';
    }
    window.setTimeout(() => window.location.assign('/crud/vehiculos/'), 500);
  } catch (error) {
    showError(error);
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadVehicle();
  loadEmpresas();
  loadChoices();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/vehiculos/" class="hover:text-primary-600">Vehículos</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Agregar' }}</li>
      </ol>
    </nav>
    <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">{{ isEditMode ? 'Editar vehículo' : 'Nuevo vehículo' }}</h1>
  </div>

  <div class="p-4">
    <div class="relative max-w-4xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <h4 class="mb-4 text-xl font-semibold dark:text-white">Información General</h4>
      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando vehículo...</div>
      <form v-else class="grid grid-cols-6 gap-6" novalidate @submit.prevent="submit">
        <div v-if="errorMessage" class="col-span-6 p-4 text-sm text-red-800 bg-red-50 rounded-lg dark:bg-gray-700 dark:text-red-400" role="alert">{{ errorMessage }}</div>
        <div v-if="successMessage" class="col-span-6 p-4 text-sm text-green-800 bg-green-50 rounded-lg dark:bg-gray-700 dark:text-green-400" role="status">{{ successMessage }}</div>
        <div class="col-span-6">
          <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Empresas</p>
          <div v-if="isLoadingEmpresas" class="text-sm text-gray-500 dark:text-gray-400">Cargando empresas...</div>
          <div v-else-if="!empresas.length" class="text-sm text-gray-500 dark:text-gray-400">No hay empresas disponibles.</div>
          <div v-else class="flex flex-wrap gap-4">
            <label v-for="empresa in empresas" :key="empresa.id" class="inline-flex items-center space-x-2">
              <input type="checkbox" :value="empresa.id" :checked="form.empresas.includes(empresa.id)" @change="toggleEmpresa(empresa.id)" class="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500">
              <span class="text-sm text-gray-900 dark:text-gray-300">{{ empresa.nombre_comercial }}</span>
            </label>
          </div>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="placa" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</label>
          <input id="placa" v-model="form.placa" required maxlength="10" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="marca" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</label>
          <input id="marca" v-model="form.marca" required maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="modelo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</label>
          <input id="modelo" v-model="form.modelo" required maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="anio" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Año de Fabricación</label>
          <input id="anio" v-model="form.anio" type="number" min="1900" :max="new Date().getFullYear() + 1" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="color" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
          <input id="color" v-model="form.color" maxlength="30" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="transmision" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Transmisión</label>
          <select id="transmision" v-model="form.transmision" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            <option value="M">Manual / Mecánica</option>
            <option value="A">Automática</option>
            <option value="C">CVT</option>
          </select>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="combustible" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Combustible</label>
          <select id="combustible" v-model="form.combustible" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            <option value="GAS">Gasolina</option>
            <option value="DIE">Diésel</option>
            <option value="HIB">Híbrido</option>
            <option value="ELE">Eléctrico</option>
          </select>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="tipo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
          <select id="tipo" v-model="form.tipo" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            <option v-for="item in tipos" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="pais_origen" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">País de Origen</label>
          <select id="pais_origen" v-model="form.pais_origen" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
            <option v-for="item in paises" :key="item.code" :value="item.code">{{ item.name }}</option>
          </select>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="kilometraje_actual" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje Actual</label>
          <input id="kilometraje_actual" v-model="form.kilometraje_actual" type="number" min="0" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="vin" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">VIN / Chasis</label>
          <input id="vin" v-model="form.vin" maxlength="17" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="numero_motor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Número de Motor</label>
          <input id="numero_motor" v-model="form.numero_motor" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="observaciones" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Observaciones</label>
          <textarea id="observaciones" v-model="form.observaciones" rows="3" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Imagen</p>
          <div class="flex items-start space-x-6 p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div class="w-40 h-40 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
              <img :src="localImagePreview || form.imagen" class="w-full h-full object-cover" alt="Imagen del vehículo">
              <svg v-if="!localImagePreview && !form.imagen" class="w-16 h-16 text-gray-900 dark:text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">JPG, PNG o WebP. Máximo 2MB</p>
              <div class="flex items-center space-x-3">
                <label class="inline-flex items-center px-4 py-2 text-sm font-medium text-center text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 cursor-pointer">
                  <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path><path d="M9 13h2v5a1 1 0 11-2 0v-5z"></path></svg>
                  Upload picture
                  <input type="file" class="hidden" accept="image/*" @change="onImageChange">
                </label>
                <button type="button" :disabled="!form.imagen" @click="cancelImage" class="py-2 px-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  Cancelar
                </button>
              </div>
              <p v-if="!form.imagen" class="mt-3 text-sm text-gray-500 dark:text-gray-400">Sin imagen registrada</p>
            </div>
          </div>
        </div>
        <div class="flex items-center col-span-6">
          <input id="is_active" v-model="form.is_active" type="checkbox" class="w-4 h-4 text-primary-600 rounded">
          <label for="is_active" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Vehículo activo</label>
        </div>
        <div class="flex items-center justify-end col-span-6 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a href="/crud/vehiculos/" class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300">Cancelar</a>
          <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-50">{{ isSaving ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Guardar') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
