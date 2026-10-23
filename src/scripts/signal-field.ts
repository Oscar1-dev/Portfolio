// Hero particle field, in raw WebGL2 (a few KB instead of a 3D engine).
// The name is sampled from real text into particles that assemble on load,
// scatter away from the pointer, spring back, and catch a periodic "signal
// sweep" in the foil colours. Original code.
//
// Never blocks content: the <h1> is real text underneath, the canvas is
// decorative (aria-hidden), and this file is only imported when motion is
// allowed, WebGL2 exists and the device isn't a low-power one.

interface Field {
  dispose: () => void;
}

const vertexSource = /* glsl */ `#version 300 es
  in vec2 aPosition;
  in vec3 aColor;
  in float aSize;
  uniform vec2 uHalf;
  uniform float uPixelRatio;
  uniform float uSweep;
  out vec3 vColor;
  out float vGlow;
  void main() {
    gl_Position = vec4(aPosition / uHalf, 0.0, 1.0);
    // The sweep: a soft vertical band moving across the name.
    float d = abs(aPosition.x - uSweep) / (uHalf.x * 0.18);
    vGlow = exp(-d * d);
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * (1.0 + vGlow * 0.9);
  }
`;
const fragmentSource = /* glsl */ `#version 300 es
  precision mediump float;
  in vec3 vColor;
  in float vGlow;
  out vec4 outColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float edge = smoothstep(0.5, 0.18, r);
    vec3 colour = mix(vColor * 0.78, vec3(1.0, 0.95, 0.98), vGlow * 0.55);
    outColor = vec4(colour * edge, edge * (0.72 + vGlow * 0.28));
  }
`;

// Foil stops: infrared → magenta → violet → ice → pearl.
const STOPS = [
  [255, 77, 109],
  [255, 95, 200],
  [185, 140, 255],
  [143, 211, 255],
  [255, 217, 236],
].map((c) => c.map((v) => v / 255));
function foil(t: number): [number, number, number] {
  const x = Math.min(0.9999, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = STOPS[i]!;
  const b = STOPS[i + 1]!;
  return [a[0]! + (b[0]! - a[0]!) * f, a[1]! + (b[1]! - a[1]!) * f, a[2]! + (b[2]! - a[2]!) * f];
}

/** Samples the name into points (CSS pixels, centred, y up). */
async function sample(lines: string[], width: number, height: number, step: number) {
  await document.fonts.load('800 120px "Archivo Variable"').catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const setFont = (px: number) => {
    ctx.font = `800 ${px}px "Archivo Variable", "Archivo", sans-serif`;
    if ('fontStretch' in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = 'expanded';
  };
  // Fit by measuring the real text: widest line at 96% of the field.
  setFont(100);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const size = Math.min((width * 0.96 * 100) / widest, height / (lines.length * 1.02));
  setFont(size);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const lineHeight = size * 0.92;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, height / 2 + (i - (lines.length - 1) / 2) * lineHeight));
  const data = ctx.getImageData(0, 0, width, height).data;
  const points: [number, number][] = [];
  for (let y = 0; y < height; y += step)
    for (let x = 0; x < width; x += step)
      if (data[(y * width + x) * 4 + 3]! > 128)
        points.push([x - width / 2 + (Math.random() - 0.5) * step * 0.6, height / 2 - y + (Math.random() - 0.5) * step * 0.6]);
  return points;
}

function program(gl: WebGL2RenderingContext) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    return shader;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

export async function mountSignalField(host: HTMLElement, lines: string[]): Promise<Field | null> {
  const width = Math.round(host.clientWidth);
  const height = Math.round(host.clientHeight);
  if (!width || !height) return null;

  const canvas = document.createElement('canvas');
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: true, alpha: true });
  if (!gl) return null;
  let shader: WebGLProgram;
  try {
    shader = program(gl);
  } catch {
    return null;
  }

  // Density scales with area so phones stay light and desktops rich.
  const step = Math.max(3, Math.round(Math.sqrt((width * height) / 9000) * 0.95));
  const homes = await sample(lines, width, height, step);
  const count = homes.length;
  if (!count) return null;

  const home = new Float32Array(count * 2);
  const pos = new Float32Array(count * 2);
  const vel = new Float32Array(count * 2);
  const colour = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const [x, y] = homes[i]!;
    home[i * 2] = x;
    home[i * 2 + 1] = y;
    // Start scattered: the name assembles out of noise.
    const a = Math.random() * Math.PI * 2;
    const r = Math.max(width, height) * (0.3 + Math.random() * 0.7);
    pos[i * 2] = x * 0.2 + Math.cos(a) * r;
    pos[i * 2 + 1] = y * 0.2 + Math.sin(a) * r * 0.6;
    colour.set(foil((x + width / 2) / width + (Math.random() - 0.5) * 0.08), i * 3);
    sizes[i] = step * (0.55 + Math.random() * 0.5);
  }

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const attribute = (name: string, data: Float32Array, size: number, usage: number) => {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const loc = gl.getAttribLocation(shader, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return buffer;
  };
  const posBuffer = attribute('aPosition', pos, 2, gl.DYNAMIC_DRAW);
  const colourBuffer = attribute('aColor', colour, 3, gl.STATIC_DRAW);
  const sizeBuffer = attribute('aSize', sizes, 1, gl.STATIC_DRAW);

  gl.useProgram(shader);
  gl.uniform2f(gl.getUniformLocation(shader, 'uHalf'), width / 2, height / 2);
  gl.uniform1f(gl.getUniformLocation(shader, 'uPixelRatio'), pixelRatio);
  const uSweep = gl.getUniformLocation(shader, 'uSweep');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive light
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  host.appendChild(canvas);

  const pointer = { x: 1e6, y: 1e6, active: false };
  const onMove = (e: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointer.x = e.clientX - rect.left - width / 2;
    pointer.y = height / 2 - (e.clientY - rect.top);
    pointer.active = true;
  };
  const onLeave = () => (pointer.active = false);
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  let visible = true;
  let frame = 0;
  const radius = Math.max(70, width * 0.07);
  const started = performance.now();
  let last = started;

  const tick = (now: number) => {
    frame = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const t = (now - started) / 1000;
    // Assembly: springs stiffen over the first ~1.6 s.
    const k = 10 + 22 * Math.min(1, t / 1.6);
    const damping = Math.exp(-6.5 * dt);
    for (let i = 0; i < count; i++) {
      const ix = i * 2;
      const iy = ix + 1;
      let fx = (home[ix]! - pos[ix]!) * k;
      let fy = (home[iy]! - pos[iy]!) * k;
      if (pointer.active) {
        const dx = pos[ix]! - pointer.x;
        const dy = pos[iy]! - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / radius) * 2600;
          fx += (dx / d) * push;
          fy += (dy / d) * push;
        }
      }
      // A breath of motion so the name never looks frozen.
      fx += Math.sin(t * 1.3 + i * 0.37) * 6;
      fy += Math.cos(t * 1.1 + i * 0.21) * 6;
      vel[ix] = (vel[ix]! + fx * dt) * damping;
      vel[iy] = (vel[iy]! + fy * dt) * damping;
      pos[ix] = pos[ix]! + vel[ix]! * dt;
      pos[iy] = pos[iy]! + vel[iy]! * dt;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    // One sweep every 7 s, left to right.
    const cycle = (t % 7) / 7;
    gl.uniform1f(uSweep, -width * 0.7 + cycle * width * 2.4);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
    frame = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  });
  io.observe(host);
  const onVisibility = () => {
    if (!document.hidden && visible && !frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  frame = requestAnimationFrame(tick);

  return {
    dispose() {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteBuffer(posBuffer);
      gl.deleteBuffer(colourBuffer);
      gl.deleteBuffer(sizeBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(shader);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };
}
