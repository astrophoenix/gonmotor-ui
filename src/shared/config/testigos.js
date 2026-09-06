import {
  mdiEngine,
  mdiCarBrakeAbs,
  mdiAirbag,
  mdiCarBattery,
  mdiOil,
  mdiCoolantTemperature,
  mdiCarTireAlert,
  mdiCarDefrostFront,
  mdiWiperWash,
  mdiCarLightHigh,
  mdiGasStation,
  mdiCarLightFog,
  mdiCarTractionControl,
  mdiFootPrint,
  mdiTriangleOutline,
  mdiCarDoor,
  mdiSeatbelt,
  mdiAlphaPCircle,
  mdiCarBrakeAlert,
  mdiHelpCircleOutline,
} from '@mdi/js';

// Fuente única de verdad de los testigos del tablero.
// Para agregar un testigo: añadir un objeto al array (key debe coincidir
// con el campo booleano en backend y en los formularios de recepción/inspección).
export const TESTIGOS = [
  {
    key: 'testigo_check_engine',
    label: 'Check Engine',
    color: 'yellow',
    path: mdiEngine,
  },
  {
    key: 'testigo_abs',
    label: 'ABS',
    color: 'yellow',
    path: mdiCarBrakeAbs,
  },
  {
    key: 'testigo_airbag',
    label: 'Airbag',
    color: 'red',
    path: mdiAirbag,
  },
  {
    key: 'testigo_bateria',
    label: 'Batería',
    color: 'red',
    path: mdiCarBattery,
  },
  {
    key: 'testigo_aceite',
    label: 'Presión de Aceite',
    color: 'red',
    path: mdiOil,
  },
  {
    key: 'testigo_temperatura',
    label: 'Temperatura',
    color: 'red',
    path: mdiCoolantTemperature,
  },
  {
    key: 'testigo_presion_llantas',
    label: 'Presión de Llantas',
    color: 'yellow',
    path: mdiCarTireAlert,
  },
  {
    key: 'testigo_desempanado',
    label: 'Desempañado',
    color: 'green',
    path: mdiCarDefrostFront,
  },
  {
    key: 'testigo_limpiaparabrisas',
    label: 'Limpiaparabrisas',
    color: 'green',
    path: mdiWiperWash,
  },
  {
    key: 'testigo_luces_largas',
    label: 'Luces Largas',
    color: 'green',
    path: mdiCarLightHigh,
  },
  {
    key: 'testigo_combustible_bajo',
    label: 'Combustible Bajo',
    color: 'yellow',
    path: mdiGasStation,
  },
  {
    key: 'testigo_antiniebla_traseras',
    label: 'Antiniebla Traseras',
    color: 'yellow',
    path: mdiCarLightFog,
  },
  {
    key: 'testigo_esp',
    label: 'ESP',
    color: 'yellow',
    path: mdiCarTractionControl,
  },
  {
    key: 'testigo_bujias_precalentamiento',
    label: 'Precalentamiento',
    color: 'yellow',
    path: mdiHelpCircleOutline,
  },
  {
    key: 'testigo_pedal_freno',
    label: 'Pedal de Freno',
    color: 'yellow',
    path: mdiFootPrint,
  },
  {
    key: 'testigo_luces_emergencia',
    label: 'Emergencia',
    color: 'red',
    path: mdiTriangleOutline,
  },
  {
    key: 'testigo_puerta_maletero',
    label: 'Puerta o Maletero',
    color: 'red',
    path: mdiCarDoor,
  },
  {
    key: 'testigo_cinturon',
    label: 'Cinturón',
    color: 'red',
    path: mdiSeatbelt,
  },
  {
    key: 'testigo_freno_estacionamiento',
    label: 'Freno de Mano',
    color: 'red',
    path: mdiAlphaPCircle,
  },
  {
    key: 'testigo_frenos_fallo',
    label: 'Frenos',
    color: 'red',
    path: mdiCarBrakeAlert,
  },
];

export const TESTIGO_KEYS = TESTIGOS.map(t => t.key);

// Estado inicial de los testigos para los formularios (todos apagados + observaciones).
export function testigoDefaults() {
  return {
    ...Object.fromEntries(TESTIGO_KEYS.map(key => [key, false])),
    otros_testigos_observaciones: '',
  };
}

// Construye el estado de testigos a partir de datos de la API.
export function testigoFromData(source = {}) {
  return {
    ...Object.fromEntries(TESTIGO_KEYS.map(key => [key, !!source[key]])),
    otros_testigos_observaciones: source.otros_testigos_observaciones || '',
  };
}

// Prepara el payload a enviar a la API desde el estado del formulario.
export function testigoPayload(source = {}) {
  return {
    ...Object.fromEntries(TESTIGO_KEYS.map(key => [key, !!source[key]])),
    otros_testigos_observaciones: source.otros_testigos_observaciones || '',
  };
}