/**
 * Formatea una placa vehicular agregando el guion correspondiente.
 * Si la placa ya incluye el separador, se devuelve sin cambios.
 * Si no coincide con un patrón reconocido, se retorna el valor original.
 *
 * Ejemplos:
 *   formatPlate('PBA1234')   -> 'PBA-1234'
 *   formatPlate('ABC123')    -> 'ABC-123'
 *   formatPlate('PBA-1234')  -> 'PBA-1234'
 */
export function formatPlate(plate) {
  if (!plate || typeof plate !== 'string') {
    return plate;
  }

  if (plate.includes('-')) {
    return plate;
  }

  const match = plate.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) {
    return plate;
  }

  return `${match[1]}-${match[2]}`;
}
