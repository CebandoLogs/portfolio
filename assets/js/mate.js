// El mate de la portada: un mate 3D (campo de distancias + ray marching) dibujado
// con caracteres en un <canvas>. Las líneas de log de la portada caen por la boca,
// como el agua al cebar. Sin dependencias y compatible con la CSP del sitio.
(function () {
  var stage = document.querySelector("[data-mate]");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;

  var hudLog = document.querySelector("[data-mate-log]");
  var hudStat = document.querySelector("[data-mate-stat]");
  var RAMP = " .:-=+*xoX#%@";
  var NOISE = "#x+:@";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Las líneas que se ceban salen del HTML (partial hero-logs), no están duplicadas acá.
  var nodes = document.querySelectorAll(".hero-logs p");
  var lines = [];
  for (var i = 0; i < nodes.length / 2; i++) lines.push({ t: nodes[i].textContent, hit: nodes[i].classList.contains("hit") });
  if (!lines.length) lines.push({ t: "cebando logs", hit: false });

  var colors = {};
  function readColors() {
    var cs = getComputedStyle(stage);
    ["fg", "accent", "wood", "muted"].forEach(function (k) { colors[k] = cs.getPropertyValue("--" + k).trim() || "#fff"; });
  }

  // ── Grilla ──────────────────────────────────────────────────────────
  var cell = 14, cx = 0.5, cyF = 0.5, cols = 0, rows = 0, scale = 1, chars, mats, noise = [];
  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    cell = w < 600 ? 10 : w < 1100 ? 12 : 14;
    var wide = w >= 860;
    cx = wide ? 0.66 : 0.5; cyF = wide ? 0.5 : 0.69;
    cols = Math.max(8, Math.floor(w / cell));
    rows = Math.max(8, Math.floor(h / cell));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = cols * cell * dpr;
    canvas.height = rows * cell * dpr;
    canvas.style.width = cols * cell + "px";
    canvas.style.height = rows * cell + "px";
    stage.style.setProperty("--cell", cell + "px");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "500 " + Math.round(cell * 0.96) + 'px "Chivo Mono", ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    chars = new Uint8Array(cols * rows);
    mats = new Uint8Array(cols * rows);
    scale = wide ? Math.max(2.6 / rows, 2.4 / (cols * 0.62)) : Math.max(2.6 / (rows * 0.5), 2.3 / cols); // unidades de mundo por celda
    noise = [];
    for (var n = 0; n < 22; n++) noise.push(newNoise());
  }
  function newNoise() {
    return { c: Math.floor(Math.random() * cols), r: Math.floor(Math.random() * rows), ch: NOISE[Math.floor(Math.random() * NOISE.length)] };
  }

  // ── Escena: campo de distancias del mate, en espacio del objeto ─────
  var hitBomb = false;
  function capsule(x, y, z, ax, ay, bx, by, rad) {
    var pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
    var h = (pax * bax + pay * bay) / (bax * bax + bay * bay);
    h = h < 0 ? 0 : h > 1 ? 1 : h;
    var dx = pax - bax * h, dy = pay - bay * h;
    return Math.sqrt(dx * dx + dy * dy + z * z) - rad;
  }
  function map(x, y, z) {
    var r = Math.sqrt(x * x + z * z);
    // cuerpo: calabaza achatada con base plana
    var ex = r / 0.66, ey = (y + 0.12) / 0.62;
    var body = (Math.sqrt(ex * ex + ey * ey) - 1) * 0.6;
    var base = -(y + 0.66);
    if (base > body) body = base;
    // virola: cilindro de metal
    var dx = r - 0.5, dy = Math.abs(y - 0.39) - 0.19;
    var mx = dx > 0 ? dx : 0, my = dy > 0 ? dy : 0;
    var vir = Math.min(Math.max(dx, dy), 0) + Math.sqrt(mx * mx + my * my) - 0.02;
    // unión suave cuerpo + virola
    var k = 0.08, hh = 0.5 + (0.5 * (vir - body)) / k;
    hh = hh < 0 ? 0 : hh > 1 ? 1 : hh;
    var d = vir + (body - vir) * hh - k * hh * (1 - hh);
    // borde de la boca
    var tx = r - 0.52, ty = y - 0.58;
    var rim = Math.sqrt(tx * tx + ty * ty) - 0.045;
    if (rim < d) d = rim;
    // hueco de la boca
    var cav = Math.max(r - 0.44, 0.5 - y);
    if (-cav > d) d = -cav;
    // montañita de yerba
    var yx = (x + 0.08) / 0.36, yy = (y - 0.5) / 0.13, yz = z / 0.36;
    var yer = (Math.sqrt(yx * yx + yy * yy + yz * yz) - 1) * 0.13;
    if (yer < d) d = yer;
    // bombilla: caño y boquilla
    var b = Math.min(capsule(x, y, z, 0.2, 0.5, 0.74, 1.48, 0.052), capsule(x, y, z, 0.74, 1.48, 1.04, 1.6, 0.052));
    hitBomb = b < d;
    return hitBomb ? b : d;
  }

  // ── Cuadro ──────────────────────────────────────────────────────────
  var yaw = 0.6, pitch = 0.36, yawOff = 0, pitchOff = 0, mouseX = 0.5, mouseY = 0.5;
  var TX = 0.14, TY = 0.44; // punto al que mira la cámara
  var pour = { line: 0, head: 0 };

  function render(time) {
    var cp = Math.cos(pitch + pitchOff), sp = Math.sin(pitch + pitchOff);
    var cy = Math.cos(yaw + yawOff), sy = Math.sin(yaw + yawOff);
    // cámara ortográfica: adelante f, arriba u, derecha (1,0,0)
    var fx = 0, fy = -sp, fz = -cp, ux = 0, uy = cp, uz = -sp;
    // dirección del rayo y luz, pasadas al espacio del objeto (rotación en Y)
    var dX = cy * fx + sy * fz, dY = fy, dZ = -sy * fx + cy * fz;
    var lx = -0.52, ly = 0.62, lz = 0.58;
    var LX = cy * lx + sy * lz, LY = ly, LZ = -sy * lx + cy * lz;
    // vector medio para el brillo del metal
    var hx = LX - dX, hy = LY - dY, hz = LZ - dZ, hl = Math.sqrt(hx * hx + hy * hy + hz * hz);
    hx /= hl; hy /= hl; hz /= hl;
    var top = RAMP.length - 1;

    for (var j = 0; j < rows; j++) {
      var v = (rows * cyF - j - 0.5) * scale;
      for (var i = 0; i < cols; i++) {
        var idx = j * cols + i;
        chars[idx] = 0;
        var u = (i + 0.5 - cols * cx) * scale;
        // origen del rayo en mundo, luego al espacio del objeto
        var wx = TX + u - fx * 6 + ux * v, wy = TY + uy * v - fy * 6, wz = uz * v - fz * 6;
        var ox = cy * wx + sy * wz, oy = wy, oz = -sy * wx + cy * wz;
        // descarte rápido contra una esfera que envuelve todo
        var sx = ox - 0.15, syy = oy - 0.45, sz = oz;
        var bq = sx * dX + syy * dY + sz * dZ;
        var disc = bq * bq - (sx * sx + syy * syy + sz * sz - 2.31);
        if (disc < 0) continue;
        var sq = Math.sqrt(disc), t = -bq - sq, tMax = -bq + sq, hit = false, px, py, pz;
        for (var s = 0; s < 56 && t < tMax; s++) {
          px = ox + dX * t; py = oy + dY * t; pz = oz + dZ * t;
          var d = map(px, py, pz);
          if (d < 0.006) { hit = true; break; }
          t += d * 0.9;
        }
        if (!hit) continue;
        var bomb = hitBomb, e = 0.012;
        var n1 = map(px + e, py - e, pz - e), n2 = map(px - e, py - e, pz + e), n3 = map(px - e, py + e, pz - e), n4 = map(px + e, py + e, pz + e);
        var nx = n1 - n2 - n3 + n4, ny = -n1 - n2 + n3 + n4, nz = -n1 + n2 - n3 + n4;
        var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        var diff = nx * LX + ny * LY + nz * LZ; if (diff < 0) diff = 0;
        var spec = nx * hx + ny * hy + nz * hz; spec = spec > 0 ? Math.pow(spec, 22) : 0;
        var fres = 1 + (nx * dX + ny * dY + nz * dZ); fres = fres > 0 ? fres * fres : 0;
        var r = Math.sqrt(px * px + pz * pz), a = Math.atan2(pz, px), lum, mat;
        if (bomb) { mat = 1; lum = 0.4 + 0.45 * diff + 0.7 * spec; }
        else if (r < 0.455 && py > 0.47) {
          mat = 2;
          var hs = Math.sin(Math.floor(px * 15) * 12.9898 + Math.floor(pz * 15) * 78.233) * 43758.5453;
          lum = 0.34 + 0.46 * diff + 0.3 * (hs - Math.floor(hs) - 0.5);
        } else if (py > 0.2) {
          mat = 1; lum = 0.24 + 0.55 * diff + 0.6 * spec;
          // guarda pampa grabada en la virola
          var gu = a * 1.5915; gu = Math.abs(gu - Math.floor(gu) - 0.5) * 2;
          var g = gu + Math.abs((py - 0.39) / 0.15);
          if ((g > 0.62 && g < 0.86) || g < 0.24) lum *= 0.38;
        } else { mat = 0; lum = (0.2 + 0.72 * diff) * (0.84 + 0.16 * Math.sin(a * 7 + py * 5)); }
        lum += 0.16 * fres;
        lum = lum < 0 ? 0 : lum > 1 ? 1 : lum;
        chars[idx] = 1 + Math.floor(lum * (top - 0.001));
        mats[idx] = mat;
      }
    }

    // ── Dibujo ────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, cols * cell, rows * cell);
    var half = cell / 2;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = colors.muted;
    for (var q = 0; q < noise.length; q++) {
      var nn = noise[q];
      if (nn.c < cols && nn.r < rows && !chars[nn.r * cols + nn.c]) ctx.fillText(nn.ch, nn.c * cell + half, nn.r * cell + half);
    }
    ctx.globalAlpha = 1;
    var palette = [colors.wood, colors.fg, colors.accent];
    for (var m = 0; m < 3; m++) {
      ctx.fillStyle = palette[m];
      for (var jj = 0; jj < rows; jj++) for (var ii = 0; ii < cols; ii++) {
        var c = chars[jj * cols + ii];
        if (c && mats[jj * cols + ii] === m) ctx.fillText(RAMP[c], ii * cell + half, jj * cell + half);
      }
    }

    // el chorro: la línea de log actual cae hasta la boca del mate
    var mouthCol = Math.round(cols * cx + (-0.1 - TX) / scale - 0.5);
    var mouthRow = Math.round(rows * cyF - ((0.6 - TY) * uy) / scale - 0.5);
    var line = lines[pour.line], head = Math.floor(pour.head);
    for (var kk = 0; kk < line.t.length; kk++) {
      var row = head - kk;
      if (row < 0 || row > mouthRow) continue;
      var ch = line.t[kk];
      if (ch === " ") continue;
      ctx.clearRect(mouthCol * cell, row * cell, cell, cell);
      ctx.fillStyle = kk === 0 ? colors.fg : line.hit ? colors.wood : colors.accent;
      ctx.globalAlpha = kk === 0 ? 1 : Math.max(0.35, 1 - kk / 40);
      ctx.fillText(ch, mouthCol * cell + half, row * cell + half);
    }
    ctx.globalAlpha = 1;
    return mouthRow;
  }

  function setLog() {
    if (!hudLog) return;
    hudLog.textContent = lines[pour.line].t;
    hudLog.classList.toggle("hit", lines[pour.line].hit);
  }

  // ── Bucle ───────────────────────────────────────────────────────────
  var last = 0, visible = true, raf = 0, frames = 0, statAt = 0, noiseAt = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 24) return; // ~30 cuadros por segundo alcanzan
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    yaw += dt * 0.32;
    yawOff += ((mouseX - 0.5) * 0.9 - yawOff) * 0.06;
    pitchOff += ((mouseY - 0.5) * 0.22 - pitchOff) * 0.06;
    pour.head += dt * 16;
    var mouthRow = render(now);
    if (pour.head - lines[pour.line].t.length > mouthRow + 4) {
      pour.line = (pour.line + 1) % lines.length; pour.head = 0; setLog();
    }
    if (now - noiseAt > 900) { noiseAt = now; noise[Math.floor(Math.random() * noise.length)] = newNoise(); }
    frames++;
    if (now - statAt > 1000) {
      if (hudStat && now - statAt < 2500) {
        var deg = Math.round((((yaw + yawOff) * 57.2958) % 360 + 360) % 360);
        hudStat.textContent = "giro " + ("00" + deg).slice(-3) + "° · celda " + cell + "px · " + Math.round((frames * 1000) / (now - statAt)) + " fps";
      }
      frames = 0; statAt = now;
    }
  }
  function start() { if (!raf && !reduce) { last = statAt = performance.now(); frames = 0; raf = requestAnimationFrame(frame); } }
  function still() { pour.head = rows * 0.42; render(0); }

  readColors();
  resize();
  setLog();
  stage.classList.add("is-live");
  still();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce) still(); });

  var rt = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); still(); }, 120);
  });
  new MutationObserver(function () { readColors(); still(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (!reduce) {
    window.addEventListener("pointermove", function (ev) {
      mouseX = ev.clientX / window.innerWidth; mouseY = ev.clientY / window.innerHeight;
    }, { passive: true });
    document.addEventListener("visibilitychange", start);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(stage);
    }
    start();
  }
})();
