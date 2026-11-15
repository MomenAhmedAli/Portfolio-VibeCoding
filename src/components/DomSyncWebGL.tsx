import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as THREE from 'three';
import { addFrameEffect, getLenisScrollSnapshot } from '../lib/lenisScrollBus';

export interface DomSyncProjectSpec {
  id: string;
  imageSrc: string;
}

interface DomSyncWebGLProps {
  projects: DomSyncProjectSpec[];
  imageBoxRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  cardRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  hoveredId: string | null;
  pressedId?: string | null;
  waveTriggers?: Record<string, number>;
  onReadyChange?: (ready: boolean) => void;
}

/**
 * Velocity-driven curl sampler using clamped delta and fast-attack / slow-release
 * exponential smoothing so trackpad micro-fluctuations never turn into visual noise.
 */
function createCurlStrengthSampler() {
  let previousScrollY: number | null = null;
  let activity = 0;
  let signedActivity = 0;

  return (scrollY: number, delta: number) => {
    const dt = THREE.MathUtils.clamp(delta, 1 / 240, 0.1);
    const rawDeltaY = previousScrollY == null ? 0 : scrollY - previousScrollY;
    previousScrollY = scrollY;

    const rawSignedVelocity = rawDeltaY / dt;
    const velocity = Math.abs(rawSignedVelocity);

    // Normalize scroll speed gently into target curl activity.
    const target = THREE.MathUtils.clamp(velocity / 1350, 0, 1);
    const signedTarget = THREE.MathUtils.clamp(rawSignedVelocity / 1350, -1, 1);

    // Slower, ultra-smooth attack and release so shader curvature & shade settle gently.
    const tau = target > activity ? 0.14 : 0.42;
    const alpha = 1 - Math.exp(-dt / tau);
    activity += (target - activity) * alpha;

    const signedTau = Math.abs(signedTarget) > Math.abs(signedActivity) ? 0.16 : 0.45;
    const signedAlpha = 1 - Math.exp(-dt / signedTau);
    signedActivity += (signedTarget - signedActivity) * signedAlpha;

    // Map the smoothed activity to the maximum curl strength.
    return {
      curlStrength: 0.048 * activity,
      signedVelocity: signedActivity,
    };
  };
}

const VERTEX_SHADER = `
  uniform float uCurlStrength;
  uniform float uSignedVelocity;
  uniform vec4 uCardRect;
  varying vec2 vUv;
  varying vec2 vScreenUv;

  void main() {
    vUv = uv;
    vec2 screenUv = uCardRect.xy + uv * uCardRect.zw;
    vScreenUv = screenUv;

    // Normalized viewport Y (-1 at bottom edge of viewport, +1 at top edge of viewport)
    float centeredY = 2.0 * clamp(screenUv.y, 0.0, 1.0) - 1.0;
    float profile = 1.0 - sqrt(max(0.0, 1.0 - centeredY * centeredY));

    vec3 pos = position;

    // Lift edges gently forward in 3D when approaching the top or bottom edges of the screen
    pos.z += profile * (uCurlStrength * 850.0 + abs(uSignedVelocity) * 35.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform float uCurlStrength;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uPress;
  uniform float uWave;
  uniform float uImageAspect;
  uniform float uPlaneAspect;
  uniform vec4 uCardRect;
  varying vec2 vUv;
  varying vec2 vScreenUv;

  vec2 applyCurl(vec2 screenUv) {
    float centered = 2.0 * clamp(screenUv.y, 0.0, 1.0) - 1.0;
    float profile = 1.0 - sqrt(max(0.0, 1.0 - centered * centered));

    // Higher speed increases uCurlStrength and compresses X near the top and bottom.
    float uvScale = 1.0 - profile * uCurlStrength;
    float distortedX = (screenUv.x - 0.5) * uvScale + 0.5;
    return vec2(distortedX, screenUv.y);
  }

  vec2 getCoverUv(vec2 uv, float imgAspect, float planeAspect) {
    vec2 scale = vec2(1.0);
    if (planeAspect > imgAspect) {
      scale.y = imgAspect / planeAspect;
    } else {
      scale.x = planeAspect / imgAspect;
    }
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    // Apply exact screen-space semicircular lens curl
    vec2 curledScreenUv = applyCurl(vScreenUv);
    vec2 curledLocalUv = (curledScreenUv - uCardRect.xy) / max(uCardRect.zw, vec2(0.0001));
    curledLocalUv = clamp(curledLocalUv, 0.0, 1.0);

    // Concentric shockwave ripple expanding outward from center (0.5, 0.5) to edges on press/click
    vec2 toCenter = curledLocalUv - vec2(0.5);
    float dist = length(toCenter);
    float waveFront = uWave * 0.85;
    float ringBand = exp(-pow((dist - waveFront) * 14.0, 2.0)) * (1.0 - uWave);
    vec2 waveOffset = normalize(toCenter + vec2(0.0001)) * sin((dist - waveFront) * 28.0) * ringBand * 0.028;

    // Strictly internal UV zoom-in on hover and zoom-out pulse on press (never resizes card)
    float hoverScale = 1.0 - uHover * 0.065 + uPress * 0.035;
    vec2 zoomedUv = (curledLocalUv + waveOffset - 0.5) * hoverScale + 0.5;

    // Fit image with object-cover aspect preservation
    vec2 finalUv = getCoverUv(zoomedUv, uImageAspect, uPlaneAspect);
    vec4 texColor = texture2D(uTexture, finalUv);

    // Smoothly darken primary image on hover and add subtle wave crest highlight
    texColor.rgb *= mix(1.0, 0.22, uHover);
    texColor.rgb += vec3(0.28, 0.36, 0.55) * ringBand;

    gl_FragColor = vec4(texColor.rgb, texColor.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

interface PlaneEntry {
  id: string;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  texture: THREE.Texture;
  imageAspect: number;
  hoverAmount: number;
  pressAmount: number;
  lastWaveTrigger: number;
  waveProgress: number;
}

export function DomSyncWebGL({
  projects,
  imageBoxRefs,
  cardRefs,
  hoveredId,
  pressedId = null,
  waveTriggers = {},
  onReadyChange,
}: DomSyncWebGLProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoveredIdRef = useRef(hoveredId);
  hoveredIdRef.current = hoveredId;

  const pressedIdRef = useRef(pressedId);
  pressedIdRef.current = pressedId;

  const waveTriggersRef = useRef(waveTriggers);
  waveTriggersRef.current = waveTriggers;

  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const onReadyChangeRef = useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;

  useEffect(() => {
    const mount = containerRef.current;
    if (!mount) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      onReadyChangeRef.current?.(false);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const fov = 45;
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(fov, vw / Math.max(vh, 1), 10, 4000);

    const syncCamera = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      camera.aspect = vw / Math.max(vh, 1);
      camera.position.z = vh / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
      camera.updateProjectionMatrix();
      renderer.setSize(vw, vh, false);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    };

    syncCamera();
    window.addEventListener('resize', syncCamera);

    const sharedGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
    const textureLoader = new THREE.TextureLoader();
    const entries: PlaneEntry[] = [];
    let loadedCount = 0;

    projectsRef.current.forEach((proj) => {
      const texture = textureLoader.load(proj.imageSrc, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        const img = tex.image as { width?: number; height?: number } | undefined;
        if (img && img.width && img.height) {
          entry.imageAspect = img.width / img.height;
          material.uniforms.uImageAspect.value = entry.imageAspect;
        }

        loadedCount += 1;
        if (loadedCount === projectsRef.current.length) {
          onReadyChangeRef.current?.(true);
        }
      });

      texture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: texture },
          uCurlStrength: { value: 0 },
          uSignedVelocity: { value: 0 },
          uOpacity: { value: 0 },
          uHover: { value: 0 },
          uPress: { value: 0 },
          uWave: { value: 1 },
          uImageAspect: { value: 1.6 },
          uPlaneAspect: { value: 1.6 },
          uCardRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(sharedGeometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);

      const entry: PlaneEntry = {
        id: proj.id,
        mesh,
        texture,
        imageAspect: 1.6,
        hoverAmount: 0,
        pressAmount: 0,
        lastWaveTrigger: 0,
        waveProgress: 1,
      };
      entries.push(entry);
    });

    const sampleCurl = createCurlStrengthSampler();
    let disposed = false;
    let gpuBusy = false;
    let cooldownUntil = 0;
    let fenceTimerId = 0;

    const scheduleSoftwareSync = () => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        gpuBusy = false;
        cooldownUntil = performance.now() + 80;
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          fenceTimerId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          gpuBusy = false;
          cooldownUntil = performance.now() + 80;
        }
      };
      fenceTimerId = window.setTimeout(poll, 5);
    };

    // Execute inside the shared post-Lenis frame loop right after DOM & ScrollBus update
    const removeEffect = addFrameEffect(20, (timeMs, delta) => {
      if (disposed) return;

      // Read fresh scroll snapshot recorded after lenis.raf() this frame
      const scrollY = getLenisScrollSnapshot().scrollTop;
      const { curlStrength, signedVelocity } = sampleCurl(scrollY, delta);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const imgEl = imageBoxRefs.current[i];
        const cardEl = cardRefs.current[i];

        if (!imgEl || !cardEl) {
          entry.mesh.visible = false;
          continue;
        }

        const rect = imgEl.getBoundingClientRect();
        const cardOpacity = parseFloat(window.getComputedStyle(cardEl).opacity) || 0;

        if (
          rect.width <= 1 ||
          rect.height <= 1 ||
          rect.bottom < -120 ||
          rect.top > vh + 120 ||
          cardOpacity <= 0.005
        ) {
          entry.mesh.visible = false;
          continue;
        }

        entry.mesh.visible = true;
        entry.mesh.scale.set(rect.width, rect.height, 1);
        entry.mesh.position.set(
          rect.left + rect.width / 2 - vw / 2,
          -(rect.top + rect.height / 2 - vh / 2),
          0
        );

        const targetHover = hoveredIdRef.current === entry.id ? 1 : 0;
        entry.hoverAmount = THREE.MathUtils.damp(
          entry.hoverAmount,
          targetHover,
          10,
          Math.min(delta, 0.05)
        );

        const targetPress = pressedIdRef.current === entry.id ? 1 : 0;
        entry.pressAmount = THREE.MathUtils.damp(
          entry.pressAmount,
          targetPress,
          14,
          Math.min(delta, 0.05)
        );

        const latestTrigger = waveTriggersRef.current[entry.id] || 0;
        if (latestTrigger !== entry.lastWaveTrigger) {
          entry.lastWaveTrigger = latestTrigger;
          entry.waveProgress = 0;
        }
        if (entry.waveProgress < 1) {
          entry.waveProgress = Math.min(1, entry.waveProgress + Math.min(delta, 0.05) * 1.75);
        }

        const uniforms = entry.mesh.material.uniforms;
        uniforms.uCurlStrength.value = curlStrength;
        uniforms.uSignedVelocity.value = signedVelocity;
        uniforms.uOpacity.value = cardOpacity;
        uniforms.uHover.value = entry.hoverAmount;
        uniforms.uPress.value = entry.pressAmount;
        uniforms.uWave.value = entry.waveProgress;
        uniforms.uPlaneAspect.value = rect.width / Math.max(rect.height, 1);
        (uniforms.uCardRect.value as THREE.Vector4).set(
          rect.left / Math.max(vw, 1),
          (vh - rect.bottom) / Math.max(vh, 1),
          rect.width / Math.max(vw, 1),
          rect.height / Math.max(vh, 1)
        );
      }

      if (isSoftwareGl && (gpuBusy || timeMs < cooldownUntil)) {
        return;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        gpuBusy = true;
        scheduleSoftwareSync();
      }
    });

    return () => {
      disposed = true;
      removeEffect();
      window.clearTimeout(fenceTimerId);
      window.removeEventListener('resize', syncCamera);

      entries.forEach((entry) => {
        scene.remove(entry.mesh);
        entry.mesh.material.dispose();
        entry.texture.dispose();
      });
      sharedGeometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      onReadyChangeRef.current?.(false);
    };
  }, [imageBoxRefs, cardRefs]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-10"
    />
  );
}
