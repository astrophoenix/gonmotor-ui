<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ApexCharts from 'apexcharts';
import { formatCurrency } from '../../../shared/utils/format';
import { temaGrafica } from '../../dashboard/utils/chartTheme';

/**
 * Cascada de la rentabilidad del periodo: de los ingresos se van restando
 * costos y gastos hasta la utilidad neta. Cada barra flota entre el acumulado
 * anterior y el nuevo (`rangeBar`), así se ve qué se come la ganancia.
 */
const props = defineProps({
  ingresos: { type: Number, default: 0 },
  costoRepuestos: { type: Number, default: 0 },
  costoManoObra: { type: Number, default: 0 },
  margenBruto: { type: Number, default: 0 },
  gastos: { type: Number, default: 0 },
  utilidad: { type: Number, default: 0 },
});

const COLOR_NEUTRO = '#64748B';
const COLOR_RESTA = '#DC2626';
const COLOR_GANANCIA = '#10B981';

const contenedor = ref(null);
let chart = null;

function tramo(desde, hasta) {
  return [Math.min(desde, hasta), Math.max(desde, hasta)];
}

/** Barras en orden, con el monto con signo que representa cada una. */
const barras = computed(() => {
  const trasRepuestos = props.ingresos - props.costoRepuestos;
  return [
    { etiqueta: 'Ingresos', monto: props.ingresos, y: tramo(0, props.ingresos), color: COLOR_NEUTRO },
    { etiqueta: 'Costo repuestos', monto: -props.costoRepuestos, y: tramo(props.ingresos, trasRepuestos), color: COLOR_RESTA },
    { etiqueta: 'Costo mano de obra', monto: -props.costoManoObra, y: tramo(trasRepuestos, props.margenBruto), color: COLOR_RESTA },
    { etiqueta: 'Margen bruto', monto: props.margenBruto, y: tramo(0, props.margenBruto), color: COLOR_NEUTRO },
    { etiqueta: 'Gastos operativos', monto: -props.gastos, y: tramo(props.margenBruto, props.utilidad), color: COLOR_RESTA },
    {
      etiqueta: 'Utilidad neta',
      monto: props.utilidad,
      y: tramo(0, props.utilidad),
      color: props.utilidad >= 0 ? COLOR_GANANCIA : COLOR_RESTA,
    },
  ];
});

function montoConSigno(monto) {
  return monto < 0 ? `−${formatCurrency(Math.abs(monto))}` : formatCurrency(monto);
}

function porcentajeSobreIngresos(monto) {
  if (!props.ingresos) return '—';
  return `${(monto / props.ingresos * 100).toFixed(1)}%`;
}

function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function opciones() {
  const tema = temaGrafica();
  return {
    chart: {
      type: 'rangeBar',
      height: 340,
      fontFamily: tema.fontFamily,
      foreColor: tema.foreColor,
      toolbar: { show: false },
      animations: { easing: 'easeinout', speed: 400 },
    },
    series: [{
      name: 'Monto',
      data: barras.value.map((barra) => ({ x: barra.etiqueta, y: barra.y, fillColor: barra.color })),
    }],
    plotOptions: {
      bar: { horizontal: false, columnWidth: '58%', borderRadius: 3 },
    },
    dataLabels: {
      enabled: true,
      formatter: (_valor, opts) => montoConSigno(barras.value[opts.dataPointIndex]?.monto ?? 0),
      style: { fontSize: '11px', fontWeight: 600, colors: ['#ffffff'] },
    },
    xaxis: {
      labels: { style: { fontSize: '12px' }, trim: true, hideOverlappingLabels: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { formatter: (valor) => `$${Math.round(Number(valor) || 0).toLocaleString('es-EC')}` },
    },
    grid: { borderColor: tema.gridColor, strokeDashArray: 1, padding: { left: 8, right: 8 } },
    legend: { show: false },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const barra = barras.value[dataPointIndex];
        if (!barra) return '';
        const texto = `${barra.etiqueta}: ${montoConSigno(barra.monto)} · ${porcentajeSobreIngresos(barra.monto)} de los ingresos`;
        return `<div class="px-3 py-2 text-xs font-medium">${escaparHtml(texto)}</div>`;
      },
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

watch(barras, render, { deep: true });

onBeforeUnmount(() => {
  document.removeEventListener('dark-mode', alCambiarTema);
  chart?.destroy();
  chart = null;
});
</script>

<template>
  <div
    ref="contenedor"
    class="w-full min-h-80"
    role="img"
    aria-label="Cascada de la rentabilidad: de los ingresos a la utilidad neta"
  />
</template>
