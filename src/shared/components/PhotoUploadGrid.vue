<script setup>
import { computed, ref, watch } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import Alert from './Alert.vue';
import ConfirmModal from './ConfirmModal.vue';
import ImageField from './ImageField.vue';
import { sanitizeObservaciones } from '../utils/sanitize';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  entityId: {
    type: [Number, String],
    default: null,
  },
  entityField: {
    type: String,
    required: true,
  },
  service: {
    type: Object,
    required: true,
  },
  max: {
    type: Number,
    default: 5,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  disabledMessage: {
    type: String,
    default: '',
  },
  entityLabel: {
    type: String,
    default: 'entidad',
  },
});

const emit = defineEmits(['update:modelValue']);

const FOTO_MAX_SIZE = 5 * 1024 * 1024;
const FOTO_ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const items = ref([...props.modelValue]);
const eliminadas = ref([]);
const error = ref('');
const addField = ref(null);

const showConfirmRemove = ref(false);
const fotoPendiente = ref(null);

const mensajeEliminarFoto = computed(() => {
  const desc = (fotoPendiente.value?.descripcion || '').trim();
  const recorte = desc.length > 80 ? `${desc.slice(0, 80)}…` : desc;
  return `Esta foto tiene la descripción "${recorte}". Al eliminarla también se descartará la descripción. ¿Deseas continuar?`;
});

let lastEmitted = null;

watch(
  () => props.modelValue,
  (valor) => {
    if (valor === lastEmitted) return;
    items.value = [...valor];
  }
);

watch(
  items,
  (lista) => {
    lista.forEach((foto) => {
      const clean = sanitizeObservaciones(foto.descripcion || '').slice(0, 255);
      if (clean !== foto.descripcion) foto.descripcion = clean;
    });
    lastEmitted = lista;
    emit('update:modelValue', lista);
  },
  { deep: true }
);

function onFotoSelected(file) {
  if (items.value.length >= props.max) {
    error.value = `Solo se permiten hasta ${props.max} fotos por ${props.entityLabel}.`;
  } else {
    error.value = '';
    items.value.push({
      id: null,
      file,
      preview: URL.createObjectURL(file),
      url: null,
      descripcion: '',
      descripcionOriginal: '',
    });
  }
  // El alta vive en la ImageField; su preview interno se libera siempre.
  if (addField.value) addField.value.resetPreview();
}

function quitarFoto(index) {
  const foto = items.value[index];
  if (!foto) return;
  if (foto.descripcion && foto.descripcion.trim()) {
    fotoPendiente.value = foto;
    showConfirmRemove.value = true;
    return;
  }
  eliminarFoto(index);
}

function eliminarFoto(index) {
  const foto = items.value.splice(index, 1)[0];
  if (!foto) return;
  if (foto.id) eliminadas.value.push(foto.id);
  if (foto.preview) URL.revokeObjectURL(foto.preview);
  error.value = '';
}

function confirmarEliminarFoto() {
  const indice = items.value.indexOf(fotoPendiente.value);
  if (indice !== -1) eliminarFoto(indice);
  fotoPendiente.value = null;
  showConfirmRemove.value = false;
}

function cancelarEliminarFoto() {
  fotoPendiente.value = null;
}

function traducirErrorItem(valor, porDefecto) {
  return (typeof valor === 'string' && valor.trim()) ? valor.trim() : porDefecto;
}

async function guardarFotos() {
  const entidadRef = Number(props.entityId);
  if (!entidadRef) return;
  const errores = [];

  for (const id of eliminadas.value) {
    try {
      await props.service.deleteFoto(id);
    } catch (err) {
      errores.push(`Foto eliminada (#${id})`);
    }
  }

  for (const f of items.value) {
    if (!f.id && f.file) {
      try {
        const creada = await props.service.createFoto({
          [props.entityField]: entidadRef,
          imagen: f.file,
          descripcion: f.descripcion,
        });
        f.id = creada && creada.id;
        f.url = creada && creada.imagen;
        f.file = null;
        if (f.preview) URL.revokeObjectURL(f.preview);
        f.preview = null;
      } catch (err) {
        const msg = (err && err.message) || 'no se pudo subir';
        errores.push(`Foto "${traducirErrorItem(f.descripcion, 'sin descripción')}": ${msg}`);
      }
    } else if (f.id && f.descripcion !== f.descripcionOriginal) {
      try {
        await props.service.updateFoto(f.id, { descripcion: f.descripcion });
        f.descripcionOriginal = f.descripcion;
      } catch (err) {
        const msg = (err && err.message) || 'no se pudo actualizar';
        errores.push(`Foto: ${msg}`);
      }
    }
  }

  if (errores.length) {
    throw new Error(`No se pudieron guardar las fotos: ${errores.join(', ')}`);
  }

  eliminadas.value = [];
}

defineExpose({ guardarFotos });
</script>

<template>
  <div>
    <div v-if="disabled && disabledMessage" class="mb-3 text-sm text-fg-danger-strong">
      {{ disabledMessage }}
    </div>

    <Alert v-if="error" type="error" :message="error" dismissible class="mb-3" @dismiss="error = ''" />

    <div class="flex flex-col gap-4">
      <div
        v-for="(foto, index) in items"
        :key="foto.id || foto.preview || index"
        class="grid grid-cols-[88px_1fr] items-stretch gap-4 sm:grid-cols-[112px_1fr]"
      >
        <ImageField
          :image-url="foto.preview || foto.url || ''"
          :alt="'Foto ' + (index + 1)"
          :max-size="FOTO_MAX_SIZE"
          :allowed-types="FOTO_ALLOWED"
          :disabled="disabled"
          :show-hint="false"
          :droppable="false"
          compact
          @remove="quitarFoto(index)"
        />
        <textarea
          v-model="foto.descripcion"
          maxlength="255"
          placeholder="Descripción (opcional)"
          class="h-full min-h-16 w-full resize-none rounded border border-default-medium bg-neutral-secondary-medium p-2.5 text-sm text-heading shadow-xs placeholder:text-body focus:border-brand focus:ring-brand"
        />
      </div>

      <div
        v-if="items.length < max && !disabled"
        class="grid grid-cols-[88px_1fr] items-stretch gap-4 sm:grid-cols-[112px_1fr]"
      >
        <ImageField
          ref="addField"
          empty-label="Agregar foto"
          :max-size="FOTO_MAX_SIZE"
          :allowed-types="FOTO_ALLOWED"
          compact
          @upload="onFotoSelected"
        />
      </div>
    </div>

    <ConfirmModal
      v-model="showConfirmRemove"
      title="Foto con descripción"
      :message="mensajeEliminarFoto"
      :icon="Trash2"
      confirm-text="Sí, eliminar foto"
      @confirm="confirmarEliminarFoto"
      @cancel="cancelarEliminarFoto"
    />
  </div>
</template>
