<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { formatCurrency } from '../../../shared/utils/format';
import { PALETA_GRAFICAS, temaGrafica } from '../utils/chartTheme';

const props = defineProps({
  /** [{ etiqueta, ingresos, ordenes }] — últimos 6 meses. */
  datos: { type: Array, default: () => [] },
});

const contenedor = ref(null);
let chart = null;

function opciones() {
  const tema = temaGrafica();
  const categorias = props.datos.map((fila) => fila.etiqueta);

  return {
    chart: {
      type: 'line',
      height: 320,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: [
      {
        name: 'Ingresos (USD)',
        type: 'column',
        data: props.datos.map((fila) => Number(fila.ingresos) || 0),
      },
      {
        name: 'Órdenes de trabajo',
        type: 'line',
        data: props.datos.map((fila) => Number(fila.ordenes) || 0),
      },
    ],
    colors: [PALETA_GRAFICAS[0], PALETA_GRAFICAS[1]],
    stroke: { width: [0, 3], curve: 'smooth' },
    plotOptions: {
      bar: { columnWidth: '55%', borderRadius: 4 },
    },
    markers: { size: [0, 4], strokeColors: '#ffffff', hover: { sizeOffset: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: categorias,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '12px' } },
    },
    yaxis: [
      {
        title: { text: 'Ingresos (USD)' },
        labels: {
          formatter: (valor) => `$${Math.round(Number(valor) || 0).toLocaleString('es-EC')}`,
        },
      },
      {
        opposite: true,
        title: { text: 'Órdenes' },
        min: 0,
        forceNiceScale: true,
        tickAmount: 4,
        labels: { formatter: (valor) => String(Math.round(Number(valor) || 0)) },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (valor, contexto) => (contexto?.seriesIndex === 0
          ? formatCurrency(valor)
          : `${Math.round(Number(valor) || 0)} órdenes`),
      },
    },
    grid: {
      borderColor: tema.gridColor,
      strokeDashArray: 1,
      padding: { left: 8, right: 8 },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: tema.etiquetaColor },
      markers: { width: 10, height: 10 },
    },
    noData: {
      text: 'Sin actividad en el período',
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
  <div ref="contenedor" class="w-full min-h-80" role="img" aria-label="Tendencia de ingresos y órdenes por mes" />
</template>
