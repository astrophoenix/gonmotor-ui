<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { PALETA_GRAFICAS, temaGrafica } from '../../dashboard/utils/chartTheme';

const props = defineProps({
  /** [{ clave, etiqueta, ordenes | servicios }] — filas de una distribución. */
  datos: { type: Array, default: () => [] },
  /** Campo numérico de cada fila (`ordenes` o `servicios`). */
  campo: { type: String, default: 'ordenes' },
  /** Nombre de la métrica para accesibilidad/tooltips (`Distribución por …`). */
  metrica: { type: String, default: 'estado de la orden' },
  /** Unidad mostrada en el tooltip de cada barra. */
  unidad: { type: String, default: 'órdenes' },
  altura: { type: Number, default: 260 },
});

const contenedor = ref(null);
let chart = null;

function opciones() {
  const tema = temaGrafica();

  return {
    chart: {
      type: 'bar',
      height: props.altura,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      toolbar: { show: false },
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: [
      {
        name: props.unidad,
        data: props.datos.map((fila) => ({
          x: fila.etiqueta,
          y: Number(fila[props.campo]) || 0,
        })),
      },
    ],
    colors: [PALETA_GRAFICAS[0]],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '58%',
        borderRadius: 4,
        distributed: true,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (valor) => `${Math.round(Number(valor) || 0)}`,
      style: { fontSize: '11px', fontWeight: 600, colors: ['#ffffff'] },
      offsetX: -4,
    },
    stroke: { show: true, width: 1, colors: ['transparent'] },
    xaxis: {
      labels: { style: { fontSize: '12px' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      min: 0,
      forceNiceScale: true,
    },
    yaxis: {
      labels: {
        style: { fontSize: '12px' },
        maxWidth: 160,
      },
    },
    grid: {
      borderColor: tema.gridColor,
      strokeDashArray: 1,
      padding: { left: 8, right: 16 },
    },
    tooltip: {
      y: {
        formatter: (valor) => `${Math.round(Number(valor) || 0)} ${props.unidad}`,
      },
    },
    noData: {
      text: 'Sin datos en el periodo',
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

watch(() => [props.datos, props.campo], render, { deep: true });

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
    class="w-full"
    role="img"
    :aria-label="`Distribución por ${metrica}`"
  />
</template>
