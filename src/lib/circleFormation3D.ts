import * as THREE from 'three';
import type { VoyageFrameState } from './voyageChoreography';
import { clamp } from './voyageChoreography';

export interface CircleFormation3DHandle {
  updateAndRender: (
    state: VoyageFrameState,
    effectiveAlpha: number,
    elapsedTimeSec: number,
    theme: 'light' | 'dark',
    viewportWidth: number,
    viewportHeight: number
  ) => void;
  clearCanvas: () => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
  domElement: HTMLCanvasElement;
}

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 aChunkNormal;
  attribute vec3 aChunkAxis;
  attribute float aChunkSeed;

  uniform float uTime;
  uniform float uSplit;
  uniform float uSurge;
  uniform float uVanish;

  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vDisp;
  varying float vChunkEdge;

  vec3 rotateAxisAngle(vec3 v, vec3 axis, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
  }

  void main() {
    vec3 pos = position;
    vec3 nrm = normal;

    // 1. Subtle organic GLSL wave undulation when unified
    float waveMask = 1.0 - uSplit * 0.65;
    float w1 = sin(pos.x * 3.4 + uTime * 2.1) * cos(pos.y * 3.7 - uTime * 1.7) * sin(pos.z * 3.2 + uTime * 1.4);
    float disp = w1 * (0.065 + uSurge * 0.04) * waveMask;
    pos += normalize(pos) * disp;

    // 2. Clean 3D solid fracture: each spherical wedge rotates around its local axis & separates radially
    vec3 chunkPivot = aChunkNormal * 1.34;
    vec3 relPos = pos - chunkPivot;
    float spinAngle = uSplit * (1.65 + aChunkSeed * 2.35);
    relPos = rotateAxisAngle(relPos, normalize(aChunkAxis), spinAngle);
    vec3 rotNrm = rotateAxisAngle(nrm, normalize(aChunkAxis), spinAngle);

    float burstDist = uSplit * (1.65 + aChunkSeed * 0.95);
    vec3 explodedPos = chunkPivot + relPos + aChunkNormal * burstDist;

    // Compress smoothly during dissolve
    explodedPos *= (1.0 - uVanish * 0.62);

    vLocalPos = explodedPos;
    vDisp = disp;
    vChunkEdge = uSplit;

    vec4 worldPosition = modelMatrix * vec4(explodedPos, 1.0);
    vWorldPos = worldPosition.xyz;
    vNormalWorld = normalize(mat3(modelMatrix) * rotNrm);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uSplit;
  uniform float uSurge;
  uniform float uAlpha;
  uniform vec3 uPrimaryColor;
  uniform vec3 uAccentA;
  uniform vec3 uAccentB;
  uniform vec3 uBaseCoreColor;

  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;
  varying vec3 vLocalPos;
  varying float vDisp;
  varying float vChunkEdge;

  void main() {
    vec3 N = normalize(vNormalWorld);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // Dual-sided lighting so fractured inner faces look solid and sculpted
    if (!gl_FrontFacing) N = -N;

    float ndotv = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.2);

    // Flowing geodesic luminance waves across the sphere
    float bandA = sin(vLocalPos.y * 10.0 - uTime * (2.2 + uSurge * 4.5));
    float bandB = cos(vLocalPos.x * 8.0 + vLocalPos.z * 8.0 + uTime * 1.8);
    float sheen = smoothstep(0.58, 0.98, abs(bandA * 0.6 + bandB * 0.4));

    // Three-point studio directional & rim shading
    vec3 L1 = normalize(vec3(0.65, 0.85, 0.72));
    vec3 L2 = normalize(vec3(-0.7, -0.35, -0.5));
    float diff1 = max(dot(N, L1), 0.0);
    float diff2 = max(dot(N, L2), 0.0);

    vec3 H = normalize(L1 + V);
    float spec = pow(max(dot(N, H), 0.0), 42.0);

    vec3 col = mix(uBaseCoreColor, uAccentB, diff1 * 0.65 + 0.2);
    col += uAccentA * (diff2 * 0.32 + sheen * 0.26);
    col = mix(col, uAccentA, clamp(fresnel * 0.85, 0.0, 1.0));
    col += uPrimaryColor * (spec * 0.75 + pow(fresnel, 3.2) * 0.58 + uSurge * 0.16);

    // Subtle energy flash along facets right as chunks snap together / break apart
    col += uAccentA * vChunkEdge * 0.18;

    float alpha = clamp((0.86 + fresnel * 0.14) * uAlpha, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Builds ONE unified curved 3D Sphere composed of 20 interlocking solid spherical shell shards.
 * When split == 0 all 20 curved patches lock together flush into ONE smooth sphere;
 * when split > 0 every shard breaks cleanly along geodesic seams with real radial thickness.
 */
function buildFracturableSphereGeometry(
  outerRadius = 1.52,
  innerRadius = 1.24,
  subdivisions = 4
): THREE.BufferGeometry {
  const baseIco = new THREE.IcosahedronGeometry(1, 0).toNonIndexed();
  const basePos = baseIco.getAttribute('position');
  const faceCount = basePos.count / 3;

  const positions: number[] = [];
  const normals: number[] = [];
  const chunkNormals: number[] = [];
  const chunkAxes: number[] = [];
  const chunkSeeds: number[] = [];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const triA = new THREE.Vector3();
  const triB = new THREE.Vector3();
  const triC = new THREE.Vector3();
  const edgeAB = new THREE.Vector3();
  const edgeAC = new THREE.Vector3();
  const sideNormal = new THREE.Vector3();
  const chunkN = new THREE.Vector3();
  const chunkAxis = new THREE.Vector3();

  const baryPoint = (i: number, j: number, out: THREE.Vector3) => {
    const u = i / subdivisions;
    const v = j / subdivisions;
    const w = 1 - u - v;
    out
      .set(0, 0, 0)
      .addScaledVector(vA, w)
      .addScaledVector(vB, u)
      .addScaledVector(vC, v)
      .normalize();
    return out;
  };

  for (let f = 0; f < faceCount; f++) {
    vA.fromBufferAttribute(basePos, f * 3);
    vB.fromBufferAttribute(basePos, f * 3 + 1);
    vC.fromBufferAttribute(basePos, f * 3 + 2);

    chunkN.copy(vA).add(vB).add(vC).divideScalar(3).normalize();
    const seed = ((f * 0.6180339) % 1 + 1) % 1;
    chunkAxis
      .set(
        Math.sin(f * 2.17 + 0.4),
        Math.cos(f * 1.43 - 0.8),
        Math.sin(f * 3.11 + 1.2)
      )
      .normalize();

    const pushTri = (
      a: THREE.Vector3,
      b: THREE.Vector3,
      c: THREE.Vector3,
      nA: THREE.Vector3,
      nB: THREE.Vector3,
      nC: THREE.Vector3
    ) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      normals.push(nA.x, nA.y, nA.z, nB.x, nB.y, nB.z, nC.x, nC.y, nC.z);
      for (let k = 0; k < 3; k++) {
        chunkNormals.push(chunkN.x, chunkN.y, chunkN.z);
        chunkAxes.push(chunkAxis.x, chunkAxis.y, chunkAxis.z);
        chunkSeeds.push(seed);
      }
    };

    const pushWallQuad = (u0: THREE.Vector3, u1: THREE.Vector3) => {
      const o0 = triA.copy(u0).multiplyScalar(outerRadius);
      const o1 = triB.copy(u1).multiplyScalar(outerRadius);
      const i0 = p0.copy(u0).multiplyScalar(innerRadius);
      const i1 = p1.copy(u1).multiplyScalar(innerRadius);
      edgeAB.subVectors(o1, o0);
      edgeAC.subVectors(i0, o0);
      sideNormal.crossVectors(edgeAB, edgeAC).normalize();
      pushTri(o0, o1, i1, sideNormal, sideNormal, sideNormal);
      pushTri(o0, i1, i0, sideNormal, sideNormal, sideNormal);
    };

    // Subdivide spherical patch into curved outer + inner cap triangles
    for (let i = 0; i < subdivisions; i++) {
      for (let j = 0; j < subdivisions - i; j++) {
        const u00 = baryPoint(i, j, new THREE.Vector3());
        const u10 = baryPoint(i + 1, j, new THREE.Vector3());
        const u01 = baryPoint(i, j + 1, new THREE.Vector3());

        // Outer smooth curved face
        pushTri(
          triA.copy(u00).multiplyScalar(outerRadius),
          triB.copy(u10).multiplyScalar(outerRadius),
          triC.copy(u01).multiplyScalar(outerRadius),
          u00,
          u10,
          u01
        );

        // Inner curved back face (reversed winding & inverted normal)
        p0.copy(u00).negate();
        p1.copy(u10).negate();
        p2.copy(u01).negate();
        pushTri(
          triA.copy(u00).multiplyScalar(innerRadius),
          triB.copy(u01).multiplyScalar(innerRadius),
          triC.copy(u10).multiplyScalar(innerRadius),
          p0,
          p2,
          p1
        );

        if (i + j + 1 < subdivisions) {
          const u11 = baryPoint(i + 1, j + 1, new THREE.Vector3());
          pushTri(
            triA.copy(u10).multiplyScalar(outerRadius),
            triB.copy(u11).multiplyScalar(outerRadius),
            triC.copy(u01).multiplyScalar(outerRadius),
            u10,
            u11,
            u01
          );

          p0.copy(u10).negate();
          p1.copy(u11).negate();
          p2.copy(u01).negate();
          pushTri(
            triA.copy(u10).multiplyScalar(innerRadius),
            triB.copy(u01).multiplyScalar(innerRadius),
            triC.copy(u11).multiplyScalar(innerRadius),
            p0,
            p2,
            p1
          );
        }
      }
    }

    // Solid bevelled side walls along all 3 seams of the icosahedral wedge
    for (let k = 0; k < subdivisions; k++) {
      const a0 = baryPoint(k, 0, new THREE.Vector3());
      const a1 = baryPoint(k + 1, 0, new THREE.Vector3());
      pushWallQuad(a1, a0);

      const b0 = baryPoint(0, k, new THREE.Vector3());
      const b1 = baryPoint(0, k + 1, new THREE.Vector3());
      pushWallQuad(b0, b1);

      const c0 = baryPoint(subdivisions - k, k, new THREE.Vector3());
      const c1 = baryPoint(subdivisions - k - 1, k + 1, new THREE.Vector3());
      pushWallQuad(c0, c1);
    }
  }

  baseIco.dispose();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('aChunkNormal', new THREE.Float32BufferAttribute(chunkNormals, 3));
  geo.setAttribute('aChunkAxis', new THREE.Float32BufferAttribute(chunkAxes, 3));
  geo.setAttribute('aChunkSeed', new THREE.Float32BufferAttribute(chunkSeeds, 1));
  geo.computeBoundingSphere();
  return geo;
}

function detectSoftwareWebGL(): boolean {
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return true;
  const ext = probe.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
  const gpu = String(probe.getParameter(param));
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export function createCircleFormation3D(
  mount: HTMLElement,
  initialWidth: number,
  initialHeight: number
): CircleFormation3DHandle | null {
  const isSoftwareGl = detectSoftwareWebGL();

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      preserveDrawingBuffer: isSoftwareGl,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(initialWidth, initialHeight, false);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.setAttribute('data-testid', 'circle-formation-canvas');
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    42,
    initialWidth / Math.max(initialHeight, 1),
    0.1,
    100
  );
  camera.position.set(0, 0.1, initialWidth < 768 ? 9.6 : 7.8);
  camera.lookAt(0, 0, 0);

  // Build ONE single fracturable 3D GLSL Shader Sphere (no extra rings/satellites/halo clutter)
  const sphereGeo = buildFracturableSphereGeometry(1.52, 1.24, 4);
  const sphereMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSplit: { value: 0 },
      uSurge: { value: 0 },
      uVanish: { value: 0 },
      uAlpha: { value: 1 },
      uPrimaryColor: { value: new THREE.Color(0xf4f6ff) },
      uAccentA: { value: new THREE.Color(0x7dd3fc) },
      uAccentB: { value: new THREE.Color(0x38bdf8) },
      uBaseCoreColor: { value: new THREE.Color(0x0f2470) },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphereMesh);

  let gpuBusy = false;
  let lastTheme: 'light' | 'dark' | null = null;
  let clearedSinceInvisible = true;
  let pendingTimer = 0;
  let disposed = false;

  const waitForAfterDraw = () => {
    if (!isSoftwareGl) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync !== 'function') {
      gpuBusy = false;
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED) {
        pendingTimer = window.setTimeout(poll, 4);
      } else {
        if (sync) gl.deleteSync(sync);
        gpuBusy = false;
      }
    };
    gpuBusy = true;
    pendingTimer = window.setTimeout(poll, 4);
  };

  const syncPalette = (theme: 'light' | 'dark') => {
    if (lastTheme === theme) return;
    lastTheme = theme;
    const isDark = theme === 'dark';

    sphereMat.uniforms.uPrimaryColor.value.setHex(isDark ? 0xf4f6ff : 0x0d1117);
    sphereMat.uniforms.uAccentA.value.setHex(isDark ? 0x7dd3fc : 0x1d4ed8);
    sphereMat.uniforms.uAccentB.value.setHex(isDark ? 0x38bdf8 : 0x0284c7);
    sphereMat.uniforms.uBaseCoreColor.value.setHex(isDark ? 0x0f2470 : 0x60a5fa);
  };

  syncPalette('dark');

  const clearCanvas = () => {
    if (clearedSinceInvisible) return;
    renderer.clear();
    clearedSinceInvisible = true;
  };

  const resize = (width: number, height: number) => {
    camera.aspect = width / Math.max(height, 1);
    camera.position.z = width < 768 ? 9.6 : 7.8;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  };

  const updateAndRender = (
    state: VoyageFrameState,
    effectiveAlpha: number,
    elapsedTimeSec: number,
    theme: 'light' | 'dark',
    viewportWidth: number,
    _viewportHeight: number
  ) => {
    if (disposed) return;
    if (effectiveAlpha <= 0.004 || state.circleScale <= 0.004) {
      clearCanvas();
      return;
    }

    if (isSoftwareGl && gpuBusy) {
      return;
    }

    syncPalette(theme);
    clearedSinceInvisible = false;

    const isMobile = viewportWidth < 768;
    const scale = (isMobile ? 0.85 : 1.0) * state.circleScale;
    sphereMesh.scale.setScalar(scale);

    // Continuous smooth 3D sphere rotation driven by both scroll rotationRad & time
    const spin = state.rotationRad * 0.62 + elapsedTimeSec * 0.42;
    sphereMesh.rotation.set(
      Math.sin(elapsedTimeSec * 0.45) * 0.22 + spin * 0.25,
      spin,
      spin * 0.14
    );

    sphereMat.uniforms.uTime.value = elapsedTimeSec;
    sphereMat.uniforms.uSplit.value = clamp(state.splitAmount, 0, 1);
    sphereMat.uniforms.uSurge.value = clamp(state.reassembleSurge, 0, 1);
    sphereMat.uniforms.uVanish.value = clamp(state.vanishProgress, 0, 1);
    sphereMat.uniforms.uAlpha.value = clamp(effectiveAlpha, 0, 1);

    renderer.render(scene, camera);
    waitForAfterDraw();
  };

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  return {
    updateAndRender,
    clearCanvas,
    resize,
    dispose: () => {
      disposed = true;
      window.clearTimeout(pendingTimer);
      sphereGeo.dispose();
      sphereMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    },
    domElement: renderer.domElement,
  };
}
