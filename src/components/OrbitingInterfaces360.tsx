import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addFrameEffect } from '../lib/lenisScrollBus';

interface OrbitingInterfaces360Props {
  theme?: 'light' | 'dark';
  scrollVelocity?: number;
}

// Exclusively the user's real project images placed across the portfolio (zero synthetic cards, zero text, zero white frames)
const SITE_PROJECT_IMAGES: string[] = [
  '/assets/aistudio/Arabic_Blue_Online_Learning_Platform_2c685461.png',
  '/assets/aistudio/Rivka_Desert_App_Showcase_0c2aebe6.png',
  '/assets/aistudio/hook_70c6e796.png',
  '/assets/aistudio/Arabic_Calligraphy_and_Geometric_Emblem_1c258821.png',
  '/assets/aistudio/Modern_Arabic_Supplier_Marketplace_Dashboard_508fd2df.png',
  '/assets/aistudio/rivka_a6cdcbf7.png',
  '/assets/aistudio/Arabic_Blue_Online_Learning_Platform_2c685461.png',
  '/assets/aistudio/hook_70c6e796.png',
  '/assets/aistudio/Rivka_Desert_App_Showcase_0c2aebe6.png',
  '/assets/aistudio/Modern_Arabic_Supplier_Marketplace_Dashboard_508fd2df.png',
];

function drawRoundedClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPureImageFrame(
  canvas: HTMLCanvasElement,
  loadedImage?: HTMLImageElement
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const radius = 18;

  ctx.clearRect(0, 0, w, h);
  if (!loadedImage || loadedImage.width === 0 || loadedImage.height === 0) {
    return;
  }

  ctx.save();
  drawRoundedClip(ctx, 0, 0, w, h, radius);
  ctx.clip();

  // Slightly over-fill (1.03x) so full edge-to-edge image fills without white frame bars or thin edge borders
  const scale = Math.max(w / loadedImage.width, h / loadedImage.height) * 1.03;
  const dw = loadedImage.width * scale;
  const dh = loadedImage.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.drawImage(loadedImage, dx, dy, dw, dh);
  ctx.restore();
}

export function OrbitingInterfaces360(_props: OrbitingInterfaces360Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
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
        preserveDrawingBuffer: isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
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
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    // Pulled farther back so the cohesive curved strip of project photos sits calmly behind Moamen
    camera.position.set(0, 0.08, 13.6);
    camera.lookAt(0, 0, 0);

    let disposed = false;
    let gpuBusy = false;

    const resize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || 320;
      camera.aspect = w / Math.max(h, 1);
      camera.position.z = w < 640 ? 15.8 : 13.6;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      if (!disposed && !gpuBusy) {
        renderer.render(scene, camera);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const carouselGroup = new THREE.Group();
    scene.add(carouselGroup);

    // Pure image frames packed evenly along a uniform horizontal path (identical size, spacing, and constant speed)
    const cardW = 4.25;
    const cardH = 2.66;
    const slotSpacing = 4.82;
    const totalTrackLen = SITE_PROJECT_IMAGES.length * slotSpacing;

    const cardGeo = new THREE.PlaneGeometry(cardW, cardH, 4, 2);

    interface CardMeshEntry {
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      texture: THREE.CanvasTexture;
      index: number;
      loaded: boolean;
    }

    const cardEntries: CardMeshEntry[] = SITE_PROJECT_IMAGES.map((src, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 400;

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(cardGeo, mat);
      mesh.visible = false;
      carouselGroup.add(mesh);

      const entry: CardMeshEntry = {
        mesh,
        texture,
        index: idx,
        loaded: false,
      };

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (disposed) return;
        drawPureImageFrame(canvas, img);
        texture.needsUpdate = true;
        entry.loaded = true;
        mesh.visible = true;
        mat.opacity = 0.96;
      };
      img.src = src;

      return entry;
    });

    let trackOffset = 0;
    let fenceTimerId = 0;

    const scheduleSoftwareSync = () => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        gpuBusy = false;
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
          fenceTimerId = window.setTimeout(poll, 4);
        } else {
          gl.deleteSync(sync);
          gpuBusy = false;
        }
      };
      fenceTimerId = window.setTimeout(poll, 4);
    };

    const removeEffect = addFrameEffect(20, (_timeMs, deltaSec) => {
      if (disposed) return;

      const dt = Math.min(Math.max(deltaSec, 1 / 240), 0.05);

      // Faster constant linear speed shared identically by every image frame (mouse & scroll independent)
      trackOffset = (trackOffset + 1.55 * dt) % totalTrackLen;

      carouselGroup.rotation.set(0, 0, 0);
      carouselGroup.position.set(0, 0, 0);

      const halfTrack = totalTrackLen * 0.5;
      const visibleHalfW =
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z * camera.aspect;

      for (let i = 0; i < cardEntries.length; i++) {
        const entry = cardEntries[i];
        let x = ((entry.index * slotSpacing - trackOffset) % totalTrackLen + totalTrackLen) % totalTrackLen;
        if (x > halfTrack) x -= totalTrackLen;

        // Uniform flat depth behind Moamen so every image moves at the exact same screen speed with zero overlap
        entry.mesh.position.set(x, 0, -1.6);
        entry.mesh.rotation.set(0, 0, 0);

        const edgeDist = Math.abs(x) / Math.max(visibleHalfW + 2.5, 8);
        const edgeFade = THREE.MathUtils.clamp(1.18 - edgeDist * 0.35, 0.55, 0.97);
        entry.mesh.material.opacity = entry.loaded ? edgeFade : 0;
      }

      if (isSoftwareGl && gpuBusy) {
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
      resizeObserver.disconnect();

      cardEntries.forEach((entry) => {
        carouselGroup.remove(entry.mesh);
        entry.mesh.material.dispose();
        entry.texture.dispose();
      });
      cardGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="absolute left-1/2 -translate-x-1/2 w-screen -top-6 sm:-top-8 h-[230px] sm:h-[285px] lg:h-[330px] pointer-events-none z-[5]"
    />
  );
}
