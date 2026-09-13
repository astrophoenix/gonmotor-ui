<script setup>
import { reactive, ref, watch } from 'vue';
import { Camera, X, ZoomIn, ZoomOut } from 'lucide-vue-next';
import Alert from './Alert.vue';
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
const zoom = reactive({ visible: false, src: '', scale: 1 });

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

function abrirZoom(foto) {
  const src = foto.preview || foto.url;
  if (!src) return;
  zoom.src = src;
  zoom.scale = 1;
  zoom.visible = true;
}

function cerrarZoom() {
  zoom.visible = false;
  zoom.src = '';
  zoom.scale = 1;
}

function zoomMas() {
  zoom.scale = Math.min(3, zoom.scale + 0.25);
}

function zoomMenos() {
  zoom.scale = Math.max(0.5, zoom.scale - 0.25);
}

function toggleZoom() {
  if (zoom.scale === 1) {
    zoomMas();
  } else {
    zoom.scale = 1;
  }
}

function quitarFoto(index) {
  const foto = items.value.splice(index, 1)[0];
  if (!foto) return;
  if (foto.id) eliminadas.value.push(foto.id);
  if (foto.preview) URL.revokeObjectURL(foto.preview);
  error.value = '';
}

function onFotoSelected(event) {
  const input = event.target;
  const file = input && input.files && input.files[0];
  input.value = '';
  if (!file) return;
  if (!FOTO_ALLOWED.includes(file.type)) {
    error.value = 'Formato no permitido. Solo JPG, PNG o WebP.';
    return;
  }
  if (file.size > FOTO_MAX_SIZE) {
    error.value = 'La imagen supera el tamaño máximo de 5 MB.';
    return;
  }
  if (items.value.length >= props.max) {
    error.value = `Solo se permiten hasta ${props.max} fotos por ${props.entityLabel}.`;
    return;
  }
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
    <div v-if="disabled && disabledMessage" class="mb-3 text-sm text-red-600 dark:text-red-400">
      {{ disabledMessage }}
    </div>

    <Alert v-if="error" type="error" :message="error" dismissible class="mb-3" @dismiss="error = ''" />

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <div
        v-for="(foto, index) in items"
        :key="foto.id || foto.preview || index"
        class="border border-gray-200 rounded-lg p-3 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
      >
        <div
          class="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
          :class="{ 'cursor-zoom-in': foto.url || foto.preview }"
          @click="abrirZoom(foto)"
        >
          <img v-if="foto.url || foto.preview" :src="foto.preview || foto.url" :alt="'Foto ' + (index + 1)" class="h-full w-full object-cover" />
          <span v-else class="text-xs text-gray-500 dark:text-gray-400">Sin foto</span>
          <span
            v-if="foto.url || foto.preview"
            class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/20 hover:opacity-100"
          >
            <ZoomIn class="w-8 h-8 text-white drop-shadow" />
          </span>
          <button
            type="button"
            class="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white hover:bg-red-700"
            aria-label="Quitar foto"
            @click.stop="quitarFoto(index)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <input
          v-model="foto.descripcion"
          maxlength="255"
          placeholder="Descripción (opcional)"
          class="mt-2 block w-full p-2 text-sm bg-white rounded-lg border border-gray-300 dark:bg-gray-800 dark:text-white dark:border-gray-600"
        >
      </div>

      <label
        v-if="items.length < max && !disabled"
        class="flex min-h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        <Camera class="w-6 h-6" />
        Agregar foto
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          class="sr-only"
          @change="onFotoSelected"
        />
      </label>
    </div>

    <div
      v-if="zoom.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      @click="cerrarZoom"
    >
      <div class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl" @click.stop>
        <button
          type="button"
          class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Cerrar"
          @click="cerrarZoom"
        >
          <X class="w-5 h-5" />
        </button>
        <div class="absolute top-2 left-2 z-10 inline-flex items-center gap-1">
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/50 text-white hover:bg-black/70"
            aria-label="Alejar"
            @click="zoomMenos"
          >
            <ZoomOut class="w-5 h-5" />
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/50 text-white hover:bg-black/70"
            aria-label="Acercar"
            @click="zoomMas"
          >
            <ZoomIn class="w-5 h-5" />
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center h-8 px-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
            aria-label="Restablecer zoom"
            @click="zoom.scale = 1"
          >
            {{ Math.round(zoom.scale * 100) }}%
          </button>
        </div>
        <img
          :src="zoom.src"
          class="max-h-[90vh] max-w-[90vw] object-contain cursor-zoom-in transition-transform duration-150 select-none"
          :style="{ transform: `scale(${zoom.scale})` }"
          alt="Foto ampliada"
          @dblclick="toggleZoom"
        />
      </div>
    </div>
  </div>
</template>