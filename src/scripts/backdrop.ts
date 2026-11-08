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
vec2 rotate2(vec2 p, float angle) {
  float c = cos(angle), s = sin(angle);
  return mat2(c, -s, s, c) * p;
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdCylinder(vec3 p, vec2 h) {
  vec2 d = abs(vec2(length(p.xy), p.z)) - h;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xy) - t.x, p.z)) - t.y; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
vec2 opUnion(vec2 a, vec2 b) { return a.x < b.x ? a : b; }

vec3 modelTransform(vec3 p, float state) {
  float turn = -0.32 + sin(uTime * 0.11) * 0.055 + state * 0.24;
  p.yz *= rot(-0.2 + state * 0.08);
  p.xz *= rot(turn);
  return p;
}

vec2 driveCore(vec3 worldP, float state) {
  vec3 p = modelTransform(worldP, state);
  float split = smoothstep(0.16, 0.5, state);
  float rebuild = smoothstep(0.58, 0.76, state);
  float residue = smoothstep(0.8, 1.0, state);
  float scatter = split * (1.0 - rebuild * 0.78) + abs(uVelocity) * 0.12;
  vec2 scene = vec2(10.0, 0.0);

  // An incomplete casing assembled from offset rails. Deliberately omitting
  // corners keeps the silhouette mechanical without enclosing it in a box.
  vec3 frameP = p - vec3(-0.04 - scatter * 0.18, 0.0, -0.16 - scatter * 0.22);
  scene = opUnion(scene, vec2(sdRoundBox(frameP - vec3(-0.5, -0.12, 0.0), vec3(0.055, 0.47, 0.08), 0.045), 1.0));
  scene = opUnion(scene, vec2(sdRoundBox(frameP - vec3(-0.22, 0.65, 0.035), vec3(0.32, 0.055, 0.075), 0.045), 1.0));
  scene = opUnion(scene, vec2(sdRoundBox(frameP - vec3(0.42, 0.48, -0.025), vec3(0.16, 0.055, 0.07), 0.04), 1.0));
  scene = opUnion(scene, vec2(sdRoundBox(frameP - vec3(0.5, -0.37, 0.025), vec3(0.055, 0.25, 0.08), 0.045), 1.0));
  vec3 lowerRail = frameP - vec3(0.12, -0.65, 0.04);
  lowerRail.xy *= rot(-0.08);
  scene = opUnion(scene, vec2(sdRoundBox(lowerRail, vec3(0.38, 0.055, 0.075), 0.045), 1.0));

  // Three recessed platter rings have distinct depths, so the rear rings are
  // naturally occluded instead of being merged into one mask.
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 rp = p - vec3(0.0 + scatter * (fi - 1.0) * 0.16, 0.02 + scatter * fi * 0.08, 0.08 + fi * 0.105 + scatter * fi * 0.12);
    float ring = sdTorus(rp, vec2(0.365 - fi * 0.018, 0.035));
    scene = opUnion(scene, vec2(ring, 2.0 + fi));
  }

  vec3 hubP = p - vec3(0.0, 0.02, 0.22 + scatter * 0.08);
  scene = opUnion(scene, vec2(sdCylinder(hubP, vec2(0.105, 0.24)), 5.0));
  scene = opUnion(scene, vec2(sdTorus(hubP - vec3(0.0, 0.0, 0.25), vec2(0.105, 0.025)), 6.0));

  // Articulated read-head assembly: pivot, arm and a small separated head.
  vec3 armP = p - vec3(scatter * 0.22, -scatter * 0.16, scatter * 0.2);
  scene = opUnion(scene, vec2(sdCylinder(armP - vec3(0.34, -0.42, 0.24), vec2(0.11, 0.09)), 7.0));
  scene = opUnion(scene, vec2(sdCapsule(armP, vec3(0.34, -0.42, 0.24), vec3(-0.12, 0.16, 0.3), 0.055), 8.0));
  scene = opUnion(scene, vec2(sdRoundBox(armP - vec3(-0.17, 0.22, 0.3), vec3(0.13, 0.07, 0.035), 0.025), 9.0));

  // Suspended circuit and shell fragments create an intentional exploded view.
  vec3 boardP = p - vec3(0.64 + scatter * 0.42, 0.16 + scatter * 0.18, -0.02 + scatter * 0.2);
  boardP.xy *= rot(-0.18 - scatter * 0.3);
  scene = opUnion(scene, vec2(sdRoundBox(boardP, vec3(0.2, 0.42, 0.035), 0.055), 10.0));
  vec3 plateP = p - vec3(-0.48 - scatter * 0.34, 0.64 + scatter * 0.26, 0.12 + scatter * 0.25);
  plateP.xy *= rot(0.36 + scatter * 0.24);
  scene = opUnion(scene, vec2(sdRoundBox(plateP, vec3(0.25, 0.09, 0.04), 0.045), 11.0));

  // Later sections quieten the system without replacing it with unrelated art.
  scene.x += residue * 0.035;
  return scene;
}

vec3 coreNormal(vec3 p, float state) {
  float e = 0.0025;
  vec2 h = vec2(e, 0.0);
  return normalize(vec3(
    driveCore(p + h.xyy, state).x - driveCore(p - h.xyy, state).x,
    driveCore(p + h.yxy, state).x - driveCore(p - h.yxy, state).x,
    driveCore(p + h.yyx, state).x - driveCore(p - h.yyx, state).x
  ));
}

float coreShadow(vec3 p, vec3 lightDir, float state) {
  float shade = 1.0, t = 0.035;
  for (int i = 0; i < 12; i++) {
    float h = driveCore(p + lightDir * t, state).x;
    shade = min(shade, 8.0 * h / t);
    t += clamp(h, 0.025, 0.14);
  }
  return clamp(shade, 0.15, 1.0);
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
    0.825 - smoothstep(0.18, 0.58, state) * 0.14 + securityState * 0.12 + residue * 0.035,
    mix(0.49 + sin(state * 8.0) * 0.025, 0.62, portrait)
  );
  vec2 p = vec2((uv.x - centre.x) * aspect, uv.y - centre.y);
  vec2 pointer = vec2((uPointer.x - centre.x) * aspect, uPointer.y - centre.y);
  vec2 portraitScale = mix(vec2(1.0), vec2(1.82, 1.18), portrait);
  p *= portraitScale;
  pointer *= portraitScale;
  float formScale = mix(1.36, 1.56, smoothstep(0.12, 0.42, state));
  p *= formScale;
  pointer *= formScale;
  vec2 dp = p - pointer;
  p -= dp * exp(-dot(dp, dp) * 11.0) * 0.095 * uLens;

  // Fluid movement bends the camera rays slightly; it no longer substitutes
  // for geometry or erases the intentional silhouette.
  p += (q - 0.5) * mix(0.026, 0.016, state);
  p.y += (sin(p.x * 4.8 + uScroll * 0.34) + sin(p.x * 10.5 - uTime * 0.035) * 0.35) * 0.012;
  p.x -= uVelocity * (0.035 + fracture * 0.075) * (0.35 + abs(p.y));

  // One camera ray is derived from each visible character cell. The returned
  // surface normal, shadow and travel distance choose the glyph and its tone.
  vec2 glyphWarp = (q - 0.5) * 0.48 + vec2(uVelocity * 1.4, time * 0.27 + uScroll * 0.032);
  float densityScale = 1.0 + securityState * 0.12 - fracture * 0.08;
  vec2 gridSize = vec2(${rich ? '112.0' : '78.0'}, ${rich ? '64.0' : '44.0'}) * densityScale;
  vec2 gp = uv * gridSize + glyphWarp;
  vec2 cell = floor(gp);
  vec2 cellUv = fract(gp);
  vec2 cellScreen = (cell + 0.5 - glyphWarp) / gridSize;
  vec2 rayP = vec2((cellScreen.x - centre.x) * aspect, cellScreen.y - centre.y) * portraitScale * formScale;
  rayP += (q - 0.5) * mix(0.026, 0.016, state);
  rayP.y += sin(rayP.x * 4.8 + uScroll * 0.34) * 0.01;
  vec3 rayOrigin = vec3(0.0, 0.0, 3.25);
  vec3 rayDir = normalize(vec3(rayP * 1.62, -2.35));
  float travel = 0.0;
  float material = 0.0;
  float hit = 0.0;
  for (int i = 0; i < ${rich ? 54 : 38}; i++) {
    vec3 sampleP = rayOrigin + rayDir * travel;
    vec2 surface = driveCore(sampleP, state);
    if (surface.x < 0.0035) { hit = 1.0; material = surface.y; break; }
    travel += surface.x * 0.78;
    if (travel > 6.0) break;
  }
  vec3 hitP = rayOrigin + rayDir * travel;
  vec3 normal = hit > 0.5 ? coreNormal(hitP, state) : vec3(0.0, 0.0, 1.0);
  vec3 lightDir = normalize(vec3(-0.52 + q.x * 0.18, 0.66 + q.y * 0.14, 0.92));
  float shadow = hit > 0.5 ? coreShadow(hitP + normal * 0.008, lightDir, state) : 1.0;
  float diffuse = max(dot(normal, lightDir), 0.0) * shadow;
  float rim = hit * pow(1.0 - max(dot(normal, -rayDir), 0.0), 2.25);
  float cavity = smoothstep(3.45, 4.8, travel) * hit;
  float componentTone = 0.04 * sin(material * 2.41);
  float tone = clamp(0.12 + diffuse * 0.67 + rim * 0.22 - cavity * 0.09 + componentTone + ribbon * 0.08, 0.0, 1.0);
  float charIndex = floor(mix(1.0, 13.0, tone));
  if (rim > 0.36) {
    vec2 n = normal.xy;
    if (abs(n.x) > abs(n.y) * 1.55) charIndex = 8.0;
    else if (abs(n.y) > abs(n.x) * 1.55) charIndex = 5.0;
    else charIndex = n.x * n.y > 0.0 ? 6.0 : 7.0;
  }
  vec2 atlasUv = vec2((charIndex + cellUv.x) / ${CHARSET.length}.0, 1.0 - cellUv.y);
  float glyph = texture(uGlyphs, atlasUv).a;
  float cellularDensity = hit * smoothstep(0.05 + fracture * 0.05, 0.18, tone + noise(cell * 0.11) * 0.075);

  float surfaceShade = 0.08 + diffuse * 0.48 + ribbon * 0.12 + rim * 0.22;
  float quietState = smoothstep(0.5, 0.57, state) * (1.0 - smoothstep(0.63, 0.71, state));
  float readability = mix(0.5, 1.0, smoothstep(0.4, 0.64, uv.x));
  float artStrength = mix(1.0, 0.48, smoothstep(0.12, 0.42, state));

  vec3 metal = mix(uA, uC, fluid);
  float steelAccent = smoothstep(6.5, 10.5, material) * 0.18;
  vec3 asciiLight = mix(uC, uB, clamp(diffuse * 0.78 + rim * 0.2 + steelAccent, 0.0, 1.0));
  vec3 colour = vec3(0.008, 0.009, 0.011);
  colour += metal * hit * surfaceShade * (0.09 + uIntensity * 0.09) * artStrength;
  colour += asciiLight * glyph * cellularDensity * (0.28 + tone * 1.05) * mix(1.0, 0.52, quietState) * artStrength;
  colour += uB * rim * (0.08 + ribbon * 0.1) * artStrength;

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
