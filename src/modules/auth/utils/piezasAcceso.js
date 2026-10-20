// Planos propios de «recuperar contraseña» y «restablecer contraseña»: cada pantalla cambia el motor
// del login por un objeto que cuenta su propósito (la persiana del taller que se vuelve a abrir y la
// llave de auto que entra en el encendido). Mismas clases de trazo que piezasPlano.js; `eje` es la
// línea discontinua de una vista explotada y `txt` el rotulado del plano.
import { f, circ, ubicar } from './piezasPlano';

const rect = (cls, x, y, w, h, r = 0) =>
  `<rect class="${cls}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${r ? ` rx="${f(r)}"` : ''}/>`;
const texto = (x, y, t, size = 9, extra = '') =>
  `<text class="txt" x="${f(x)}" y="${f(y)}" font-size="${size}" text-anchor="middle"${extra}>${t}</text>`;
// Flecha de cota: punta en (x, y) apuntando según el ángulo (grados).
const punta = (x, y, ang) =>
  `<path class="fino" d="M0 0L-6 -2.4M0 0L-6 2.4" transform="translate(${f(x)} ${f(y)}) rotate(${ang})"/>`;

/** Persiana enrollable del taller a medio subir, con el candado abierto colgando del pasador. */
export function persiana() {
  const W = 150, yTop = -128, yb = 28, piso = 170;
  let s = '';
  // Cajón del rodillo con su placa «TALLER» y tapas laterales con el eje
  s += `<path class="pz" d="M${-W - 22} ${yTop}V-162Q${-W - 22} -172 ${-W - 12} -172H${W + 12}Q${W + 22} -172 ${W + 22} -162V${yTop}Z"/>`;
  s += `<path class="fino" d="M${-W - 16} -140H${W + 16}M${-W - 16} -134H${W + 16}"/>`;
  for (const x of [-W - 9, W + 9]) s += circ('fino', x, -156, 7) + circ('pz', x, -156, 2.6);
  s += rect('pz', -46, -166, 92, 22, 3) + rect('fino', -42, -162, 84, 14, 2) + texto(0, -151.5, 'TALLER', 9.5, ' letter-spacing="3"');
  // Columnas con perfil, guías de la persiana y pernos de anclaje
  for (const sg of [-1, 1]) {
    const xo = sg * (W + 22), xi = sg * W;
    s += `<path class="pz" d="M${xo} ${yTop}V${piso}M${xi} ${yTop}V${piso}"/>`;
    s += `<path class="fino" d="M${sg * (W + 6)} ${yTop}V${piso}"/><path class="som" d="M${sg * (W + 16)} ${yTop + 4}V${piso - 4}M${sg * (W + 18)} ${yTop + 4}V${piso - 4}"/>`;
    for (let y = yTop + 22; y < piso - 10; y += 46) s += circ('fino', sg * (W + 14), y, 2.4);
  }
  // Lamas: cada una con su canal y una franja de ventilación
  let n = 0;
  for (let y = yTop; y < yb; y += 13, n++) {
    s += `<path class="pz" d="M${-W} ${f(y)}H${W}"/><path class="fino" d="M${-W} ${f(y + 4)}H${W}"/>`;
    s += `<path class="som" d="M${-W + 4} ${f(y + 9)}H${W - 4}"/>`;
    if (n === 3) for (let x = -W + 16; x < W - 16; x += 22) s += rect('fino', x, y + 6.5, 12, 3, 1.5);
  }
  // Botonera de subir/bajar en la columna derecha
  s += rect('pz', W + 30, 18, 22, 40, 3) + rect('fino', W + 33, 21, 16, 34, 2);
  s += circ('fino', W + 41, 30, 4.4) + circ('fino', W + 41, 46, 4.4);
  s += `<path class="fino" d="M${W + 38.5} 31.5l2.5 -3l2.5 3M${W + 38.5} 44.5l2.5 3l2.5 -3"/><path class="som" d="M${W + 41} 58V${piso}"/>`;
  // Barra inferior, tiradores y pasador
  s += rect('pz', -W, yb, W * 2, 12, 2) + `<path class="fino" d="M${-W} ${yb + 6}H${W}"/>`;
  for (const x of [-92, 92]) s += `<path class="pz" d="M${x - 14} ${yb + 12}v7q0 4 4 4h20q4 0 4 -4v-7"/>`;
  s += rect('pz', -9, yb + 4, 18, 16, 2) + circ('pz', 0, yb + 22, 4.2) + circ('fino', 0, yb + 22, 2);
  // Candado abierto colgando: un brazo del arco sujeto al pasador y el otro fuera del cuerpo
  s += `<g transform="translate(0 ${yb + 22}) rotate(10) scale(1.25)">`;
  s += `<path class="pz" d="M-7 22V4A7 7 0 0 1 7 4V12"/><path class="fino" d="M-4.5 22V4A4.5 4.5 0 0 1 4.5 4V12"/>`;
  s += rect('pz', -14, 22, 28, 26, 5) + rect('fino', -11, 25, 22, 20, 3.5);
  s += circ('pz', 0, 33, 3) + `<path class="pz" d="M-1.4 35.5L-2.2 41H2.2L1.4 35.5"/>`;
  s += `<path class="som" d="M9 26V44M6.5 26V44"/></g>`;
  // Interior visible bajo la persiana: piso en perspectiva, carro de herramientas y llantas apiladas
  const fondo = 112;
  s += `<path class="fino" d="M${-W + 6} ${piso}L-104 ${fondo}H104L${W - 6} ${piso}"/>`;
  s += `<path class="som" d="M-104 ${fondo}V${yb + 12}M104 ${fondo}V${yb + 12}M-60 ${fondo}L-80 ${piso}M0 ${fondo}V${piso}M60 ${fondo}L80 ${piso}"/>`;
  s += rect('fino', -94, 64, 50, 46, 3);
  for (const y of [74, 84, 94]) s += `<path class="som" d="M-90 ${y}H-48"/><path class="fino" d="M-74 ${y + 4.5}h10"/>`;
  s += circ('fino', -86, 114, 3.4) + circ('fino', -52, 114, 3.4);
  for (const y of [74, 92]) {
    s += rect('fino', 46, y, 46, 18, 8);
    for (let x = 52; x < 88; x += 6) s += `<path class="som" d="M${x} ${y + 2}l3 14"/>`;
  }
  // Suelo frente al taller con la luz que sale por la abertura
  s += `<path class="pz" d="M-200 ${piso}H200"/>`;
  for (const [x0, x1] of [[-120, -176], [-60, -92], [0, 0], [60, 92], [120, 176]]) s += `<path class="som" d="M${x0} ${piso + 4}L${x1} ${piso + 34}"/>`;
  // Cotas del plano: ancho del vano y altura libre bajo la persiana
  s += `<path class="som" d="M${-W} -176V-196M${W} -176V-196"/><path class="fino" d="M${-W} -190H-28M28 -190H${W}"/>`;
  s += punta(-W, -190, 180) + punta(W, -190, 0) + texto(0, -186.5, '3.20 m', 9);
  s += `<path class="som" d="M${-W - 26} ${yb + 12}H${-W - 46}M${-W - 26} ${piso}H${-W - 46}"/><path class="fino" d="M${-W - 40} ${yb + 12}V${(yb + piso) / 2 - 14}M${-W - 40} ${(yb + piso) / 2 + 14}V${piso}"/>`;
  s += punta(-W - 40, yb + 12, -90) + punta(-W - 40, piso, 90);
  s += texto(-W - 40, (yb + piso) / 2 + 3, '1.30', 9, ` transform="rotate(-90 ${-W - 40} ${(yb + piso) / 2})"`);
  return s;
}

/** Llave de auto plegable en vista explotada: carcasa en dos mitades, botones y hoja con corte láser. */
export function llaveAuto() {
  const h = 25, sep = 50;
  const carcasa = (dy) =>
    `<path class="pz" d="M-56 ${dy - h}Q-78 ${dy - h} -78 ${dy}Q-78 ${dy + h} -56 ${dy + h}H26Q46 ${dy + h} 52 ${dy + 10}V${dy - 10}Q46 ${dy - h} 26 ${dy - h}Z"/>` +
    `<path class="fino" d="M-56 ${dy - h + 6}Q-72 ${dy - h + 6} -72 ${dy}Q-72 ${dy + h - 6} -56 ${dy + h - 6}H25Q40 ${dy + h - 6} 45 ${dy + 7}V${dy - 7}Q40 ${dy - h + 6} 25 ${dy - h + 6}Z"/>`;
  let s = '';
  // Mitad inferior con la hoja desplegada (corte láser por el centro y punta redondeada)
  s += carcasa(0) + circ('pz', -62, 0, 6) + circ('fino', -62, 0, 3.4);
  s += rect('pz', 46, -11, 20, 22, 4) + circ('pz', 56, 0, 5) + circ('fino', 56, 0, 2);
  s += `<path class="pz" d="M66 -8H160Q172 -8 174 0Q172 8 160 8H66Z"/>`;
  s += `<path class="fino" d="M70 -1.5C82 -1.5 86 3.5 98 3.5S114 -3.5 126 -3.5S142 2.5 154 2.5Q164 2.5 168 0"/>`;
  s += `<path class="fino" d="M70 -5.2H158M70 5.2H158"/><path class="som" d="M72 -6.6H150"/>`;
  // Botones flotando entre las mitades: cerrar, abrir y maletero
  const yB = -sep / 2 - 4;
  s += `<path class="eje" d="M-36 -14V${yB + 9}M-6 -14V${yB + 9}M24 -14V${yB + 9}"/>`;
  for (const x of [-36, -6, 24]) s += rect('pz', x - 12, yB - 8, 24, 16, 6);
  s += rect('fino', -40, yB - 2, 8, 6, 1) + `<path class="fino" d="M-38.5 ${yB - 2}v-2a2.5 2.5 0 0 1 5 0v2"/>`;
  s += rect('fino', -10, yB - 2, 8, 6, 1) + `<path class="fino" d="M-8.5 ${yB - 2}v-2a2.5 2.5 0 0 1 5 -0.6"/>`;
  s += `<path class="fino" d="M18 ${yB + 3}h12M19 ${yB + 3}l2 -5h6l2 5"/>`;
  // Mitad superior separada sobre el mismo eje, con el botón que libera la hoja
  const yT = -sep - 2 * h + 6;
  s += `<path class="eje" d="M-62 -${h}V${yT + h}M40 -${h - 4}V${yT + h - 4}"/>`;
  s += carcasa(yT) + circ('pz', 30, yT, 7) + circ('fino', 30, yT, 4);
  s += circ('pz', -62, yT, 6) + `<path class="som" d="M-44 ${yT + 15}H14"/>`;
  // Argolla
  s += circ('pz', -86, 0, 22) + circ('fino', -86, 0, 19.5) + `<path class="som" d="M-107 6l5 -3"/>`;
  return s;
}

/** Switch de encendido con el bombín, posiciones LOCK · ACC · ON · START y la flecha de retorno de START. */
export function switchEncendido() {
  let s = '';
  // Brida de montaje con orejas y el espesor del cuerpo
  s += `<path class="pz" d="M-86 -16H-60M60 -16H86A14 14 0 0 1 86 16H60M-60 16H-86A14 14 0 0 1 -86 -16"/>`;
  for (const x of [-88, 88]) s += circ('pz', x, 0, 5.5) + circ('fino', x, 0, 3);
  s += circ('som', 6, 6, 74) + circ('pz', 0, 0, 74) + circ('fino', 0, 0, 68) + circ('pz', 0, 0, 52) + circ('fino', 0, 0, 40);
  // Moleteado del bisel
  for (let i = 0; i < 48; i++) {
    const a = i * Math.PI / 24, c = Math.cos(a), sn = Math.sin(a);
    s += `<line class="som" x1="${f(69 * c)}" y1="${f(69 * sn)}" x2="${f(73 * c)}" y2="${f(73 * sn)}"/>`;
  }
  // Posiciones (ángulo desde las 12, sentido horario)
  const posiciones = [['LOCK', -64], ['ACC', -22], ['ON', 22], ['START', 64]];
  for (const [nombre, g] of posiciones) {
    const a = (g - 90) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    s += `<line class="${nombre === 'ON' ? 'pz' : 'fino'}" x1="${f(54 * c)}" y1="${f(54 * sn)}" x2="${f(64 * c)}" y2="${f(64 * sn)}"/>`;
    s += texto(88 * c, 88 * sn + 3, nombre, 9, ' letter-spacing="1"');
  }
  // Retorno con muelle de START a ON
  const arco = (g) => { const a = (g - 90) * Math.PI / 180; return [f(104 * Math.cos(a)), f(104 * Math.sin(a))]; };
  const [ax, ay] = arco(60), [bx, by] = arco(28);
  s += `<path class="fino" d="M${ax} ${ay}A104 104 0 0 0 ${bx} ${by}"/>` + punta(bx, by, 205);
  // Bombín con la ranura girada a ON y sus pines
  s += `<g transform="rotate(22)">`;
  s += `<path class="pz" d="M-4 -26H4V-10L6 -6V6L4 10V26H-4V10L-6 6V-6L-4 -10Z"/>`;
  for (const y of [-18, -6, 6, 18]) s += `<path class="fino" d="M-12 ${y}h6M6 ${y}h6"/>`;
  s += `<path class="som" d="M-30 -24A38 38 0 0 1 30 -24"/></g>`;
  return s;
}

/** Sobre cerrado con sello: el enlace de recuperación llega por correo. */
export function sobre(w = 68, h = 44) {
  const x = -w / 2, y = -h / 2;
  let s = rect('pz', x, y, w, h, 3);
  s += `<path class="pz" d="M${x + 2} ${y + 2}L0 ${f(y + h * 0.58)}L${-x - 2} ${y + 2}"/>`;
  s += `<path class="fino" d="M${x + 2} ${-y - 2}L${f(-w * 0.16)} ${f(y + h * 0.42)}M${-x - 2} ${-y - 2}L${f(w * 0.16)} ${f(y + h * 0.42)}"/>`;
  s += circ('pz', 0, f(y + h * 0.58), 6) + circ('fino', 0, f(y + h * 0.58), 3.6);
  s += `<path class="som" d="M${x + 6} ${-y - 5}H${f(x + w * 0.36)}"/>`;
  return s;
}

/** Llave de puerta con dientes (o en blanco, sin cortar). */
export function llaveCasa(L = 70, dientes = true) {
  const r = L * 0.2, x0 = -L / 2;
  let s = circ('pz', x0 + r, 0, r) + circ('fino', x0 + r, 0, r * 0.4);
  s += `<path class="pz" d="M${f(x0 + r * 1.9)} -3.4H${f(L / 2)}V2${dientes ? '' : 'L' + f(L / 2 - 3) + ' 4.5'}"/>`;
  if (dientes) {
    let d = `M${f(L / 2)} 2`;
    const xs = [0.95, 0.8, 0.68, 0.55, 0.42];
    xs.forEach((t, i) => { const xx = x0 + L * t; d += `L${f(xx + 2)} 2L${f(xx)} ${i % 2 ? 7 : 9}L${f(xx - 3)} 2`; });
    s += `<path class="pz" d="${d}H${f(x0 + r * 1.9)}"/>`;
  } else {
    s += `<path class="pz" d="M${f(L / 2 - 3)} 4.5H${f(x0 + r * 1.9)}"/>`;
  }
  s += `<path class="fino" d="M${f(x0 + r * 2.3)} -0.6H${f(L / 2 - 4)}"/>`;
  s += rect('fino', x0 + r * 1.9 - 1, -5.4, 5, 12, 1.2);
  return s;
}

/** Llavero del taller: argolla, etiqueta numerada y dos llaves. */
export function llavero() {
  let s = circ('pz', 0, 0, 14) + circ('som', 0, 0, 11.5);
  s += `<g transform="translate(-4 13) rotate(78)">${rect('pz', 0, -11, 40, 22, 4)}${circ('fino', 6, 0, 3)}${texto(24, 3.4, '07', 10)}</g>`;
  s += `<g transform="translate(10 10) rotate(52) translate(38 0)">${llaveCasa(62)}</g>`;
  s += `<g transform="translate(13 2) rotate(18) translate(34 0)">${llaveCasa(54)}</g>`;
  return s;
}

/** Muelle helicoidal (resorte del bombín). */
export function muelle(L = 70, r = 9, vueltas = 9) {
  const p = L / vueltas, y0 = -L / 2;
  let frente = `M${-r} ${f(y0)}`, atras = '';
  for (let i = 0; i < vueltas; i++) {
    const y = y0 + i * p;
    frente += `M${-r} ${f(y)}A${r} 3.4 0 0 0 ${r} ${f(y + p / 2)}`;
    atras += `M${r} ${f(y + p / 2)}A${r} 3.4 0 0 0 ${-r} ${f(y + p)}`;
  }
  return `<path class="fino" d="${atras}"/><path class="pz" d="${frente}"/>` +
    `<path class="pz" d="M${-r} ${f(y0)}H${r - 2}M${-r} ${f(y0 + L)}H${r - 2}"/>`;
}

/** Control remoto del portón: dos botones (subir / bajar), led y ojal para el llavero. */
export function controlPorton() {
  let s = `<path class="pz" d="M-18 -30Q-18 -38 -10 -38H10Q18 -38 18 -30V30Q18 38 10 38H-10Q-18 38 -18 30Z"/>`;
  s += `<path class="fino" d="M-14 -27Q-14 -34 -8 -34H8Q14 -34 14 -27V27Q14 34 8 34H-8Q-14 34 -14 27Z"/>`;
  s += circ('pz', 0, -40, 4.5) + circ('fino', 0, -40, 2.2);
  s += circ('pz', 0, -12, 8) + circ('pz', 0, 10, 8);
  s += `<path class="fino" d="M-3.5 -10.5L0 -14L3.5 -10.5M-3.5 8.5L0 12L3.5 8.5"/>`;
  s += circ('fino', 0, -27, 1.6) + `<path class="som" d="M-8 26H8M-8 29H8M10 -28V28"/>`;
  return s;
}

/** Credencial del taller con pinza, foto y código de barras. */
export function credencial() {
  let s = rect('pz', -27, -38, 54, 78, 5) + rect('fino', -23, -34, 46, 70, 3);
  s += rect('pz', -8, -50, 16, 10, 2) + `<path class="pz" d="M-4 -50V-56A4 4 0 0 1 4 -56V-50"/>` + rect('fino', -9, -32, 18, 4, 2);
  s += rect('fino', -17, -22, 18, 22, 2) + circ('fino', -8, -15, 4) + `<path class="fino" d="M-15 -1Q-8 -9 -1 -1"/>`;
  s += `<path class="fino" d="M5 -18H18M5 -12H15M5 -6H17"/>` + texto(0, 12, 'TALLER', 7, ' letter-spacing="2"');
  for (let i = 0; i < 16; i++) s += `<path class="${i % 3 ? 'som' : 'fino'}" d="M${-17 + i * 2.2} 20V31"/>`;
  return s;
}

/** Linterna de mano encendida, con el haz de luz abriéndose. */
export function linterna() {
  let s = `<path class="pz" d="M-52 -9H8L22 -16V16L8 9H-52Q-58 9 -58 3V-3Q-58 -9 -52 -9Z"/>`;
  s += `<path class="pz" d="M22 -16Q27 0 22 16"/><path class="fino" d="M19 -12Q23 0 19 12"/>`;
  for (const x of [-44, -38, -32, -26]) s += `<path class="fino" d="M${x} -9V9"/>`;
  s += rect('pz', -12, -13, 12, 4, 1.5) + `<path class="som" d="M-52 5H6M8 -8L20 -13"/>`;
  s += `<path class="fino" d="M-58 -3H-62V3H-58"/>`;
  for (const [y0, y1] of [[-13, -40], [-6, -16], [0, 8], [6, 32], [13, 46]]) s += `<path class="som" d="M30 ${y0}L92 ${y1}"/>`;
  return s;
}

/** Calibrador pie de rey: regla graduada, mordazas y nonio deslizante. */
export function calibrador(L = 160) {
  const x0 = -L / 2, x1 = L / 2;
  let s = rect('pz', x0, -7, L, 14, 2);
  for (let x = x0 + 22, i = 0; x < x1 - 4; x += 4, i++) s += `<path class="${i % 5 ? 'som' : 'fino'}" d="M${f(x)} -7V${i % 5 ? -3 : -1}"/>`;
  s += `<path class="pz" d="M${x0} 7V40L${x0 + 6} 46L${x0 + 12} 40V7M${x0} -7V-24L${x0 + 6} -24L${x0 + 9} -7"/>`;
  const xc = x0 + 54;
  s += `<path class="pz" d="M${xc} -11H${xc + 44}V11H${xc}Z"/><path class="pz" d="M${xc} 11V40L${xc - 6} 46L${xc - 12} 40V11M${xc + 3} -11V-24L${xc - 3} -24L${xc - 6} -11"/>`;
  for (let i = 0; i < 9; i++) s += `<path class="fino" d="M${f(xc + 4 + i * 4.3)} 11V${i % 5 ? 7 : 5}"/>`;
  s += rect('fino', xc + 16, -5, 18, 10, 1.5) + circ('pz', xc + 30, 15, 4) + `<path class="som" d="M${x1 - 30} 7V10H${x1 + 18}"/>`;
  return s;
}

/** Lima plana con mango, para retocar el corte de una llave. */
export function lima(L = 130) {
  const x0 = -L / 2;
  let s = `<path class="pz" d="M${x0} -6Q${x0 - 4} 0 ${x0} 6H${x0 + 44}V-6Z"/>`;
  for (const x of [x0 + 10, x0 + 20, x0 + 30]) s += `<path class="fino" d="M${x} -6V6"/>`;
  s += rect('pz', x0 + 44, -4.5, 6, 9, 1) + `<path class="pz" d="M${x0 + 50} -4H${L / 2 - 6}L${L / 2} 0L${L / 2 - 6} 4H${x0 + 50}"/>`;
  for (let x = x0 + 54; x < L / 2 - 6; x += 4) s += `<path class="som" d="M${x} -4L${x + 3} 4"/>`;
  return s;
}

/** Juego de pines del bombín: perno de llave, perno superior y muelle de cada cámara. */
export function pinesBombin() {
  let s = '';
  [[0, 22], [16, 14], [32, 26], [48, 18]].forEach(([x, k]) => {
    s += `<path class="pz" d="M${x - 3.5} 8V${8 + k}L${x} ${12 + k}L${x + 3.5} ${8 + k}V8Z"/>`;
    s += rect('pz', x - 3.5, -10, 7, 16, 1.5);
    let d = `M${x - 3} -12`;
    for (let i = 0; i < 6; i++) d += `L${x + (i % 2 ? -3 : 3)} ${-14 - i * 3}`;
    s += `<path class="fino" d="${d}"/>`;
  });
  return `<g transform="translate(-24 0)">${s}</g>`;
}

/** Letrero colgante «ABIERTO» con su cordón: el taller vuelve a estar disponible. */
export function letreroAbierto() {
  let s = `<path class="fino" d="M-30 -24L0 -70L30 -24"/>` + circ('pz', 0, -70, 3.5);
  s += rect('pz', -50, -24, 100, 44, 6) + rect('fino', -45, -19, 90, 34, 4);
  for (const x of [-30, 30]) s += circ('pz', x, -24, 2.6);
  s += texto(0, 3.5, 'ABIERTO', 14, ' letter-spacing="3"');
  return s + `<path class="som" d="M-40 14H40"/>`;
}

/** Buzón con la bandera levantada: el correo con el enlace ya llegó. */
export function buzon() {
  let s = `<path class="pz" d="M-34 -6Q-34 -30 -10 -30H14Q34 -30 34 -6V20H-34Z"/>`;
  s += `<path class="fino" d="M-10 -30Q14 -30 14 -6V20M-28 -6H8"/>` + rect('pz', -6, 20, 12, 46, 1.5);
  s += `<path class="pz" d="M24 -2V-38H40V-28H28"/>` + circ('fino', 24, -2, 2.4);
  s += `<path class="som" d="M-22 20V0M-28 66H28"/>` + sobre(30, 18).replace(/<rect/, '<rect transform="translate(-14 -14)"').replace(/class="pz" d="M/, 'class="fino" transform="translate(-14 -14)" d="M');
  return s;
}

/** Candado cerrado: la cuenta queda protegida con la contraseña nueva. */
export function candadoCerrado() {
  let s = `<path class="pz" d="M-16 -6V-22A16 16 0 0 1 16 -22V-6"/><path class="fino" d="M-10 -6V-22A10 10 0 0 1 10 -22V-6"/>`;
  s += rect('pz', -26, -6, 52, 44, 7) + rect('fino', -21, -1, 42, 34, 5);
  s += circ('pz', 0, 12, 5) + `<path class="pz" d="M-2.5 16L-4 25H4L2.5 16"/>`;
  return s + `<path class="som" d="M18 -2V34M14 -2V34"/>`;
}

/** Bombín de cerradura en vista lateral, con sus cámaras y la leva. */
export function bombinEuro() {
  let s = `<path class="pz" d="M-60 -12H60V12H14V26A14 14 0 0 1 -14 26V12H-60Z"/>`;
  s += circ('pz', -60, 0, 12) + circ('fino', -60, 0, 6) + `<path class="pz" d="M-62 -4H-58V4H-62Z"/>`;
  for (let x = -46; x <= 40; x += 14) s += `<path class="fino" d="M${x} -12V6"/>` + circ('som', x, 9, 2);
  s += rect('pz', -6, 12, 12, 10, 2) + circ('fino', 0, 26, 4);
  return s + `<path class="som" d="M-56 8H56"/>`;
}

// Bajo la lista de pasos del panel: más pequeño y abajo que el motor del login.
const HEROE_X = 522, HEROE_Y = 690;
const heroe = (pieza, k) => `<g transform="translate(${HEROE_X} ${HEROE_Y}) scale(${k})">${pieza}</g>`;

/** Objeto principal de «recuperar» (coordenadas locales, también para la cabecera móvil). */
export const heroeRecuperar = () => persiana();

/** Objeto principal de «restablecer»: la llave llega por su eje al bombín del encendido. */
export const heroeRestablecer = () =>
  `<g transform="translate(0 42)"><g transform="translate(-118 -128) rotate(47)">${llaveAuto()}</g>` +
  `<path class="eje" d="M14 13L49 51"/><g transform="translate(90 95)">${switchEncendido()}</g></g>`;

/** Plano de la marca para «recuperar contraseña» (viewBox 720×900): lo que se usa para volver a entrar. */
export const escenaRecuperar = () => [
  ubicar(566, 112, -14, sobre(), 0.55),
  ubicar(602, 262, 14, llavero(), 0.7),
  ubicar(150, 676, -18, controlPorton(), 0.75),
  ubicar(252, 642, 12, credencial(), 0.65),
  ubicar(196, 790, -10, linterna(), 0.7),
  heroe(heroeRecuperar(), 0.72),
].join('');

/** Plano de la marca para «restablecer contraseña» (viewBox 720×900): lo que se usa para hacer una llave nueva. */
export const escenaRestablecer = () => [
  ubicar(572, 106, -32, llaveCasa(78, false), 0.6),
  ubicar(616, 262, 26, muelle(), 0.7),
  ubicar(196, 660, -24, calibrador(), 0.7),
  ubicar(158, 778, -38, lima(), 0.65),
  ubicar(268, 776, 0, pinesBombin(), 0.7),
  heroe(heroeRestablecer(), 0.68),
].join('');

/** Panel del formulario para cada pantalla (viewBox 720×900): sustituyen a la bujía y el pistón del login. */
export const formularioRecuperar = () => [
  ubicar(632, 84, 6, letreroAbierto(), 0.6),
  ubicar(74, 808, 0, buzon(), 0.6),
].join('');

export const formularioRestablecer = () => [
  ubicar(664, 74, 18, candadoCerrado(), 0.6),
  ubicar(82, 832, 40, bombinEuro(), 0.6),
].join('');
