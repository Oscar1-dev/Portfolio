// The site background: slow ribbons of colour seen through fluted (reeded)
// glass. A domain-warped noise field makes the ribbons; each vertical flute
// bends what's behind it and splits it slightly into colour fringes. The
// cursor acts like a lens pressed against the glass. Each section declares a
// data-scene; its palette and brightness blend in as it scrolls into view,
// and the live colours are mirrored into CSS (--scene-a/b/c).
//
// Raw WebGL2, one fullscreen triangle, rendered below screen resolution (the
// image is soft by nature). With reduced motion a single still frame is drawn.

interface Look {
  colours: [string, string, string];
  /** Overall brightness of the colour field, 0…1. */
  intensity: number;
}

const LOOKS: Record<string, Look> = {
  hero: { colours: ['#ff2d55', '#8a3cff', '#2b7bff'], intensity: 1.45 },
  statement: { colours: ['#ff6a1a', '#ff2d55', '#ffc83d'], intensity: 0.7 },
  kush: { colours: ['#c9a7ff', '#ff9ad5', '#7ff0c4'], intensity: 0.75 },
  work: { colours: ['#2b7bff', '#00c9a7', '#8a3cff'], intensity: 0.5 },
  experience: { colours: ['#8a3cff', '#ff3d8b', '#2b7bff'], intensity: 0.48 },
  security: { colours: ['#ff2626', '#ff6a1a', '#ffc83d'], intensity: 0.55 },
  archive: { colours: ['#00d98a', '#2b7bff', '#ffc83d'], intensity: 0.42 },
  stack: { colours: ['#ffc83d', '#00d98a', '#ff6a1a'], intensity: 0.48 },
  contact: { colours: ['#ff3d8b', '#8a3cff', '#ffe8f4'], intensity: 0.9 },
  page: { colours: ['#8a3cff', '#ff2d55', '#2b7bff'], intensity: 0.6 },
  case: { colours: ['#c9a7ff', '#ff9ad5', '#7ff0c4'], intensity: 0.6 },
  detail: { colours: ['#2b7bff', '#8a3cff', '#00c9a7'], intensity: 0.5 },
};

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const frag = (rich: boolean) => `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec2 uPointer;
uniform float uLens;
uniform float uFlute;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform float uIntensity;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < ${rich ? 4 : 3}; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// Ribbons of colour with dark space between them.
vec3 field(vec2 p) {
  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.4), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float n = fbm(p + 2.6 * r);
  vec3 col = mix(uA, uB, smoothstep(0.25, 0.75, q.x));
  col = mix(col, uC, smoothstep(0.45, 0.85, r.y));
  float mask = smoothstep(0.36, 0.78, n);
  float silk = pow(1.0 - abs(sin(n * 7.0 + r.x * 3.0)), 3.0);
  vec3 c = col * mask * (0.45 + silk * 0.9);
  c += vec3(1.0) * pow(silk, 8.0) * mask * 0.35;
  return c;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  float aspect = uRes.x / uRes.y;

  // Fluted glass: position across the current flute, -0.5 … 0.5.
  float fx = fract(frag.x / uFlute) - 0.5;

  vec2 p = vec2(uv.x * aspect, uv.y) * 1.35 + vec2(0.0, uScroll);
  vec2 m = vec2(uPointer.x * aspect, uPointer.y) * 1.35 + vec2(0.0, uScroll);
  // The lens: magnifies the field around the cursor.
  vec2 dm = p - m;
  p -= dm * exp(-dot(dm, dm) * 5.0) * 0.45 * uLens;

  float bend = fx * 0.07;
  ${
    rich
      ? `vec3 a = field(p + vec2(bend, 0.0));
  vec3 b = field(p + vec2(bend * 1.35, 0.0));
  vec3 c = vec3(b.r, a.g, a.b * 0.6 + b.b * 0.4);`
      : `vec3 c = field(p + vec2(bend, 0.0));`
  }

  // Each flute is a rounded rib: brighter along its crest, a fine bright
  // edge where two ribs meet.
  float rib = 0.78 + 0.22 * cos(fx * 3.14159);
  float edge = smoothstep(0.43, 0.5, abs(fx));
  c *= rib;
  c += (c * 0.8 + vec3(0.012)) * edge;

  c *= uIntensity;
  // Calm the edges of the screen, and keep the very top darker for the nav.
  float vig = smoothstep(1.3, 0.25, length((uv - vec2(0.5, 0.55)) * vec2(1.0, 1.25)));
  c *= mix(0.5, 1.0, vig);

  c = vec3(0.022, 0.02, 0.03) + c;
  c = 1.0 - exp(-c * 1.35);
  c += (hash(frag + uTime) - 0.5) / 255.0; // dither against banding
  outColor = vec4(c, 1.0);
}`;

export interface BackdropHandle {
  refresh(): void;
  dispose(): void;
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

export function mountBackdrop(canvas: HTMLCanvasElement, opts: { rich: boolean; still: boolean }): BackdropHandle | null {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: opts.rich ? 'high-performance' : 'low-power' });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const program = gl.createProgram()!;
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag(opts.rich)));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
  } catch (e) {
    console.warn('backdrop disabled:', e);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const uni = {
    res: u('uRes'),
    time: u('uTime'),
    scroll: u('uScroll'),
    pointer: u('uPointer'),
    lens: u('uLens'),
    flute: u('uFlute'),
    a: u('uA'),
    b: u('uB'),
    c: u('uC'),
    intensity: u('uIntensity'),
  };

  // Render scale: the field is soft, so a fraction of the pixels is plenty.
  const scale = opts.rich ? 0.55 : 0.4;
  const resize = () => {
    canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
    canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uni.res, canvas.width, canvas.height);
    // Flutes about 44 CSS px wide (wider on phones so they stay readable).
    gl.uniform1f(uni.flute, (window.innerWidth < 720 ? 34 : 44) * scale);
    if (opts.still) draw(performance.now());
  };

  let sections: { el: HTMLElement; look: Look }[] = [];
  const refresh = () => {
    sections = [...document.querySelectorAll<HTMLElement>('[data-scene]')].map((el) => ({ el, look: LOOKS[el.dataset.scene ?? 'page'] ?? LOOKS.page! }));
    if (opts.still) draw(performance.now());
  };

  const cur = { cols: LOOKS.hero!.colours.map(hex), intensity: LOOKS.hero!.intensity };
  const target = { cols: cur.cols.map((c) => [...c] as [number, number, number]), intensity: cur.intensity };
  const blend = () => {
    const vh = window.innerHeight;
    let total = 0;
    const acc = [0, 0, 0].map(() => [0, 0, 0]);
    let inten = 0;
    for (const { el, look } of sections) {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, 1 - Math.abs(r.top + r.height / 2 - vh / 2) / (vh * 0.5 + r.height * 0.5)) ** 2;
      if (w <= 0) continue;
      total += w;
      inten += look.intensity * w;
      look.colours.forEach((h, i) => hex(h).forEach((v, j) => (acc[i]![j]! += v * w)));
    }
    if (!total) return;
    target.intensity = inten / total;
    acc.forEach((c, i) => c.forEach((v, j) => (target.cols[i]![j] = v / total)));
  };

  const pointer = { x: 0.7, y: 0.6, sx: 0.7, sy: 0.6, lens: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = 1 - e.clientY / window.innerHeight;
    pointer.lens = e.pointerType === 'mouse' ? 1 : 0;
  };
  const onLeave = () => (pointer.lens = 0);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  const root = document.documentElement;
  let lens = 0;
  let last = performance.now();
  let frame = 0;
  let tickCount = 0;
  const draw = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    blend();
    const k = opts.still ? 1 : 1 - Math.exp(-dt * 2.4);
    cur.intensity += (target.intensity - cur.intensity) * k;
    cur.cols.forEach((c, i) => c.forEach((v, j) => (c[j] = v + (target.cols[i]![j]! - v) * k)));
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, k * 2.2);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, k * 2.2);
    lens += (pointer.lens - lens) * k;

    gl.uniform1f(uni.time, opts.still ? 40 : now / 1000);
    gl.uniform1f(uni.scroll, (window.scrollY / window.innerHeight) * 0.22);
    gl.uniform2f(uni.pointer, pointer.sx, pointer.sy);
    gl.uniform1f(uni.lens, opts.still ? 0 : lens);
    gl.uniform3fv(uni.a, cur.cols[0]!);
    gl.uniform3fv(uni.b, cur.cols[1]!);
    gl.uniform3fv(uni.c, cur.cols[2]!);
    gl.uniform1f(uni.intensity, cur.intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (tickCount++ % 4 === 0) {
      const css = (c: number[]) => c.map((v) => Math.round(Math.min(1, v) * 255)).join(' ');
      root.style.setProperty('--scene-a', css(cur.cols[0]!));
      root.style.setProperty('--scene-b', css(cur.cols[1]!));
      root.style.setProperty('--scene-c', css(cur.cols[2]!));
    }
  };

  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (document.hidden) return;
    // Weaker devices draw every other frame; the field moves slowly anyway.
    if (!opts.rich && tickCount % 2 === 1) {
      tickCount++;
      return;
    }
    draw(now);
  };

  const onScrollStill = () => draw(performance.now());
  refresh();
  resize();
  window.addEventListener('resize', resize);
  if (opts.still) window.addEventListener('scroll', onScrollStill, { passive: true });
  else frame = requestAnimationFrame(loop);
  canvas.dataset.ready = 'true';

  return {
    refresh,
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScrollStill);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      delete canvas.dataset.ready;
    },
  };
}
