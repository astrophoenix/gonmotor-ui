<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { PALETA_GRAFICAS, temaGrafica } from '../../dashboard/utils/chartTheme';

const props = defineProps({
  /** [{ clave, etiqueta, ordenes }] — órdenes del periodo por tipo de trabajo. */
  datos: { type: Array, default: () => [] },
});

const contenedor = ref(null);
let chart = null;

function opciones() {
  const tema = temaGrafica();

  return {
    chart: {
      type: 'donut',
      height: 340,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: props.datos.map((fila) => Number(fila.ordenes) || 0),
    labels: props.datos.map((fila) => fila.etiqueta),
    colors: PALETA_GRAFICAS.slice(0, 6),
    stroke: { width: 2, colors: [tema.oscuro ? '#111827' : '#ffffff'] },
    dataLabels: {
      enabled: true,
      formatter: (valor, opts) => `${Math.round(Number(valor))}`,
      style: { fontSize: '12px', fontWeight: 600 },
      dropShadow: { enabled: false },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Órdenes',
              formatter: () => props.datos.reduce(
                (suma, fila) => suma + (Number(fila.ordenes) || 0), 0
              ),
            },
          },
        },
      },
    },
    legend: {
      position: 'bottom',
      labels: { colors: tema.etiquetaColor },
      markers: { width: 10, height: 10 },
      fontSize: '12px',
    },
    tooltip: {
      y: {
        formatter: (valor) => `${Math.round(Number(valor) || 0)} órdenes`,
      },
    },
    noData: {
      text: 'Sin órdenes en el periodo',
      style: { color: tema.foreColor, fontSize: '13px' },
    },
  };
}

async function render() {
  if (!contenedor.value) return;
  if (chart) {
    chart.destroy();
    chart = null;
  }
  chart = new ApexCharts(contenedor.value, opciones());
  await chart.render();
}

function alCambiarTema() {
  render();
}

onMounted(() => {
  render();
  document.addEventListener('dark-mode', alCambiarTema);
});

watch(() => props.datos, render, { deep: true });

onBeforeUnmount(() => {
  document.removeEventListener('dark-mode', alCambiarTema);
  if (chart) {
    chart.destroy();
    chart = null;
  }
});
</script>

<template>
  <div
    ref="contenedor"
    class="w-full min-h-80"
    role="img"
    aria-label="Distribución de órdenes por tipo de trabajo"
  />
</template>
