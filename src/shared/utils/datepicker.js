/**
 * Flowbite inicializa los `<input datepicker>` en el evento `load`, pero sus
 * atributos `datepicker-*` no permiten activar `todayHighlight` (por defecto
 * apagado), así que el calendario no marcaba el día actual. Esto lo activa en
 * todas las instancias creadas.
 */
export function resaltarHoyEnDatepickers(raiz = document) {
  raiz.querySelectorAll('[datepicker]').forEach((elemento) => {
    elemento.datepicker?.setOptions({ todayHighlight: true });
  });
}

/** Ejecuta `resaltarHoyEnDatepickers` justo después del auto-init de Flowbite. */
export function iniciarResaltadoHoyDatepickers() {
  // El listener de Flowbite se registró antes (su import va primero), así que
  // este corre después de que los datepickers ya existen.
  window.addEventListener('load', () => resaltarHoyEnDatepickers());
}
