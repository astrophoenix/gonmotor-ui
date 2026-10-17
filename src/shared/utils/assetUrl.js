/* global __ASSET_VERSIONS__ */
// Versiones (hash del contenido) de static/images, calculadas por webpack en el build.
const VERSIONES = typeof __ASSET_VERSIONS__ !== 'undefined' ? __ASSET_VERSIONS__ : {};

/**
 * Devuelve la URL de un archivo de static/ con ?v=<hash> para que el navegador
 * nunca sirva una versión vieja tras un despliegue. Si no se conoce el archivo,
 * devuelve la ruta tal cual.
 */
export function assetUrl(ruta) {
  const version = VERSIONES[ruta];
  return version ? `${ruta}?v=${version}` : ruta;
}
