// Piezas de taller dibujadas como plano técnico (SVG) para el fondo del inicio de sesión.
// Cada función devuelve el SVG de una pieza en coordenadas locales centradas en ella;
// las clases `pz` (contorno), `fino` (detalle) y `som` (sombreado) dan el grosor del trazo.
const f = (n) => +n.toFixed(1);
const poly = (pts) => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
const hexPts = (r, rot = 0, sy = 1) => [...Array(6)].map((_, i) => [r * Math.cos(i * Math.PI / 3 + rot), sy * r * Math.sin(i * Math.PI / 3 + rot)]);
const circ = (cls, x, y, r) => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;

// Llave combinada horizontal: anillo de 12 puntas a la izquierda, boca abierta a la derecha.
export function llave(L = 150, r = 20) {
  const w = r * 0.42, R2 = r * 1.15, a = r * 0.48, x0 = -L / 2;
  const sx = Math.sqrt(r * r - w * w), jx = L - Math.sqrt(R2 * R2 - w * w), ox = L + Math.sqrt(R2 * R2 - a * a);
  let s = `<g transform="translate(${f(x0)} 0)"><path class="pz" d="M${f(sx)} ${f(-w)}L${f(jx)} ${f(-w)}A${f(R2)} ${f(R2)} 0 0 1 ${f(ox)} ${f(-a)}L${f(L - a * 0.1)} ${f(-a)}A${f(a)} ${f(a)} 0 0 0 ${f(L - a * 0.1)} ${f(a)}L${f(ox)} ${f(a)}A${f(R2)} ${f(R2)} 0 0 1 ${f(jx)} ${f(w)}L${f(sx)} ${f(w)}A${r} ${r} 0 1 1 ${f(sx)} ${f(-w)}Z"/>`;
  const star = [...Array(24)].map((_, i) => { const an = i * Math.PI / 12, rr = i % 2 ? r * 0.5 : r * 0.6; return [rr * Math.cos(an), rr * Math.sin(an)]; });
  s += `<path class="pz" d="${poly(star)}"/>` + circ('fino', 0, 0, r * 0.82);
  // canal rebajado del mango
  s += `<path class="fino" d="M${f(r * 1.3)} ${f(-w * 0.5)}H${f(jx - 8)}A${f(w * 0.5)} ${f(w * 0.5)} 0 0 1 ${f(jx - 8)} ${f(w * 0.5)}H${f(r * 1.3)}A${f(w * 0.5)} ${f(w * 0.5)} 0 0 1 ${f(r * 1.3)} ${f(-w * 0.5)}Z"/>`;
  // chaflán interior de la boca
  s += `<path class="fino" d="M${f(L + R2 * 0.55)} ${f(-a - 3)}L${f(L - a * 0.1)} ${f(-a - 3)}A${f(a + 3)} ${f(a + 3)} 0 0 0 ${f(L - a * 0.1)} ${f(a + 3)}L${f(L + R2 * 0.55)} ${f(a + 3)}"/>`;
  for (let i = 0; i < 5; i++) s += `<line class="som" x1="${f(jx + 2 + i * 4)}" y1="${f(-w - 2 - i)}" x2="${f(jx + 6 + i * 4)}" y2="${f(-w - 8 - i)}"/>`;
  // bisel exterior del anillo y cuello hacia el mango
  s += circ('som', 0, 0, r * 0.92) + `<path class="fino" d="M${f(sx * 0.9)} ${f(-w * 0.78)}Q${f(r * 1.25)} ${f(-w * 0.5)} ${f(r * 1.3)} ${f(-w * 0.5)}M${f(sx * 0.9)} ${f(w * 0.78)}Q${f(r * 1.25)} ${f(w * 0.5)} ${f(r * 1.3)} ${f(w * 0.5)}"/>`;
  // marcas estampadas de la medida en el canal
  const xm = (r * 1.3 + jx - 8) / 2;
  for (let i = -2; i <= 2; i++) s += `<path class="som" d="M${f(xm + i * 3.2 - 1)} ${f(-w * 0.22)}v${f(w * 0.44)}"/>`;
  s += `<path class="fino" d="M${f(xm - 12)} ${f(-w * 0.32)}h${f(5)}M${f(xm + 7)} ${f(-w * 0.32)}h${f(5)}"/>`;
  // brillo del mango
  s += `<path class="som" d="M${f(r * 1.4)} ${f(w * 0.78)}H${f(jx - 6)}"/>`;
  return s + '</g>';
}

// Perno con cabeza hexagonal en vista lateral (tres caras) y rosca.
export function perno(L = 120, d = 22) {
  const hw = d * 0.9, hh = d * 0.62, y0 = -L / 2, ys = y0 + hh + 5.4;
  let s = `<path class="pz" d="M${f(-hw)} ${f(y0 + 4)}Q${f(-hw)} ${f(y0)} ${f(-hw + 4)} ${f(y0)}H${f(hw - 4)}Q${f(hw)} ${f(y0)} ${f(hw)} ${f(y0 + 4)}V${f(y0 + hh)}H${f(-hw)}Z"/>`;
  s += `<path class="fino" d="M${f(-hw * 0.48)} ${f(y0)}v${f(hh)}M${f(hw * 0.48)} ${f(y0)}v${f(hh)}"/>`;
  s += `<path class="fino" d="M${f(-hw * 0.48)} ${f(y0 + 3)}Q0 ${f(y0 + 8)} ${f(hw * 0.48)} ${f(y0 + 3)}"/>`;
  s += `<rect class="pz" x="${f(-hw * 0.95)}" y="${f(y0 + hh)}" width="${f(hw * 1.9)}" height="3" rx="1"/>`;
  s += `<rect class="pz" x="${f(-hw * 1.15)}" y="${f(y0 + hh + 3)}" width="${f(hw * 2.3)}" height="2.4" rx="1"/><path class="som" d="M${f(-hw * 0.7)} ${f(y0 + 2)}V${f(y0 + hh - 2)}M${f(hw * 0.7)} ${f(y0 + 2)}V${f(y0 + hh - 2)}"/>`;
  s += `<path class="pz" d="M${f(-d / 2)} ${f(ys)}V${f(L / 2 - 4)}L${f(-d / 2 + 4)} ${f(L / 2)}H${f(d / 2 - 4)}L${f(d / 2)} ${f(L / 2 - 4)}V${f(ys)}"/>`;
  const t0 = ys + L * 0.22;
  s += `<line class="fino" x1="${f(-d / 2)}" y1="${f(t0)}" x2="${f(d / 2)}" y2="${f(t0)}"/>`;
  for (let y = t0 + 4; y < L / 2 - 5; y += 5) s += `<line class="fino" x1="${f(-d / 2)}" y1="${f(y)}" x2="${f(d / 2)}" y2="${f(y + 3)}"/>`;
  s += `<path class="som" d="M${f(-d / 2 + 3)} ${f(t0)}V${f(L / 2 - 4)}M${f(d / 2 - 3)} ${f(t0)}V${f(L / 2 - 4)}"/>`;
  // perfil de los hilos en ambos flancos
  let hl = '', hr = '';
  for (let y = t0 + 1; y < L / 2 - 6; y += 5) { hl += `M${f(-d / 2)} ${f(y)}l-1.6 2.5l1.6 2.5`; hr += `M${f(d / 2)} ${f(y + 1.5)}l1.6 2.5l-1.6 2.5`; }
  s += `<path class="fino" d="${hl}${hr}"/>`;
  s += `<path class="fino" d="M${f(-d / 2 + 4)} ${f(L / 2)}Q0 ${f(L / 2 - 3)} ${f(d / 2 - 4)} ${f(L / 2)}M${f(-d / 2)} ${f(L / 2 - 4)}H${f(d / 2)}"/>`;
  // chaflanes de las caras laterales de la cabeza y radio de unión
  s += `<path class="fino" d="M${f(-hw)} ${f(y0 + 4)}Q${f(-hw * 0.74)} ${f(y0 + 7)} ${f(-hw * 0.48)} ${f(y0 + 3)}M${f(hw * 0.48)} ${f(y0 + 3)}Q${f(hw * 0.74)} ${f(y0 + 7)} ${f(hw)} ${f(y0 + 4)}"/>`;
  s += `<path class="fino" d="M${f(-d / 2)} ${f(ys + 2.5)}Q${f(-d / 2)} ${f(ys)} ${f(-d / 2 - 2)} ${f(ys)}M${f(d / 2)} ${f(ys + 2.5)}Q${f(d / 2)} ${f(ys)} ${f(d / 2 + 2)} ${f(ys)}"/>`;
  for (let y = ys + 4; y < t0 - 2; y += 6) s += `<line class="som" x1="${f(d / 2 - 4)}" y1="${f(y)}" x2="${f(d / 2 - 1)}" y2="${f(y + 3)}"/>`;
  return s;
}

// Tuerca en perspectiva: cara superior, caras laterales y agujero roscado.
export function tuerca(r = 30, h = 18) {
  const top = hexPts(r, 0, 0.55), bot = top.map(([x, y]) => [x, y + h]);
  let s = `<path class="pz" d="M${f(top[0][0])} ${f(top[0][1])}L${f(bot[0][0])} ${f(bot[0][1])}L${f(bot[1][0])} ${f(bot[1][1])}L${f(bot[2][0])} ${f(bot[2][1])}L${f(bot[3][0])} ${f(bot[3][1])}L${f(top[3][0])} ${f(top[3][1])}"/>`;
  s += `<path class="pz" d="${poly(top)}"/>`;
  for (const i of [1, 2]) s += `<line class="pz" x1="${f(top[i][0])}" y1="${f(top[i][1])}" x2="${f(bot[i][0])}" y2="${f(bot[i][1])}"/>`;
  s += `<ellipse class="fino" rx="${f(r * 0.86)}" ry="${f(r * 0.86 * 0.55)}"/>`;
  s += `<ellipse class="pz" rx="${f(r * 0.48)}" ry="${f(r * 0.48 * 0.55)}"/><ellipse class="fino" rx="${f(r * 0.38)}" ry="${f(r * 0.38 * 0.55)}"/>`;
  s += `<path class="fino" d="M${f(-r * 0.38)} 0Q0 ${f(r * 0.45)} ${f(r * 0.38)} 0" transform="translate(0 4)"/>`;
  for (const i of [0, 1, 2]) { const a = bot[i], b = bot[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; s += `<path class="fino" d="M${f(a[0])} ${f(a[1] - 2.5)}Q${f(mx)} ${f(my + 1.5)} ${f(b[0])} ${f(b[1] - 2.5)}"/>`; }
  for (let i = 0; i < 6; i++) { const x = bot[1][0] + (bot[2][0] - bot[1][0]) * (i + 0.5) / 6; s += `<line class="som" x1="${f(x)}" y1="${f(top[1][1] + 3)}" x2="${f(x)}" y2="${f(bot[1][1] - 3)}"/>`; }
  return s;
}

// Engranaje con radios, cubo con chavetero y sombra de espesor.
export function engranaje(z = 16, ro = 56, ri = 47) {
  const pts = [];
  for (let i = 0; i < z; i++) {
    const a = (i / z) * Math.PI * 2, t = Math.PI * 2 / z;
    for (const [r, da] of [[ri, 0], [ro, t * 0.18], [ro, t * 0.46], [ri, t * 0.64]]) pts.push([r * Math.cos(a + da), r * Math.sin(a + da)]);
  }
  let s = `<path class="som" d="${poly(pts)}" transform="translate(7 -6)"/><path class="pz" d="${poly(pts)}"/>`;
  s += circ('fino', 0, 0, ri * 0.92) + circ('pz', 0, 0, ri * 0.8);
  const rh = ro * 0.3, n = 6;
  for (let i = 0; i < n; i++) {
    const a0 = i * 2 * Math.PI / n + 0.16, a1 = (i + 1) * 2 * Math.PI / n - 0.16, R1 = ri * 0.72, R0 = rh * 1.45;
    s += `<path class="fino" d="M${f(R0 * Math.cos(a0 + 0.12))} ${f(R0 * Math.sin(a0 + 0.12))}L${f(R1 * Math.cos(a0))} ${f(R1 * Math.sin(a0))}A${f(R1)} ${f(R1)} 0 0 1 ${f(R1 * Math.cos(a1))} ${f(R1 * Math.sin(a1))}L${f(R0 * Math.cos(a1 - 0.12))} ${f(R0 * Math.sin(a1 - 0.12))}A${f(R0)} ${f(R0)} 0 0 0 ${f(R0 * Math.cos(a0 + 0.12))} ${f(R0 * Math.sin(a0 + 0.12))}Z"/>`;
  }
  s += circ('pz', 0, 0, rh * 1.25) + circ('fino', 0, 0, rh * 1.05) + circ('pz', 0, 0, rh * 0.6);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; s += circ('fino', rh * 0.86 * Math.cos(a), rh * 0.86 * Math.sin(a), 1.4); }
  s += circ('som', 0, 0, ri * 0.86);
  s += `<path class="pz" d="M${f(-rh * 0.16)} ${f(-rh * 0.58)}V${f(-rh * 0.8)}H${f(rh * 0.16)}V${f(-rh * 0.58)}"/>`;
  for (let i = 0; i < z; i++) { const a = (i / z) * Math.PI * 2 + Math.PI / z * 0.64; s += `<line class="som" x1="${f(ri * 0.94 * Math.cos(a))}" y1="${f(ri * 0.94 * Math.sin(a))}" x2="${f(ro * 0.96 * Math.cos(a))}" y2="${f(ro * 0.96 * Math.sin(a))}"/>`; }
  return s;
}


// Pistón y biela con relieves de válvula, segmentos, bulón y tapa con pernos.
export function piston(k = 0.62) {
  let s = `<g transform="scale(${k}) translate(0 -165)">`;
  s += `<path class="pz" d="M-62 10a10 10 0 0 1 10 -10h104a10 10 0 0 1 10 10v48h-3v58a6 6 0 0 1 -6 6h-106a6 6 0 0 1 -6 -6v-58h-3z"/>`;
  s += `<path class="fino" d="M-44 0q10 8 22 0M22 0q10 8 22 0"/>`;
  for (const y of [12, 22, 32]) s += `<path class="fino" d="M-62 ${y}H62M-62 ${y + 4}H62"/>`;
  for (let x = -50; x <= 50; x += 10) s += circ('fino', x, 34, 1.4);
  s += `<path class="fino" d="M-48 60V114M48 60V114"/><path class="som" d="M52 62V112M56 62V112"/>`;
  s += circ('pz', 0, 82, 21) + circ('fino', 0, 82, 15) + circ('pz', 0, 82, 10);
  s += `<path class="pz" d="M-17 102L-27 230M17 102L27 230"/><path class="fino" d="M-8 116L-13 222M8 116L13 222M-8 116H8M-13 222H13"/>`;
  s += circ('pz', 0, 272, 52) + circ('fino', 0, 272, 38) + circ('pz', 0, 272, 33);
  s += `<path class="pz" d="M-68 272H68"/>`;
  for (const x of [-56, 56]) s += `<rect class="pz" x="${x - 7}" y="250" width="14" height="44" rx="2"/><path class="pz" d="${poly(hexPts(9, Math.PI / 6, 0.55).map(([a, b]) => [a + x, b + 302]))}"/><path class="fino" d="M${x - 7} 262H${x + 7}M${x - 7} 282H${x + 7}"/>`;
  return s + '</g>';
}


// Bujía: terminal, aislante con aletas, hexágono, arandela, rosca y electrodo.
export function bujia(k = 1) {
  let s = `<g transform="scale(${k}) translate(0 -70)">`;
  s += `<path class="pz" d="M-4 0h8v4h2v6h-2v4h-8v-4h-2v-6h2z"/>`;
  s += `<path class="pz" d="M-8 14h16l4 50h-24z"/>`;
  for (const y of [20, 26, 32, 38, 44]) s += `<path class="fino" d="M-9 ${y}h18q2 2 0 4h-18q-2 -2 0 -4"/>`;
  s += `<path class="som" d="M5 16L7 62M3 16L5 62"/>`;
  s += `<path class="pz" d="M-14 64h28v6h-28z"/><path class="pz" d="M-18 70h36v20h-36z"/><path class="fino" d="M-7 70v20M7 70v20"/>`;
  s += `<path class="fino" d="M-18 72q18 -4 36 0"/><rect class="pz" x="-15" y="90" width="30" height="5" rx="1.5"/>`;
  s += `<path class="pz" d="M-11 95h22v34h-22z"/>`;
  for (let y = 98; y < 128; y += 4) s += `<line class="fino" x1="-11" y1="${y}" x2="11" y2="${y + 2.5}"/>`;
  s += `<path class="pz" d="M-2 129v7h4v-7"/><path class="pz" d="M9 129v12h-12"/>`;
  return s + '</g>';
}

// Destornillador plano vertical: mango estriado con anillos de agarre, doble virola, vástago con brillo y punta de paleta.
export function destornillador(L = 150, w = 22) {
  const y0 = -L / 2, hL = L * 0.4, hw = w / 2, yv = y0 + hL, sw = w * 0.14;
  let s = `<path class="pz" d="M${f(-hw * 0.8)} ${f(y0)}Q${f(-hw)} ${f(y0)} ${f(-hw)} ${f(y0 + 6)}L${f(-hw * 0.88)} ${f(yv - 8)}Q${f(-hw * 0.84)} ${f(yv)} ${f(-hw * 0.6)} ${f(yv)}H${f(hw * 0.6)}Q${f(hw * 0.84)} ${f(yv)} ${f(hw * 0.88)} ${f(yv - 8)}L${f(hw)} ${f(y0 + 6)}Q${f(hw)} ${f(y0)} ${f(hw * 0.8)} ${f(y0)}Z"/>`;
  // tapa abombada y anillos de agarre
  s += `<path class="fino" d="M${f(-hw * 0.82)} ${f(y0 + 5)}Q0 ${f(y0 + 9)} ${f(hw * 0.82)} ${f(y0 + 5)}"/>`;
  s += `<path class="fino" d="M${f(-hw * 0.5)} ${f(y0 + 2.2)}Q0 ${f(y0 + 4.2)} ${f(hw * 0.5)} ${f(y0 + 2.2)}"/>`;
  for (const t of [0.34, 0.37, 0.8, 0.83]) { const y = y0 + 10 + (hL - 22) * t, k = 0.97 - t * 0.08; s += `<path class="fino" d="M${f(-hw * k)} ${f(y)}Q0 ${f(y + 2.5)} ${f(hw * k)} ${f(y)}"/>`; }
  s += `<ellipse class="fino" cx="0" cy="${f(y0 + 6.5)}" rx="${f(hw * 0.22)}" ry="${f(hw * 0.14)}"/>`;
  for (let y = y0 + 14; y < yv - 14; y += 4) s += `<line class="som" x1="${f(hw * 0.62)}" y1="${f(y)}" x2="${f(hw * 0.8)}" y2="${f(y + 2.5)}"/>`;
  // estrías del mango
  for (const x of [-0.56, -0.28, 0, 0.28, 0.56]) s += `<path class="fino" d="M${f(hw * x)} ${f(y0 + 10)}V${f(yv - 12)}"/>`;
  s += `<path class="som" d="M${f(-hw * 0.76)} ${f(y0 + 10)}V${f(yv - 12)}M${f(hw * 0.76)} ${f(y0 + 10)}V${f(yv - 12)}M${f(hw * 0.68)} ${f(y0 + 12)}V${f(yv - 14)}"/>`;
  // doble virola
  s += `<rect class="pz" x="${f(-hw * 0.56)}" y="${f(yv)}" width="${f(hw * 1.12)}" height="4" rx="1.2"/>`;
  s += `<rect class="pz" x="${f(-hw * 0.44)}" y="${f(yv + 4)}" width="${f(hw * 0.88)}" height="5" rx="1.2"/><path class="fino" d="M${f(-hw * 0.44)} ${f(yv + 6.5)}h${f(hw * 0.88)}"/>`;
  const yt = L / 2 - 14, ys = yv + 9;
  s += `<path class="pz" d="M${f(-sw)} ${f(ys)}V${f(yt)}L${f(-sw * 1.9)} ${f(L / 2 - 2)}V${f(L / 2)}H${f(sw * 1.9)}V${f(L / 2 - 2)}L${f(sw)} ${f(yt)}V${f(ys)}"/>`;
  // hexágono de apoyo para llave en la base del vástago
  s += `<path class="pz" d="M${f(-sw * 1.7)} ${f(ys)}H${f(sw * 1.7)}V${f(ys + 5)}H${f(-sw * 1.7)}Z"/><path class="fino" d="M${f(-sw * 0.6)} ${f(ys)}v5M${f(sw * 0.6)} ${f(ys)}v5"/>`;
  // brillo del vástago y chaflán de la paleta
  s += `<path class="som" d="M${f(sw * 0.35)} ${f(ys + 3)}V${f(yt - 2)}M${f(-sw * 0.4)} ${f(ys + 3)}V${f(ys + 9)}"/><path class="fino" d="M${f(-sw)} ${f(yt)}H${f(sw)}M${f(-sw * 1.9)} ${f(L / 2 - 2)}H${f(sw * 1.9)}"/>`;
  s += `<path class="som" d="M${f(-sw * 0.4)} ${f(yt + 2)}L${f(-sw * 0.9)} ${f(L / 2 - 3)}M${f(sw * 0.4)} ${f(yt + 2)}L${f(sw * 0.9)} ${f(L / 2 - 3)}"/>`;
  return s;
}

// Llave inglesa horizontal: mango con ojal y nervio, cabeza con mandíbulas estriadas, eje del sinfín y remache.
export function llaveInglesa(L = 150) {
  const x0 = -L / 2, xh = L / 2 - 36;
  let s = `<path class="pz" d="M${f(xh)} -7.5L${f(x0 + 6)} -5.5Q${f(x0)} -5.5 ${f(x0)} 0Q${f(x0)} 5.5 ${f(x0 + 6)} 5.5L${f(xh)} 7.5"/>`;
  // ojal con refuerzo y nervio central del mango
  s += circ('pz', x0 + 9, 0, 3) + circ('fino', x0 + 9, 0, 4.4);
  s += `<path class="fino" d="M${f(x0 + 18)} -2.5L${f(xh - 8)} -3.5Q${f(xh - 5)} 0 ${f(xh - 8)} 3.5L${f(x0 + 18)} 2.5Q${f(x0 + 15)} 0 ${f(x0 + 18)} -2.5Z"/>`;
  s += `<path class="som" d="M${f(x0 + 20)} 4.6L${f(xh - 6)} 6M${f(x0 + 20)} -4.6L${f(xh - 6)} -6"/>`;
  for (let x = x0 + 22; x < x0 + 40; x += 3) s += `<line class="som" x1="${f(x)}" y1="-1.6" x2="${f(x + 1.5)}" y2="1.6"/>`;
  // cabeza y mandíbula fija
  s += `<path class="pz" d="M${f(xh)} -7.5C${f(xh + 2)} -20 ${f(xh + 22)} -27 ${f(xh + 36)} -18L${f(xh + 36)} -7H${f(xh + 20)}Q${f(xh + 17)} -7 ${f(xh + 17)} -4V3H${f(xh + 14)}V13Q${f(xh + 6)} 14 ${f(xh)} 7.5"/>`;
  s += `<path class="fino" d="M${f(xh + 6)} -12Q${f(xh + 18)} -21 ${f(xh + 30)} -17M${f(xh + 4)} -8Q${f(xh + 10)} -14 ${f(xh + 17)} -12"/>`;
  for (let x = xh + 21; x < xh + 36; x += 3) s += `<path class="fino" d="M${f(x)} -7l1.5 -2l1.5 2"/>`;
  s += circ('pz', xh + 9, -5, 2) + `<path class="fino" d="M${f(xh + 7.6)} -6.4l2.8 2.8"/>`;
  // mandíbula móvil estriada
  s += `<path class="pz" d="M${f(xh + 17)} 1H${f(xh + 36)}V7Q${f(xh + 34)} 15 ${f(xh + 22)} 16H${f(xh + 17)}Z"/>`;
  for (let x = xh + 21; x < xh + 36; x += 3) s += `<path class="fino" d="M${f(x)} 1l1.5 2l1.5 -2"/>`;
  s += `<path class="som" d="M${f(xh + 19)} 7H${f(xh + 33)}M${f(xh + 19)} 10H${f(xh + 30)}"/>`;
  // nervio inferior del mango y escala grabada en la mandíbula móvil
  s += `<path class="som" d="M${f(x0 + 6)} 0H${f(x0 + 13)}"/>`;
  for (let i = 0; i < 5; i++) s += `<path class="som" d="M${f(xh + 20 + i * 3)} 13v${i % 2 ? -1.5 : -2.8}"/>`;
  // tornillo sinfín moleteado con su eje
  s += `<path class="fino" d="M${f(xh + 1)} 19.5H${f(xh + 19)}"/><rect class="pz" x="${f(xh + 3)}" y="16" width="14" height="7" rx="2"/>`;
  for (let x = xh + 4.5; x < xh + 16.5; x += 1.6) s += `<line class="fino" x1="${f(x)}" y1="16" x2="${f(x + 0.8)}" y2="23"/>`;
  return s;
}

const ubicar = (x, y, giro, pieza, opacidad) =>
  `<g opacity="${opacidad}" transform="translate(${x} ${y}) rotate(${giro})">${pieza}</g>`;

/** Panel de marca (viewBox 720×900): herramientas cayendo hacia el motor y piezas ya caídas a su izquierda. */
export const escenaMarca = () => [
  ubicar(560, 108, 28, destornillador(124, 19), 0.45),
  ubicar(612, 252, 58, llaveInglesa(132), 0.65),
  ubicar(604, 420, 64, llave(96, 12), 0.9),
  ubicar(146, 700, 0, engranaje(14, 38, 32), 0.75),
  ubicar(236, 652, -62, perno(88, 16), 0.6),
  ubicar(214, 786, -16, tuerca(22, 13), 0.75),
].join('');

/** Panel del formulario (viewBox 720×900): bujía y pistón en esquinas opuestas, apuntando a la tarjeta. */
export const escenaFormulario = () => [
  ubicar(692, 30, 45, bujia(0.88), 0.65),
  ubicar(30, 878, 45, piston(0.5), 0.65),
].join('');
