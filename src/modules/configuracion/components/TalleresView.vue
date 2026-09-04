<script setup>
import { onMounted, reactive, ref } from 'vue';
import { sucursalesService } from '../services/sucursalesService';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import {
  sanitizeTaller,
  sanitizeNombre,
  sanitizeObservaciones,
  sanitizeTelefono,
} from '../../../shared/utils/sanitize';

const sucursales = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);
const isDeleting = ref(false);

const alert = ref({ type: 'default', title: '', message: '' });
const formErrors = ref({});

const showFormModal = ref(false);
const editingId = ref(null);

const emptyForm = () => ({
  nombre: '',
  codigo_sucursal: '',
  ciudad: '',
  direccion: '',
  telefono: '',
  is_active: true,
});

const form = reactive(emptyForm());

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

function resetForm() {
  Object.assign(form, emptyForm());
  formErrors.value = {};
  editingId.value = null;
}

function openCreate() {
  resetForm();
  showFormModal.value = true;
}

function openEdit(sucursal) {
  Object.assign(form, {
    nombre: sucursal.nombre || '',
    codigo_sucursal: sucursal.codigo_sucursal || '',
    ciudad: sucursal.ciudad || '',
    direccion: sucursal.direccion || '',
    telefono: sucursal.telefono || '',
    is_active: sucursal.is_active,
  });
  formErrors.value = {};
  editingId.value = sucursal.id;
  showFormModal.value = true;
}

function closeModal() {
  showFormModal.value = false;
}

function validateForm() {
  formErrors.value = {};
  const errors = {};

  if (!form.nombre || !form.nombre.trim()) {
    errors.nombre = 'El nombre de la sucursal es obligatorio.';
  }

  if (!form.codigo_sucursal || !form.codigo_sucursal.trim()) {
    errors.codigo_sucursal = 'El código de sucursal es obligatorio.';
  }

  if (!form.direccion || !form.direccion.trim()) {
    errors.direccion = 'La dirección es obligatoria.';
  }

  if (form.is_active && form.codigo_sucursal && form.codigo_sucursal.trim()) {
    const codigo = form.codigo_sucursal.trim();
    const duplicado = sucursales.value.some((s) =>
      s.is_active && s.codigo_sucursal === codigo && s.id !== editingId.value
    );
    if (duplicado) {
      errors.codigo_sucursal =
        'El código de sucursal ya está en uso por una sucursal activa.';
    }
  }

  formErrors.value = errors;
  return Object.keys(errors).length === 0;
}

async function loadSucursales() {
  isLoading.value = true;
  hideAlert();
  try {
    const data = await sucursalesService.listSucursales();
    sucursales.value = Array.isArray(data) ? data : data?.results || [];
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar las sucursales.');
  } finally {
    isLoading.value = false;
  }
}

async function submitForm() {
  formErrors.value = {};
  hideAlert();

  if (!validateForm()) {
    showAlert('error', '', 'Completa correctamente los campos marcados.');
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      nombre: form.nombre.trim(),
      codigo_sucursal: form.codigo_sucursal.trim(),
      ciudad: form.ciudad.trim(),
      direccion: form.direccion.trim(),
      telefono: form.telefono,
      is_active: form.is_active,
    };

    if (editingId.value) {
      await sucursalesService.updateSucursal(editingId.value, payload);
      showAlert('success', '', 'Sucursal actualizada correctamente.');
    } else {
      await sucursalesService.createSucursal(payload);
      showAlert('success', '', 'Sucursal creada correctamente.');
    }

    closeModal();
    await loadSucursales();
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo guardar la sucursal.');
  } finally {
    isSaving.value = false;
  }
}

const showDeleteModal = ref(false);
const sucursalToDelete = ref(null);

function openDeleteModal(sucursal) {
  sucursalToDelete.value = sucursal;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!sucursalToDelete.value) return;

  isDeleting.value = true;
  try {
    await sucursalesService.deleteSucursal(sucursalToDelete.value.id);
    showAlert('success', '', 'Sucursal eliminada correctamente.');
    showDeleteModal.value = false;
    sucursalToDelete.value = null;
    await loadSucursales();
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar la sucursal.');
    showDeleteModal.value = false;
    sucursalToDelete.value = null;
  } finally {
    isDeleting.value = false;
  }
}

onMounted(loadSucursales);
</script>

<template>
  <div class="w-full">
    <div class="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
      <div class="w-full mb-1">
        <div class="mb-4">
          <nav class="flex mb-5" aria-label="Breadcrumb">
            <ol class="inline-flex items-center space-x-1 text-sm font-medium md:space-x-2">
              <li class="inline-flex items-center">
                <a href="/" class="text-gray-700 hover:text-primary-600 dark:text-gray-300">Inicio</a>
              </li>
              <li class="text-gray-400">/ Configuración</li>
              <li class="text-gray-400">/ Sucursales</li>
            </ol>
          </nav>
          <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">Sucursales</h1>
        </div>

        <Alert
          :type="alert.type"
          :title="alert.title"
          :message="alert.message"
          dismissible
          @dismiss="hideAlert"
        />

        <div class="sm:flex items-center justify-between">
          <p class="text-sm text-gray-500 dark:text-gray-400">Gestiona los talleres y sedes de la empresa.</p>
          <div class="mt-3 sm:mt-0">
            <button
              type="button"
              class="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-700 rounded-lg border border-primary-700 hover:bg-primary-100 active:bg-primary-200 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-800 dark:active:bg-gray-700"
              @click="openCreate"
            >
              <svg class="w-5 h-5 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7.757v8.486M7.757 12h8.486M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
              Agregar sucursal
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <div class="overflow-x-auto">
        <div class="inline-block min-w-full align-middle">
          <div class="overflow-hidden shadow">
            <table class="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
              <thead class="bg-gray-200 dark:bg-gray-900">
                <tr>
                  <th v-for="heading in ['Nombre', 'Código', 'Ciudad', 'Dirección', 'Teléfono', 'Estado', 'Acciones']" :key="heading" scope="col" class="p-4 text-sm font-medium text-left text-gray-900 uppercase dark:text-gray-900">{{ heading }}</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                <tr v-if="isLoading"><td colspan="7" class="p-4 text-center text-gray-500 dark:text-gray-400">Cargando sucursales...</td></tr>
                <tr v-else-if="!sucursales.length"><td colspan="7" class="p-4 text-center text-gray-500 dark:text-gray-400">No se encontraron sucursales.</td></tr>
                <template v-else>
                  <tr v-for="sucursal in sucursales" :key="sucursal.id" class="hover:bg-gray-100 dark:hover:bg-gray-700">
                    <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ sucursal.nombre }}</td>
                    <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ sucursal.codigo_sucursal }}</td>
                    <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ sucursal.ciudad || '—' }}</td>
                    <td class="p-4 text-gray-800 dark:text-white">{{ sucursal.direccion }}</td>
                    <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ sucursal.telefono || '—' }}</td>
                    <td class="p-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="sucursal.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'">
                        {{ sucursal.is_active ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="p-4 whitespace-nowrap">
                      <button type="button" title="Editar sucursal" aria-label="Editar sucursal" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="openEdit(sucursal)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
                      </button>
                      <button type="button" title="Eliminar sucursal" aria-label="Eliminar sucursal" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(sucursal)">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <div v-if="showFormModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50" @click="closeModal"></div>
      <div class="relative w-full max-w-lg p-4 mx-auto">
        <form class="relative bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6 dark:bg-gray-800 dark:border-gray-700" novalidate @submit.prevent="submitForm">
          <button type="button" class="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm w-9 h-9 inline-flex justify-center items-center dark:hover:bg-gray-700 dark:hover:text-white" @click="closeModal">
            <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 17.94 6M18 18 6.06 6"/>
            </svg>
            <span class="sr-only">Cerrar modal</span>
          </button>

          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{{ editingId ? 'Editar sucursal' : 'Nueva sucursal' }}</h3>

          <div class="space-y-4">
            <div>
              <label for="sucursal_nombre" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre *</label>
              <input
                id="sucursal_nombre"
                v-model="form.nombre"
                maxlength="150"
                @input="form.nombre = sanitizeTaller(form.nombre)"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.nombre ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              >
              <p v-if="formErrors.nombre" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.nombre }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="sucursal_codigo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Código de sucursal *</label>
                <input
                  id="sucursal_codigo"
                  v-model="form.codigo_sucursal"
                  maxlength="10"
                  @input="form.codigo_sucursal = sanitizeText(form.codigo_sucursal)"
                  :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.codigo_sucursal ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
                >
                <p v-if="formErrors.codigo_sucursal" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.codigo_sucursal }}</p>
              </div>
              <div>
                <label for="sucursal_ciudad" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Ciudad</label>
                <input
                  id="sucursal_ciudad"
                  v-model="form.ciudad"
                  maxlength="100"
                  @input="form.ciudad = sanitizeNombre(form.ciudad)"
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
              </div>
            </div>

            <div>
              <label for="sucursal_direccion" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Dirección *</label>
              <textarea
                id="sucursal_direccion"
                v-model="form.direccion"
                rows="2"
                maxlength="300"
                @input="form.direccion = sanitizeObservaciones(form.direccion)"
                :class="['block w-full p-2.5 text-sm rounded-lg focus:ring-4 focus:ring-primary-300 dark:bg-gray-700 dark:text-white', formErrors.direccion ? 'bg-red-50 border border-red-500 text-red-900 placeholder-red-700 dark:bg-gray-700 dark:text-red-500 dark:placeholder-red-500 dark:border-red-500' : 'bg-gray-50 border border-gray-300 dark:border-gray-600']"
              ></textarea>
              <p v-if="formErrors.direccion" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ formErrors.direccion }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="sucursal_telefono" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Teléfono</label>
                <input
                  id="sucursal_telefono"
                  v-model="form.telefono"
                  inputmode="numeric"
                  maxlength="20"
                  @input="form.telefono = sanitizeTelefono(form.telefono)"
                  class="block w-full p-2.5 text-sm bg-gray-50 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
              </div>
              <div>
                <label for="sucursal_activo" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Estado</label>
                <label class="inline-flex items-center cursor-pointer">
                  <input id="sucursal_activo" v-model="form.is_active" type="checkbox" class="sr-only peer">
                  <div class="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  <span class="ms-3 text-sm text-gray-900 dark:text-white">{{ form.is_active ? 'Activo' : 'Inactivo' }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700" @click="closeModal">Cancelar</button>
            <button type="submit" :disabled="isSaving" class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-lg hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg v-if="isSaving" class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ isSaving ? 'Guardando...' : (editingId ? 'Guardar cambios' : 'Crear sucursal') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDeleteModal
      v-model="showDeleteModal"
      entity-name="sucursal"
      :item-name="sucursalToDelete?.nombre"
      :is-deleting="isDeleting"
      @confirm="confirmDelete"
      @cancel="sucursalToDelete = null"
    />
  </div>
</template>