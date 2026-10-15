<template>
  <div ref="contenedor"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { formatCurrency } from '../../../shared/utils/format';
import { PALETA_GRAFICAS, temaGrafica } from '../../dashboard/utils/chartTheme';

const props = defineProps({
  ingresos: { type: Number, default: 0 },
  cmv: { type: Number, default: 0 },
  gastos: { type: Number, default: 0 },
  utilidad: { type: Number, default: 0 },
  margenBruto: { type: Number, default: 0 },
});

const contenedor = ref(null);
let chart = null;

function opciones() {
  const tema = temaGrafica();
  return {
    chart: {
      type: 'donut',
      height: 320,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      toolbar: { show: false },
    },
    series: [
      Number(props.cmv) || 0,
      Number(props.gastos) || 0,
      Number(props.utilidad) > 0 ? Number(props.utilidad) : 0,
    ],
    labels: ['Costo de los trabajos', 'Gastos Operativos', 'Utilidad Neta'],
    colors: [PALETA_GRAFICAS[1], PALETA_GRAFICAS[3], PALETA_GRAFICAS[4]],
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => {
        const total = opts.w.globals.seriesTotals.reduce((a, b) => a + b, 0);
        if (total === 0) return '0%';
        const pct = ((opts.w.globals.series[opts.seriesIndex] / total) * 100).toFixed(1);
        return `${pct}%`;
      },
    },
    tooltip: {
      y: {
        formatter: (valor) => formatCurrency(valor),
      },
    },
    legend: {
      position: 'bottom',
      labels: { colors: tema.etiquetaColor },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Ingresos',
              color: tema.etiquetaColor,
              formatter: () => formatCurrency(props.ingresos),
            },
          },
        },
      },
    },
    noData: {
      text: 'Sin datos para graficar',
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

onMounted(render);
watch(() => [props.ingresos, props.cmv, props.gastos, props.utilidad, props.margenBruto], render, { deep: true });
onBeforeUnmount(() => {
  if (chart) {
    chart.destroy();
    chart = null;
  }
});
</script>
