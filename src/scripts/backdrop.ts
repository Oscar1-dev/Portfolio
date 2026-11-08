// Scroll-independent atmospheric field. It has no section, scroll-position or
// velocity inputs: foreground content owns every scroll-driven interaction.
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const fragment = (rich: boolean) => `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerActive;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.5;
  mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
  for (int i = 0; i < ${rich ? 6 : 4}; i++) {
    value += noise(p) * amplitude;
    p = turn * p * 2.04 + vec2(2.7, 5.1);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.055;

  // Slow nested warps retain the original fluid depth without smoke, particles
  // or a repeating technical texture.
  vec2 q = vec2(
    fbm(p * 1.15 + vec2(t, -t * 0.62)),
    fbm(p * 1.15 + vec2(4.8 - t * 0.44, 1.7 + t * 0.56))
  );
  vec2 r = vec2(
    fbm(p * 1.34 + q * 2.65 + vec2(1.7, 8.2) + t * 0.31),
    fbm(p * 1.34 + q * 2.65 + vec2(8.3, 2.8) - t * 0.27)
  );
  float field = fbm(p * 1.52 + r * 3.0);
  float folds = pow(1.0 - abs(sin(field * 7.2 + r.x * 3.1 - r.y * 1.7)), 5.0);
  float fineFold = pow(1.0 - abs(sin(field * 12.0 - q.y * 4.5)), 10.0);

  // Pointer pressure bends nearby light only. It never changes the cursor or
  // creates a spotlight, and is inactive for touch and reduced-motion modes.
  vec2 pointer = (uPointer - 0.5) * vec2(aspect, 1.0);
  float pointerField = exp(-dot(p - pointer, p - pointer) * 3.4) * uPointerActive;
  folds = mix(folds, pow(folds, 0.72), pointerField * 0.22);

  // Authored pools keep negative space through the editorial left column.
  vec2 pr = (p - vec2(0.46, 0.04)) * vec2(0.78, 1.2);
  vec2 pu = (p - vec2(-0.18, 0.46)) * vec2(1.1, 1.7);
  vec2 pl = (p - vec2(-0.5, -0.48)) * vec2(0.9, 1.5);
  float rightPool = exp(-dot(pr, pr) * 1.8);
  float upperPool = exp(-dot(pu, pu) * 2.2);
  float lowerPool = exp(-dot(pl, pl) * 2.0);
  float composition = rightPool * 0.78 + upperPool * 0.23 + lowerPool * 0.18;
  float leftQuiet = mix(0.42, 1.0, smoothstep(-0.36, 0.28, p.x));

  vec3 black = vec3(0.006, 0.007, 0.009);
  vec3 graphite = vec3(0.095, 0.11, 0.122);
  vec3 steel = vec3(0.24, 0.31, 0.36);
  vec3 warm = vec3(0.39, 0.38, 0.35);
  vec3 colour = black;
  colour += graphite * field * 0.055;
  colour += mix(graphite, steel, clamp(r.x * 0.8 + pointerField * 0.12, 0.0, 1.0))
    * folds * composition * leftQuiet * 0.22;
  colour += warm * fineFold * (upperPool + lowerPool) * 0.018;
  colour += steel * pointerField * folds * 0.018;

  float vignette = smoothstep(1.32, 0.24, length(p * vec2(0.72, 1.08)));
  colour *= mix(0.48, 1.0, vignette);
  colour += (hash(gl_FragCoord.xy + uTime) - 0.5) / 560.0;
  outColor = vec4(1.0 - exp(-colour * 1.18), 1.0);
}`;

export interface BackdropHandle { refresh(): void; dispose(): void; }

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
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment(opts.rich)));
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

  const res = gl.getUniformLocation(program, 'uRes');
  const time = gl.getUniformLocation(program, 'uTime');
  const pointerUniform = gl.getUniformLocation(program, 'uPointer');
  const pointerActive = gl.getUniformLocation(program, 'uPointerActive');
  const scale = opts.rich ? 0.72 : 0.5;
  const pointer = { x: 0.76, y: 0.5, smoothX: 0.76, smoothY: 0.5, active: 0, smoothActive: 0 };
  let frame = 0;
  let last = performance.now();

  const draw = (now: number) => {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    const ease = opts.still ? 1 : 1 - Math.exp(-delta * 3.2);
    pointer.smoothX += (pointer.x - pointer.smoothX) * ease;
    pointer.smoothY += (pointer.y - pointer.smoothY) * ease;
    pointer.smoothActive += (pointer.active - pointer.smoothActive) * ease;
    gl.uniform1f(time, opts.still ? 42 : now / 1000);
    gl.uniform2f(pointerUniform, pointer.smoothX, pointer.smoothY);
    gl.uniform1f(pointerActive, opts.still ? 0 : pointer.smoothActive);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.ready = 'true';
  };
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    if (!document.hidden) draw(now);
  };
  const resize = () => {
    canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
    canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(res, canvas.width, canvas.height);
    draw(performance.now());
  };
  const onPointer = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = 1 - event.clientY / window.innerHeight;
    pointer.active = event.pointerType === 'mouse' ? 1 : 0;
  };
  const onPointerLeave = () => (pointer.active = 0);
  const onVisibility = () => { last = performance.now(); };

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);
  resize();
  if (!opts.still) frame = requestAnimationFrame(loop);

  return {
    refresh: () => draw(performance.now()),
    dispose: () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      delete canvas.dataset.ready;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
