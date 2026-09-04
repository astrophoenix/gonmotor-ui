export const ADD_MODE = {
  modal: 'modal',
  page: 'page',
};

// Define cómo se crea cada entidad desde el botón "Agregar" de
// EntityActionButtons: 'modal' abre el modal de creación de la entidad
// (el listado escucha el evento 'add'), 'page' redirige a la pantalla
// /crud/<entidad>/agregar/.
export const ENTITY_ADD_MODES = {
  clientes: ADD_MODE.modal,
  vehiculos: ADD_MODE.modal,
  empleados: ADD_MODE.modal,
  talleres: ADD_MODE.modal,
  recepciones: ADD_MODE.page,
  inspecciones: ADD_MODE.page,
  ordenes_trabajo: ADD_MODE.page,
};

export function getEntityAddMode(entity) {
  return ENTITY_ADD_MODES[entity] || ADD_MODE.page;
}