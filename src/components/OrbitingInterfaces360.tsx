import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addFrameEffect, getLenisScrollSnapshot } from '../lib/lenisScrollBus';

interface OrbitingInterfaces360Props {
  theme?: 'light' | 'dark';
  scrollVelocity?: number;
}

interface InterfaceCardSpec {
  id: string;
  domain: string;
  title: string;
  tag: string;
  accent: string;
  bgTop: string;
  bgBottom: string;
  imageSrc?: string;
  layout: 'website' | 'dashboard' | 'tokens' | 'studio';
}

const INTERFACE_CARDS: InterfaceCardSpec[] = [
  {
    id: 'nurabi',
    domain: 'nurabi.edu',
    title: 'NURABI PORTAL',
    tag: 'EDTECH WEB',
    accent: '#38BDF8',
    bgTop: '#0B2545',
    bgBottom: '#061529',
    imageSrc: '/assets/aistudio/project_nurabi.png',
    layout: 'website',
  },
  {
    id: 'studio-web',
    domain: 'moamen.design',
    title: 'CREATIVE ARCHITECTURE',
    tag: 'WEB SYSTEM',
    accent: '#60A5FA',
    bgTop: '#0F1E5A',
    bgBottom: '#060D3D',
    layout: 'studio',
  },
  {
    id: 'rivka',
    domain: 'rivka.camp',
    title: 'RIVKA EXPEDITION',
    tag: 'TRAVEL WEB',
    accent: '#F59E0B',
    bgTop: '#2E2114',
    bgBottom: '#161009',
    imageSrc: '/assets/aistudio/project_rivka.png',
    layout: 'website',
  },
  {
    id: 'ui-tokens',
    domain: 'tokens.ui',
    title: 'DESIGN TOKENS v4',
    tag: 'UI LIBRARY',
    accent: '#34D399',
    bgTop: '#0D1B2A',
    bgBottom: '#071019',
    layout: 'tokens',
  },
  {
    id: 'game-hud',
    domain: 'supportal.gg',
    title: 'ECONOMY HUD',
    tag: 'STOREFRONT',
    accent: '#A78BFA',
    bgTop: '#1E1B4B',
    bgBottom: '#0F0D2E',
    imageSrc: '/assets/aistudio/project_game.png',
    layout: 'website',
  },
  {
    id: 'analytics',
    domain: 'metrics.app',
    title: 'SCALE TELEMETRY',
    tag: 'SAAS WEB',
    accent: '#2DD4BF',
    bgTop: '#0A192F',
    bgBottom: '#040C18',
    layout: 'dashboard',
  },
];

function drawInterfaceCanvas(
  spec: InterfaceCardSpec,
  loadedImage?: HTMLImageElement
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // Card background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, spec.bgTop);
  grad.addColorStop(1, spec.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural grid inside UI preview
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let gx = 40; gx < w; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 46);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 96; gy < h; gy += 60) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Top Browser Chrome Bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fillRect(0, 0, w, 46);

  // Window dots
  const dotColors = ['#FF5F56', '#FFBD2E', '#27C93F'];
  dotColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(22 + i * 16, 23, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // URL pill bar in browser chrome
  ctx.fillStyle = 'rgba(13, 17, 23, 0.08)';
  ctx.fillRect(82, 11, 240, 24);
  ctx.fillStyle = '#0D1117';
  ctx.font = '600 13px "IBM Plex Sans", sans-serif';
  ctx.fillText(spec.domain, 94, 28);

  // Right badge label
  ctx.fillStyle = 'rgba(13, 17, 23, 0.55)';
  ctx.font = '700 11px "IBM Plex Sans", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(spec.tag, w - 18, 27);
  ctx.textAlign = 'left';

  if (spec.layout === 'website' && loadedImage) {
    // Draw live website/project screenshot inside the browser viewport
    const imgY = 46;
    const imgH = h - 98;
    const scale = Math.max(w / loadedImage.width, imgH / loadedImage.height);
    const dw = loadedImage.width * scale;
    const dh = loadedImage.height * scale;
    const dx = (w - dw) / 2;
    const dy = imgY + (imgH - dh) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, imgY, w, imgH);
    ctx.clip();
    ctx.drawImage(loadedImage, dx, dy, dw, dh);
    ctx.restore();

    // Bottom status bar inside website frame
    ctx.fillStyle = 'rgba(6, 13, 61, 0.9)';
    ctx.fillRect(0, h - 52, w, 52);
    ctx.fillStyle = spec.accent;
    ctx.fillRect(20, h - 32, 8, 8);
    ctx.fillStyle = '#F4F6FF';
    ctx.font = '700 15px "IBM Plex Sans", sans-serif';
    ctx.fillText(spec.title, 38, h - 22);
  } else if (spec.layout === 'studio') {
    // Editorial Website Hero Mockup
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(28, 72, 160, 12);
    ctx.fillStyle = '#F4F6FF';
    ctx.font = '700 34px "IBM Plex Sans", sans-serif';
    ctx.fillText('SYSTEMS THAT', 28, 136);
    ctx.fillText('MOVE & SCALE.', 28, 176);

    ctx.fillStyle = spec.accent;
    ctx.fillRect(28, 200, 128, 34);
    ctx.fillStyle = '#060D3D';
    ctx.font = '700 12px "IBM Plex Sans", sans-serif';
    ctx.fillText('LAUNCH PROJECT →', 40, 221);

    // Website sub-cards
    for (let i = 0; i < 3; i++) {
      const bx = 28 + i * 198;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(bx, 260, 182, 126);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.strokeRect(bx, 260, 182, 126);
      ctx.fillStyle = spec.accent;
      ctx.fillRect(bx + 14, 276, 36, 4);
      ctx.fillStyle = 'rgba(244,246,255,0.8)';
      ctx.font = '600 13px "IBM Plex Sans", sans-serif';
      ctx.fillText(`MODULE 0${i + 1}`, bx + 14, 306);
      ctx.fillStyle = 'rgba(244,246,255,0.45)';
      ctx.fillRect(bx + 14, 324, 140, 8);
      ctx.fillRect(bx + 14, 340, 102, 8);
    }
  } else if (spec.layout === 'tokens') {
    // UI Design System Token Board
    ctx.fillStyle = '#F4F6FF';
    ctx.font = '700 22px "IBM Plex Sans", sans-serif';
    ctx.fillText(spec.title, 28, 92);

    const swatches = ['#2B3BE0', '#38BDF8', '#34D399', '#F59E0B', '#F4F6FF'];
    swatches.forEach((col, i) => {
      const sx = 28 + i * 116;
      ctx.fillStyle = col;
      ctx.fillRect(sx, 118, 98, 68);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.strokeRect(sx, 118, 98, 68);
      ctx.fillStyle = 'rgba(244,246,255,0.7)';
      ctx.font = '500 11px "IBM Plex Sans", sans-serif';
      ctx.fillText(col, sx, 204);
    });

    // Typography & spacing wireframe bars
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(28, 232, w - 56, 152);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.strokeRect(28, 232, w - 56, 152);
    ctx.fillStyle = '#F4F6FF';
    ctx.font = '700 24px "IBM Plex Sans", sans-serif';
    ctx.fillText('Aa Bb Cc — IBM Plex Sans', 48, 282);
    ctx.fillStyle = spec.accent;
    ctx.fillRect(48, 306, 260, 10);
    ctx.fillStyle = 'rgba(244,246,255,0.35)';
    ctx.fillRect(48, 328, 420, 10);
    ctx.fillRect(48, 350, 320, 10);
  } else {
    // Web Analytics Dashboard Mockup
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 46, 130, h - 46);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i === 0 ? spec.accent : 'rgba(255,255,255,0.2)';
      ctx.fillRect(20, 74 + i * 34, 86, 10);
    }

    // KPI Cards
    for (let k = 0; k < 3; k++) {
      const kx = 154 + k * 154;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(kx, 68, 138, 80);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(kx, 68, 138, 80);
      ctx.fillStyle = spec.accent;
      ctx.font = '700 22px "IBM Plex Sans", sans-serif';
      ctx.fillText(['+140%', '60 FPS', '350K+'][k], kx + 14, 114);
      ctx.fillStyle = 'rgba(244,246,255,0.55)';
      ctx.font = '500 11px "IBM Plex Sans", sans-serif';
      ctx.fillText(['CONVERSION', 'WEBGL RENDER', 'USERS'][k], kx + 14, 134);
    }

    // Smooth vector line graph
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(154, 168, w - 178, 222);
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const pts = [340, 320, 330, 285, 295, 245, 255, 215, 200];
    pts.forEach((py, idx) => {
      const px = 176 + idx * 52;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  // Outer crisp frame border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  return canvas;
}

export function OrbitingInterfaces360({
  theme = 'dark',
  scrollVelocity = 0,
}: OrbitingInterfaces360Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(scrollVelocity);
  velocityRef.current = scrollVelocity;

  const themeRef = useRef(theme);
  themeRef.current = theme;

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
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.35, 8.6);
    camera.lookAt(0, 0, 0);

    const resize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || 520;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = 0.14;
    orbitGroup.rotation.z = -0.06;
    scene.add(orbitGroup);

    // Subtle 360° dashed orbital guide ring
    const ringPoints: THREE.Vector3[] = [];
    const ringRadiusX = 3.55;
    const ringRadiusZ = 2.05;
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(Math.cos(a) * ringRadiusX, 0, Math.sin(a) * ringRadiusZ));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
    const ringMat = new THREE.LineDashedMaterial({
      color: themeRef.current === 'dark' ? 0x60a5fa : 0x1e3a8a,
      dashSize: 0.18,
      gapSize: 0.14,
      transparent: true,
      opacity: 0.25,
    });
    const ringLine = new THREE.LineLoop(ringGeo, ringMat);
    ringLine.computeLineDistances();
    orbitGroup.add(ringLine);

    // Shared curved/flat plane geometry for UI cards
    const cardGeo = new THREE.PlaneGeometry(1.72, 1.13, 12, 8);
    // Subtle concave wrap along card curvature
    const posAttr = cardGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      posAttr.setZ(i, -0.08 * (px * px));
    }
    cardGeo.computeVertexNormals();

    interface CardMeshEntry {
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      texture: THREE.CanvasTexture;
      baseAngle: number;
      floatPhase: number;
    }

    const cardEntries: CardMeshEntry[] = INTERFACE_CARDS.map((spec, idx) => {
      const canvas = drawInterfaceCanvas(spec);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(cardGeo, mat);
      const baseAngle = (idx / INTERFACE_CARDS.length) * Math.PI * 2;
      orbitGroup.add(mesh);

      // Load external website screenshot onto canvas when provided
      if (spec.imageSrc) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const updatedCanvas = drawInterfaceCanvas(spec, img);
          const ctx2d = canvas.getContext('2d');
          if (ctx2d) {
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            ctx2d.drawImage(updatedCanvas, 0, 0);
            texture.needsUpdate = true;
          }
        };
        img.src = spec.imageSrc;
      }

      return {
        mesh,
        texture,
        baseAngle,
        floatPhase: idx * 1.15,
      };
    });

    let targetPointerX = 0;
    let targetPointerY = 0;
    let smoothPointerX = 0;
    let smoothPointerY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      targetPointerX = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      targetPointerY = (e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    let orbitAngle = 0;
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

    const removeEffect = addFrameEffect(20, (timeMs, deltaSec) => {
      if (disposed) return;

      const dt = Math.min(deltaSec, 0.05);
      const elapsed = timeMs * 0.001;

      smoothPointerX = THREE.MathUtils.damp(smoothPointerX, targetPointerX, 4, dt);
      smoothPointerY = THREE.MathUtils.damp(smoothPointerY, targetPointerY, 4, dt);

      // Read fresh scroll velocity directly from ScrollBus
      const liveVelocity = getLenisScrollSnapshot().velocity || velocityRef.current;
      const scrollBoost = THREE.MathUtils.clamp(liveVelocity * 0.015, -0.6, 0.6);
      orbitAngle += (0.28 + scrollBoost) * dt;

      orbitGroup.rotation.x = 0.15 + smoothPointerY * 0.08;
      orbitGroup.rotation.z = -0.05 - smoothPointerX * 0.05;
      ringMat.color.setHex(themeRef.current === 'dark' ? 0x60a5fa : 0x1e3a8a);

      for (let i = 0; i < cardEntries.length; i++) {
        const entry = cardEntries[i];
        const a = entry.baseAngle + orbitAngle;

        const x = Math.cos(a) * ringRadiusX;
        const z = Math.sin(a) * ringRadiusZ;
        const y = Math.sin(elapsed * 1.15 + entry.floatPhase) * 0.16;

        entry.mesh.position.set(x, y, z);
        entry.mesh.rotation.y = Math.atan2(x, z + 6.5) * 0.85;

        const depthNorm = (z + ringRadiusZ) / (2 * ringRadiusZ);
        entry.mesh.material.opacity = 0.34 + depthNorm * 0.56;
        const s = 0.84 + depthNorm * 0.2;
        entry.mesh.scale.set(s, s, 1);
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
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();

      cardEntries.forEach((entry) => {
        orbitGroup.remove(entry.mesh);
        entry.mesh.material.dispose();
        entry.texture.dispose();
      });
      cardGeo.dispose();
      ringGeo.dispose();
      ringMat.dispose();
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
      className="absolute inset-x-[-14%] sm:inset-x-[-18%] -top-10 sm:-top-14 bottom-2 pointer-events-none z-[5]"
    />
  );
}
