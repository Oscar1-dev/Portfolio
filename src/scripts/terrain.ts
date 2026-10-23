// The background landscape: a field of dots laid out on a floor that runs to
// the horizon. The ground swells in slow waves that flow toward the viewer
// (faster while you scroll), the cursor lifts a ripple where it touches the
// floor, and a signal pulse sweeps away into the distance every few seconds.
// Colours come from the scene's current palette, so the landscape changes
// with each section. Everything moves in the vertex shader: one draw call.
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2 } from 'three';

export interface Terrain {
  points: Points;
  uniforms: {
    uTime: { value: number };
    uFlow: { value: number };
    uWave: { value: number };
    uPointer: { value: Vector2 };
    uPointerAmt: { value: number };
    uPixel: { value: number };
    uColA: { value: Color };
    uColB: { value: Color };
    uColC: { value: Color };
  };
}

export const FLOOR_Y = -2.7;
const WIDTH = 64;
const NEAR = 6;
const FAR = -70;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uFlow;
  uniform float uWave;
  uniform vec2 uPointer;
  uniform float uPointerAmt;
  uniform float uPixel;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  attribute vec2 aGrid;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float x = aGrid.x;
    float z = aGrid.y;
    // The pattern travels toward the camera; the dots stay on their grid,
    // so the motion is seamless.
    float zf = z - uFlow;

    float h = sin(x * 0.21 + zf * 0.17) * 0.9
            + sin(x * 0.07 - zf * 0.11 + uTime * 0.25) * 1.6
            + sin((x + zf) * 0.33 + uTime * 0.6) * 0.25;
    // Ridges: fold the big wave so crests are sharp, like dunes.
    h = h * 0.55 + abs(sin(x * 0.045 + zf * 0.06)) * 1.4;
    // Flat valley down the middle keeps the area under the text calm.
    float valley = smoothstep(2.0, 16.0, abs(x));
    h *= mix(0.35, 1.0, valley) * uWave;

    // Cursor ripple.
    float d = distance(vec2(x, z), uPointer);
    float ripple = sin(d * 1.3 - uTime * 4.0) * exp(-d * 0.22) * 1.1 * uPointerAmt;
    h += ripple;

    // A pulse that sweeps away from the viewer.
    float pulseZ = mod(uTime * 9.0, 90.0);
    float pulse = exp(-pow((-z) - pulseZ + 6.0, 2.0) * 0.05);

    vec3 pos = vec3(x, h, z);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float crest = smoothstep(0.4, 2.6, h);
    float band = 0.5 + 0.5 * sin(x * 0.06 + zf * 0.035 + uTime * 0.15);
    vec3 col = mix(uColA, uColB, band);
    col = mix(col, uColC, crest * 0.7);
    col += vec3(1.0) * pulse * 0.35 + uColC * max(ripple, 0.0) * 0.6;
    vColor = col * 1.25;

    float depth = -mv.z;
    float nearFade = smoothstep(2.0, 7.0, depth);
    float farFade = 1.0 - smoothstep(38.0, 72.0, depth);
    float edge = 1.0 - smoothstep(${(WIDTH / 2 - 8).toFixed(1)}, ${(WIDTH / 2).toFixed(1)}, abs(x));
    vAlpha = nearFade * farFade * edge * (0.5 + crest * 0.8 + pulse * 0.6) * (0.7 + aSeed * 0.6);

    gl_PointSize = uPixel * (1.4 + crest * 1.8 + pulse * 1.4) * (16.0 / depth);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = dot(c, c);
    if (r > 0.25) discard;
    float soft = smoothstep(0.25, 0.05, r);
    gl_FragColor = vec4(vColor * soft, vAlpha * soft);
  }
`;

export function createTerrain(rich: boolean, pixelRatio: number): Terrain {
  const cols = rich ? 190 : 110;
  const rows = rich ? 120 : 70;
  const grid = new Float32Array(cols * rows * 2);
  const seed = new Float32Array(cols * rows);
  // Rows get further apart with distance, so detail sits up close.
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const z = NEAR + (FAR - NEAR) * Math.pow(t, 1.35);
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      grid[i * 2] = (c / (cols - 1) - 0.5) * WIDTH;
      grid[i * 2 + 1] = z;
      seed[i] = Math.random();
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('aGrid', new BufferAttribute(grid, 2));
  geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
  // Three needs a position attribute for bounds; the shader ignores it.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(cols * rows * 3), 3));

  const uniforms: Terrain['uniforms'] = {
    uTime: { value: 0 },
    uFlow: { value: 0 },
    uWave: { value: 1 },
    uPointer: { value: new Vector2(0, -20) },
    uPointerAmt: { value: 0 },
    uPixel: { value: pixelRatio * (rich ? 1.15 : 1.4) },
    uColA: { value: new Color('#ff4d6d') },
    uColB: { value: new Color('#b98cff') },
    uColC: { value: new Color('#8fd3ff') },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.position.y = FLOOR_Y;
  return { points, uniforms };
}
