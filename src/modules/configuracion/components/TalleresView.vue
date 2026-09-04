<script setup>
import { onMounted, ref } from 'vue';
import { talleresService } from '../services/talleresService';
import EntityActionButtons from '../../../shared/components/EntityActionButtons.vue';
import EntityTable from '../../../shared/components/EntityTable.vue';
import ConfirmDeleteModal from '../../../shared/components/ConfirmDeleteModal.vue';
import Alert from '../../../shared/components/Alert.vue';
import TallerModal from './TallerModal.vue';

const talleres = ref([]);
const isLoading = ref(true);
const isDeleting = ref(false);

const alert = ref({ type: 'default', title: '', message: '' });

const columns = ['Nombre', 'Código', 'Ciudad', 'Dirección', 'Teléfono', 'Estado', 'Acciones'];

function showAlert(type, title, message) {
  alert.value = { type, title, message };
}

function hideAlert() {
  alert.value = { type: 'default', title: '', message: '' };
}

const showTallerModal = ref(false);
const tallerModalId = ref(null);

function openCreateModal() {
  tallerModalId.value = null;
  showTallerModal.value = true;
}

function openEditModal(taller) {
  tallerModalId.value = taller.id;
  showTallerModal.value = true;
}

function onTallerSaved(message) {
  showTallerModal.value = false;
  tallerModalId.value = null;
  showAlert('success', '', message);
  loadTalleres();
}

function onTallerCreated() {
  onTallerSaved('Taller creado correctamente.');
}

function onTallerUpdated() {
  onTallerSaved('Taller actualizado correctamente.');
}

async function loadTalleres() {
  isLoading.value = true;
  hideAlert();
  try {
    const data = await talleresService.listTalleres();
    talleres.value = Array.isArray(data) ? data : data?.results || [];
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudieron cargar los talleres.');
  } finally {
    isLoading.value = false;
  }
}

const showDeleteModal = ref(false);
const tallerToDelete = ref(null);

function openDeleteModal(taller) {
  tallerToDelete.value = taller;
  showDeleteModal.value = true;
}

async function confirmDelete() {
  if (!tallerToDelete.value) return;

  isDeleting.value = true;
  try {
    await talleresService.deleteTaller(tallerToDelete.value.id);
    showAlert('success', '', 'Taller eliminado correctamente.');
    showDeleteModal.value = false;
    tallerToDelete.value = null;
    await loadTalleres();
  } catch (error) {
    showAlert('error', '', error.message || 'No se pudo eliminar el taller.');
    showDeleteModal.value = false;
    tallerToDelete.value = null;
  } finally {
    isDeleting.value = false;
  }
}

onMounted(loadTalleres);
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
              <li class="text-gray-400">/ Talleres</li>
            </ol>
          </nav>
          <h1 class="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">Talleres</h1>
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
          <div class="flex items-center mt-3 ml-auto sm:mt-0">
            <EntityActionButtons
              entity="talleres"
              :show-export-pdf="false"
              :show-export-excel="false"
              @add="openCreateModal"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col">
      <EntityTable
        :columns="columns"
        :items="talleres"
        :loading="isLoading"
        loading-text="Cargando talleres..."
        empty-text="No se encontraron talleres."
        :empty-colspan="columns.length"
      >
        <template #row="{ item }">
          <tr class="hover:bg-gray-100 dark:hover:bg-gray-700">
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.nombre }}</td>
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.codigo_sucursal }}</td>
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.ciudad || '—' }}</td>
            <td class="p-4 text-gray-800 dark:text-white">{{ item.direccion }}</td>
            <td class="p-4 text-gray-800 whitespace-nowrap dark:text-white">{{ item.telefono || '—' }}</td>
            <td class="p-4 whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="item.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'">
                {{ item.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="p-4 whitespace-nowrap">
              <button type="button" title="Editar taller" aria-label="Editar taller" class="inline-flex items-center p-2 text-primary-600 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-gray-700" @click="openEditModal(item)">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg>
              </button>
              <button type="button" title="Eliminar taller" aria-label="Eliminar taller" :disabled="isDeleting" class="inline-flex items-center p-2 text-red-600 rounded-lg hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700" @click="openDeleteModal(item)">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
              </button>
            </td>
          </tr>
        </template>
      </EntityTable>
    </div>

    <ConfirmDeleteModal
      v-model="showDeleteModal"
      entity-name="taller"
      :item-name="tallerToDelete?.nombre"
      :is-deleting="isDeleting"
      @confirm="confirmDelete"
      @cancel="tallerToDelete = null"
    />

    <TallerModal
      v-model="showTallerModal"
      :taller-id="tallerModalId"
      @created="onTallerCreated"
      @updated="onTallerUpdated"
    />
  </div>
</template>