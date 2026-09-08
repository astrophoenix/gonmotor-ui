import { ref } from 'vue';
import { notificacionesService } from '../services/notificacionesService';
import { useToast } from '../../../shared/composables/useToast';

/**
 * Composable central del módulo de notificaciones WhatsApp.
 *
 * Expone estado reactivo (estado del proveedor, preferencias y bitácora) y
 * las acciones que consumen `notificacionesService` mostrando toasts de
 * éxito/error según el resultado del backend.
 */
export function useNotificaciones() {
  const { showSuccess, showError, showInfo } = useToast();

  const isLoadingEstado = ref(false);
  const isLoadingRegistros = ref(false);
  const isSending = ref(false);
  const isEjecutando = ref(false);
  const isGuardandoPreferencias = ref(false);

  const configuracion = ref(null);
  const preferencias = ref(null);
  const registros = ref([]);
  const totalRegistros = ref(0);

  async function fetchEstado() {
    isLoadingEstado.value = true;
    try {
      configuracion.value = await notificacionesService.estado();
      if (configuracion.value.preferencia) {
        preferencias.value = configuracion.value.preferencia;
      }
      return configuracion.value;
    } catch (error) {
      showError(error.message || 'No se pudo consultar el estado de WhatsApp.');
      throw error;
    } finally {
      isLoadingEstado.value = false;
    }
  }

  async function fetchPreferencias() {
    try {
      preferencias.value = await notificacionesService.preferencias();
      return preferencias.value;
    } catch (error) {
      showError(error.message || 'No se pudieron cargar las preferencias.');
      throw error;
    }
  }

  async function fetchRegistros(filter = {}) {
    isLoadingRegistros.value = true;
    try {
      const data = await notificacionesService.listado(filter);
      registros.value = data.resultados || [];
      totalRegistros.value = data.total || 0;
      return data;
    } catch (error) {
      showError(error.message || 'No se pudo cargar la bitácora de mensajes.');
      throw error;
    } finally {
      isLoadingRegistros.value = false;
    }
  }

  /** Envía el recordatorio de mantenimiento de un vehículo. */
  async function enviarRecordatorio(vehiculoId) {
    isSending.value = true;
    try {
      const resultado = await notificacionesService.enviarRecordatorio(vehiculoId);
      if (resultado.ok) {
        showSuccess(resultado.descripcion || 'Recordatorio enviado correctamente.');
      } else if (resultado.omitido) {
        showInfo(resultado.detail || 'El vehículo ya fue notificado recientemente.');
      } else {
        showError(resultado.descripcion || resultado.detail || 'No se pudo enviar el recordatorio.');
      }
      return resultado;
    } catch (error) {
      showError(error.message || 'No se pudo enviar el recordatorio.');
      throw error;
    } finally {
      isSending.value = false;
    }
  }

  /** Envía un mensaje de prueba gratuito (para validar el proveedor). */
  async function enviarPrueba({ celular, mensaje }) {
    isSending.value = true;
    try {
      const resultado = await notificacionesService.enviarPrueba({ celular, mensaje });
      if (resultado.ok) {
        showSuccess(resultado.descripcion || 'Mensaje de prueba procesado.');
      } else {
        showError(resultado.descripcion || 'No se pudo enviar el mensaje de prueba.');
      }
      return resultado;
    } catch (error) {
      showError(error.message || 'No se pudo enviar el mensaje de prueba.');
      throw error;
    } finally {
      isSending.value = false;
    }
  }

  /** Detección/envío automático (o vista previa) de la empresa actual. */
  async function ejecutar({ preview = false, vehiculosIds = [] } = {}) {
    isEjecutando.value = true;
    try {
      const resultado = await notificacionesService.ejecutar({ preview, vehiculosIds });
      if (preview) {
        showInfo(
          resultado.pendientes === 0
            ? 'No hay vehículos pendientes de recordatorio.'
            : `${resultado.pendientes} vehículo(s) pendiente(s) de recordatorio.`,
        );
      } else if (resultado.detenido) {
        showInfo(resultado.mensaje || 'Las notificaciones están desactivadas.');
      } else {
        showSuccess(
          `${resultado.enviados} recordatorio(s) enviado(s) · ${resultado.errores} error(es).`,
        );
      }
      if (!preview && !resultado.detenido) {
        await fetchRegistros();
      }
      return resultado;
    } catch (error) {
      showError(error.message || 'No se pudo ejecutar el proceso de recordatorios.');
      throw error;
    } finally {
      isEjecutando.value = false;
    }
  }

  /** Guarda preferencias (intervalo km, antelación, plantilla, etc.). */
  async function guardarPreferencias(payload) {
    isGuardandoPreferencias.value = true;
    try {
      preferencias.value = await notificacionesService.actualizarPreferencias(payload);
      showSuccess('Preferencias de mantenimiento actualizadas.');
      return preferencias.value;
    } catch (error) {
      showError(error.message || 'No se pudieron guardar las preferencias.');
      throw error;
    } finally {
      isGuardandoPreferencias.value = false;
    }
  }

  return {
    // Estado
    isLoadingEstado,
    isLoadingRegistros,
    isSending,
    isEjecutando,
    isGuardandoPreferencias,
    configuracion,
    preferencias,
    registros,
    totalRegistros,
    // Acciones
    fetchEstado,
    fetchPreferencias,
    fetchRegistros,
    enviarRecordatorio,
    enviarPrueba,
    ejecutar,
    guardarPreferencias,
  };
}