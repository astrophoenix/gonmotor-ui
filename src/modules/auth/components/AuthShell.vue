<script setup>
import { assetUrl } from '../../../shared/utils/assetUrl';
import { escenaMarca, escenaFormulario } from '../utils/piezasPlano';
import {
  escenaRecuperar, escenaRestablecer, heroeRecuperar, heroeRestablecer, formularioRecuperar, formularioRestablecer,
} from '../utils/piezasAcceso';

// Marco común de las pantallas públicas de acceso: panel de marca con el plano técnico
// y tarjeta con ranura. El mensaje principal es lo único que se ve en móvil.
// `escena` cambia el motor por el objeto que cuenta el propósito de cada pantalla.
const props = defineProps({
  escena: { type: String, default: 'motor' }, // 'motor' | 'recuperar' | 'restablecer'
});

const ESCENAS = {
  recuperar: { piezas: escenaRecuperar, heroe: heroeRecuperar, formulario: formularioRecuperar },
  restablecer: { piezas: escenaRestablecer, heroe: heroeRestablecer, formulario: formularioRestablecer },
};
const propia = ESCENAS[props.escena] || null;
const planoMarca = propia ? propia.piezas() : escenaMarca();
const heroeMovil = propia ? propia.heroe() : '';
const planoFormulario = propia ? propia.formulario() : escenaFormulario();
</script>

<template>
  <div class="acceso font-brand min-h-screen w-full bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-50 lg:grid lg:grid-cols-2">
    <!-- ===== Panel de marca ===== -->
    <aside class="marca relative z-10 flex flex-col overflow-hidden rounded-b-[40px] bg-brand-900 px-5 pb-8 pt-7 text-white lg:rounded-b-none lg:px-16 lg:pb-11 lg:pt-13">
      <svg
        class="plano plano-marca pointer-events-none absolute inset-0 z-[1] hidden h-full w-full lg:block"
        viewBox="0 0 720 900"
        preserveAspectRatio="xMaxYMax meet"
        aria-hidden="true"
      >
        <g class="piezas" v-html="planoMarca"></g>
        <image v-if="!propia" :href="assetUrl('/images/login/motor-plano.png')" x="302" y="482" width="392" height="349" />
      </svg>
      <svg
        v-if="propia"
        class="plano plano-marca pointer-events-none absolute -right-10 top-3 z-[1] w-[170px] opacity-30 lg:hidden"
        viewBox="-230 -235 440 460"
        aria-hidden="true"
        v-html="heroeMovil"
      ></svg>
      <img
        v-else
        :src="assetUrl('/images/login/motor-plano.png')"
        alt=""
        class="pointer-events-none absolute -right-8 top-2.5 z-[1] w-[180px] opacity-35 lg:hidden"
      >

      <a href="/" class="relative z-[2] inline-flex items-center gap-3 self-start">
        <img :src="assetUrl('/images/login/isotipo-piston-negativo.svg')" alt="" class="h-11 w-11 lg:h-13 lg:w-13">
        <span>
          <span class="block text-[26px] font-extrabold leading-[1] tracking-tight lg:text-[31px]">
            gon<span class="text-brand-coral">motor</span>
          </span>
          <span class="mt-1.5 block text-[9.5px] font-bold tracking-[0.32em] text-brand-300 lg:text-[11px]">GESTIÓN DE TALLERES</span>
        </span>
      </a>

      <div class="relative z-[2] mt-6 lg:mb-auto lg:mt-26">
        <p class="max-w-[520px] text-[30px] font-extrabold leading-[1.08] tracking-[-0.015em] lg:text-[46px]">
          <slot name="titulo" />
        </p>
        <div class="hidden lg:block">
          <slot name="detalle" />
        </div>
      </div>

      <div class="relative z-[2] hidden gap-4 text-[15px] font-medium text-white/90 lg:flex">
        <span>&copy; 2026 Gonmotor</span>
        <span class="w-px bg-white/40" aria-hidden="true"></span>
        <span>Hecho para talleres de verdad</span>
      </div>
    </aside>

    <!-- ===== Panel de la tarjeta ===== -->
    <section class="formulario relative flex w-full flex-col items-center justify-start overflow-hidden px-4 pb-7 pt-6 lg:min-h-screen lg:justify-center lg:px-6 lg:py-10">
      <svg
        class="plano plano-formulario pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        viewBox="0 0 720 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        v-html="planoFormulario"
      ></svg>

      <div class="relative z-[1] w-full max-w-[460px] rounded-[18px] border border-brand-100 bg-white shadow-[0_1px_2px_rgba(17,28,46,0.04),0_10px_28px_-14px_rgba(17,28,46,0.16)] dark:border-brand-700 dark:bg-brand-900 dark:shadow-[0_10px_28px_-14px_rgba(0,0,0,0.6)]">
        <span
          class="absolute left-1/2 top-[18px] h-6 w-28 -translate-x-1/2 rounded-xl border border-brand-200 bg-brand-50 shadow-[inset_0_2px_3px_rgba(17,28,46,0.14)] dark:border-brand-600 dark:bg-brand-950"
          aria-hidden="true"
        ></span>

        <div class="px-5 pb-5.5 pt-15 sm:px-9.5 sm:pb-7 sm:pt-17">
          <slot />
        </div>

        <div
          v-if="$slots.pie"
          class="flex items-center justify-between gap-3 border-t border-brand-100 px-5 pb-5 pt-4 dark:border-brand-700 sm:px-9.5"
        >
          <slot name="pie" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.plano :deep(.pz) { fill: none; stroke: var(--plano); stroke-width: 1.3; stroke-linejoin: round; stroke-linecap: round; }
.plano :deep(.fino) { fill: none; stroke: var(--plano); stroke-width: 0.8; opacity: 0.8; }
.plano :deep(.som) { fill: none; stroke: var(--plano); stroke-width: 0.6; opacity: 0.45; }
.plano :deep(.eje) { fill: none; stroke: var(--plano); stroke-width: 0.8; stroke-dasharray: 4 3; opacity: 0.7; }
.plano :deep(.txt) { fill: var(--plano); font-family: inherit; font-weight: 700; opacity: 0.85; }
.plano-marca { --plano: #78ACDE; }
.plano-marca .piezas { opacity: 0.85; }
.plano-formulario { --plano: #94A6BF; }
.dark .plano-formulario { --plano: #3A4F6E; }

.marca::before,
.formulario::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-size: 24px 24px;
}
.marca::before {
  background-image: radial-gradient(circle, rgba(120, 172, 222, 0.3) 1.2px, transparent 1.7px);
  mask-image: linear-gradient(160deg, #000 0%, rgba(0, 0, 0, 0.35) 45%, rgba(0, 0, 0, 0.15) 65%, rgba(0, 0, 0, 0.6) 100%);
}
.formulario::before {
  background-image: radial-gradient(circle, #D5DDE8 1.3px, transparent 1.8px);
  mask-image: radial-gradient(ellipse 44% 48% at 50% 48%, transparent 62%, #000 100%);
}
.dark .formulario::before {
  background-image: radial-gradient(circle, #16233A 1.3px, transparent 1.8px);
}
</style>
