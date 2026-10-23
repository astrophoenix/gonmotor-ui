<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { formatCurrency } from '../../../shared/utils/format';
import { PALETA_GRAFICAS, temaGrafica } from '../../dashboard/utils/chartTheme';

/**
 * Facturado frente a cobrado del periodo, por día o por mes (lo decide el
 * backend según la longitud del rango).
 */
const props = defineProps({
  /** [{ fecha, etiqueta, facturado, cobrado }] */
  puntos: { type: Array, default: () => [] },
});

const contenedor = ref(null);
let chart = null;

const filas = computed(() => props.puntos.map((punto) => ({
  etiqueta: punto.etiqueta,
  facturado: Number(punto.facturado) || 0,
  cobrado: Number(punto.cobrado) || 0,
})));

function opciones() {
  const tema = temaGrafica();
  return {
    chart: {
      type: 'bar',
      height: 300,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: [
      { name: 'Facturado', data: filas.value.map((fila) => fila.facturado) },
      { name: 'Cobrado', data: filas.value.map((fila) => fila.cobrado) },
    ],
    colors: [PALETA_GRAFICAS[0], PALETA_GRAFICAS[4]],
    plotOptions: { bar: { columnWidth: '65%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: filas.value.map((fila) => fila.etiqueta),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { rotate: -45, hideOverlappingLabels: true, style: { fontSize: '11px' } },
      tickAmount: Math.min(filas.value.length, 15),
    },
    yaxis: { labels: { formatter: (valor) => `$${Math.round(Number(valor) || 0).toLocaleString('es-EC')}` } },
    grid: { borderColor: tema.gridColor, strokeDashArray: 1 },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: tema.etiquetaColor } },
    tooltip: { shared: true, intersect: false, y: { formatter: (valor) => formatCurrency(valor) } },
  };
}

async function render() {
  if (!contenedor.value) return;
  chart?.destroy();
  chart = new ApexCharts(contenedor.value, opciones());
  await chart.render();
}

onMounted(() => {
  render();
  document.addEventListener('dark-mode', render);
});

watch(filas, render, { deep: true });

onBeforeUnmount(() => {
  document.removeEventListener('dark-mode', render);
  chart?.destroy();
  chart = null;
});
</script>

<template>
  <div ref="contenedor" class="w-full min-h-72" role="img" aria-label="Facturado y cobrado del periodo" />
</template>
