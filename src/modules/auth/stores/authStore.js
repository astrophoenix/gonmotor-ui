import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authService } from '../services/authService';

const ACCESS_TOKEN_KEY = 'gonmotor_access_token';
const REFRESH_TOKEN_KEY = 'gonmotor_refresh_token';
const USER_KEY = 'gonmotor_user';
const LOGGED_IN_KEY = 'gonmotor_logged_in';
const EMPRESA_ID_KEY = 'gonmotor_empresa_id';
const TALLER_ID_KEY = 'gonmotor_taller_id';
const TALLER_NOMBRE_KEY = 'gonmotor_taller_nombre';

function getStorage() {
  if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
    return localStorage;
  }

  if (sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
    return sessionStorage;
  }

  return null;
}

function readUser(storage) {
  try {
    return JSON.parse(storage?.getItem(USER_KEY) || '{}');
  } catch {
    return {};
  }
}

export const useAuthStore = defineStore('auth', () => {
  const storage = getStorage();
  const accessToken = ref(storage?.getItem(ACCESS_TOKEN_KEY) || null);
  const user = ref(readUser(storage));
  const empresaId = ref(storage?.getItem(EMPRESA_ID_KEY) || user.value?.empresa_id || null);
  const tallerId = ref(storage?.getItem(TALLER_ID_KEY) || user.value?.taller_id || null);
  const tallerNombre = ref(storage?.getItem(TALLER_NOMBRE_KEY) || user.value?.taller_nombre || '');
  const isLoading = ref(false);
  const isAuthenticated = computed(() => Boolean(accessToken.value));
  /** `true` cuando el taller activo es «Todos los talleres» (sin recorte). */
  const esTodosLosTalleres = computed(() => tallerId.value == null);

  function persistSession(data, remember) {
    const targetStorage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;

    [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, LOGGED_IN_KEY, EMPRESA_ID_KEY, TALLER_ID_KEY, TALLER_NOMBRE_KEY].forEach((key) => {
      otherStorage.removeItem(key);
    });

    targetStorage.setItem(ACCESS_TOKEN_KEY, data.access);
    if (data.refresh) {
      targetStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    }
    
    const userData = data.user || {};
    targetStorage.setItem(USER_KEY, JSON.stringify(userData));
    targetStorage.setItem(LOGGED_IN_KEY, 'true');

    if (userData.empresa_id) {
      targetStorage.setItem(EMPRESA_ID_KEY, String(userData.empresa_id));
      empresaId.value = String(userData.empresa_id);
    } else {
      // Admin SaaS en la gestión de empresas: sin empresa activa heredada.
      targetStorage.removeItem(EMPRESA_ID_KEY);
      empresaId.value = null;
    }

    if (userData.taller_id) {
      targetStorage.setItem(TALLER_ID_KEY, String(userData.taller_id));
      tallerId.value = String(userData.taller_id);
      tallerNombre.value = userData.taller_nombre || '';
      targetStorage.setItem(TALLER_NOMBRE_KEY, tallerNombre.value);
    } else {
      // La administración opera sin taller activo («Todos»): se limpia
      // cualquier taller heredado de una sesión anterior para no recortar
      // los listados ni enviar un `X-Taller-ID` equivocado.
      targetStorage.removeItem(TALLER_ID_KEY);
      targetStorage.removeItem(TALLER_NOMBRE_KEY);
      tallerId.value = null;
      tallerNombre.value = '';
    }

    accessToken.value = data.access;
    user.value = userData;
  }

  /**
   * Persiste el taller activo elegido por el usuario (selector del topbar/login).
   * `taller` puede ser un objeto `{ id, nombre }` o `null` para limpiarlo.
   */
  function setTaller(taller) {
    const esObjeto = taller !== null && typeof taller === 'object';
    const id = esObjeto ? (taller.id ?? null) : (taller ?? null);
    const nombre = esObjeto ? (taller.nombre || '') : '';

    [localStorage, sessionStorage].forEach((currentStorage) => {
      currentStorage.removeItem(TALLER_ID_KEY);
      currentStorage.removeItem(TALLER_NOMBRE_KEY);
    });

    tallerId.value = id != null ? String(id) : null;
    tallerNombre.value = nombre;

    const destino = getStorage();
    if (destino && id != null) {
      destino.setItem(TALLER_ID_KEY, String(id));
      destino.setItem(TALLER_NOMBRE_KEY, nombre);
    }

    window.dispatchEvent(new CustomEvent('gonmotor:taller-updated'));
  }

  async function authenticate(credentials, remember = false) {
    isLoading.value = true;

    try {
      const data = await authService.login(credentials);

      // 🟡 Si requiere selección de empresa, NO guardamos tokens aún pero devolvemos la respuesta a la vista
      if (data.requires_company_selection) {
        return data;
      }

      if (!data.access) {
        throw new Error('La respuesta del servidor no incluye el token de acceso.');
      }

      // 🟢 Si solo tiene 1 empresa, persiste directo
      persistSession(data, remember);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateProfile(profileData) {
    isLoading.value = true;

    try {
      const currentUser = user.value || {};
      const currentEmpresaId = currentUser.empresa_id || empresaId.value;

      const data = await authService.updateProfile(profileData);

      const userData = data.user || {};

      if (!userData.empresa_id && currentEmpresaId) {
        userData.empresa_id = currentEmpresaId;
      }

      const storage = getStorage();
      if (storage) {
        storage.setItem(USER_KEY, JSON.stringify(userData));
        if (userData.empresa_id) {
          storage.setItem(EMPRESA_ID_KEY, String(userData.empresa_id));
        }
      }

      user.value = userData;
      empresaId.value = userData.empresa_id || null;

      window.dispatchEvent(new CustomEvent('gonmotor:user-updated'));
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  function refreshUserFromStorage() {
    const storage = getStorage();
    const stored = readUser(storage);
    user.value = stored && Object.keys(stored).length ? stored : {};
    return user.value;
  }

  async function changePassword(passwordData) {
    isLoading.value = true;

    try {
      const data = await authService.changePassword(passwordData);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  async function selectCompany(payload, remember = false) {
    isLoading.value = true;

    try {
      const data = await authService.selectCompany(payload);

      if (!data.access) {
        throw new Error('La respuesta del servidor no incluye el token de acceso.');
      }

      persistSession(data, remember);
      return data;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Admin SaaS: abre la sesión sin empresa (tokens que llegan en el login)
   * para gestionar empresas.
   */
  function iniciarSesionAdminSaaS(data, remember = false) {
    if (!data?.access) {
      throw new Error('La respuesta del servidor no incluye el token de acceso.');
    }
    persistSession(data, remember);
  }

  function logout() {
    [localStorage, sessionStorage].forEach((currentStorage) => {
      [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, LOGGED_IN_KEY, EMPRESA_ID_KEY, TALLER_ID_KEY, TALLER_NOMBRE_KEY].forEach((key) => {
        currentStorage.removeItem(key);
      });
    });

    accessToken.value = null;
    user.value = {};
    empresaId.value = null;
    tallerId.value = null;
    tallerNombre.value = '';
  }

  return {
    accessToken,
    user,
    empresaId,
    tallerId,
    tallerNombre,
    isLoading,
    isAuthenticated,
    esTodosLosTalleres,
    authenticate,
    selectCompany,
    iniciarSesionAdminSaaS,
    updateProfile,
    changePassword,
    setTaller,
    refreshUserFromStorage,
    logout
  };
});