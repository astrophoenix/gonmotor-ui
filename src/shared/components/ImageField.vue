<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Image as ImageIcon, Loader2, Plus, RefreshCw, Trash2, X, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { cargarLimitesImagenes, limitesImagenes, perfilImagen } from '@/shared/services/imagenesService';
import { comprimirImagen } from '@/shared/utils/imagenes';

const props = defineProps({
  imageUrl: {
    type: String,
    default: '',
  },
  // Miniatura para la casilla; el visor (zoom) carga siempre `imageUrl`.
  thumbUrl: {
    type: String,
    default: '',
  },
  file: {
    type: [Object, File],
    default: null,
  },
  label: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  alt: {
    type: String,
    default: 'Imagen',
  },
  emptyLabel: {
    type: String,
    default: 'Subir imagen',
  },
  error: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  /**
   * Perfil del backend (`evidencia`, `vehiculo`, `repuesto`, `avatar`, `logo`):
   * define a qué tamaño se comprime en el navegador antes de subir.
   */
  perfil: {
    type: String,
    default: 'evidencia',
  },
  // Por defecto, los límites publicados por el backend para el perfil.
  maxSize: {
    type: Number,
    default: null,
  },
  allowedTypes: {
    type: Array,
    default: null,
  },
  aspect: {
    type: String,
    default: 'square',
  },
  previewable: {
    type: Boolean,
    default: true,
  },
  droppable: {
    type: Boolean,
    default: true,
  },
  showHint: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:imageUrl', 'update:file', 'upload', 'remove', 'change']);

const TYPE_LABELS = {
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'image/heic': 'HEIC',
  'image/heif': 'HEIC',
};
const EXTENSIONES_HEIC = /\.(heic|heif)$/i;

const internalFile = ref(null);
const internalUrl = ref('');
const localError = ref('');
const dragging = ref(false);
const showViewer = ref(false);
const scale = ref(1);
const cleared = ref(false);
const procesando = ref(false);

const perfilActual = computed(() => perfilImagen(props.perfil));
const limiteBytes = computed(() => props.maxSize ?? perfilActual.value.max_bytes);
const tipos = computed(() => props.allowedTypes ?? limitesImagenes.value.formatos_aceptados);
// Algunos navegadores no reconocen el MIME de HEIC: se acepta también por extensión.
const accept = computed(() => {
  const lista = [...tipos.value];
  if (lista.includes('image/heic')) lista.push('.heic', '.heif');
  return lista.join(',');
});

const ASPECT_CLASSES = {
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  // Casilla baja para formularios densos: la imagen completa se ve en el visor.
  wide: 'aspect-[2/1]',
};
const aspectClass = computed(() => ASPECT_CLASSES[props.aspect] || ASPECT_CLASSES.square);

const maxSizeText = computed(() => {
  const bytes = limiteBytes.value;
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
});

const typesText = computed(() => {
  const labels = [];
  tipos.value.forEach((type) => {
    const label = TYPE_LABELS[type] || type.split('/').pop().toUpperCase();
    if (!labels.includes(label)) labels.push(label);
  });
  if (labels.length <= 1) return labels[0] || 'imagen';
  return `${labels.slice(0, -1).join(', ')} o ${labels[labels.length - 1]}`;
});

const hintText = computed(
  () => props.hint || `${typesText.value} · máx. ${maxSizeText.value}`,
);

// Mientras `cleared` está activo la imagen queda vacía aunque el padre
// siga enviando la URL anterior: el usuario siempre puede limpiar el campo.
const currentSrc = computed(() =>
  cleared.value ? '' : internalUrl.value || props.imageUrl,
);
const hasImage = computed(() => Boolean(currentSrc.value));
const tileSrc = computed(() =>
  !cleared.value && !internalUrl.value && props.thumbUrl ? props.thumbUrl : currentSrc.value,
);
const errorMessage = computed(() => localError.value || props.error);

function isTypeAllowed(type, name = '') {
  if (!type && EXTENSIONES_HEIC.test(name)) {
    return tipos.value.includes('image/heic');
  }
  return tipos.value.some((allowed) => {
    if (allowed.endsWith('/*')) {
      return String(type).startsWith(allowed.slice(0, -1));
    }
    return allowed === type;
  });
}

function revokeInternal() {
  if (internalUrl.value) {
    URL.revokeObjectURL(internalUrl.value);
    internalUrl.value = '';
  }
}

function setInternalFile(file) {
  revokeInternal();
  internalFile.value = file || null;
  internalUrl.value = file ? URL.createObjectURL(file) : '';
}

async function handleFile(original) {
  if (!original || props.disabled || procesando.value) return;
  if (!isTypeAllowed(original.type, original.name)) {
    localError.value = `Formato no permitido. Solo ${typesText.value}.`;
    return;
  }
  // Se comprime antes de validar el peso: una foto de 15 MB llega a ~400 KB.
  procesando.value = true;
  let file;
  try {
    file = await comprimirImagen(original, perfilActual.value);
  } finally {
    procesando.value = false;
  }
  if (file.size > limiteBytes.value) {
    localError.value = `La imagen supera los ${maxSizeText.value}.`;
    return;
  }
  localError.value = '';
  cleared.value = false;
  setInternalFile(file);
  emit('upload', file);
  emit('update:file', file);
  emit('update:imageUrl', internalUrl.value);
  emit('change', { file, src: internalUrl.value, hasImage: true });
}

function onFileChange(event) {
  const input = event.target;
  const file = input && input.files && input.files[0];
  if (input) input.value = '';
  handleFile(file);
}

function onDrop(event) {
  dragging.value = false;
  if (props.disabled || !props.droppable) return;
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  handleFile(file);
}

function clearImage() {
  setInternalFile(null);
  localError.value = '';
  cleared.value = true;
  showViewer.value = false;
  emit('remove');
  emit('update:file', null);
  emit('update:imageUrl', '');
  emit('change', { file: null, src: '', hasImage: false });
}

function openViewer() {
  if (props.previewable && hasImage.value) {
    scale.value = 1;
    showViewer.value = true;
  }
}

function closeViewer() {
  showViewer.value = false;
  scale.value = 1;
}

function zoomIn() {
  scale.value = Math.min(3, Number((scale.value + 0.25).toFixed(2)));
}

function zoomOut() {
  scale.value = Math.max(0.5, Number((scale.value - 0.25).toFixed(2)));
}

function toggleZoom() {
  scale.value = scale.value === 1 ? 2 : 1;
}

function resetPreview() {
  setInternalFile(null);
  localError.value = '';
  cleared.value = false;
}

watch(
  () => props.file,
  (file) => {
    if (file === internalFile.value) return;
    if (file) cleared.value = false;
    setInternalFile(file || null);
  },
  { immediate: true },
);

// Una URL nueva del padre (recarga, guardado, otro registro) reactiva la vista.
watch(
  () => props.imageUrl,
  (url) => {
    if (url) cleared.value = false;
  },
);

watch(
  () => props.error,
  (value) => {
    if (value) localError.value = '';
  },
);

onMounted(cargarLimitesImagenes);
onBeforeUnmount(revokeInternal);

defineExpose({ resetPreview, clearImage, hasImage, currentSrc });
</script>

<template>
  <div
    class="rounded border border-default bg-neutral-secondary-soft p-3 shadow-xs transition"
    :class="[
      errorMessage ? 'border-danger-subtle' : '',
      dragging ? 'ring-2 ring-brand' : '',
    ]"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <p v-if="label || required" class="mb-2 text-sm font-medium text-heading">
      {{ label }}<span v-if="required" class="text-accent-500 dark:text-accent-400">*</span>
    </p>

    <div
      v-if="hasImage"
      class="group relative w-full cursor-zoom-in overflow-hidden rounded bg-default"
      :class="[aspectClass, !previewable ? 'cursor-default' : '']"
      @click="openViewer"
    >
      <img :src="tileSrc" :alt="alt" loading="lazy" decoding="async" class="h-full w-full object-cover" />
      <span
        v-if="previewable"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100"
      >
        <ZoomIn class="w-8 h-8 text-white drop-shadow" />
      </span>
      <button
        v-if="!disabled"
        type="button"
        class="absolute top-1.5 right-1.5 inline-flex items-center justify-center rounded-full bg-danger text-white shadow-xs hover:bg-danger-strong"
        :class="compact ? 'w-6 h-6' : 'w-7 h-7'"
        aria-label="Quitar imagen"
        @click.stop="clearImage"
      >
        <Trash2 class="w-4 h-4" />
      </button>
      <label
        v-if="compact && !disabled"
        class="absolute bottom-1.5 left-1.5 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white shadow-xs transition hover:bg-black/70"
        title="Reemplazar imagen"
        aria-label="Reemplazar imagen"
        @click.stop
      >
        <RefreshCw class="w-3.5 h-3.5" />
        <input
          type="file"
          class="sr-only"
          :accept="accept"
          @change="onFileChange"
        />
      </label>
    </div>

    <label
      v-else
      class="flex w-full cursor-pointer flex-col items-center justify-center rounded border border-dashed border-default bg-neutral-secondary-medium text-center transition hover:bg-neutral-tertiary"
      :class="[
        aspectClass,
        compact ? 'gap-1 px-1' : 'gap-2 px-3',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ]"
    >
      <Loader2 v-if="procesando" :class="compact ? 'w-5 h-5 text-body animate-spin' : 'w-8 h-8 text-body animate-spin'" />
      <ImageIcon v-else :class="compact ? 'w-5 h-5 text-body' : 'w-8 h-8 text-body'" />
      <span :class="compact ? 'text-xs font-medium leading-tight text-heading' : 'text-sm font-medium text-heading'">{{ procesando ? 'Procesando…' : emptyLabel }}</span>
      <span v-if="showHint && !compact" class="text-xs text-body">{{ hintText }}</span>
      <input
        type="file"
        class="sr-only"
        :accept="accept"
        :disabled="disabled || procesando"
        @change="onFileChange"
      />
    </label>

    <label
      v-if="hasImage && !disabled && !compact"
      class="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-default bg-neutral-secondary-medium px-3 py-2 text-sm font-medium text-heading shadow-xs transition hover:bg-neutral-tertiary"
    >
      <Plus class="w-4 h-4" />
      Reemplazar
      <input
        type="file"
        class="sr-only"
        :accept="accept"
        @change="onFileChange"
      />
    </label>

    <slot name="footer"></slot>

    <p v-if="errorMessage" class="mt-2 text-xs text-fg-danger-strong">
      {{ errorMessage }}
    </p>
    <p v-else-if="hasImage && showHint" class="mt-2 text-xs text-body">{{ hintText }}</p>

    <div
      v-if="showViewer"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4"
      @click="closeViewer"
    >
      <div
        class="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl"
        @click.stop
      >
        <button
          type="button"
          class="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Cerrar"
          @click="closeViewer"
        >
          <X class="w-5 h-5" />
        </button>
        <div class="absolute top-2 left-2 z-10 inline-flex items-center gap-1">
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/50 text-white hover:bg-black/70"
            aria-label="Alejar"
            @click="zoomOut"
          >
            <ZoomOut class="w-5 h-5" />
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/50 text-white hover:bg-black/70"
            aria-label="Acercar"
            @click="zoomIn"
          >
            <ZoomIn class="w-5 h-5" />
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center h-8 px-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
            aria-label="Restablecer zoom"
            @click="scale = 1"
          >
            {{ Math.round(scale * 100) }}%
          </button>
        </div>
        <img
          :src="currentSrc"
          class="max-h-[90vh] max-w-[90vw] cursor-zoom-in object-contain transition-transform duration-150 select-none"
          :style="{ transform: `scale(${scale})` }"
          :alt="`${alt} ampliada`"
          @dblclick="toggleZoom"
        />
      </div>
    </div>
  </div>
</template>
