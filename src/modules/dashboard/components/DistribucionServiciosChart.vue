<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { PALETA_GRAFICAS, temaGrafica } from '../utils/chartTheme';

const props = defineProps({
  /** [{ clave, etiqueta, ordenes }] — órdenes agrupadas por tipo de trabajo. */
  datos: { type: Array, default: () => [] },
});

const contenedor = ref(null);
let chart = null;

const total = computed(() => props.datos.reduce((suma, fila) => suma + (Number(fila.ordenes) || 0), 0));

function opciones() {
  const tema = temaGrafica();

  return {
    chart: {
      type: 'donut',
      height: 320,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
    },
    series: props.datos.map((fila) => Number(fila.ordenes) || 0),
    labels: props.datos.map((fila) => fila.etiqueta),
    colors: PALETA_GRAFICAS,
    stroke: { width: 2 },
    dataLabels: {
      enabled: true,
      // Porcentaje calculado desde la serie (evita depender de la firma
      // del formatter, que difiere entre tipos de gráfico de ApexCharts).
      formatter: (valor, opts) => {
        const serie = opts?.w?.config?.series || [];
        const totalSerie = serie.reduce((suma, valorSerie) => suma + (Number(valorSerie) || 0), 0);
        if (!totalSerie) return '';
        const porcentaje = ((Number(serie[opts.seriesIndex]) || 0) / totalSerie) * 100;
        return `${Math.round(porcentaje)}%`;
      },
      style: { fontSize: '12px' },
      dropShadow: { enabled: false },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: { show: false },
            value: { show: false },
            total: {
              show: true,
              label: 'Órdenes',
              color: tema.foreColor,
              style: { fontSize: '26px', fontWeight: 700 },
              formatter: () => String(total.value),
            },
          },
        },
      },
    },
    legend: {
      position: 'bottom',
      labels: { colors: tema.etiquetaColor },
      markers: { width: 10, height: 10 },
    },
    tooltip: {
      y: { formatter: (valor) => `${Math.round(Number(valor) || 0)} órdenes` },
    },
    noData: {
      text: 'Sin órdenes en el período',
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
