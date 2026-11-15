import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { addFrameEffect } from '../lib/lenisScrollBus';

interface ShipVoyageSectionProps {
  theme?: 'light' | 'dark';
}

// Pre-allocated math helpers outside render loop (zero GC)
const _camPosTarget = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _camLookCurrent = new THREE.Vector3();
const _camUpTarget = new THREE.Vector3();
const _camUpCurrent = new THREE.Vector3(0, 0, -1);
const _dummyObj = new THREE.Object3D();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / Math.max(edge1 - edge0, 0.0001), 0, 1);
  return t * t * (3 - 2 * t);
}

function createSoftCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.45, 'rgba(235, 245, 255, 0.18)');
    grad.addColorStop(1, 'rgba(235, 245, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ShipVoyageSection({ theme = 'dark' }: ShipVoyageSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const reticleRingOuterRef = useRef<HTMLDivElement>(null);
  const reticleRingInnerRef = useRef<HTMLDivElement>(null);
  const phraseRef = useRef<HTMLDivElement>(null);
  const zoomBurstRef = useRef<HTMLDivElement>(null);
  const steeringCaptionRef = useRef<HTMLDivElement>(null);
  const stageLabelRef = useRef<HTMLSpanElement>(null);
  const magReadoutRef = useRef<HTMLSpanElement>(null);

  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const section = sectionRef.current;
    const mount = canvasMountRef.current;
    if (!section || !mount) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const w0 = mount.clientWidth || window.innerWidth;
    const h0 = mount.clientHeight || window.innerHeight;
    renderer.setSize(w0, h0, false);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialFogHex = themeRef.current === 'dark' ? 0x060d3d : 0xc8e3fa;
    const fog = new THREE.FogExp2(initialFogHex, 0.018);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(36, w0 / Math.max(h0, 1), 0.1, 160);
    camera.position.set(0, 22, 0.05);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);

    // Mandatory studio environment map for metallic/wood contrast
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Warm/cool 3-point sky lighting rig
    const keyLight = new THREE.DirectionalLight(0xfff1d6, 3.2);
    keyLight.position.set(8, 18, 9);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 42;
      keyLight.shadow.camera.left = -7;
      keyLight.shadow.camera.right = 7;
      keyLight.shadow.camera.top = 7;
      keyLight.shadow.camera.bottom = -7;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 2.5);
    rimLight.position.set(-9, 8, -10);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0b153b, 1.1);
    scene.add(hemiLight);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    // =========================================================================
    // 1. COMPOSITE PROCEDURAL 3D SAILING SKY-SHIP (Bow at -Z, Stern Helm at +Z)
    // =========================================================================
    const shipGroup = new THREE.Group();
    scene.add(shipGroup);

    // Distinct roughness/metalness materials
    const hullDarkMat = new THREE.MeshPhysicalMaterial({
      color: 0x161b2e,
      metalness: 0.45,
      roughness: 0.36,
      clearcoat: 0.4,
    });
    const deckWoodMat = new THREE.MeshStandardMaterial({
      color: 0xc29e74,
      metalness: 0.08,
      roughness: 0.72,
    });
    const sailMat = new THREE.MeshPhysicalMaterial({
      color: 0xe7e5df,
      metalness: 0.04,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const brassMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4a853,
      metalness: 0.94,
      roughness: 0.18,
    });
    const mastWoodMat = new THREE.MeshStandardMaterial({
      color: 0x4b3322,
      metalness: 0.08,
      roughness: 0.65,
    });
    const coatMat = new THREE.MeshStandardMaterial({
      color: 0xd6cfc2,
      metalness: 0.08,
      roughness: 0.72,
    });
    const scarfMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.1,
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xdcb898,
      metalness: 0.05,
      roughness: 0.58,
    });
    const trousersMat = new THREE.MeshStandardMaterial({
      color: 0x262936,
      metalness: 0.08,
      roughness: 0.74,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      metalness: 0.25,
      roughness: 0.42,
    });

    materials.push(
      hullDarkMat,
      deckWoodMat,
      sailMat,
      brassMat,
      mastWoodMat,
      coatMat,
      scarfMat,
      skinMat,
      trousersMat,
      bootMat
    );

    // Sculpted Ship Hull Shape (XY silhouette extruded/beveled along height, then oriented along Z)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, -4.6); // sharp prow (-Z)
    hullShape.bezierCurveTo(1.25, -3.2, 1.55, -0.5, 1.38, 2.2);
    hullShape.lineTo(1.05, 4.1); // stern quarter
    hullShape.lineTo(-1.05, 4.1);
    hullShape.lineTo(-1.38, 2.2);
    hullShape.bezierCurveTo(-1.55, -0.5, -1.25, -3.2, 0, -4.6);
    hullShape.closePath();

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.95,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.16,
      bevelSegments: 4,
    });
    hullGeo.rotateX(Math.PI / 2);
    geometries.push(hullGeo);

    const hullMesh = new THREE.Mesh(hullGeo, hullDarkMat);
    hullMesh.position.y = 0.0;
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    shipGroup.add(hullMesh);

    // Main Wooden Deck (inset slightly above hull top)
    const deckGeo = new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.08,
      bevelEnabled: false,
    });
    deckGeo.rotateX(Math.PI / 2);
    deckGeo.scale(0.86, 1, 0.93);
    geometries.push(deckGeo);
    const deckMesh = new THREE.Mesh(deckGeo, deckWoodMat);
    deckMesh.position.y = 0.14;
    deckMesh.receiveShadow = true;
    shipGroup.add(deckMesh);

    // Raised Aft Quarterdeck Platform where the Helmsman stands (at +Z = 1.85..3.9)
    const qDeckGeo = new THREE.BoxGeometry(2.15, 0.28, 2.15);
    geometries.push(qDeckGeo);
    const qDeckMesh = new THREE.Mesh(qDeckGeo, deckWoodMat);
    qDeckMesh.position.set(0, 0.26, 2.85);
    qDeckMesh.castShadow = true;
    qDeckMesh.receiveShadow = true;
    shipGroup.add(qDeckMesh);

    // Brass Trim Railings along hull sides & stern
    const sternRailGeo = new THREE.BoxGeometry(2.2, 0.07, 0.07);
    geometries.push(sternRailGeo);
    const sternRail = new THREE.Mesh(sternRailGeo, brassMat);
    sternRail.position.set(0, 0.72, 3.92);
    shipGroup.add(sternRail);

    const railPostGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.36, 10);
    geometries.push(railPostGeo);
    [-1.0, -0.5, 0, 0.5, 1.0].forEach((rx) => {
      const post = new THREE.Mesh(railPostGeo, brassMat);
      post.position.set(rx, 0.54, 3.92);
      shipGroup.add(post);
    });

    // Bowsprit Spar (+forward toward -Z)
    const bowspritGeo = new THREE.CylinderGeometry(0.04, 0.09, 2.2, 12);
    geometries.push(bowspritGeo);
    const bowsprit = new THREE.Mesh(bowspritGeo, mastWoodMat);
    bowsprit.rotation.x = Math.PI / 2 - 0.18;
    bowsprit.position.set(0, 0.42, -5.2);
    shipGroup.add(bowsprit);

    // Twin Masts & Billowing Curved Canvas Sails
    const createMastWithSail = (zPos: number, height: number, sailW: number, sailH: number) => {
      const mastGroup = new THREE.Group();
      mastGroup.position.set(0, 0.14, zPos);

      const mastGeo = new THREE.CylinderGeometry(0.06, 0.1, height, 14);
      const yardGeo = new THREE.CylinderGeometry(0.035, 0.045, sailW + 0.5, 12);
      yardGeo.rotateZ(Math.PI / 2);
      geometries.push(mastGeo, yardGeo);

      const mast = new THREE.Mesh(mastGeo, mastWoodMat);
      mast.position.y = height * 0.5;
      mast.castShadow = true;
      mastGroup.add(mast);

      const topYard = new THREE.Mesh(yardGeo, mastWoodMat);
      topYard.position.y = height * 0.85;
      mastGroup.add(topYard);

      const botYard = new THREE.Mesh(yardGeo, mastWoodMat);
      botYard.position.y = height * 0.85 - sailH;
      mastGroup.add(botYard);

      // Curved billowing sail geometry
      const sailGeo = new THREE.PlaneGeometry(sailW, sailH, 16, 12);
      const posAttr = sailGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const nx = vx / (sailW * 0.5);
        const ny = vy / (sailH * 0.5);
        const billow = Math.cos(nx * Math.PI * 0.5) * Math.cos(ny * Math.PI * 0.5) * 0.48;
        posAttr.setZ(i, -billow);
      }
      sailGeo.computeVertexNormals();
      geometries.push(sailGeo);

      const sailMesh = new THREE.Mesh(sailGeo, sailMat);
      sailMesh.position.set(0, height * 0.85 - sailH * 0.5, -0.08);
      sailMesh.castShadow = true;
      mastGroup.add(sailMesh);

      return mastGroup;
    };

    // Mainmast & Foremast
    shipGroup.add(createMastWithSail(-0.45, 4.4, 3.1, 2.35));
    shipGroup.add(createMastWithSail(-2.65, 3.5, 2.3, 1.85));

    // =========================================================================
    // 2. SHIP HELM PEDESTAL & SPOKED WHEEL (Quarterdeck at z = 2.55)
    // =========================================================================
    const helmRigGroup = new THREE.Group();
    helmRigGroup.position.set(0, 0.4, 2.55); // Seated directly on top of quarterdeck (0.26 + 0.14)
    shipGroup.add(helmRigGroup);

    const pedestalGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.92, 16);
    const axleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.34, 12);
    axleGeo.rotateX(Math.PI / 2);
    geometries.push(pedestalGeo, axleGeo);

    const pedestal = new THREE.Mesh(pedestalGeo, mastWoodMat);
    pedestal.position.y = 0.46;
    pedestal.castShadow = true;
    helmRigGroup.add(pedestal);

    const axle = new THREE.Mesh(axleGeo, brassMat);
    axle.position.set(0, 0.86, 0.05);
    helmRigGroup.add(axle);

    const helmWheelGroup = new THREE.Group();
    helmWheelGroup.position.set(0, 0.86, 0.16);
    helmRigGroup.add(helmWheelGroup);

    const wheelRimGeo = new THREE.TorusGeometry(0.36, 0.032, 12, 32);
    const wheelHubGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.09, 16);
    wheelHubGeo.rotateX(Math.PI / 2);
    const spokeGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.88, 8);
    const handleTipGeo = new THREE.SphereGeometry(0.032, 10, 10);
    geometries.push(wheelRimGeo, wheelHubGeo, spokeGeo, handleTipGeo);

    const wheelRim = new THREE.Mesh(wheelRimGeo, mastWoodMat);
    wheelRim.castShadow = true;
    helmWheelGroup.add(wheelRim);

    const wheelHub = new THREE.Mesh(wheelHubGeo, brassMat);
    helmWheelGroup.add(wheelHub);

    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(spokeGeo, brassMat);
      spoke.rotation.z = (s * Math.PI) / 4;
      helmWheelGroup.add(spoke);

      const angle = (s * Math.PI) / 4;
      const tip1 = new THREE.Mesh(handleTipGeo, mastWoodMat);
      tip1.position.set(Math.sin(angle) * 0.44, Math.cos(angle) * 0.44, 0);
      helmWheelGroup.add(tip1);

      const tip2 = new THREE.Mesh(handleTipGeo, mastWoodMat);
      tip2.position.set(-Math.sin(angle) * 0.44, -Math.cos(angle) * 0.44, 0);
      helmWheelGroup.add(tip2);
    }

    // =========================================================================
    // 3. COMPOSITE FULL-BODY HELMSMAN / CAPTAIN STEERING AT THE WHEEL
    // Grounded at z = 3.22, y = 0.40 facing forward (-Z) toward the helm wheel
    // =========================================================================
    const helmsmanGroup = new THREE.Group();
    helmsmanGroup.position.set(0, 0.4, 3.22);
    shipGroup.add(helmsmanGroup);

    // Boots (grounded bottom-center at y = 0)
    const bootGeo = new THREE.BoxGeometry(0.14, 0.12, 0.24);
    const legGeo = new THREE.CylinderGeometry(0.075, 0.062, 0.68, 12);
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.64, 16);
    const coatSkirtGeo = new THREE.CylinderGeometry(0.21, 0.28, 0.46, 16, 1, true);
    const shoulderGeo = new THREE.SphereGeometry(0.085, 12, 12);
    const armGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.56, 12);
    const handGeo = new THREE.SphereGeometry(0.048, 10, 10);
    const headGeo = new THREE.SphereGeometry(0.135, 18, 18);
    const capBrimGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 18);
    const scarfGeo = new THREE.PlaneGeometry(0.16, 0.72, 4, 8);
    geometries.push(
      bootGeo,
      legGeo,
      torsoGeo,
      coatSkirtGeo,
      shoulderGeo,
      armGeo,
      handGeo,
      headGeo,
      capBrimGeo,
      scarfGeo
    );

    [-0.13, 0.13].forEach((xSide) => {
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(xSide, 0.06, -0.04);
      boot.castShadow = true;
      helmsmanGroup.add(boot);

      const leg = new THREE.Mesh(legGeo, trousersMat);
      leg.position.set(xSide, 0.44, 0);
      leg.castShadow = true;
      helmsmanGroup.add(leg);
    });

    const torso = new THREE.Mesh(torsoGeo, coatMat);
    torso.position.set(0, 1.06, 0);
    torso.castShadow = true;
    helmsmanGroup.add(torso);

    const coatSkirt = new THREE.Mesh(coatSkirtGeo, coatMat);
    coatSkirt.position.set(0, 0.78, 0.02);
    coatSkirt.rotation.x = 0.08;
    helmsmanGroup.add(coatSkirt);

    // Neck & Head
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.52, -0.02);
    head.castShadow = true;
    helmsmanGroup.add(head);

    const captainCap = new THREE.Mesh(capBrimGeo, brassMat);
    captainCap.position.set(0, 1.62, -0.04);
    captainCap.rotation.x = -0.12;
    helmsmanGroup.add(captainCap);

    // Flowing scarf trailing in sky wind (+Z)
    const scarfMesh = new THREE.Mesh(scarfGeo, scarfMat);
    scarfMesh.position.set(0.06, 1.24, 0.36);
    scarfMesh.rotation.x = Math.PI / 2 - 0.32;
    helmsmanGroup.add(scarfMesh);

    // Articulated Left & Right Arms reaching forward to grip helm wheel at z_local ~ -0.78
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.22, 1.32, -0.02);
    helmsmanGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.22, 1.32, -0.02);
    helmsmanGroup.add(rightArmPivot);

    const buildArm = (pivot: THREE.Group, inwardSign: number) => {
      const sh = new THREE.Mesh(shoulderGeo, coatMat);
      pivot.add(sh);

      const limb = new THREE.Mesh(armGeo, coatMat);
      limb.position.set(0, -0.26, 0);
      limb.castShadow = true;
      pivot.add(limb);

      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.set(0, -0.54, 0);
      pivot.add(hand);

      // Reach forward (-Z) and downward toward the helm rim
      pivot.rotation.set(1.14, 0, inwardSign * 0.14);
    };

    buildArm(leftArmPivot, -1);
    buildArm(rightArmPivot, 1);

    // =========================================================================
    // 4. DRIFTING SKY CLOUDS BELOW + WARP SPEED STREAKS DURING RAPID ZOOM
    // =========================================================================
    const cloudTex = createSoftCloudTexture();
    textures.push(cloudTex);
    const cloudMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cloudGeo = new THREE.PlaneGeometry(1, 1);
    geometries.push(cloudGeo);
    materials.push(cloudMat);

    const clouds: { mesh: THREE.Mesh; speed: number; baseZ: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(cloudGeo, cloudMat);
      const scale = 5.5 + (i % 5) * 2.4;
      m.scale.set(scale, scale, 1);
      m.rotation.x = -Math.PI / 2;
      const zPos = -24 + i * 2.2;
      m.position.set(
        Math.sin(i * 3.1) * 14,
        -3.5 - (i % 4) * 2.2,
        zPos
      );
      scene.add(m);
      clouds.push({ mesh: m, speed: 1.6 + (i % 4) * 0.55, baseZ: zPos });
    }

    // Hyperspeed Warp Streaks (InstancedMesh) visible during Stage 3 rapid zoom
    const streakCount = 120;
    const streakGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    geometries.push(streakGeo);
    materials.push(streakMat);

    const warpStreaks = new THREE.InstancedMesh(streakGeo, streakMat, streakCount);
    warpStreaks.frustumCulled = false;
    scene.add(warpStreaks);

    const streakData = Array.from({ length: streakCount }, (_, i) => {
      const angle = (i / streakCount) * Math.PI * 2 + (i % 7) * 0.35;
      const radius = 2.4 + ((i * 1.37) % 8.5);
      const yBase = 1.5 + ((i * 2.13) % 19);
      return { angle, radius, yBase, speed: 14 + (i % 5) * 4 };
    });

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let disposed = false;
    let gpuBusy = false;
    let cooldownUntil = 0;
    let fenceTimerId = 0;
    let elapsed = 0;
    let smoothProgress = 0;
    let currentFov = 36;

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

    const removeEffect = addFrameEffect(20, (timeMs, delta) => {
      if (disposed) return;

      elapsed += Math.min(delta, 0.05);

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const totalTravel = Math.max(rect.height - vh, 1);

      // Pause GPU renders when entirely off-screen above/below viewport
      if (rect.bottom < -100 || rect.top > vh + 100) {
        return;
      }

      const rawProgress = THREE.MathUtils.clamp(-rect.top / totalTravel, 0, 1);
      smoothProgress = THREE.MathUtils.damp(
        smoothProgress,
        rawProgress,
        6.5,
        Math.min(delta, 0.05)
      );
      const p = smoothProgress;

      // Sync atmospheric fog & sky colors with Light/Dark theme
      const isDark = themeRef.current === 'dark';
      fog.color.setHex(isDark ? 0x060d3d : 0xc8e3fa);
      streakMat.color.setHex(isDark ? 0xe0f2fe : 0x0f172a);

      // Gentle ambient motion: ship sailing pitch/roll & wheel steering back and forth
      const steerCycle = Math.sin(elapsed * 1.45);
      shipGroup.position.y = Math.sin(elapsed * 1.1) * 0.08;
      shipGroup.rotation.z = Math.sin(elapsed * 0.9) * 0.032 + steerCycle * 0.025;
      shipGroup.rotation.x = Math.cos(elapsed * 1.1) * 0.015;

      // Animate clouds streaming past stern (+Z)
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.mesh.position.z += c.speed * delta * (1 + smoothstep(0.44, 0.68, p) * 2.5);
        if (c.mesh.position.z > 24) c.mesh.position.z = -24;
      }

      // Helmsman gripping & turning the spoked ship's wheel
      const steerAmount = smoothstep(0.62, 0.85, p);
      const wheelRot = steerCycle * (0.42 + steerAmount * 0.45);
      helmWheelGroup.rotation.z = wheelRot;
      leftArmPivot.rotation.z = -0.14 - wheelRot * 0.18;
      rightArmPivot.rotation.z = 0.14 - wheelRot * 0.18;
      leftArmPivot.rotation.x = 1.14 + Math.sin(wheelRot) * 0.08;
      rightArmPivot.rotation.x = 1.14 - Math.sin(wheelRot) * 0.08;
      scarfMesh.rotation.z = Math.sin(elapsed * 5.2) * 0.14;

      // =========================================================================
      // 5-STAGE CAMERA CHOREOGRAPHY DRIVEN BY SCROLL PROGRESS (p = 0 -> 1)
      // =========================================================================
      // tDive: rapid hyperspeed zoom from sky down toward the ship (0.44 -> 0.68)
      const tDive = smoothstep(0.44, 0.68, p);
      // tHands: close angle focused on hands & wheel steering (0.66 -> 0.84)
      const tHands = smoothstep(0.66, 0.84, p);
      // tFullBody: pull smoothly back/side at scroll end to frame FULL BODY steering ship (0.84 -> 1.0)
      const tFullBody = smoothstep(0.84, 1.0, p);

      // Camera Position keyframes:
      // Stage 1-2 (Vertical Top-Down Sky): (0, 22, 0.05) -> (0, 17, 0.5)
      // Stage 3 (Rapid Fast Zoom into Deck): plunges down to (0.65, 3.2, 4.2)
      // Stage 4 (Steering Close-up): (0.48, 2.05, 3.75) focusing on hands/wheel
      // Stage 5 (Full Body Helmsman at Scroll End): (-1.45, 2.25, 4.85) framing entire pilot + helm + stern
      _camPosTarget.set(0, 22, 0.05);
      _camLookTarget.set(0, 0, -0.3);
      _camUpTarget.set(0, 0, -1);

      if (tDive > 0) {
        // Vertical plunge + transition from vertical top-down Z-up to horizontal horizon Y-up
        const plungeT = Math.pow(tDive, 1.45); // exponential snappy speed zoom!
        _camPosTarget.set(
          THREE.MathUtils.lerp(0, 0.52, plungeT),
          THREE.MathUtils.lerp(22, 2.15, plungeT),
          THREE.MathUtils.lerp(0.05, 3.85, plungeT)
        );
        _camLookTarget.set(
          0,
          THREE.MathUtils.lerp(0, 1.18, plungeT),
          THREE.MathUtils.lerp(-0.3, 2.48, plungeT)
        );
        _camUpTarget
          .set(0, THREE.MathUtils.lerp(0.01, 1, plungeT), THREE.MathUtils.lerp(-1, 0, plungeT))
          .normalize();
      }

      if (tHands > 0) {
        _camPosTarget.set(
          THREE.MathUtils.lerp(_camPosTarget.x, 0.62, tHands),
          THREE.MathUtils.lerp(_camPosTarget.y, 1.98, tHands),
          THREE.MathUtils.lerp(_camPosTarget.z, 3.65, tHands)
        );
        _camLookTarget.set(
          0,
          THREE.MathUtils.lerp(_camLookTarget.y, 1.24, tHands),
          THREE.MathUtils.lerp(_camLookTarget.z, 2.56, tHands)
        );
      }

      if (tFullBody > 0) {
        // Pull into heroic full-body framing showing head to boots standing at helm + ship ahead
        _camPosTarget.set(
          THREE.MathUtils.lerp(_camPosTarget.x, -1.55, tFullBody),
          THREE.MathUtils.lerp(_camPosTarget.y, 2.05, tFullBody),
          THREE.MathUtils.lerp(_camPosTarget.z, 5.15, tFullBody)
        );
        _camLookTarget.set(
          THREE.MathUtils.lerp(_camLookTarget.x, 0.0, tFullBody),
          THREE.MathUtils.lerp(_camLookTarget.y, 1.15, tFullBody),
          THREE.MathUtils.lerp(_camLookTarget.z, 2.35, tFullBody)
        );
      }

      camera.position.lerp(_camPosTarget, Math.min(1, delta * 8.5));
      _camLookCurrent.lerp(_camLookTarget, Math.min(1, delta * 8.5));
      _camUpCurrent.lerp(_camUpTarget, Math.min(1, delta * 8.5)).normalize();
      camera.up.copy(_camUpCurrent);
      camera.lookAt(_camLookCurrent);

      // Rapid Warp FOV surge mid-zoom (peaks cleanly during Stage 3 dive!)
      const zoomVelocityBell = Math.sin(tDive * Math.PI) * (tDive > 0 && tDive < 1 ? 1 : 0);
      const targetFov = 36 + zoomVelocityBell * 26;
      currentFov = THREE.MathUtils.damp(currentFov, targetFov, 12, Math.min(delta, 0.05));
      if (Math.abs(camera.fov - currentFov) > 0.02) {
        camera.fov = currentFov;
        camera.updateProjectionMatrix();
      }

      // Warp Streaks visibility & speed during dive zoom
      streakMat.opacity = zoomVelocityBell * 0.65;
      if (zoomVelocityBell > 0.01) {
        for (let i = 0; i < streakCount; i++) {
          const d = streakData[i];
          const yCycle = (d.yBase + elapsed * d.speed) % 20;
          _dummyObj.position.set(
            Math.cos(d.angle) * d.radius,
            yCycle,
            Math.sin(d.angle) * d.radius
          );
          _dummyObj.scale.set(1, 0.8 + zoomVelocityBell * 3.8, 1);
          _dummyObj.updateMatrix();
          warpStreaks.setMatrixAt(i, _dummyObj.matrix);
        }
        warpStreaks.instanceMatrix.needsUpdate = true;
      }

      // =========================================================================
      // DOM OPTICAL TELESCOPE / MICROSCOPE & TYPOGRAPHY OVERLAYS (Zero Lag)
      // =========================================================================
      // Telescope/Microscope aperture fades in (0.18 -> 0.28), holds (0.28 -> 0.48), zooms out wide (0.48 -> 0.64)
      const lensEnter = smoothstep(0.16, 0.27, p);
      const lensExit = 1 - smoothstep(0.49, 0.64, p);
      const lensAlpha = lensEnter * lensExit;
      const lensScale = 1 + smoothstep(0.44, 0.64, p) * 2.4;

      if (reticleRef.current) {
        reticleRef.current.style.opacity = lensAlpha.toFixed(3);
        reticleRef.current.style.transform = `scale(${lensScale.toFixed(3)})`;
      }
      if (reticleRingOuterRef.current) {
        reticleRingOuterRef.current.style.transform = `rotate(${(p * 140).toFixed(1)}deg)`;
      }
      if (reticleRingInnerRef.current) {
        reticleRingInnerRef.current.style.transform = `rotate(${(-p * 210).toFixed(1)}deg)`;
      }

      // "Creative would be only one thing" appears crisp inside the microscope reticle (0.27 -> 0.52)
      const phraseIn = smoothstep(0.27, 0.35, p);
      const phraseOut = 1 - smoothstep(0.45, 0.56, p);
      const phraseAlpha = phraseIn * phraseOut;
      const phraseZoom = 0.94 + phraseIn * 0.06 + smoothstep(0.45, 0.56, p) * 0.65;

      if (phraseRef.current) {
        phraseRef.current.style.opacity = phraseAlpha.toFixed(3);
        phraseRef.current.style.transform = `scale(${phraseZoom.toFixed(3)})`;
      }

      if (zoomBurstRef.current) {
        zoomBurstRef.current.style.opacity = (zoomVelocityBell * 0.55).toFixed(3);
        zoomBurstRef.current.style.transform = `scale(${(0.85 + tDive * 0.65).toFixed(3)})`;
      }

      if (magReadoutRef.current) {
        const mag = 1.0 + tDive * 11.5;
        magReadoutRef.current.textContent = `MAG ${mag.toFixed(1)}×`;
      }

      if (stageLabelRef.current) {
        if (p < 0.22) {
          stageLabelRef.current.textContent = '01 // OVERHEAD SKY TRAVERSE';
        } else if (p < 0.45) {
          stageLabelRef.current.textContent = '02 // OPTICAL LOCK — TARGET ACQUIRED';
        } else if (p < 0.68) {
          stageLabelRef.current.textContent = '03 // HYPERSPEED OPTICAL DIVE';
        } else if (p < 0.84) {
          stageLabelRef.current.textContent = '04 // QUARTERDECK HELM CONTROL';
        } else {
          stageLabelRef.current.textContent = '05 // STEERING TOWARD BEYOND';
        }
      }

      if (steeringCaptionRef.current) {
        const capAlpha = smoothstep(0.82, 0.94, p);
        steeringCaptionRef.current.style.opacity = capAlpha.toFixed(3);
        steeringCaptionRef.current.style.transform = `translate3d(0, ${((1 - capAlpha) * 16).toFixed(1)}px, 0)`;
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
      window.removeEventListener('resize', handleResize);

      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Creative Sky Ship Voyage"
      className="relative w-full h-[520vh] z-10"
    >
      <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center">
        {/* Isolated Three.js Canvas Mount */}
        <div ref={canvasMountRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Stage 3 Rapid Warp Speed Vignette (Fires during Stage 3 Dive Zoom) */}
        <div
          ref={zoomBurstRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-0"
          style={{
            background:
              theme === 'dark'
                ? 'radial-gradient(circle at center, rgba(6,13,61,0) 24%, rgba(96,165,250,0.16) 62%, rgba(6,13,61,0.85) 100%)'
                : 'radial-gradient(circle at center, rgba(200,227,250,0) 24%, rgba(13,17,23,0.14) 62%, rgba(200,227,250,0.85) 100%)',
          }}
        />

        {/* Stage 2 Microscope / Telescope Calibrated Optical Reticle */}
        <div
          ref={reticleRef}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 will-change-transform"
        >
          {/* Circular Lens Aperture Darkening Outer Peripheral Frame */}
          <div
            className="absolute inset-0"
            style={{
              background:
                theme === 'dark'
                  ? 'radial-gradient(circle min(38vw, 340px) at center, transparent 62%, rgba(4,9,43,0.52) 78%, rgba(4,9,43,0.88) 100%)'
                  : 'radial-gradient(circle min(38vw, 340px) at center, transparent 62%, rgba(190,224,250,0.48) 78%, rgba(190,224,250,0.88) 100%)',
            }}
          />

          {/* Outer Calibrated Telescope Ring */}
          <div
            ref={reticleRingOuterRef}
            className="relative w-[min(74vw,520px)] h-[min(74vw,520px)] rounded-full border border-current/35 flex items-center justify-center"
          >
            {/* Cardinal Optical Ticks */}
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-4 bg-current opacity-80" />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[1px] h-4 bg-current opacity-80" />
            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-[1px] w-4 bg-current opacity-80" />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-[1px] w-4 bg-current opacity-80" />

            {/* Inner Rotating Vernier Ring */}
            <div
              ref={reticleRingInnerRef}
              className="w-[74%] h-[74%] rounded-full border border-dashed border-current/30 flex items-center justify-center"
            />
          </div>

          {/* Static Crosshair Lines */}
          <div className="absolute w-10 h-[1px] bg-current opacity-65" />
          <div className="absolute h-10 w-[1px] bg-current opacity-65" />
        </div>

        {/* Stage 2 Central Optical Statement Inside Telescope */}
        <div
          ref={phraseRef}
          className="relative z-20 px-6 text-center pointer-events-none opacity-0 will-change-transform max-w-2xl"
        >
          <p className="font-pixel text-[10px] sm:text-xs tracking-[0.28em] uppercase opacity-70 mb-3">
            OPTICAL FOCUS LOCKED
          </p>
          <h3 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase font-sans leading-[1.02]">
            Creative would be only one thing
          </h3>
        </div>

        {/* Corner HUD Telemetry Readouts */}
        <div className="absolute top-20 left-6 sm:left-12 right-6 sm:right-12 flex items-center justify-between font-pixel text-[10px] sm:text-xs uppercase opacity-75 pointer-events-none">
          <span ref={stageLabelRef}>01 // OVERHEAD SKY TRAVERSE</span>
          <span ref={magReadoutRef} className="tabular-nums">
            MAG 1.0×
          </span>
        </div>

        {/* Stage 5 Closing Full-Body Helmsman Caption */}
        <div
          ref={steeringCaptionRef}
          className="absolute bottom-14 left-6 sm:left-12 right-6 sm:right-12 flex items-end justify-between gap-4 pointer-events-none opacity-0"
        >
          <div>
            <span className="font-pixel text-[10px] tracking-[0.22em] uppercase opacity-65 block mb-1">
              AT THE HELM
            </span>
            <p className="text-lg sm:text-2xl font-bold tracking-tight uppercase font-sans">
              Steering craft through uncharted skies.
            </p>
          </div>
          <span className="font-pixel text-[10px] sm:text-xs opacity-65 uppercase shrink-0">
            KEEP SCROLLING ↓
          </span>
        </div>
      </div>
    </section>
  );
}
