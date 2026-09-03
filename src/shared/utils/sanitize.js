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

/** Elimina espacios y limpia el correo. */
export function sanitizeEmail(value) {
  return (value == null ? '' : String(value)).replace(/\s+/g, '').trim();
}

/** Deja únicamente dígitos. */
export function sanitizeTelefono(value) {
  return (value == null ? '' : String(value)).replace(/\D/g, '');
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

/** Texto alfanumérico + espacios + acentos (marca, modelo). */
export function sanitizeText(value) {
  return (value == null ? '' : String(value)).replace(ALPHA_NUM_PATTERN, '').trim();
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
 * Sanitiza el nombre de un taller/sucursal: permite letras (con acentos), dígitos,
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
