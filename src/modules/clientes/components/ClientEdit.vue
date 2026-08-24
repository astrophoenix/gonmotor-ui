<script setup>
import { onMounted, reactive, ref } from 'vue';
import { clientsService } from '../services/clientesService';
import { request } from '../../../shared/services/httpClient';
import Alert from '../../../shared/components/Alert.vue';

const clientId = new URLSearchParams(window.location.search).get('id');
const isEditMode = Boolean(clientId);
const form = reactive({
  tipo_identificacion: 'C',
  identificacion: '',
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  contifico_id: '',
  is_active: true
});
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const vehiculos = ref([]);
let nextVehicleUid = 1;
const tipos = ref([]);
const paises = ref([]);
const isLoadingChoices = ref(false);
const localImagePreviews = ref({});

function showError(error) {
  errorMessage.value = error.message || 'No fue posible completar la operación.';
}

function createEmptyVehiculo() {
  return {
    _uid: nextVehicleUid++,
    placa: '',
    marca: '',
    modelo: '',
    anio: null,
    color: '',
    transmision: 'M',
    combustible: 'GAS',
    tipo: 'AUTO',
    pais_origen: 'EC',
    vin: '',
    numero_motor: '',
    kilometraje_actual: 0,
    observaciones: '',
    is_active: true
  };
}

function addVehiculo() {
  vehiculos.value.push(createEmptyVehiculo());
}

function removeVehiculo(index) {
  const removed = vehiculos.value[index];
  if (removed) {
    const key = removed._uid || removed.id;
    const preview = localImagePreviews.value[key];
    if (preview) {
      URL.revokeObjectURL(preview);
      delete localImagePreviews.value[key];
    }
  }
  vehiculos.value.splice(index, 1);
}

async function loadClient(clearMessages = true) {
  if (clearMessages) {
    errorMessage.value = '';
    successMessage.value = '';
  }

  Object.values(localImagePreviews.value).forEach(url => URL.revokeObjectURL(url));
  localImagePreviews.value = {};

  if (!isEditMode) {
    isLoading.value = false;
    return;
  }

  try {
    const data = await clientsService.getById(clientId);
    Object.assign(form, data);
    if (data.vehiculos && Array.isArray(data.vehiculos)) {
      vehiculos.value = data.vehiculos.map(v => ({ ...v }));
    }
  } catch (error) {
    showError(error);
  } finally {
    isLoading.value = false;
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

function getVehicleKey(vehiculo) {
  return vehiculo._uid || vehiculo.id;
}

function getLocalPreview(vehiculo) {
  return localImagePreviews.value[getVehicleKey(vehiculo)] || '';
}

function onImageChange(event, vehiculo) {
  const file = event.target.files[0];
  if (!file) return;
  const key = getVehicleKey(vehiculo);

  const previousPreview = localImagePreviews.value[key];
  if (previousPreview) {
    URL.revokeObjectURL(previousPreview);
  }

  const previewUrl = URL.createObjectURL(file);
  localImagePreviews.value[key] = previewUrl;
  vehiculo.imagenFile = file;
  vehiculo.imagenPreview = previewUrl;
}

function cancelImage(vehiculo) {
  const key = getVehicleKey(vehiculo);
  const preview = localImagePreviews.value[key];
  if (preview) {
    URL.revokeObjectURL(preview);
    delete localImagePreviews.value[key];
  }
  vehiculo.imagenFile = null;
  vehiculo.imagenPreview = '';
  vehiculo.imagen = '';
}

async function submit() {
  errorMessage.value = '';
  successMessage.value = '';
  isSaving.value = true;

  try {
    const formData = new FormData();

    formData.append('tipo_identificacion', form.tipo_identificacion);
    formData.append('identificacion', form.identificacion);
    formData.append('nombre', form.nombre);
    formData.append('email', form.email || '');
    formData.append('telefono', form.telefono || '');
    formData.append('direccion', form.direccion || '');
    formData.append('contifico_id', form.contifico_id || '');
    formData.append('is_active', String(form.is_active));

    const vehiculosPayload = vehiculos.value.map((v, index) => {
      const { _uid, imagenFile, imagenPreview, imagen, ...rest } = v;
      const item = {
        ...rest,
        placa: (v.placa || '').trim().toUpperCase()
      };
      if (imagenFile) {
        formData.append(`vehiculo_${index}_imagen`, imagenFile);
      }
      return item;
    });

    formData.append('vehiculos', JSON.stringify(vehiculosPayload));

    if (isEditMode) {
      await request(`/api/clientes/${clientId}/`, {
        method: 'PATCH',
        body: formData,
      });
      successMessage.value = 'Cliente actualizado correctamente.';
      await loadClient(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const response = await request('/api/clientes/', {
        method: 'POST',
        body: formData,
      });
      const nuevoId = response?.id;
      if (nuevoId) {
        window.location.assign(`/crud/clientes/editar/?id=${encodeURIComponent(nuevoId)}`);
      } else {
        successMessage.value = 'Cliente creado correctamente.';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  } catch (error) {
    showError(error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadClient();
  loadChoices();
});
</script>

<template>
  <div class="p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
    <nav class="flex mb-5" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
        <li><a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a></li>
        <li class="text-gray-400">/ <a href="/crud/clientes/" class="hover:text-primary-600">Clientes</a></li>
        <li class="text-gray-400">/ {{ isEditMode ? 'Editar' : 'Agregar' }}</li>
      </ol>
    </nav>
    <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">{{ isEditMode ? 'Editar cliente' : 'Nuevo cliente' }}</h1>
  </div>

  <div class="p-4">
    <div class="relative max-w-6xl p-6 bg-white rounded-lg shadow dark:bg-gray-800">
      <Alert v-if="successMessage" type="success" :message="successMessage" dismissible @dismiss="successMessage = ''" />
      <Alert v-if="errorMessage" type="error" :message="errorMessage" dismissible @dismiss="errorMessage = ''" />
      <h4 class="mb-4 text-xl font-semibold dark:text-white">Información General</h4>
      <div v-if="isLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando cliente...</div>
      <form v-else class="grid grid-cols-6 gap-6" novalidate @submit.prevent="submit">
        <div class="col-span-6 sm:col-span-3">
          <label for="tipo_identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo de identificación</label>
          <select id="tipo_identificacion" v-model="form.tipo_identificacion" required class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"><option value="C">Cédula</option><option value="R">RUC</option><option value="P">Pasaporte</option></select>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="identificacion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Identificación</label>
          <input id="identificacion" v-model="form.identificacion" required maxlength="13" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6">
          <label for="nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre o razón social</label>
          <input id="nombre" v-model="form.nombre" required maxlength="200" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Correo electrónico</label>
          <input id="email" v-model="form.email" type="email" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
          <input id="telefono" v-model="form.telefono" maxlength="20" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="col-span-6">
          <label for="direccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Dirección</label>
          <textarea id="direccion" v-model="form.direccion" rows="3" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
        </div>
        <div class="col-span-6 sm:col-span-3">
          <label for="contifico_id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">ID de Contífico</label>
          <input id="contifico_id" v-model="form.contifico_id" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
        </div>
        <div class="flex items-center col-span-6"><input id="is_active" v-model="form.is_active" type="checkbox" class="w-4 h-4 text-primary-600 rounded"><label for="is_active" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Cliente activo</label></div>

        <div class="col-span-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-xl font-semibold dark:text-white">Vehículos del Cliente</h4>
            <button type="button" @click="addVehiculo" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300">
              <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
              Agregar Vehículo
            </button>
          </div>

          <div v-if="!vehiculos.length" class="p-4 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">
            No hay vehículos asociados. Presiona "Agregar Vehículo" para crear uno.
          </div>

          <div v-for="(vehiculo, index) in vehiculos" :key="vehiculo._uid || vehiculo.id" class="p-4 mb-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
              <h5 class="text-lg font-medium text-gray-900 dark:text-white">Vehículo {{ index + 1 }}</h5>
              <button type="button" @click="removeVehiculo(index)" class="inline-flex items-center p-2 text-red-600 border border-red-500 rounded-lg hover:bg-red-100 dark:text-red-400 dark:hover:bg-gray-700" title="Eliminar vehículo" aria-label="Eliminar vehículo">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Placa</label>
                <input v-model="vehiculo.placa" maxlength="10" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Marca</label>
                <input v-model="vehiculo.marca" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Modelo</label>
                <input v-model="vehiculo.modelo" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Año</label>
                <input v-model="vehiculo.anio" type="number" min="1900" :max="new Date().getFullYear() + 1" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Color</label>
                <input v-model="vehiculo.color" maxlength="30" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Transmisión</label>
                <select v-model="vehiculo.transmision" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  <option value="M">Manual / Mecánica</option>
                  <option value="A">Automática</option>
                  <option value="C">CVT</option>
                </select>
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Combustible</label>
                <select v-model="vehiculo.combustible" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  <option value="GAS">Gasolina</option>
                  <option value="DIE">Diésel</option>
                  <option value="HIB">Híbrido</option>
                  <option value="ELE">Eléctrico</option>
                </select>
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
                <select v-model="vehiculo.tipo" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  <option v-for="item in tipos" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">País de Origen</label>
                <select v-model="vehiculo.pais_origen" :disabled="isLoadingChoices" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
                  <option v-for="item in paises" :key="item.code" :value="item.code">{{ item.name }}</option>
                </select>
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">VIN / Chasis</label>
                <input v-model="vehiculo.vin" maxlength="17" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Motor</label>
                <input v-model="vehiculo.numero_motor" maxlength="50" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kilometraje</label>
                <input v-model="vehiculo.kilometraje_actual" type="number" min="0" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white">
              </div>
              <div class="col-span-1 md:col-span-2">
                <p class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Imagen</p>
                <div class="flex items-start space-x-6 p-4 border border-gray-200 rounded-lg dark:border-gray-700">
                  <div class="w-40 h-40 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
                    <img v-if="getLocalPreview(vehiculo) || vehiculo.imagen" :src="getLocalPreview(vehiculo) || vehiculo.imagen" class="w-full h-full object-cover" alt="Imagen del vehículo">
                    <svg v-if="!getLocalPreview(vehiculo) && !vehiculo.imagen" class="w-16 h-16 text-gray-900 dark:text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">JPG, PNG. Máximo 2MB</p>
                    <div class="flex items-center space-x-3">
                      <label class="inline-flex items-center px-4 py-2 text-sm font-medium text-center text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 cursor-pointer">
                        <svg class="w-4 h-4 mr-2 -ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z"></path><path d="M9 13h2v5a1 1 0 11-2 0v-5z"></path></svg>
                        Subir foto
                        <input type="file" class="hidden" accept="image/*" @change="(e) => onImageChange(e, vehiculo)">
                      </label>
                      <button type="button" :disabled="!vehiculo.imagen && !getLocalPreview(vehiculo)" @click="cancelImage(vehiculo)" class="py-2 px-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        Cancelar
                      </button>
                    </div>
                    <p v-if="!vehiculo.imagen" class="mt-3 text-sm text-gray-500 dark:text-gray-400">Sin imagen registrada</p>
                  </div>
                </div>
              </div>
              <div class="col-span-1 md:col-span-2">
                <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Observaciones</label>
                <textarea v-model="vehiculo.observaciones" rows="2" class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white"></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end col-span-6 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <a href="/crud/clientes/" class="px-5 py-2.5 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg dark:bg-gray-700 dark:text-gray-300">Cancelar</a>
          <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-primary-700 hover:bg-primary-800 disabled:opacity-50">{{ isSaving ? 'Guardando...' : (isEditMode ? 'Actualizar' : 'Guardar') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
