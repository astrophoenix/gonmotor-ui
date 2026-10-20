/**
 * Utilidades reutilizables de saneamiento (sanitización), formateo y
 * validación de campos comunes a los formularios de cliente y vehículo.
 *
 * Centralizadas para evitar duplicar la lógica en cada componente que tenga
 * campos similares (placa, VIN, marca, modelo, color, motor, observaciones,
 * identificación, nombre, email, teléfono, año, kilometraje, etc.).
 */

const LATIN_PATTERN = /[^a-zA-ZÁÉÍÓÚÜáéíóúüÑñ\s]/g;
const ALPHA_NUM_PATTERN = /[^a-zA-ZÁÉÍÓÚÜáéíóúüÑñ0-9\s]/g;

/**
 * Sanitiza la identificación según el tipo:
 *  - 'C' (Cédula): solo dígitos, máximo 10.
 *  - 'R' (RUC): solo dígitos, máximo 13.
 *  - 'P' (Pasaporte): alfanumérico en mayúsculas, máximo 20.
 */
export function sanitizeIdentificacion(value, tipo = 'C') {
  const raw = value == null ? '' : String(value);
  if (tipo === 'P') {
    return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);
  }
  const max = tipo === 'C' ? 10 : 13;
  return raw.replace(/\D/g, '').slice(0, max);
}

/** Elimina etiquetas HTML, entidades y cualquier cosa que no sea letra, espacio o acento latino. */
export function sanitizeNombre(value) {
  return (value == null ? '' : String(value))
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, '')
    .replace(LATIN_PATTERN, '');
}

/**
 * Nombre / Razón Social en mayúsculas: además de limpiar caracteres no
 * permitidos, quita los espacios iniciales y convierte el texto a mayúsculas
 * mientras se escribe. El espacio final se conserva para poder escribir la
 * siguiente palabra; se recorta con `recortarEspacios` al salir/guardar.
 */
export function sanitizeNombreUpper(value) {
  return sanitizeNombre(value).replace(/^\s+/, '').toUpperCase();
}

/**
 * Sanitiza un teléfono.
 * Por defecto deja únicamente dígitos y limita la longitud (`max`, 15 por
 * defecto: celular EC 10 dígitos + código de país, con margen).
 * Si `keepFormat` es true, conserva los separadores visuales típicos
 * (`+`, `(`, `)`, `-` y espacios) eliminando cualquier otro carácter.
 */
export function sanitizeTelefono(value, max = 15, keepFormat = false) {
  const raw = value == null ? '' : String(value);
  const cleaned = keepFormat
    ? raw.replace(/[^0-9+\s()-]/g, '')
    : raw.replace(/\D/g, '');
  return cleaned.slice(0, max);
}

/**
 * Formatea la placa en mayúsculas, alfanumérica, con guion visual (AAA-1234).
 * El guion se debe remover antes de enviar al backend (ver stripPlacaDash).
 */
export function formatPlaca(value) {
  const cleaned = (value == null ? '' : String(value))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
  return cleaned.length <= 3 ? cleaned : `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
}

/** Quita el guion de una placa para empacar en el payload. */
export function stripPlacaDash(value) {
  return (value == null ? '' : String(value)).replace(/-/g, '').trim().toUpperCase();
}

/**
 * Valida el formato de placa: 3 letras + 3 o 4 dígitos (ej. ABC-123, ABC-1234).
 * Devuelve '' si es válido o un mensaje de error.
 */
export function validatePlaca(value) {
  const raw = value == null ? '' : String(value).trim();
  if (raw === '') {
    return 'La placa es obligatoria.';
  }
  const normalized = raw.replace(/-/g, '').toUpperCase();
  if (!/^[A-Z]{3}\d{3,4}$/.test(normalized)) {
    return 'La placa debe tener 3 letras y 3 o 4 dígitos (ej. ABC-123).';
  }
  return '';
}

/** VIN / Chasis: mayúsculas, alfanumérico, máximo 17. */
export function sanitizeVin(value) {
  return (value == null ? '' : String(value))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 17);
}

/**
 * Texto alfanumérico + espacios + acentos (marca, modelo).
 * Quita los espacios iniciales pero conserva los intermedios y el final: se
 * aplica en cada tecla y un `trim()` completo impediría escribir el espacio
 * entre palabras. El espacio final se recorta con `recortarEspacios` al salir
 * del campo (`@blur`) y al guardar.
 */
export function sanitizeText(value) {
  return (value == null ? '' : String(value)).replace(ALPHA_NUM_PATTERN, '').replace(/^\s+/, '');
}

/** Código corto (p. ej. código del taller): solo letras, acentos y dígitos, sin espacios. */
export function sanitizeCodigo(value) {
  return sanitizeText(value).replace(/\s/g, '');
}

/**
 * Recorta únicamente los espacios del inicio y del final de una cadena,
 * respetando los espacios internos: "  Filtro de aceite  " -> "Filtro de aceite".
 * Se usa al salir del campo (`@blur`) y al guardar, nunca en cada tecla, para no
 * impedir escribir un espacio al final mientras se redacta.
 */
export function recortarEspacios(value) {
  return (value == null ? '' : String(value)).replace(/^\s+|\s+$/g, '');
}

/**
 * Búsqueda libre de vehículos/clientes: permite letras (con acentos), dígitos,
 * espacios y los separadores presentes en los campos filtrados (placa, VIN,
 * motor, marca, modelo, nombre, identificación, razón social, RUC) además de
 * los caracteres válidos en una dirección de correo electrónico
 * (`@ . _ - + ' ’`), para que buscar por email funcione sin recortar el texto.
 * Limita a 100 por defecto (longitud del campo más extenso: nombre del dueño).
 */
export function sanitizeBusqueda(value, max = 100) {
  return (value == null ? '' : String(value))
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-zA-ZÁÉÍÓÚÜáéíóúüÑñ0-9\s@._'’+\-]/g, '')
    .slice(0, max);
}

/** Año: solo dígitos, máximo 4 (uso en filtros por año). */
export function sanitizeAnio(value) {
  return (value == null ? '' : String(value)).replace(/\D/g, '').slice(0, 4);
}

/**
 * Dirección: letras (con acentos), dígitos, espacios, saltos de línea y la
 * puntuación/símbolos típicos de direcciones (.,;:ºª#&()-/'' con comillas
 * tipográficas). Elimina cualquier otro carácter. Máximo `max` (150 por
 * defecto). No recorta espacios para conservar el formato del usuario.
 */
export function sanitizeDireccion(value, max = 150) {
  return (value == null ? '' : String(value))
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, '')
    .replace(/[^a-zA-ZÁÉÍÓÚÜáéíóúüÑñ0-9\s.,;:ºª#&()\-/'’“”…/\\]/g, '')
    .slice(0, max);
}

/** Kilometraje: solo dígitos, máximo 9 (hasta 999,999,999). */
export function sanitizeKilometraje(value, max = 9) {
  return (value == null ? '' : String(value)).replace(/\D/g, '').slice(0, max);
}

/** Solo letras, espacios y acentos latinos (color). */
export function sanitizeColor(value) {
  return (value == null ? '' : String(value)).replace(LATIN_PATTERN, '');
}

/** Alfanumérico en mayúsculas (número de motor). */
export function sanitizeMotor(value) {
  return (value == null ? '' : String(value)).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Sanitiza el nombre de un taller: permite letras (con acentos), dígitos,
 * espacios y los separadores típicos de numeración de sedes (- _ / ( ) [ ]).
 * Elimina etiquetas HTML, entidades y cualquier otro carácter no permitido.
 * No recorta espacios para conservar el formato que escribe el usuario.
 */
export function sanitizeTaller(value) {
  return (value == null ? '' : String(value))
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z]+;/g, '')
    .replace(/[^a-zA-ZÁÉÍÓÚÜáéíóúüÑñ0-9\s\-_/()[\]]/g, '');
}

/** Notas: letras, dígitos, espacios (incl. salto de línea), acentos, puntuación y símbolos comunes (@ / \ | # $ % _ - [ ] { } * = +). 
 * No recorta espacios ni saltos de línea para conservar el formato del usuario. 
 * */
export function sanitizeObservaciones(value) {
  return (value == null ? '' : String(value))
    .replace(/[^a-zA-ZÁÉÍÓÚÜáéíóúüÑñ0-9\s.,;:!?¿¡()\-_'"’‘““”…@/\\|#$%\[\]{}*+=]/g, '');
}

/** Devuelve la clave estable de una entidad (uid temporal o id persistente). */
export function getItemKey(item, uidField = '_uid') {
  return item?.[uidField] || item?.id;
}

/**
 * Sanitiza un correo: trim, minúsculas, quita espacios internos y caracteres de control.
 * Máximo 254 caracteres. No valida el formato (eso lo hace validateEmail).
 */
export function sanitizeEmail(value) {
  return (value == null ? '' : String(value))
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

/**
 * Valida formato de correo sin regex catastrófica.
 * Devuelve '' si es válido o mensaje de error en español.
 */
export function validateEmail(value) {
  const raw = value == null ? '' : String(value).trim();
  if (raw === '') {
    return 'El correo electrónico es obligatorio.';
  }
  if (raw.length > 254) {
    return 'El correo electrónico es demasiado largo (máx. 254 caracteres).';
  }
  const atIndex = raw.indexOf('@');
  if (atIndex <= 0 || atIndex === raw.length - 1) {
    return 'El formato del correo no es válido.';
  }
  const domain = raw.slice(atIndex + 1);
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return 'El formato del correo no es válido.';
  }
  if (raw.split('@').length !== 2) {
    return 'El formato del correo no es válido.';
  }
  const localPart = raw.slice(0, atIndex);
  if (localPart.length > 64) {
    return 'El formato del correo no es válido.';
  }
  if (/[\u0000-\u001F\u007F-\u009F<>[\]]/.test(raw)) {
    return 'El correo contiene caracteres no permitidos.';
  }
  return '';
}

/**
 * Sanitiza un código numérico: solo dígitos, longitud exacta.
 */
export function sanitizeCode(value, length = 6) {
  return (value == null ? '' : String(value))
    .replace(/\D/g, '')
    .slice(0, length);
}

/**
 * Valida un código numérico de longitud exacta.
 */
export function validateCode(value, length = 6) {
  const raw = value == null ? '' : String(value).trim();
  if (raw === '') {
    return 'El código es obligatorio.';
  }
  if (!/^\d+$/.test(raw)) {
    return 'El código debe contener solo números.';
  }
  if (raw.length !== length) {
    return `El código debe tener ${length} dígitos.`;
  }
  return '';
}

/** Longitud mínima de contraseña: la misma que exige el backend (`MinimumLengthValidator`). */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Valida requisitos de contraseña.
 * Devuelve objeto con: { isValid: boolean, errors: string[], checks: { length, upper, lower, number, symbol } }
 */
export function validatePasswordStrength(value) {
  const checks = {
    length: value.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /\d/.test(value),
    symbol: /[^A-Za-z0-9]/.test(value),
  };
  const errors = [];
  if (!checks.length) errors.push(`${PASSWORD_MIN_LENGTH} o más caracteres`);
  if (!checks.upper || !checks.lower) errors.push('Mayúscula y minúscula');
  if (!checks.number) errors.push('Un número');
  if (!checks.symbol) errors.push('Un símbolo');
  return {
    isValid: errors.length === 0,
    errors,
    checks,
  };
}

/**
 * Valida contraseña completa: longitud PASSWORD_MIN_LENGTH-128, sin caracteres de control ni byte nulo,
 * requisitos de complejidad, y coincidencia con confirmación.
 * Devuelve '' si es válido o mensaje de error en español.
 */
export function validatePassword(value, confirmation = null) {
  const raw = value == null ? '' : String(value);
  if (raw === '') {
    return 'La contraseña es obligatoria.';
  }
  if (raw.length < PASSWORD_MIN_LENGTH || raw.length > 128) {
    return `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y 128 caracteres.`;
  }
  if (/[\u0000-\u001F\u007F]/.test(raw)) {
    return 'La contraseña contiene caracteres no permitidos.';
  }
  const strength = validatePasswordStrength(raw);
  if (!strength.isValid) {
    return `La contraseña debe tener: ${strength.errors.join(', ')}.`;
  }
  if (confirmation !== null && raw !== confirmation) {
    return 'Las contraseñas no coinciden.';
  }
  return '';
}

/**
 * Valida un teléfono. Devuelve '' si es válido o un mensaje de error.
 * Reglas: obligatorio, solo dígitos, entre 7 y 15 dígitos.
 */
export function validateTelefono(value, min = 7, max = 15) {
  const digitos = (value == null ? '' : String(value)).replace(/\D/g, '');
  if (digitos === '') {
    return 'El teléfono es obligatorio.';
  }
  if (digitos.length < min) {
    return `El teléfono debe tener al menos ${min} dígitos.`;
  }
  if (digitos.length > max) {
    return `El teléfono no puede superar los ${max} dígitos.`;
  }
  return '';
}

/**
 * Valida el kilometraje. Devuelve '' si es válido o un mensaje de error.
 * Reglas: obligatorio, número entero mayor a 0.
 */
export function validateKilometraje(value) {
  const raw = value == null ? '' : String(value).trim();
  if (raw === '') {
    return 'El kilometraje es obligatorio y debe ser mayor a 0.';
  }
  const km = Number(raw);
  if (Number.isNaN(km)) {
    return 'El kilometraje no es válido. Ingresa solo números enteros mayores a 0.';
  }
  if (km < 0) {
    return 'El kilometraje no puede ser negativo. Por favor ingresa un valor mayor a 0.';
  }
  if (km === 0) {
    return 'El kilometraje debe ser mayor a 0.';
  }
  if (!Number.isInteger(km)) {
    return 'El kilometraje debe ser un número entero mayor a 0.';
  }
  return '';
}

/**
 * Valida el año. Devuelve '' si es válido o un mensaje de error.
 * Rango permitido: 1900 .. (año actual + 1).
 */
export function validateAnio(value, currentYear = new Date().getFullYear() + 1) {
  if (value == null || value === '') {
    return '';
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < 1900 || num > currentYear) {
    return `El año debe estar entre 1900 y ${currentYear}.`;
  }
  return '';
}

/**
 * Códigos de falla DTC OBD2: letras y dígitos en mayúsculas, separadores de
 * lista (coma, punto y coma, espacio, punto, guion, slash). Máximo 255.
 */
export function sanitizeDtc(value, max = 255) {
  return (value == null ? '' : String(value))
    .toUpperCase()
    .replace(/[^A-Z0-9,\s.;/-]/g, '')
    .slice(0, max);
}

/**
 * Redondea/clampa un valor decimal a un rango y a 2 decimales.
 * Devuelve el valor por defecto si no es numérico.
 */
export function normalizarDecimal(value, min, max, def = '0.00') {
  const num = Number(value);
  if (Number.isNaN(num)) return def;
  const clamped = Math.min(max, Math.max(min, num));
  return clamped.toFixed(2);
}
