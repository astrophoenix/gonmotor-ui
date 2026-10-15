<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { formatCurrency } from '../../../shared/utils/format';
import { PALETA_GRAFICAS, temaGrafica } from '../../dashboard/utils/chartTheme';

/**
 * Evolución mensual (agregada en el backend): ingresos frente a costos+gastos
 * en barras, utilidad neta en USD y margen neto % (eje derecho) en líneas.
 */
const props = defineProps({
  /** [{ mes, etiqueta, ingresos, costos, gastos, utilidad_neta, margen_neto_pct }] */
  meses: { type: Array, default: () => [] },
});

const MESES_MOVIL = 6;
const consultaMovil = typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)') : null;
const esMovil = ref(Boolean(consultaMovil?.matches));

const contenedor = ref(null);
let chart = null;

const filas = computed(() => {
  const lista = props.meses.map((fila) => ({
    etiqueta: fila.etiqueta,
    ingresos: Number(fila.ingresos) || 0,
    costos: Number(fila.costos) || 0,
    gastos: Number(fila.gastos) || 0,
    utilidad: Number(fila.utilidad_neta) || 0,
    margen: fila.margen_neto_pct === null || fila.margen_neto_pct === undefined
      ? null
      : Number(fila.margen_neto_pct),
  }));
  return esMovil.value ? lista.slice(-MESES_MOVIL) : lista;
});

function formatoUsd(valor) {
  return `$${Math.round(Number(valor) || 0).toLocaleString('es-EC')}`;
}

function formatoMargen(valor) {
  return valor === null ? '—' : `${valor.toFixed(1)}%`;
}

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function tooltipHtml(indice) {
  const fila = filas.value[indice];
  if (!fila) return '';
  const lineas = [
    ['Ingresos', formatCurrency(fila.ingresos)],
    ['Costos', formatCurrency(fila.costos)],
    ['Gastos', formatCurrency(fila.gastos)],
    ['Utilidad neta', formatCurrency(fila.utilidad)],
    ['Margen neto', formatoMargen(fila.margen)],
  ];
  return `<div class="px-3 py-2 text-xs">
    <p class="mb-1 font-semibold">${escaparHtml(fila.etiqueta)}</p>
    ${lineas.map(([nombre, valor]) => `<p class="flex justify-between gap-4"><span>${nombre}</span><span class="font-medium">${escaparHtml(valor)}</span></p>`).join('')}
  </div>`;
}

function opciones() {
  const tema = temaGrafica();
  return {
    chart: {
      type: 'line',
      height: 360,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: [
      { name: 'Ingresos', type: 'column', data: filas.value.map((fila) => fila.ingresos) },
      { name: 'Costos + Gastos', type: 'column', data: filas.value.map((fila) => fila.costos + fila.gastos) },
      { name: 'Utilidad neta', type: 'line', data: filas.value.map((fila) => fila.utilidad) },
      { name: 'Margen neto %', type: 'line', data: filas.value.map((fila) => fila.margen) },
    ],
    colors: [PALETA_GRAFICAS[0], PALETA_GRAFICAS[3], PALETA_GRAFICAS[4], PALETA_GRAFICAS[5]],
    stroke: { width: [0, 0, 3, 2], curve: 'smooth', dashArray: [0, 0, 0, 5] },
    markers: { size: [0, 0, 4, 3], hover: { sizeOffset: 2 } },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: filas.value.map((fila) => fila.etiqueta),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: '12px' } },
    },
    yaxis: [
      { seriesName: 'Ingresos', title: { text: 'USD' }, labels: { formatter: formatoUsd } },
      { seriesName: 'Ingresos', show: false, labels: { formatter: formatoUsd } },
      { seriesName: 'Ingresos', show: false, labels: { formatter: formatoUsd } },
      {
        seriesName: 'Margen neto %',
        opposite: true,
        title: { text: 'Margen neto %' },
        labels: { formatter: (valor) => `${Math.round(Number(valor) || 0)}%` },
      },
    ],
    grid: { borderColor: tema.gridColor, strokeDashArray: 1, padding: { left: 8, right: 8 } },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: tema.etiquetaColor },
      markers: { width: 10, height: 10 },
    },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }) => tooltipHtml(dataPointIndex),
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

function alCambiarAncho(evento) {
  esMovil.value = evento.matches;
}

onMounted(() => {
  render();
  document.addEventListener('dark-mode', alCambiarTema);
  consultaMovil?.addEventListener('change', alCambiarAncho);
});

watch(filas, render, { deep: true });

onBeforeUnmount(() => {
  document.removeEventListener('dark-mode', alCambiarTema);
  consultaMovil?.removeEventListener('change', alCambiarAncho);
  chart?.destroy();
  chart = null;
});
</script>

<template>
  <div
    ref="contenedor"
    class="w-full min-h-80"
    role="img"
    aria-label="Evolución mensual de ingresos, costos, gastos, utilidad neta y margen neto"
  />
</template>
