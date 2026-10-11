import { ref } from 'vue';

const THEME_KEY = 'color-theme';

/**
 * Estado reactivo compartido del tema (true = oscuro).
 *
 * Lo consumen los componentes Vue (menú de perfil) para reflejar el estado
 * actual del interruptor sin duplicar la lógica de persistencia.
 */
export const esTemaOscuro = ref(false);

/** Criterio heredado del botón anterior: oscuro salvo "light" explícito. */
function preferenciaInicial() {
  return localStorage.getItem(THEME_KEY) !== 'light';
}

/**
 * Aplica el tema guardado al arrancar sin persistirlo.
 * Debe ejecutarse solo donde el usuario puede cambiarlo (páginas con topbar);
 * en el resto, el script inline de `header.html` ya evita el FOUC.
 */
export function inicializarTema() {
  esTemaOscuro.value = preferenciaInicial();
  document.documentElement.classList.toggle('dark', esTemaOscuro.value);
}

/** Alterna el tema, lo persiste y avisa a los consumidores (gráficas, etc.). */
export function alternarTema() {
  esTemaOscuro.value = !esTemaOscuro.value;
  document.documentElement.classList.toggle('dark', esTemaOscuro.value);
  localStorage.setItem(THEME_KEY, esTemaOscuro.value ? 'dark' : 'light');
  document.dispatchEvent(new Event('dark-mode'));
}

// En páginas sin topbar no tocamos el tema (lo decide `header.html`), pero
// mantenemos el estado reactivo en sincronía por si algo lo consume.
if (document.getElementById('topbar-app')) {
  inicializarTema();
} else {
  esTemaOscuro.value = document.documentElement.classList.contains('dark');
}

// Compatibilidad con el navbar "stacked" heredado (plantilla de demo): conserva
// el comportamiento del antiguo botón `#theme-toggle` por si se accede por URL.
const botonAntiguo = document.getElementById('theme-toggle');
if (botonAntiguo) {
  const iconoOscuro = document.getElementById('theme-toggle-dark-icon');
  const iconoClaro = document.getElementById('theme-toggle-light-icon');
  const sincronizarIconos = () => {
    iconoOscuro?.classList.toggle('hidden', !esTemaOscuro.value);
    iconoClaro?.classList.toggle('hidden', esTemaOscuro.value);
  };

  sincronizarIconos();
  botonAntiguo.addEventListener('click', () => {
    alternarTema();
    sincronizarIconos();
  });
}
