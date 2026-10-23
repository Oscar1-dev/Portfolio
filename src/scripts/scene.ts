// The site's 3D environment: a faceted holographic crystal with a lattice
// core floating over a landscape of dots (terrain.ts). The crystal shatters
// into shards when you scroll fast or bring the cursor near it, then pulls
// itself back together; lights and camera follow the pointer. It travels
// through the page as you scroll. Each section declares where the prism should be and how it should
// look (data-scene="hero" etc.); the scene blends between the states of the
// sections in view, so the environment evolves instead of cutting.
//
// Loaded lazily, only with motion allowed and WebGL2 available. Weaker devices
// render at a lower pixel ratio without antialiasing. Paused whenever the tab is hidden.
import {
  ACESFilmicToneMapping,
  BackSide,
  DoubleSide,
  BufferAttribute,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { onScrollTick } from './scroll-fx';
import { createTerrain, FLOOR_Y } from './terrain';

type Palette = 'signal' | 'kush' | 'alert' | 'ice' | 'aurora' | 'ember';
interface State {
  /** Horizontal position, −1 (left edge) … 1 (right edge). */
  x: number;
  /** Vertical position, −1 (bottom) … 1 (top). */
  y: number;
  z: number;
  scale: number;
  spin: number;
  /** 0 → wireframe lattice only, 1 → full glass shell. */
  glass: number;
  /** Height of the landscape's waves. */
  wave: number;
  palette: Palette;
}

const STATES: Record<string, State> = {
  hero: { x: 0.66, y: -0.22, z: -1, scale: 1.05, spin: 0.22, glass: 1, wave: 1.15, palette: 'signal' },
  statement: { x: 0.72, y: -0.05, z: -4, scale: 1.5, spin: 0.08, glass: 0.25, wave: 0.45, palette: 'ember' },
  kush: { x: -0.62, y: -0.05, z: -0.5, scale: 0.95, spin: 0.16, glass: 1, wave: 0.8, palette: 'kush' },
  work: { x: 0.78, y: 0.5, z: -2.5, scale: 0.7, spin: 0.12, glass: 0.8, wave: 1, palette: 'ice' },
  experience: { x: 0.55, y: 0.05, z: -2, scale: 1.3, spin: 0.06, glass: 1, wave: 0.7, palette: 'signal' },
  security: { x: -0.7, y: 0.25, z: -1, scale: 1, spin: 0.3, glass: 0.15, wave: 1.6, palette: 'alert' },
  archive: { x: 0.95, y: 0.6, z: -5, scale: 0.6, spin: 0.1, glass: 0.6, wave: 0.9, palette: 'aurora' },
  stack: { x: 0.95, y: -0.65, z: -5, scale: 0.6, spin: 0.1, glass: 0.7, wave: 1.1, palette: 'aurora' },
  contact: { x: 0.6, y: 0.05, z: -1.5, scale: 1.2, spin: 0.35, glass: 1, wave: 1.35, palette: 'signal' },
  page: { x: 0.68, y: 0.45, z: -1.5, scale: 0.75, spin: 0.14, glass: 1, wave: 0.9, palette: 'signal' },
  case: { x: 0.7, y: 0.3, z: -1, scale: 0.9, spin: 0.14, glass: 1, wave: 0.8, palette: 'kush' },
  detail: { x: 0.82, y: 0.2, z: -3, scale: 0.7, spin: 0.1, glass: 0.7, wave: 0.9, palette: 'ice' },
};

const PALETTES: Record<Palette, [string, string, string]> = {
  // primary, secondary, highlight
  signal: ['#ff4d6d', '#ff5fc8', '#8fd3ff'],
  kush: ['#cbbcff', '#f6c3ea', '#b4f0d9'],
  alert: ['#ff3355', '#ff7a45', '#b98cff'],
  ice: ['#5fb8ff', '#b98cff', '#ffd9ec'],
  aurora: ['#3dffc5', '#5fb8ff', '#b98cff'],
  ember: ['#ff7a45', '#ff4d6d', '#ffd9ec'],
};

export interface SceneHandle {
  dispose(): void;
  /** Re-read the page's [data-scene] sections (after a client-side navigation). */
  refresh(): void;
}

export function mountScene(canvas: HTMLCanvasElement, rich: boolean): SceneHandle | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: rich, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, rich ? 1.6 : 1.25);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(studio(), 0.02).texture;
  scene.environment = env;

  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // ---- the prism
  const prism = new Group();
  scene.add(prism);
  // A mirrored, iridescent crystal: each facet reflects a different strip of
  // the studio, so it reads as holographic foil. (Real-time transmission was
  // tried; on a near-black page refraction has nothing to bend and reads as
  // grey plastic, and it costs an extra scene pass per frame.)
  const shellMaterial = new MeshPhysicalMaterial({
    color: 0xb8b4c8,
    roughness: 0.16,
    metalness: 1,
    iridescence: 1,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [180, 820],
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    flatShading: true,
    transparent: true,
    opacity: 1,
    envMapIntensity: 1.4,
  });
  const shellGeometry = shardGeometry(new IcosahedronGeometry(1.6, 1));
  const explode = { value: 0 };
  const clock = { value: 0 };
  shellMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uExplode = explode;
    shader.uniforms.uTime = clock;
    shader.vertexShader =
      'attribute vec3 aCentroid;\nattribute float aRand;\nuniform float uExplode;\nuniform float uTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // Each facet is its own shard: it flies out along its normal, shrinks
        // about its centre and tumbles a little, by its own random amount.
        float e = uExplode * (0.4 + aRand * 1.1);
        vec3 dir = normalize(aCentroid);
        vec3 local = transformed - aCentroid;
        float a = e * (aRand - 0.5) * 2.4;
        float ca = cos(a), sa = sin(a);
        local = vec3(local.x * ca - local.z * sa, local.y, local.x * sa + local.z * ca);
        transformed = aCentroid + dir * (e * 1.15 + sin(uTime * 1.3 + aRand * 6.28) * 0.012) + local * (1.0 - e * 0.28);`,
      );
  };
  const shell = new Mesh(shellGeometry, shellMaterial);
  prism.add(shell);

  const lattice = new LineSegments(
    new EdgesGeometry(new IcosahedronGeometry(1.02, 1)),
    new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
  );
  prism.add(lattice);
  const outline = new LineSegments(
    new EdgesGeometry(new IcosahedronGeometry(1.62, 1)),
    new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  );
  prism.add(outline);
  const coreMaterial = new MeshBasicMaterial({ color: 0xff5fc8, wireframe: true, transparent: true, opacity: 0.9 });
  const core = new Mesh(new IcosahedronGeometry(0.3, 0), coreMaterial);
  prism.add(core);

  // ---- lights that follow the cursor
  const key = new PointLight(0xff4d6d, 40, 30, 1.6);
  const rim = new PointLight(0x8fd3ff, 30, 30, 1.6);
  key.position.set(3, 2, 5);
  rim.position.set(-4, -2, 3);
  scene.add(key, rim);

  // ---- the landscape
  const terrain = createTerrain(rich, dpr);
  scene.add(terrain.points);

  // ---- state blending
  let sections: { el: HTMLElement; state: State }[] = [];
  const refresh = () => {
    sections = [...document.querySelectorAll<HTMLElement>('[data-scene]')].map((el) => ({
      el,
      state: STATES[el.dataset.scene ?? 'page'] ?? STATES.page!,
    }));
  };
  refresh();

  const current = { ...STATES.hero!, ...(sections[0]?.state ?? STATES.page!) };
  const colours = PALETTES[current.palette].map((c) => new Color(c));
  const target = { ...current };
  const targetColours = colours.map((c) => c.clone());

  const blend = () => {
    const vh = window.innerHeight;
    let total = 0;
    const acc = { x: 0, y: 0, z: 0, scale: 0, spin: 0, glass: 0, wave: 0 };
    const accColours = [new Color(0, 0, 0), new Color(0, 0, 0), new Color(0, 0, 0)];
    let best: State | null = null;
    let bestW = 0;
    for (const { el, state } of sections) {
      const r = el.getBoundingClientRect();
      const centre = r.top + r.height / 2;
      const reach = vh * 0.5 + r.height * 0.5;
      const w = Math.max(0, 1 - Math.abs(centre - vh / 2) / reach) ** 2;
      if (w <= 0) continue;
      total += w;
      acc.x += state.x * w;
      acc.y += state.y * w;
      acc.z += state.z * w;
      acc.scale += state.scale * w;
      acc.spin += state.spin * w;
      acc.glass += state.glass * w;
      acc.wave += state.wave * w;
      PALETTES[state.palette].forEach((hex, i) => accColours[i]!.add(new Color(hex).multiplyScalar(w)));
      if (w > bestW) {
        bestW = w;
        best = state;
      }
    }
    if (!total || !best) return;
    Object.assign(target, {
      x: acc.x / total,
      y: acc.y / total,
      z: acc.z / total,
      scale: acc.scale / total,
      spin: acc.spin / total,
      glass: acc.glass / total,
      wave: acc.wave / total,
    });
    accColours.forEach((c, i) => targetColours[i]!.copy(c.multiplyScalar(1 / total)));
  };

  // ---- pointer
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, moved: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.moved = 1;
  };
  const ray = new Vector3();
  const prismScreen = new Vector3();
  // Scene colours are mirrored into CSS so glass edges, labels and the
  // header progress line take on the colours of the section in view.
  const root = document.documentElement;
  const channel = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  const rgb = (c: Color) => `${channel(c.r)} ${channel(c.g)} ${channel(c.b)}`;
  let cssFrame = 0;
  let shatter = 0;
  window.addEventListener('pointermove', onPointer, { passive: true });

  // Scroll speed drives the flow of the landscape; the engine reports it.
  let velocity = 0;
  const offScroll = onScrollTick(() => {
    velocity = Number(root.style.getPropertyValue('--scroll-v')) || 0;
  });

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let frame = 0;
  let last = performance.now();
  let spinAngle = 0;
  const render = (now: number) => {
    frame = requestAnimationFrame(render);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    blend();
    const k = 1 - Math.exp(-dt * 2.6); // smooth approach, framerate-independent
    for (const key of ['x', 'y', 'z', 'scale', 'spin', 'glass', 'wave'] as const) current[key] += (target[key] - current[key]) * k;
    colours.forEach((c, i) => c.lerp(targetColours[i]!, k));

    // World size of the viewport at the prism's depth, so x/y are responsive.
    const depth = camera.position.z - current.z;
    const halfH = Math.tan(MathUtils.degToRad(camera.fov / 2)) * depth;
    const halfW = halfH * camera.aspect;
    const narrow = camera.aspect < 0.9;
    // On phones the prism rides the right edge, half off-screen, so it never
    // sits under a column of body text.
    prism.position.set(narrow ? halfW * 0.92 : current.x * halfW * 0.78, current.y * halfH * 0.7, current.z);
    prism.scale.setScalar(current.scale * (narrow ? 0.62 : 1));

    pointer.sx += (pointer.x - pointer.sx) * k * 1.6;
    pointer.sy += (pointer.y - pointer.sy) * k * 1.6;
    spinAngle += dt * (current.spin + Math.abs(velocity) * 1.4);
    prism.rotation.set(0.35 + pointer.sy * 0.25 + Math.sin(spinAngle * 0.5) * 0.15, spinAngle + pointer.sx * 0.35, 0.12);
    lattice.rotation.y = -spinAngle * 1.6;
    core.rotation.x = spinAngle * 2;

    // Glass ↔ wireframe.
    shellMaterial.opacity = current.glass;
    shell.visible = current.glass > 0.03;
    (outline.material as LineBasicMaterial).opacity = (1 - current.glass) * 0.8;
    (lattice.material as LineBasicMaterial).opacity = 0.35 + (1 - current.glass) * 0.5;
    coreMaterial.color.copy(colours[0]!);
    (lattice.material as LineBasicMaterial).color.copy(colours[0]!).lerp(new Color(0xffffff), 0.45);
    (outline.material as LineBasicMaterial).color.copy(colours[2]!);

    // Lights track the pointer: the highlight moves across the facets.
    key.color.copy(colours[1]!);
    rim.color.copy(colours[2]!);
    key.position.set(prism.position.x + 3 + pointer.sx * 4, prism.position.y + 2 + pointer.sy * 3, 5);
    rim.position.set(prism.position.x - 4 - pointer.sx * 2, prism.position.y - 2, 3);

    // Shatter: fast scrolling, or the cursor close to the crystal on screen.
    prismScreen.copy(prism.position).project(camera);
    const reach = Math.hypot(prismScreen.x - pointer.sx, (prismScreen.y - pointer.sy) / camera.aspect);
    const near = Math.max(0, 1 - reach / 0.3) * pointer.moved;
    const shatterTarget = Math.min(1, Math.abs(velocity) * 1.6 + near * near * 0.75);
    // Breaks apart quickly, reassembles slowly.
    const rate = shatterTarget > shatter ? 9 : 1.8;
    shatter += (shatterTarget - shatter) * (1 - Math.exp(-dt * rate));
    explode.value = shatter;
    clock.value = now / 1000;

    // The camera drifts with the pointer: parallax between crystal and floor.
    camera.position.x += (pointer.sx * 0.6 - camera.position.x) * k;
    camera.position.y += (pointer.sy * 0.35 - camera.position.y) * k;
    camera.lookAt(0, -0.4, 0);

    // Landscape.
    const u = terrain.uniforms;
    u.uTime.value = now / 1000;
    u.uFlow.value += dt * (1.6 + Math.abs(velocity) * 26);
    u.uWave.value = current.wave * (1 + Math.abs(velocity) * 0.6);
    u.uColA.value.copy(colours[0]!);
    u.uColB.value.copy(colours[1]!);
    u.uColC.value.copy(colours[2]!);
    // Where the pointer's ray meets the floor.
    ray.set(pointer.sx, pointer.sy, 0.5).unproject(camera).sub(camera.position).normalize();
    let onFloor = 0;
    if (ray.y < -0.01) {
      const t = (FLOOR_Y - camera.position.y) / ray.y;
      u.uPointer.value.set(camera.position.x + ray.x * t, camera.position.z + ray.z * t);
      onFloor = pointer.moved;
    }
    u.uPointerAmt.value += (onFloor - u.uPointerAmt.value) * k;

    if (++cssFrame % 4 === 0) {
      root.style.setProperty('--scene-a', rgb(colours[0]!));
      root.style.setProperty('--scene-b', rgb(colours[1]!));
      root.style.setProperty('--scene-c', rgb(colours[2]!));
    }
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(render);
  canvas.dataset.ready = 'true';

  return {
    refresh,
    dispose() {
      cancelAnimationFrame(frame);
      offScroll();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mat = m.material as { dispose?: () => void } | undefined;
        mat?.dispose?.();
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      delete canvas.dataset.ready;
      for (const v of ['--scene-a', '--scene-b', '--scene-c']) root.style.removeProperty(v);
    },
  };
}

/** A dark studio for reflections: black walls with a few bright strips in the
 *  site's foil colours, so the glass picks up crisp coloured highlights
 *  instead of the flat grey of a generic room environment. */
function studio(): Scene {
  const room = new Scene();
  room.add(new Mesh(new IcosahedronGeometry(20, 1), new MeshBasicMaterial({ color: 0x050507, side: BackSide })));
  const strips: [string, number, number, number, number, number][] = [
    // colour, x, y, z, width, height (each strip faces the centre)
    ['#ffffff', 0, 6, -2, 14, 1.2],
    ['#ffffff', -4, -3, 6, 1, 6],
    ['#ff5fc8', -7, 1, 0, 0.8, 9],
    ['#8fd3ff', 7, 0, 1, 0.8, 9],
    ['#b98cff', 0, -1, -8, 7, 1.2],
    ['#ff4d6d', 3, -5, 4, 6, 0.5],
    ['#ffd9ec', 6, 5, 5, 3, 3],
    ['#b98cff', -6, -4, 5, 4, 2],
    ['#8fd3ff', -3, 5, 7, 5, 0.6],
  ];
  for (const [hex, x, y, z, w, h] of strips) {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(4), side: DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  }
  return room;
}

/** Adds per-facet attributes to a non-indexed polyhedron so the vertex shader
 *  can move each triangle as a separate shard. */
function shardGeometry(geometry: IcosahedronGeometry) {
  const pos = geometry.getAttribute('position');
  const count = pos.count;
  const centroid = new Float32Array(count * 3);
  const rand = new Float32Array(count);
  for (let f = 0; f < count; f += 3) {
    const r = Math.random();
    for (let axis = 0; axis < 3; axis++) {
      const c = (pos.getComponent(f, axis) + pos.getComponent(f + 1, axis) + pos.getComponent(f + 2, axis)) / 3;
      for (let v = 0; v < 3; v++) centroid[(f + v) * 3 + axis] = c;
    }
    for (let v = 0; v < 3; v++) rand[f + v] = r;
  }
  geometry.setAttribute('aCentroid', new BufferAttribute(centroid, 3));
  geometry.setAttribute('aRand', new BufferAttribute(rand, 1));
  return geometry;
}
