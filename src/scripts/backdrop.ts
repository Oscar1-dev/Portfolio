// One procedural ASCII sculpture evolves through the whole site. The original
// domain-warped fluid field supplies movement and light; a depth surface drives
// glyph weight and contour direction, so the characters describe a form rather
// than filling a rectangular mask.

interface Look {
  colours: [string, string, string];
  intensity: number;
  /** 0 = suspended sculpture; 1 = settled remnant. */
  mode: number;
}

const LOOKS: Record<string, Look> = {
  hero: { colours: ['#313940', '#ece8df', '#8198aa'], intensity: 1, mode: 0 },
  statement: { colours: ['#252a2e', '#c9c5bd', '#71899b'], intensity: 0.42, mode: 0.16 },
  kush: { colours: ['#25282d', '#d6d1c8', '#778b9a'], intensity: 0.38, mode: 0.3 },
  work: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.32, mode: 0.46 },
  experience: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.24, mode: 0.58 },
  security: { colours: ['#282426', '#d2cbc2', '#778d9d'], intensity: 0.4, mode: 0.72 },
  archive: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.24, mode: 0.84 },
  stack: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.22, mode: 0.91 },
  contact: { colours: ['#24272a', '#ded9d0', '#8198aa'], intensity: 0.26, mode: 1 },
  page: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.22, mode: 0.9 },
  case: { colours: ['#24272a', '#d2cec5', '#8198aa'], intensity: 0.25, mode: 0.34 },
  detail: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.22, mode: 0.48 },
};

// Ordered mostly by visual weight. Directional strokes occupy 5–8 and are
// selected from the surface normal along silhouettes.
const CHARSET = ' .,:;-/\\|+*#%@01';
const GLYPH_SIZE = 64;

function createGlyphAtlas(gl: WebGL2RenderingContext): WebGLTexture {
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_SIZE * CHARSET.length;
  canvas.height = GLYPH_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `600 44px "IBM Plex Mono", "Cascadia Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < CHARSET.length; i++) {
    ctx.fillText(CHARSET[i]!, i * GLYPH_SIZE + GLYPH_SIZE / 2, GLYPH_SIZE / 2 + 1);
  }
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  return texture;
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const frag = (rich: boolean) => `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform float uVelocity;
uniform vec2 uPointer;
uniform float uLens;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform float uIntensity;
uniform float uMode;
uniform sampler2D uGlyphs;
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
  for (int i = 0; i < ${rich ? 5 : 3}; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
float sdEllipse(vec2 p, vec2 radius) {
  return (length(p / radius) - 1.0) * min(radius.x, radius.y);
}
float sdBox(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

vec2 rotate2(vec2 p, float angle) {
  float c = cos(angle), s = sin(angle);
  return mat2(c, -s, s, c) * p;
}

float ellipseDepth(vec2 p, vec2 radius, float crown) {
  float d = dot(p / radius, p / radius);
  return sqrt(max(0.0, 1.0 - d)) * crown;
}

float sculptureDepth(vec2 p, float state) {
  // Section transitions are continuous envelopes rather than hard scene cuts.
  float plates = smoothstep(0.1, 0.29, state) * (1.0 - smoothstep(0.34, 0.5, state));
  float fracture = smoothstep(0.31, 0.49, state) * (1.0 - smoothstep(0.59, 0.73, state));
  float rebuild = smoothstep(0.56, 0.72, state) * (1.0 - smoothstep(0.78, 0.9, state));
  float residue = smoothstep(0.78, 1.0, state);

  // Five authored volumes form a hooked, folded object in the hero. They
  // flatten for KUSH, separate through Work, become skeletal for Experience,
  // and reconstruct vertically around Security before dispersing to a remnant.
  vec2 a = vec2(-0.24, 0.08) + vec2(-0.05, 0.05) * plates + vec2(-0.2, 0.14) * fracture + vec2(0.2, 0.18) * rebuild + vec2(-0.16, 0.08) * residue;
  vec2 b = vec2(-0.01, 0.025) + vec2(0.05, -0.04) * plates + vec2(0.02, -0.18) * fracture + vec2(-0.1, 0.13) * rebuild + vec2(0.18, -0.12) * residue;
  vec2 c = vec2(0.27, -0.025) + vec2(0.1, 0.05) * plates + vec2(0.22, 0.13) * fracture + vec2(-0.18, -0.12) * rebuild + vec2(0.32, 0.14) * residue;
  vec2 d = vec2(-0.02, -0.105) + vec2(-0.08, -0.07) * plates + vec2(-0.12, -0.2) * fracture + vec2(0.11, -0.18) * rebuild + vec2(-0.28, -0.12) * residue;
  vec2 e = vec2(0.08, 0.135) + vec2(0.13, 0.02) * plates + vec2(0.12, 0.22) * fracture + vec2(0.0, 0.26) * rebuild + vec2(0.09, 0.24) * residue;

  float turn = rebuild * 1.15;
  float da = ellipseDepth(rotate2(p - a, -0.28 + turn), vec2(0.34, 0.1), 0.78);
  float db = ellipseDepth(rotate2(p - b, 0.12 - turn * 0.45), vec2(0.38, 0.15), 1.0);
  float dc = ellipseDepth(rotate2(p - c, -0.22 + turn * 0.6), vec2(0.28, 0.085), 0.68);
  float dd = ellipseDepth(rotate2(p - d, 0.34 - turn * 0.25), vec2(0.28, 0.07), 0.58);
  float de = ellipseDepth(rotate2(p - e, -0.5 + turn * 0.2), vec2(0.21, 0.06), 0.52);

  // Experience retains a fine structural skeleton; later states become more
  // open without allowing the artwork to disappear completely.
  float quiet = 1.0 - smoothstep(0.5, 0.6, state) * (1.0 - smoothstep(0.62, 0.72, state)) * 0.38;
  float finalScale = mix(1.0, 0.7, residue);
  return max(max(da, db), max(max(dc, dd), de)) * quiet * finalScale;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  float aspect = uRes.x / uRes.y;
  float time = uTime * 0.045;

  // Preserve the original organic movement: two nested domain warps produce
  // broad, slow light rather than particles or a repeating digital texture.
  vec2 world = vec2(uv.x * aspect, uv.y) * 1.45;
  vec2 q = vec2(fbm(world + vec2(0.0, time)), fbm(world + vec2(5.2, 1.3) - time));
  vec2 r = vec2(fbm(world + 2.8 * q + vec2(1.7, 9.2) + time), fbm(world + 2.8 * q + vec2(8.3, 2.8) - time));
  float fluid = fbm(world + 2.35 * r + vec2(0.0, uScroll * 0.22));
  float ribbon = pow(1.0 - abs(sin(fluid * 6.4 + r.x * 2.7)), 4.0);

  float state = uMode;
  float portrait = 1.0 - smoothstep(0.72, 0.9, aspect);
  float fracture = smoothstep(0.31, 0.49, state) * (1.0 - smoothstep(0.59, 0.73, state));
  float securityState = 1.0 - smoothstep(0.07, 0.15, abs(state - 0.72));
  float residue = smoothstep(0.78, 1.0, state);
  vec2 centre = vec2(
    0.86 - smoothstep(0.18, 0.58, state) * 0.17 + securityState * 0.17 + residue * 0.03,
    mix(0.43 + sin(state * 8.0) * 0.035, 0.59, portrait)
  );
  vec2 p = vec2((uv.x - centre.x) * aspect, uv.y - centre.y);
  vec2 pointer = vec2((uPointer.x - centre.x) * aspect, uPointer.y - centre.y);
  vec2 portraitScale = mix(vec2(1.0), vec2(1.82, 1.18), portrait);
  p *= portraitScale;
  pointer *= portraitScale;
  float formScale = mix(1.12, 1.38, smoothstep(0.12, 0.42, state));
  p *= formScale;
  pointer *= formScale;
  vec2 dp = p - pointer;
  p -= dp * exp(-dot(dp, dp) * 11.0) * 0.095 * uLens;

  // Fluid displacement is shared by every state. Scroll speed briefly pulls
  // the form apart, then the smoothed velocity returns it to rest.
  p += (q - 0.5) * mix(0.038, 0.024, state);
  p.y += (sin(p.x * 4.8 + uScroll * 0.34) + sin(p.x * 10.5 - uTime * 0.035) * 0.35) * 0.012;
  p.x -= uVelocity * (0.035 + fracture * 0.075) * (0.35 + abs(p.y));
  float depth = sculptureDepth(p, state);
  float mask = smoothstep(0.018, 0.07, depth);
  float rim = (1.0 - smoothstep(0.04, 0.13, depth)) * mask;
  vec3 normal = normalize(vec3(-dFdx(depth) * 10.0, -dFdy(depth) * 10.0, 0.72));
  vec3 lightDir = normalize(vec3(-0.48 + q.x * 0.24, 0.58 + q.y * 0.18, 0.88));
  float diffuse = clamp(dot(normal, lightDir), 0.0, 1.0);
  float fresnel = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.2);

  // Glyph weight follows the lit depth surface. Stable per-cell variation is
  // deliberately subtle; shape, normals and light—not randomness—do the work.
  vec2 glyphWarp = (q - 0.5) * 0.48 + vec2(uVelocity * 1.4, time * 0.27 + uScroll * 0.032);
  float densityScale = 1.0 + securityState * 0.12 - fracture * 0.08;
  vec2 gridSize = vec2(${rich ? '96.0' : '72.0'}, ${rich ? '56.0' : '42.0'}) * densityScale;
  vec2 gp = uv * gridSize + glyphWarp;
  vec2 cell = floor(gp);
  vec2 cellUv = fract(gp);
  float tone = clamp(depth * 0.58 + diffuse * 0.52 + ribbon * 0.16 + (hash(cell) - 0.5) * 0.055, 0.0, 1.0);
  float charIndex = floor(mix(1.0, 13.0, tone));
  if (rim > 0.42) {
    vec2 n = normal.xy;
    if (abs(n.x) > abs(n.y) * 1.55) charIndex = 8.0;
    else if (abs(n.y) > abs(n.x) * 1.55) charIndex = 5.0;
    else charIndex = n.x * n.y > 0.0 ? 6.0 : 7.0;
  }
  vec2 atlasUv = vec2((charIndex + cellUv.x) / ${CHARSET.length}.0, 1.0 - cellUv.y);
  float glyph = texture(uGlyphs, atlasUv).a;
  float cellularDensity = smoothstep(0.02 + fracture * 0.055, 0.13, depth + noise(cell * 0.11) * 0.055);

  float surfaceShade = 0.12 + diffuse * 0.52 + ribbon * 0.24 + fresnel * 0.28;
  float quietState = smoothstep(0.5, 0.57, state) * (1.0 - smoothstep(0.63, 0.71, state));
  float readability = mix(0.5, 1.0, smoothstep(0.4, 0.64, uv.x));
  float artStrength = mix(1.0, 0.48, smoothstep(0.12, 0.42, state));

  vec3 metal = mix(uA, uC, fluid);
  vec3 asciiLight = mix(uC, uB, clamp(diffuse * 0.7 + depth * 0.28 + ribbon * 0.16, 0.0, 1.0));
  vec3 colour = vec3(0.008, 0.009, 0.011);
  colour += metal * mask * surfaceShade * (0.12 + uIntensity * 0.12) * artStrength;
  colour += asciiLight * glyph * mask * cellularDensity * (0.3 + tone * 0.95) * mix(1.0, 0.52, quietState) * artStrength;
  colour += uB * rim * (0.09 + fresnel * 0.22 + ribbon * 0.12) * artStrength;

  // The original smoke becomes reflected atmosphere around the form instead
  // of the only thing left after the hero.
  float halo = exp(-dot(p * vec2(0.72, 1.35), p * vec2(0.72, 1.35)) * 3.7);
  colour += mix(uA, uC, fluid) * halo * (0.025 + ribbon * (0.055 + uIntensity * 0.08));
  float veil = 0.014 + ribbon * (0.025 + uIntensity * 0.04) + pow(fluid, 3.0) * 0.018;
  colour += mix(uA, uC, fluid) * veil * (0.45 + 0.55 * smoothstep(0.04, 0.94, uv.x + q.y * 0.16));

  // Security annotations are tied to the reconstructed object: a few address
  // rails and scan rows, not a generic full-screen data texture.
  vec2 memoryP = vec2((uv.x - centre.x) * aspect, uv.y - centre.y);
  float row = floor((memoryP.y + 0.32) * 18.0);
  float rowBand = smoothstep(0.87, 0.98, fract((memoryP.y + 0.32) * 18.0));
  float bounds = step(abs(memoryP.x), 0.48) * step(abs(memoryP.y), 0.34);
  float addressRail = smoothstep(0.009, 0.001, abs(memoryP.x + 0.43));
  float dataRail = smoothstep(0.009, 0.001, abs(memoryP.x - 0.37));
  float memoryPulse = 0.45 + 0.55 * sin(row * 1.7 + uTime * 0.22 + fluid * 3.0);
  float annotations = (addressRail * 0.7 + dataRail * 0.45 + rowBand * 0.16) * bounds;
  colour += mix(uC, uB, 0.24) * annotations * memoryPulse * 0.11 * securityState;
  colour *= readability;

  float vignette = smoothstep(1.2, 0.22, length((uv - vec2(0.56, 0.52)) * vec2(0.88, 1.18)));
  colour *= mix(0.38, 1.0, vignette);
  colour += (hash(frag + uTime) - 0.5) / 420.0;
  outColor = vec4(1.0 - exp(-colour * 1.28), 1.0);
}`;

export interface BackdropHandle {
  refresh(): void;
  dispose(): void;
}

const hex = (value: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as [number, number, number];

export function mountBackdrop(canvas: HTMLCanvasElement, opts: { rich: boolean; still: boolean }): BackdropHandle | null {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    powerPreference: opts.rich ? 'high-performance' : 'low-power',
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    return shader;
  };
  const program = gl.createProgram()!;
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag(opts.rich)));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
  } catch (error) {
    console.warn('backdrop disabled:', error);
    return null;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const glyphTexture = createGlyphAtlas(gl);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, glyphTexture);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    res: uniform('uRes'),
    time: uniform('uTime'),
    scroll: uniform('uScroll'),
    velocity: uniform('uVelocity'),
    pointer: uniform('uPointer'),
    lens: uniform('uLens'),
    a: uniform('uA'),
    b: uniform('uB'),
    c: uniform('uC'),
    intensity: uniform('uIntensity'),
    mode: uniform('uMode'),
    glyphs: uniform('uGlyphs'),
  };
  gl.uniform1i(u.glyphs, 0);

  const scale = opts.rich ? 0.72 : 0.5;
  const resize = () => {
    canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
    canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    if (opts.still) draw(performance.now());
  };

  let sections: { el: HTMLElement; look: Look }[] = [];
  const refresh = () => {
    sections = [...document.querySelectorAll<HTMLElement>('[data-scene]')].map((el) => ({
      el,
      look: LOOKS[el.dataset.scene ?? 'page'] ?? LOOKS.page!,
    }));
    if (opts.still) draw(performance.now());
  };
  const current = {
    colours: LOOKS.hero!.colours.map(hex),
    intensity: LOOKS.hero!.intensity,
    mode: LOOKS.hero!.mode,
  };
  const target = {
    colours: current.colours.map((colour) => [...colour] as [number, number, number]),
    intensity: current.intensity,
    mode: current.mode,
  };
  const blend = () => {
    const viewport = window.innerHeight;
    let total = 0;
    let intensity = 0;
    let mode = 0;
    const colours = [0, 0, 0].map(() => [0, 0, 0]);
    for (const { el, look } of sections) {
      const rect = el.getBoundingClientRect();
      const weight = Math.max(0, 1 - Math.abs(rect.top + rect.height / 2 - viewport / 2) / (viewport * 0.5 + rect.height * 0.5)) ** 2;
      if (!weight) continue;
      total += weight;
      intensity += look.intensity * weight;
      mode += look.mode * weight;
      look.colours.forEach((value, i) => hex(value).forEach((channel, j) => (colours[i]![j]! += channel * weight)));
    }
    if (!total) return;
    target.intensity = intensity / total;
    target.mode = mode / total;
    colours.forEach((colour, i) => colour.forEach((channel, j) => (target.colours[i]![j] = channel / total)));
  };

  const pointer = { x: 0.73, y: 0.48, smoothX: 0.73, smoothY: 0.48, lens: 0 };
  const onPointer = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = 1 - event.clientY / window.innerHeight;
    pointer.lens = event.pointerType === 'mouse' ? 1 : 0;
  };
  const onLeave = () => (pointer.lens = 0);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  const root = document.documentElement;
  let lens = 0;
  let last = performance.now();
  let lastScrollY = window.scrollY;
  let scrollVelocity = 0;
  let frame = 0;
  let tick = 0;
  const draw = (now: number) => {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    blend();
    const easing = opts.still ? 1 : 1 - Math.exp(-delta * 2.35);
    current.intensity += (target.intensity - current.intensity) * easing;
    current.mode += (target.mode - current.mode) * easing;
    current.colours.forEach((colour, i) =>
      colour.forEach((channel, j) => (colour[j] = channel + (target.colours[i]![j]! - channel) * easing)),
    );
    pointer.smoothX += (pointer.x - pointer.smoothX) * Math.min(1, easing * 2.1);
    pointer.smoothY += (pointer.y - pointer.smoothY) * Math.min(1, easing * 2.1);
    lens += (pointer.lens - lens) * easing;
    const scrollY = window.scrollY;
    const velocityTarget = opts.still
      ? 0
      : Math.max(-1, Math.min(1, (scrollY - lastScrollY) / Math.max(1, delta * 900)));
    scrollVelocity += (velocityTarget - scrollVelocity) * (1 - Math.exp(-delta * 10));
    lastScrollY = scrollY;

    gl.uniform1f(u.time, opts.still ? 38 : now / 1000);
    gl.uniform1f(u.scroll, scrollY / window.innerHeight);
    gl.uniform1f(u.velocity, scrollVelocity);
    gl.uniform2f(u.pointer, pointer.smoothX, pointer.smoothY);
    gl.uniform1f(u.lens, opts.still ? 0 : lens);
    gl.uniform3fv(u.a, current.colours[0]!);
    gl.uniform3fv(u.b, current.colours[1]!);
    gl.uniform3fv(u.c, current.colours[2]!);
    gl.uniform1f(u.intensity, current.intensity);
    gl.uniform1f(u.mode, current.mode);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (tick++ % 4 === 0) {
      const css = (colour: number[]) => colour.map((value) => Math.round(Math.min(1, value) * 255)).join(' ');
      root.style.setProperty('--scene-a', css(current.colours[0]!));
      root.style.setProperty('--scene-b', css(current.colours[1]!));
      root.style.setProperty('--scene-c', css(current.colours[2]!));
    }
  };
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (document.hidden) return;
    if (!opts.rich && tick % 2 === 1) {
      tick++;
      return;
    }
    draw(now);
  };
  const drawStill = () => draw(performance.now());

  refresh();
  resize();
  window.addEventListener('resize', resize);
  if (opts.still) window.addEventListener('scroll', drawStill, { passive: true });
  else frame = requestAnimationFrame(loop);
  canvas.dataset.ready = 'true';

  return {
    refresh,
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', drawStill);
      gl.deleteTexture(glyphTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      delete canvas.dataset.ready;
    },
  };
}
