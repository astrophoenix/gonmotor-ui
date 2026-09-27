function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    // Un valor "YYYY-MM-DDTHH:mm" sin zona se interpreta como hora local.
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 'YYYY-MM-DDTHH:mm' con la hora local del navegador. */
export function localDatetimeNow() {
  return toLocalDatetimeInput(new Date());
}

/** Normaliza cualquier fecha a 'YYYY-MM-DDTHH:mm' en hora local (para <input type="datetime-local">). */
export function toLocalDatetimeInput(value) {
  const date = toDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Convierte el valor de un <input type="datetime-local"> a ISO UTC para la API. */
export function toIsoFromLocalInput(value) {
  if (!value) return null;
  const date = toDate(value);
  if (!date) return null;
  return date.toISOString();
}

/** Fecha y hora legible: '12/09/2026, 09:15'. */
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Duración legible a partir de minutos: '1 h 45 min'. */
export function formatDuration(minutes) {
  const total = Number(minutes);
  if (!Number.isFinite(total) || total < 0) return "—";
  const horas = Math.floor(total / 60);
  const resto = Math.round(total % 60);
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

/** Minutos transcurridos entre dos fechas, o null si falta alguna. */
export function minutesBetween(inicio, fin) {
  const desde = toDate(inicio);
  const hasta = toDate(fin);
  if (!desde || !hasta) return null;
  return Math.max(0, Math.round((hasta - desde) / 60000));
}
