<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { formatCurrency } from '../../../shared/utils/format';
import { PALETA_GRAFICAS, temaGrafica } from '../utils/chartTheme';

const props = defineProps({
  /** [{ clave, etiqueta, ordenes, facturado }] — órdenes del periodo por tipo de trabajo. */
  datos: { type: Array, default: () => [] },
});

/** Con más tipos que este, la dona se vuelve ilegible: se usan barras horizontales. */
const MAX_TIPOS_DONA = 5;

const contenedor = ref(null);
let chart = null;

/** Filas normalizadas y ordenadas de mayor a menor número de órdenes. */
const filas = computed(() => props.datos
  .map((fila) => ({
    etiqueta: fila.etiqueta,
    ordenes: Number(fila.ordenes) || 0,
    facturado: Number(fila.facturado) || 0,
  }))
  .sort((a, b) => b.ordenes - a.ordenes));

const total = computed(() => filas.value.reduce((suma, fila) => suma + fila.ordenes, 0));
const usarBarras = computed(() => filas.value.length > MAX_TIPOS_DONA);

function porcentaje(ordenes) {
  return total.value ? Math.round(ordenes / total.value * 100) : 0;
}

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** «Mantenimiento: 6 órdenes · $X facturado». */
function tooltipHtml(indice) {
  const fila = filas.value[indice];
  if (!fila) return '';
  const texto = `${fila.etiqueta}: ${fila.ordenes} ${fila.ordenes === 1 ? 'orden' : 'órdenes'} · ${formatCurrency(fila.facturado)} facturado`;
  return `<div class="px-3 py-2 text-xs font-medium">${escaparHtml(texto)}</div>`;
}

function opcionesDona(tema) {
  return {
    chart: {
      type: 'donut',
      height: 340,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: filas.value.map((fila) => fila.ordenes),
    labels: filas.value.map((fila) => fila.etiqueta),
    colors: PALETA_GRAFICAS.slice(0, MAX_TIPOS_DONA),
    stroke: { width: 2, colors: [tema.oscuro ? '#111827' : '#ffffff'] },
    dataLabels: {
      enabled: true,
      // ApexCharts pasa el % como `valor`; se muestra la cantidad para que la
      // suma de los segmentos coincida con el total del centro.
      formatter: (_valor, opts) => String(opts.w.globals.series[opts.seriesIndex] ?? 0),
      style: { fontSize: '12px', fontWeight: 600 },
      dropShadow: { enabled: false },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: { show: true, label: 'Órdenes', formatter: () => total.value },
          },
        },
      },
    },
    legend: {
      position: 'bottom',
      labels: { colors: tema.etiquetaColor },
      markers: { width: 10, height: 10 },
      fontSize: '12px',
      // «Mantenimiento: 6 (86%)»
      formatter: (nombre, opts) => {
        const ordenes = filas.value[opts.seriesIndex]?.ordenes ?? 0;
        return `${nombre}: ${ordenes} (${porcentaje(ordenes)}%)`;
      },
    },
    tooltip: {
      custom: ({ seriesIndex }) => tooltipHtml(seriesIndex),
    },
    noData: {
      text: 'Sin órdenes en el periodo',
      style: { color: tema.foreColor, fontSize: '13px' },
    },
  };
}

function opcionesBarras(tema) {
  return {
    chart: {
      type: 'bar',
      height: Math.max(260, filas.value.length * 36 + 60),
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      toolbar: { show: false },
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: [{
      name: 'Órdenes',
      data: filas.value.map((fila) => ({ x: fila.etiqueta, y: fila.ordenes })),
    }],
    colors: [PALETA_GRAFICAS[0]],
    plotOptions: {
      bar: { horizontal: true, barHeight: '58%', borderRadius: 4 },
    },
    dataLabels: {
      enabled: true,
      formatter: (valor) => {
        const ordenes = Math.round(Number(valor) || 0);
        return `${ordenes} (${porcentaje(ordenes)}%)`;
      },
      style: { fontSize: '11px', fontWeight: 600, colors: ['#ffffff'] },
      offsetX: -4,
    },
    xaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { style: { fontSize: '12px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: '12px' }, maxWidth: 160 } },
    grid: {
      borderColor: tema.gridColor,
      strokeDashArray: 1,
      padding: { left: 8, right: 16 },
    },
    tooltip: {
      custom: ({ dataPointIndex }) => tooltipHtml(dataPointIndex),
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
  const tema = temaGrafica();
  chart = new ApexCharts(contenedor.value, usarBarras.value ? opcionesBarras(tema) : opcionesDona(tema));
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
