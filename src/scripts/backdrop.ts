// Hero artwork: a single decompiled ASCII specimen suspended inside the
// original site's slow, domain-warped fluid light. The glyphs are rendered
// from a real canvas atlas; nothing is drawn as full-screen character noise.

interface Look {
  colours: [string, string, string];
  intensity: number;
  /** 0 = hero specimen; 1 = quiet background. */
  mode: number;
}

const LOOKS: Record<string, Look> = {
  hero: { colours: ['#313940', '#ece8df', '#8198aa'], intensity: 1, mode: 0 },
  statement: { colours: ['#252a2e', '#bfc5c4', '#71899b'], intensity: 0.28, mode: 0.36 },
  kush: { colours: ['#25282d', '#d6d1c8', '#778b9a'], intensity: 0.22, mode: 0.48 },
  work: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.16, mode: 0.94 },
  experience: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.14, mode: 0.94 },
  security: { colours: ['#282426', '#cbbeb5', '#778d9d'], intensity: 0.2, mode: 0.68 },
  archive: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.12, mode: 0.94 },
  stack: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.12, mode: 0.94 },
  contact: { colours: ['#24272a', '#ded9d0', '#8198aa'], intensity: 0.18, mode: 0.94 },
  page: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.14, mode: 1 },
  case: { colours: ['#24272a', '#d2cec5', '#8198aa'], intensity: 0.14, mode: 1 },
  detail: { colours: ['#202429', '#c8c5bd', '#71889a'], intensity: 0.14, mode: 1 },
};

const CHARSET = ' .:-=+*#%@01<>[]';
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

float specimen(vec2 p) {
  // An elongated, asymmetric slab of decompiled matter. Three overlapping
  // volumes form one continuous silhouette without suggesting a face.
  float core = sdEllipse(p - vec2(0.015, 0.02), vec2(0.14, 0.50));
  float upper = sdEllipse(p - vec2(-0.055, 0.36), vec2(0.105, 0.23));
  float lower = sdEllipse(p - vec2(0.055, -0.39), vec2(0.115, 0.25));
  return min(core, min(upper, lower));
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

  vec2 centre = vec2(0.88, 0.50);
  vec2 p = vec2((uv.x - centre.x) * aspect, uv.y - centre.y);
  vec2 pointer = vec2((uPointer.x - centre.x) * aspect, uPointer.y - centre.y);
  float portrait = 1.0 - smoothstep(0.72, 0.9, aspect);
  float portraitScale = mix(1.0, 1.34, portrait);
  p *= portraitScale;
  pointer *= portraitScale;
  vec2 dp = p - pointer;
  p -= dp * exp(-dot(dp, dp) * 12.0) * 0.11 * uLens;

  // Fluid deformation bends the sculpture without destroying its silhouette.
  p += (q - 0.5) * 0.032;
  p.x += (sin(p.y * 5.2 + uScroll * 0.34) + sin(p.y * 11.0 - uTime * 0.035) * 0.35) * 0.014 * (1.0 - uMode);
  float sdf = specimen(p);
  float mask = smoothstep(0.008, -0.006, sdf);
  float rim = smoothstep(0.018, 0.0, abs(sdf));

  // Characters live only on the specimen. Their density follows its fluid
  // illumination, making the surface dissolve and reform as one object.
  vec2 glyphWarp = (q - 0.5) * 0.55 + vec2(0.0, time * 0.32 + uScroll * 0.035);
  vec2 gridSize = vec2(${rich ? '94.0' : '70.0'}, ${rich ? '54.0' : '42.0'});
  vec2 gp = uv * gridSize + glyphWarp;
  vec2 cell = floor(gp);
  vec2 cellUv = fract(gp);
  float depth = clamp(-sdf * 4.5 + fluid * 0.72 + ribbon * 0.24, 0.0, 1.0);
  float charIndex = floor(clamp(depth * 15.0 + (hash(cell) - 0.5) * 2.0, 0.0, 15.0));
  vec2 atlasUv = vec2((charIndex + cellUv.x) / 16.0, 1.0 - cellUv.y);
  float glyph = texture(uGlyphs, atlasUv).a;

  float surfaceShade = 0.18 + ribbon * 0.56 + fluid * 0.28;
  // The ASCII sculpture belongs to the hero only. It dissolves completely before
  // the next composition arrives instead of following the user down the page.
  float specimenFade = 1.0 - smoothstep(0.08, 0.32, uMode);
  float leftSpace = smoothstep(0.43, 0.6, uv.x);

  vec3 metal = mix(uA, uC, fluid);
  vec3 asciiLight = mix(uC, uB, ribbon * 0.8 + depth * 0.2);
  vec3 colour = vec3(0.008, 0.009, 0.011);
  colour += metal * mask * surfaceShade * 0.18 * specimenFade;
  colour += asciiLight * glyph * mask * (0.42 + depth * 0.94) * specimenFade;
  colour += uB * rim * (0.16 + ribbon * 0.28) * specimenFade;

  // One soft pool of reflected light gives the sculpture dimensional depth;
  // outside the hero it fades to near-black rather than becoming another effect.
  float halo = exp(-dot(p * vec2(0.76, 1.0), p * vec2(0.76, 1.0)) * 8.0);
  colour += mix(uA, uC, fluid) * halo * ribbon * 0.13 * specimenFade;
  // Broad fluid illumination fills the hero behind the ASCII form. It stays
  // deliberately low contrast around the name, but avoids an empty black void.
  float heroVeil = (0.03 + ribbon * 0.078 + pow(fluid, 3.0) * 0.04) * specimenFade;
  float veilShape = 0.45 + 0.55 * smoothstep(0.05, 0.92, uv.x + q.y * 0.18);
  colour += mix(uA, uC, fluid) * heroVeil * veilShape;
  colour += uB * pow(ribbon, 2.0) * 0.019 * specimenFade;
  colour += uC * ribbon * 0.012 * uIntensity * (1.0 - specimenFade);

  // The rest of the page uses two restrained supporting compositions. The
  // opening statement/KUSH transition gets a broad fluid material fold; the
  // security section gets a sparse memory-map cross-section. Neither is a
  // second full-screen character field.
  float matterPresence = (1.0 - smoothstep(0.13, 0.3, abs(uMode - 0.43))) * (1.0 - specimenFade);
  vec2 matterP = vec2((uv.x - 0.72) * aspect, uv.y - 0.5);
  float matterBody = exp(-dot(matterP * vec2(0.72, 1.35), matterP * vec2(0.72, 1.35)) * 2.6);
  float matterFold = pow(clamp(1.0 - abs(sin((fluid + r.y * 0.55) * 8.0)), 0.0, 1.0), 7.0);
  colour += mix(uA, uC, fluid) * matterBody * (0.025 + matterFold * 0.075) * matterPresence;

  float memoryPresence = (1.0 - smoothstep(0.055, 0.16, abs(uMode - 0.68))) * (1.0 - specimenFade);
  vec2 memoryP = vec2((uv.x - 0.78) * aspect, uv.y - 0.5);
  float memoryFrame = smoothstep(0.012, 0.002, abs(sdBox(memoryP, vec2(0.24, 0.28))));
  float row = floor((memoryP.y + 0.24) * 15.0);
  float rowBand = step(0.72, fract((memoryP.y + 0.24) * 15.0));
  float addressRail = smoothstep(0.012, 0.0, abs(memoryP.x + 0.19));
  float dataRail = smoothstep(0.012, 0.0, abs(memoryP.x - 0.07));
  float memoryBounds = step(abs(memoryP.x), 0.24) * step(abs(memoryP.y), 0.28);
  float memoryLines = (addressRail * 0.8 + dataRail * 0.45 + rowBand * 0.3) * memoryBounds;
  float memoryPulse = 0.55 + 0.45 * sin(row * 1.7 + uTime * 0.32 + fluid * 3.0);
  colour += mix(uC, uB, 0.28) * (memoryFrame * 0.08 + memoryLines * memoryPulse * 0.035) * memoryPresence;
  colour *= mix(0.58, 1.0, leftSpace);

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

    gl.uniform1f(u.time, opts.still ? 38 : now / 1000);
    gl.uniform1f(u.scroll, window.scrollY / window.innerHeight);
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
