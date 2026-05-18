import React, { useState, useEffect, useRef } from 'react';
import { Rekognition } from "@aws-sdk/client-rekognition";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import * as THREE from 'three';

// ── WebGL Three.js Super-Detailed Galaxy Scanner ──
function ThreeGalaxyScanner({ scanState, screen }) {
  const mountRef = useRef(null);
  const scanStateRef = useRef(scanState);
  const screenRef = useRef(screen);

  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060613, 0.012);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 10, 16);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: mountRef.current, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ── Ultra-Realistic Logarithmic Spiral Galaxy Physics (45,000 Particle Physics) ──
    const starCount = 45000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const colorCore = new THREE.Color('#ffffff');
    const colorInner = new THREE.Color('#ffe17d');
    const colorMiddle = new THREE.Color('#ff7c6a');
    const colorOuter = new THREE.Color('#7a5cff');
    const colorCyan = new THREE.Color('#5cf0ff');

    for (let i = 0; i < starCount; i++) {
      let x = 0, y = 0, z = 0;
      let dist = 0;

      // Classify stars into Bulge, Central Bar, or Logarithmic Spiral Arms
      const randType = Math.random();

      if (randType < 0.25) {
        // 1. Central Bulge (Dense glowing spherical starburst core)
        const radius = Math.pow(Math.random(), 2.2) * 1.4;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(Math.random() * 2 - 1);
        
        x = radius * Math.sin(theta) * Math.cos(phi);
        y = radius * Math.sin(theta) * Math.sin(phi) * 0.7; // slightly flattened bulge
        z = radius * Math.cos(theta);
        dist = radius;
      } 
      else if (randType < 0.45) {
        // 2. Galactic Central Bar (Smooth connection core-to-arms)
        const length = (Math.random() - 0.5) * 4.0;
        const barWidth = 0.5;
        const spreadY = (Math.random() - 0.5) * 0.2;
        
        // Rotate central bar slightly for natural diagonal alignment
        const angle = -0.4; 
        const rawX = length;
        const rawZ = (Math.random() - 0.5) * barWidth * (1.0 - Math.abs(length) / 2.5); // tapered ends
        
        x = rawX * Math.cos(angle) - rawZ * Math.sin(angle);
        z = rawX * Math.sin(angle) + rawZ * Math.cos(angle);
        y = spreadY;
        dist = Math.sqrt(x*x + z*z);
      } 
      else {
        // 3. Elegant Logarithmic Spiral Arms
        const arm = Math.random() < 0.5 ? 0 : Math.PI;
        const theta = Math.random() * Math.PI * 3.5; // winding angle
        
        // Logarithmic spiral math: radius grows exponentially
        const barLength = 2.0;
        const r = barLength + theta * 1.5; 
        
        // Dispersion/scatter that increases with distance for a natural gaseous look
        const dispersion = theta * 0.28 + 0.15;
        const spreadX = (Math.random() - 0.5) * dispersion;
        const spreadZ = (Math.random() - 0.5) * dispersion;
        const spreadY = (Math.random() - 0.5) * (dispersion * 0.35);

        // Align starting arms with bar ends
        const armStartAngle = -0.4;
        x = Math.cos(theta + arm + armStartAngle) * r + spreadX;
        z = Math.sin(theta + arm + armStartAngle) * r + spreadZ;
        y = spreadY;
        dist = Math.sqrt(x*x + z*z);
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      let mixedColor = colorCore.clone();
      if (dist < 1.2) {
        mixedColor.lerp(colorInner, dist / 1.2);
      } else if (dist < 3.2) {
        mixedColor = colorInner.clone().lerp(colorMiddle, (dist - 1.2) / 2.0);
      } else if (dist < 6.0) {
        mixedColor = colorMiddle.clone().lerp(colorOuter, (dist - 3.2) / 2.8);
      } else {
        mixedColor = colorOuter.clone().lerp(colorCyan, Math.min(1.0, (dist - 6.0) / 4.0));
      }

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Programmatic glowing dot particle texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d');
    const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 16, 16);
    const texture = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: texture
    });

    const galaxyPoints = new THREE.Points(geometry, material);
    scene.add(galaxyPoints);


    // ── Gaseous Nebula Cloud Generator (6,000 Cosmic Gas Particles) ──
    const nebCount = 6000;
    const nebGeometry = new THREE.BufferGeometry();
    const nebPositions = new Float32Array(nebCount * 3);
    const nebColors = new Float32Array(nebCount * 3);

    for (let i = 0; i < nebCount; i++) {
      let x = 0, y = 0, z = 0;
      let dist = 0;
      const randType = Math.random();

      if (randType < 0.3) {
        // Core bulge gas
        const radius = Math.pow(Math.random(), 1.8) * 1.6;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(Math.random() * 2 - 1);
        x = radius * Math.sin(theta) * Math.cos(phi);
        y = radius * Math.sin(theta) * Math.sin(phi) * 0.6;
        z = radius * Math.cos(theta);
        dist = radius;
      } else {
        // Arm gas clouds
        const arm = Math.random() < 0.5 ? 0 : Math.PI;
        const theta = Math.random() * Math.PI * 3.2;
        const barLength = 1.8;
        const r = barLength + theta * 1.4;
        
        // Gas has even wider dispersion than stars
        const dispersion = theta * 0.42 + 0.3;
        const spreadX = (Math.random() - 0.5) * dispersion;
        const spreadZ = (Math.random() - 0.5) * dispersion;
        const spreadY = (Math.random() - 0.5) * (dispersion * 0.4);

        const armStartAngle = -0.4;
        x = Math.cos(theta + arm + armStartAngle) * r + spreadX;
        z = Math.sin(theta + arm + armStartAngle) * r + spreadZ;
        y = spreadY;
        dist = Math.sqrt(x*x + z*z);
      }

      nebPositions[i * 3] = x;
      nebPositions[i * 3 + 1] = y;
      nebPositions[i * 3 + 2] = z;

      let mixedColor = colorCore.clone();
      if (dist < 1.2) {
        mixedColor.lerp(colorInner, dist / 1.2);
      } else if (dist < 3.2) {
        mixedColor = colorInner.clone().lerp(colorMiddle, (dist - 1.2) / 2.0);
      } else if (dist < 6.0) {
        mixedColor = colorMiddle.clone().lerp(colorOuter, (dist - 3.2) / 2.8);
      } else {
        mixedColor = colorOuter.clone().lerp(colorCyan, Math.min(1.0, (dist - 6.0) / 4.0));
      }

      nebColors[i * 3] = mixedColor.r;
      nebColors[i * 3 + 1] = mixedColor.g;
      nebColors[i * 3 + 2] = mixedColor.b;
    }

    nebGeometry.setAttribute('position', new THREE.BufferAttribute(nebPositions, 3));
    nebGeometry.setAttribute('color', new THREE.BufferAttribute(nebColors, 3));

    // Large diffuse texture for gas clouds
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 64;
    gCanvas.height = 64;
    const gCtx = gCanvas.getContext('2d');
    const gGrad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    gGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.06)');
    gGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    gCtx.fillStyle = gGrad;
    gCtx.fillRect(0, 0, 64, 64);
    const nebTexture = new THREE.CanvasTexture(gCanvas);

    const nebMaterial = new THREE.PointsMaterial({
      size: 0.95,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: nebTexture
    });

    const nebulaPoints = new THREE.Points(nebGeometry, nebMaterial);
    scene.add(nebulaPoints);


    // ── Holographic Scanning Plane & Grid (WebGL) ──
    const scanPlaneGeom = new THREE.PlaneGeometry(20, 20);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x5cf0ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeom, scanPlaneMat);
    scanPlane.rotation.x = Math.PI / 2;
    scene.add(scanPlane);

    const scanGrid = new THREE.GridHelper(20, 20, 0x5cf0ff, 0x5cf0ff);
    scanGrid.material.transparent = true;
    scanGrid.material.opacity = 0.18;
    scanGrid.material.depthWrite = false;
    scene.add(scanGrid);

    // Sweeping neon laser line
    const laserGeom = new THREE.BufferGeometry();
    const laserPos = new Float32Array([
      -10, 0, 0,
       10, 0, 0
    ]);
    laserGeom.setAttribute('position', new THREE.BufferAttribute(laserPos, 3));
    const laserMat = new THREE.LineBasicMaterial({
      color: 0x5cf0ff,
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    const laserLine = new THREE.Line(laserGeom, laserMat);
    scene.add(laserLine);

    // Persistent target coordinates for the matched student star
    const soulStarPos = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 5
    );

    let clock = new THREE.Clock();
    let animId;
    const curLook = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Galaxy spin speed
      galaxyPoints.rotation.y = elapsedTime * 0.08;
      nebulaPoints.rotation.y = elapsedTime * 0.08;

      if (scanStateRef.current === 'zooming') {
        // Smoothly plunge/zoom camera directly into the coordinates of the selected star!
        camera.position.lerp(new THREE.Vector3(soulStarPos.x, soulStarPos.y + 0.25, soulStarPos.z + 0.95), 0.075);
        curLook.lerp(soulStarPos, 0.075);
        camera.lookAt(curLook);

        // Dynamically accelerate particle size and glow to create a gorgeous warp jump effect!
        material.size = 0.14 + (Math.sin(elapsedTime * 15) * 0.04) + 0.12 * Math.min(1.0, elapsedTime * 0.5);

        // Lock scanning beams onto the target coordinate!
        scanPlane.position.lerp(soulStarPos, 0.075);
        scanGrid.position.lerp(soulStarPos, 0.075);
        laserLine.position.lerp(soulStarPos, 0.075);

        scanPlane.visible = true;
        scanGrid.visible = true;
        laserLine.visible = true;
      } else if (scanStateRef.current === 'loading') {
        // Normal scanning translation (left to right scanning) ONLY during active cognitive scanning
        const sweep = Math.sin(elapsedTime * 1.5) * 7.5;
        scanPlane.position.set(sweep, 0, 0);
        scanGrid.position.set(sweep, 0, 0);
        laserLine.position.set(sweep, 0, 0);

        scanPlane.visible = true;
        scanGrid.visible = true;
        laserLine.visible = true;

        // Reset particle size
        material.size = 0.14;

        // Stable symmetrical frontal scanning camera view (perfectly aligned with the scanning HUD)
        camera.position.lerp(new THREE.Vector3(0, 3.2, 14.5), 0.28);
        camera.lookAt(0, 0.4, 0);
      } else {
        // Completely HIDE scanning grids, sweeping beams and lasers during camera live preview ('scan') or dashboard results ('result-ok', 'result-no')
        scanPlane.position.set(0, -999, 0);
        scanGrid.position.set(0, -999, 0);
        laserLine.position.set(0, -999, 0);

        scanPlane.visible = false;
        scanGrid.visible = false;
        laserLine.visible = false;

        material.size = 0.13;

        // Dynamically adjust camera positioning based on whether we are showing the side-split menu (splash) or centered screens
        if (screenRef.current === 'splash') {
          // Framed beautifully on the right side of the screen
          const targetCamX = 4.2 + Math.sin(elapsedTime * 0.03) * 1.5;
          const targetCamZ = 12.0 + Math.cos(elapsedTime * 0.03) * 1.5;
          camera.position.lerp(new THREE.Vector3(targetCamX, 6.5, targetCamZ), 0.025);
          camera.lookAt(-1.2, 0.2, 0);
        } else {
          // Centered majestic slow cosmic orbit
          const targetCamX = Math.sin(elapsedTime * 0.04) * 11;
          const targetCamZ = 16 + Math.cos(elapsedTime * 0.04) * 4;
          camera.position.lerp(new THREE.Vector3(targetCamX, 9, targetCamZ), 0.025);
          camera.lookAt(0, 0.4, 0);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      scanPlaneGeom.dispose();
      scanPlaneMat.dispose();
      laserGeom.dispose();
      laserMat.dispose();
    };
  }, []);

  return (
    <div className="galaxy-3d-wrapper">
      <canvas ref={mountRef} className="galaxy-3d-canvas" />
    </div>
  );
}

// Subjects Config
const SUBJECTS = [
  { key: 'rel', name: 'Agama', icon: '🕌' },
  { key: 'ppkn', name: 'PPKn', icon: '⚖️' },
  { key: 'indo', name: 'B. Indonesia', icon: '📝' },
  { key: 'eng', name: 'B. Inggris', icon: '🗣️' },
  { key: 'math', name: 'Matematika', icon: '📐' },
  { key: 'ipas', name: 'IPAS', icon: '🧬' },
  { key: 'art', name: 'Seni Budaya', icon: '🎨' },
  { key: 'pe', name: 'PJOK', icon: '🏃' },
  { key: 'jawa', name: 'B. Jawa', icon: '👑' }
];

export default function App() {
  // Navigation & UI States
  const [screen, setScreen] = useState('splash');
  const [showWarpFlash, setShowWarpFlash] = useState(false);
  const [teacherTab, setTeacherTab] = useState('t-reg');
  const [showLogin, setShowLogin] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [toasts, setToasts] = useState([]);
  
  // AWS Credentials Config
  const [cfgKey, setCfgKey] = useState('');
  const [cfgSecret, setCfgSecret] = useState('');
  const [cfgToken, setCfgToken] = useState('');
  const [cfgTable, setCfgTable] = useState('StudentGrades');
  const [cfgCollection, setCfgCollection] = useState('student-faces');
  
  // Clients
  const [rekClient, setRekClient] = useState(null);
  const [dbClient, setDbClient] = useState(null);

  // WebRTC Camera States
  const [cameras, setCameras] = useState([]);
  const [activeCamId, setActiveCamId] = useState(null);
  const [camRunning, setCamRunning] = useState(false);
  const [videoElementId, setVideoElementId] = useState('r-vid'); // 'r-vid' or 's-vid'
  
  // Teacher Quick Scanner Form States
  const [qsState, setQsState] = useState('scanner'); // 'scanner', 'add-event', 'register'
  const [qsStudent, setQsStudent] = useState(null);
  const [qsMsg, setQsMsg] = useState('');
  const [qsMsgType, setQsMsgType] = useState('ok'); // 'ok' or 'fail'
  const [lastCapBase64, setLastCapBase64] = useState('');
  
  // Event / Violation Form
  const [qsEventType, setQsEventType] = useState('grade');
  const [qsSubject, setQsSubject] = useState('math');
  const [qsScore, setQsScore] = useState('');
  const [qsNote, setQsNote] = useState('');

  // Register New Student Form
  const [regNis, setRegNis] = useState('');
  const [regName, setRegName] = useState('');
  const [regClass, setRegClass] = useState('');
  const [regReligion, setRegReligion] = useState('');
  const [regCustomTitle, setRegCustomTitle] = useState('');
  const [regCustomTagline, setRegCustomTagline] = useState('');

  // Student list
  const [students, setStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editViolations, setEditViolations] = useState('');
  const [editGrades, setEditGrades] = useState({});
  const [editCustomTitle, setEditCustomTitle] = useState('');
  const [editCustomTagline, setEditCustomTagline] = useState('');

  // Student Scan Screen States
  const [scanState, setScanState] = useState('scan'); // 'scan', 'loading', 'result-ok', 'result-no'
  const [unknownAttrs, setUnknownAttrs] = useState([]);
  const [matchedStudent, setMatchedStudent] = useState(null);
  const [matchedPhoto, setMatchedPhoto] = useState('');
  const [historySubject, setHistorySubject] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // Video Refs
  const teacherVideoRef = useRef(null);
  const studentVideoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Jakarta Time Helper ──
  const getJakartaTime = () => {
    const options = { timeZone: 'Asia/Jakarta', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());
    const d = {};
    parts.forEach(p => d[p.type] = p.value);
    return `${d.year}-${d.month}-${d.day} ${d.hour}:${d.minute}:${d.second}`;
  };

  // ── Toast Notification helper ──
  const triggerToast = (msg, type = 'ok') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // ── Load AWS config on mount ──
  useEffect(() => {
    const key = import.meta.env.VITE_AWS_ACCESS_KEY_ID || '';
    const secret = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '';
    const token = import.meta.env.VITE_AWS_SESSION_TOKEN || '';
    const table = import.meta.env.VITE_DYNAMODB_TABLE || 'StudentGrades';
    const collection = import.meta.env.VITE_REKOGNITION_COLLECTION || 'student-faces';

    setCfgKey(key);
    setCfgSecret(secret);
    setCfgToken(token);
    setCfgTable(table);
    setCfgCollection(collection);

    if (key && secret) {
      try {
        const credentials = {
          accessKeyId: key,
          secretAccessKey: secret,
          sessionToken: token || undefined
        };

        const rek = new Rekognition({ region: 'us-east-1', credentials });
        const rawDb = new DynamoDB({ region: 'us-east-1', credentials });
        const docDb = DynamoDBDocumentClient.from(rawDb);

        setRekClient(rek);
        setDbClient(docDb);
        triggerToast('AWS SDK V3 successfully configured from Console!', 'ok');
      } catch (err) {
        console.error(err);
        triggerToast('Initialization failure: ' + err.message, 'fail');
      }
    } else {
      triggerToast('AWS credentials missing in Console!', 'fail');
    }
  }, []);

  // ── Sync scanState with body class for canvas transition ──
  useEffect(() => {
    if (scanState === 'loading') {
      document.body.classList.add('loading-scan');
    } else {
      document.body.classList.remove('loading-scan');
    }
    return () => {
      document.body.classList.remove('loading-scan');
    };
  }, [scanState]);

  // ── Background Starry Effects ──
  // ── Background Starry Effects & Physics-Based Celestial Bodies Simulation ──
  useEffect(() => {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const starCount = 200; // Increased count for warp speed glory!
    const stars = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        d: Math.random() * starCount,
        color: ['#7c6aff', '#5cf0ff', '#b07aff', '#ffffff'][Math.floor(Math.random() * 4)],
        // For 3D Warp vortex
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * Math.max(width, height) * 0.5,
        speed: Math.random() * 5 + 3
      });
    }

    // Generate Andromeda spiral galaxy particles once
    const andromedaParticles = [];
    const numAndromeda = 220;
    for (let i = 0; i < numAndromeda; i++) {
      const arm = Math.random() < 0.5 ? 0 : Math.PI;
      const theta = Math.random() * Math.PI * 4.5;
      const r = 4 + Math.pow(theta, 1.45) * 3.8;
      const spread = (Math.random() - 0.5) * (r * 0.22);
      andromedaParticles.push({
        theta,
        r,
        arm,
        spread,
        color: ['#b07aff', '#5cf0ff', '#ffffff', '#7c6aff'][Math.floor(Math.random() * 4)],
        size: Math.random() * 1.4 + 0.4
      });
    }

    // Generate Bima Sakti galaxy particles once
    const milkyWayParticles = [];
    const numMilkyWay = 220;
    for (let i = 0; i < numMilkyWay; i++) {
      const arm = Math.random() < 0.5 ? 0 : Math.PI;
      const theta = Math.random() * Math.PI * 4.0;
      const r = 4 + Math.pow(theta, 1.35) * 4.4;
      const spread = (Math.random() - 0.5) * (r * 0.25);
      milkyWayParticles.push({
        theta,
        r,
        arm,
        spread,
        color: ['#ffd75c', '#ff7c6a', '#ffffff', '#7c6aff'][Math.floor(Math.random() * 4)],
        size: Math.random() * 1.4 + 0.4
      });
    }

    // Generate super detailed central scanning galaxy particles once
    const loadingGalaxyParticles = [];
    const numLoadingGalaxy = 1500; // SUPER DEEP DETAIL!
    for (let i = 0; i < numLoadingGalaxy; i++) {
      const arm = Math.random() < 0.5 ? 0 : Math.PI;
      const theta = Math.random() * Math.PI * 6.5; // many spiral winds
      const r = 5 + Math.pow(theta, 1.35) * 6.0;
      const spread = (Math.random() - 0.5) * (r * 0.22);
      
      const color = [
        'rgba(176, 122, 255, 0.85)',
        'rgba(92, 240, 255, 0.85)',
        'rgba(255, 124, 106, 0.85)',
        'rgba(255, 255, 255, 0.95)',
        'rgba(124, 106, 255, 0.75)'
      ][Math.floor(Math.random() * 5)];
      
      loadingGalaxyParticles.push({
        x: Math.cos(theta + arm) * r + Math.cos(theta + Math.PI/2) * spread,
        y: Math.sin(theta + arm) * r + Math.sin(theta + Math.PI/2) * spread,
        size: Math.random() * 1.5 + 0.4,
        color
      });
    }

    let time = 0;
    let warpFactor = 1.0;
    let animId;

    function draw() {
      const isLoading = document.body.classList.contains('loading-scan');
      const isWarping = document.body.classList.contains('warp-jump');
      
      time += 1;
      
      // Update warp zoom physics
      if (isWarping) {
        warpFactor = Math.min(8.0, warpFactor + 0.12);
      } else {
        warpFactor = Math.max(1.0, warpFactor - 0.15);
      }

      ctx.clearRect(0, 0, width, height);
        
        // Draw static drifting stars first (background layer)
        stars.forEach(s => {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          s.d += 0.015;
          ctx.globalAlpha = Math.abs(Math.sin(s.d)) * (1.0 / warpFactor); // fade out stars as we warp!
          ctx.fill();

          // Gentle cosmic drifting drift
          s.x += Math.cos(s.d * 0.1) * 0.05;
          s.y += Math.sin(s.d * 0.1) * 0.05;
          if (s.x < 0 || s.x > width) s.x = Math.random() * width;
          if (s.y < 0 || s.y > height) s.y = Math.random() * height;
        });
        
        ctx.globalAlpha = 1.0; // reset transparency for primary celestial bodies

        // Draw Celestial Bodies mathematically (under physics simulation)
        const centerX = width / 2;
        const centerY = height / 2;

        // Calculate positions dynamically from viewport, scaled by warpFactor (warp zoom out)
        const getWarpPos = (origX, origY) => {
          return {
            x: centerX + (origX - centerX) * warpFactor,
            y: centerY + (origY - centerY) * warpFactor
          };
        };

        // 1. Matahari (Solar Core)
        const sunPos = getWarpPos(width * 0.12, height * 0.18);
        drawSun(sunPos.x, sunPos.y);

        // 2. Galaksi Bima Sakti (Milky Way)
        const milkyPos = getWarpPos(width * 0.82, height * 0.45);
        drawMilkyWay(milkyPos.x, milkyPos.y);

        // 3. Galaksi Andromeda
        const androPos = getWarpPos(width * 0.14, height * 0.80);
        drawAndromeda(androPos.x, androPos.y);

        // 4. Saturnus dengan 3D Rings
        const saturnPos = getWarpPos(width * 0.88, height * 0.72);
        drawSaturn(saturnPos.x, saturnPos.y);

        // 5. Bumi & Bulan (Earth & Moon)
        const earthPos = getWarpPos(width * 0.78, height * 0.20);
        drawEarth(earthPos.x, earthPos.y);

      animId = requestAnimationFrame(draw);
    }

    // Mathematical drawing helpers
    const drawSun = (x, y) => {
      // Corona plasma spikes (animated dynamically)
      const coronaGrad = ctx.createRadialGradient(x, y, 4, x, y, (50 + Math.sin(time * 0.06) * 6) / warpFactor);
      coronaGrad.addColorStop(0, 'rgba(255, 235, 100, 0.95)');
      coronaGrad.addColorStop(0.35, 'rgba(255, 120, 0, 0.45)');
      coronaGrad.addColorStop(0.7, 'rgba(255, 50, 0, 0.18)');
      coronaGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, (60 + Math.sin(time * 0.06) * 6) / warpFactor, 0, Math.PI * 2);
      ctx.fillStyle = coronaGrad;
      ctx.fill();

      // Main core sphere
      const coreGrad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 22 / warpFactor);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, '#ffdd00');
      coreGrad.addColorStop(0.85, '#ff5500');
      coreGrad.addColorStop(1, '#cc2c00');
      
      ctx.beginPath();
      ctx.arc(x, y, 22 / warpFactor, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Label
      ctx.fillStyle = `rgba(155, 163, 208, ${Math.max(0, 0.7 - (warpFactor - 1) * 0.3)})`;
      ctx.font = 'bold 9px "Sora", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MATAHARI (SOLAR CORE)', x, y + 36 / warpFactor);
    };

    const drawEarth = (x, y) => {
      const radius = 13 / warpFactor;

      // Atmosphere Haze
      const atmGrad = ctx.createRadialGradient(x, y, radius - 2, x, y, radius + 8);
      atmGrad.addColorStop(0, 'rgba(94, 170, 255, 0.45)');
      atmGrad.addColorStop(1, 'rgba(94, 170, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = atmGrad;
      ctx.fill();

      // Earth Marble
      const earthGrad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, radius);
      earthGrad.addColorStop(0, '#a5dbff');
      earthGrad.addColorStop(0.35, '#5eaaff');
      earthGrad.addColorStop(0.75, '#1d42b0');
      earthGrad.addColorStop(1, '#050c26');
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = earthGrad;
      ctx.fill();

      // Lunar Orbit Line
      const moonOrbitX = 32 / warpFactor;
      const moonOrbitY = 10 / warpFactor;
      const moonOrbitTilt = -Math.PI / 10;
      
      ctx.beginPath();
      ctx.ellipse(x, y, moonOrbitX, moonOrbitY, moonOrbitTilt, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(94, 170, 255, ${0.15 / warpFactor})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Moon position calculation
      const moonAngle = time * 0.02;
      const unrotatedMoonX = Math.cos(moonAngle) * moonOrbitX;
      const unrotatedMoonY = Math.sin(moonAngle) * moonOrbitY;
      
      // Rotate by orbit angle
      const moonX = x + unrotatedMoonX * Math.cos(moonOrbitTilt) - unrotatedMoonY * Math.sin(moonOrbitTilt);
      const moonY = y + unrotatedMoonX * Math.sin(moonOrbitTilt) + unrotatedMoonY * Math.cos(moonOrbitTilt);
      const moonIsBehind = Math.sin(moonAngle) < 0;

      // Draw Moon
      ctx.beginPath();
      ctx.arc(moonX, moonY, 3.2 / warpFactor, 0, Math.PI * 2);
      const moonGrad = ctx.createRadialGradient(moonX - 0.8, moonY - 0.8, 0.2, moonX, moonY, 3.2 / warpFactor);
      moonGrad.addColorStop(0, '#ffffff');
      moonGrad.addColorStop(1, '#8fa0b5');
      ctx.fillStyle = moonGrad;
      
      // Add subtle bloom glow if in front
      if (!moonIsBehind) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 4 / warpFactor;
      }
      ctx.fill();
      ctx.shadowBlur = 0; // reset shadow

      // Label
      ctx.fillStyle = `rgba(155, 163, 208, ${Math.max(0, 0.7 - (warpFactor - 1) * 0.3)})`;
      ctx.font = 'bold 9px "Sora", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BUMI & BULAN', x, y + 28 / warpFactor);
    };

    const drawSaturn = (x, y) => {
      const radius = 17 / warpFactor;
      const ringRX = 38 / warpFactor;
      const ringRY = 9 / warpFactor;
      const ringTilt = -Math.PI / 10;

      // 1. Back rings
      ctx.beginPath();
      ctx.ellipse(x, y, ringRX, ringRY, ringTilt, Math.PI, Math.PI * 2);
      ctx.strokeStyle = `rgba(212, 163, 92, ${0.45 / warpFactor})`;
      ctx.lineWidth = 5 / warpFactor;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(x, y, ringRX - 4 / warpFactor, ringRY - 1.2 / warpFactor, ringTilt, Math.PI, Math.PI * 2);
      ctx.strokeStyle = `rgba(240, 210, 160, ${0.2 / warpFactor})`;
      ctx.lineWidth = 1.5 / warpFactor;
      ctx.stroke();

      // 2. Planet Sphere
      const satGrad = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, radius);
      satGrad.addColorStop(0, '#ffe8a3');
      satGrad.addColorStop(0.55, '#d4a35c');
      satGrad.addColorStop(0.9, '#63441f');
      satGrad.addColorStop(1, '#3b250e');
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = satGrad;
      ctx.fill();

      // 3. Front rings
      ctx.beginPath();
      ctx.ellipse(x, y, ringRX, ringRY, ringTilt, 0, Math.PI);
      ctx.strokeStyle = `rgba(212, 163, 92, ${0.85 / warpFactor})`;
      ctx.lineWidth = 5 / warpFactor;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(x, y, ringRX - 4 / warpFactor, ringRY - 1.2 / warpFactor, ringTilt, 0, Math.PI);
      ctx.strokeStyle = `rgba(240, 210, 160, ${0.4 / warpFactor})`;
      ctx.lineWidth = 1.5 / warpFactor;
      ctx.stroke();

      // Label
      ctx.fillStyle = `rgba(155, 163, 208, ${Math.max(0, 0.7 - (warpFactor - 1) * 0.3)})`;
      ctx.font = 'bold 9px "Sora", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PLANET SATURNUS', x, y + 32 / warpFactor);
    };

    const drawAndromeda = (x, y) => {
      // Core glow
      const coreGrad = ctx.createRadialGradient(x, y, 2, x, y, 11 / warpFactor);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.45, `rgba(92, 240, 255, ${0.7 / warpFactor})`);
      coreGrad.addColorStop(1, 'rgba(176, 122, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, 11 / warpFactor, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      const rotationAngle = time * 0.003;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 7);
      ctx.scale(1.0, 0.4);

      andromedaParticles.forEach(p => {
        const currentTheta = p.theta + rotationAngle;
        const px = (Math.cos(currentTheta + p.arm) * p.r + Math.cos(currentTheta + Math.PI/2) * p.spread) / warpFactor;
        const py = (Math.sin(currentTheta + p.arm) * p.r + Math.sin(currentTheta + Math.PI/2) * p.spread) / warpFactor;

        ctx.beginPath();
        ctx.arc(px, py, p.size / warpFactor, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      ctx.restore();

      // Label
      ctx.fillStyle = `rgba(155, 163, 208, ${Math.max(0, 0.7 - (warpFactor - 1) * 0.3)})`;
      ctx.font = 'bold 9px "Sora", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GALAKSI ANDROMEDA', x, y + 36 / warpFactor);
    };

    const drawMilkyWay = (x, y) => {
      // Core glow
      const coreGrad = ctx.createRadialGradient(x, y, 2, x, y, 13 / warpFactor);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.45, `rgba(255, 215, 92, ${0.7 / warpFactor})`);
      coreGrad.addColorStop(1, 'rgba(255, 124, 106, 0)');
      
      ctx.beginPath();
      ctx.arc(x, y, 13 / warpFactor, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      const rotationAngle = -time * 0.0025;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4.5);
      ctx.scale(1.0, 0.38);

      milkyWayParticles.forEach(p => {
        const currentTheta = p.theta + rotationAngle;
        const px = (Math.cos(currentTheta + p.arm) * p.r + Math.cos(currentTheta + Math.PI/2) * p.spread) / warpFactor;
        const py = (Math.sin(currentTheta + p.arm) * p.r + Math.sin(currentTheta + Math.PI/2) * p.spread) / warpFactor;

        ctx.beginPath();
        ctx.arc(px, py, p.size / warpFactor, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      ctx.restore();

      // Label
      ctx.fillStyle = `rgba(155, 163, 208, ${Math.max(0, 0.7 - (warpFactor - 1) * 0.3)})`;
      ctx.font = 'bold 9px "Sora", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GALAKSI BIMA SAKTI', x, y + 38 / warpFactor);
    };

    draw();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ── Interactive Cursor Glow ──
  useEffect(() => {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;
    
    const handleMove = e => {
      if (!glow.classList.contains('active')) glow.classList.add('active');
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    };
    const handleLeave = () => glow.classList.remove('active');

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
    };
  }, []);


  // ── Start Camera WebRTC ──
  const startCamera = async (targetRef) => {
    stopCamera();
    try {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const cams = devices.filter(d => d.kind === 'videoinput');
      setCameras(cams);

      let constraints = { 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      };

      if (activeCamId) {
        constraints.video.deviceId = { ideal: activeCamId };
      } else if (cams.length > 0) {
        const back = cams.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
        if (back) {
          constraints.video.deviceId = { ideal: back.deviceId };
          setActiveCamId(back.deviceId);
        } else {
          constraints.video.deviceId = { ideal: cams[0].deviceId };
          setActiveCamId(cams[0].deviceId);
        }
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn("First camera attempt failed with constraints, trying fallback facingMode...", firstErr);
        try {
          // Fallback 1: Simple facing mode or default cam
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
          });
        } catch (secondErr) {
          console.warn("Second camera attempt failed, trying absolute fallback video:true...", secondErr);
          // Fallback 2: Direct absolute default video
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      if (targetRef && targetRef.current) {
        targetRef.current.srcObject = stream;
      }
      setCamRunning(true);
    } catch (err) {
      console.error(err);
      triggerToast('Gagal memuat kamera: ' + err.message, 'fail');
    }
  };

  const stopCamera = () => {
    if (teacherVideoRef.current && teacherVideoRef.current.srcObject) {
      teacherVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
      teacherVideoRef.current.srcObject = null;
    }
    if (studentVideoRef.current && studentVideoRef.current.srcObject) {
      studentVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
      studentVideoRef.current.srcObject = null;
    }
    setCamRunning(false);
  };

  const flipCamera = (targetRef) => {
    if (cameras.length < 2) return;
    let idx = cameras.findIndex(c => c.deviceId === activeCamId);
    idx = (idx + 1) % cameras.length;
    const nextId = cameras[idx].deviceId;
    setActiveCamId(nextId);
    
    // Restart camera with new device ID
    setTimeout(() => {
      startCamera(targetRef);
    }, 100);
  };

  // ── Base64 to ArrayBuffer conversion ──
  const base64ToByteArray = (base64String) => {
    const rawBase64 = base64String.split(',')[1] || base64String;
    const binaryString = atob(rawBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // ── Teacher Login Handling ──
  const handleLogin = () => {
    if (loginUser === 'admin' && loginPass === 'admin123') {
      setShowLogin(false);
      setScreen('teacher');
      setTeacherTab('t-reg');
      setLoginUser('');
      setLoginPass('');
      setLoginErr('');
    } else {
      setLoginErr('Username atau password salah!');
    }
  };

  // ── Quick Scanner Snap & Check ──
  const snapAndCheck = async () => {
    if (!rekClient || !dbClient) {
      triggerToast('Please configure AWS Credentials first!', 'fail');
      return;
    }

    const vid = teacherVideoRef.current;
    if (!vid) return;

    const cnv = document.createElement('canvas');
    cnv.width = vid.videoWidth;
    cnv.height = vid.videoHeight;
    const ctx = cnv.getContext('2d');
    ctx.drawImage(vid, 0, 0);
    
    const base64 = cnv.toDataURL('image/jpeg', 0.85);
    setLastCapBase64(base64);
    stopCamera();

    setQsMsg('MENGANALISIS WAJAH...');
    setQsMsgType('ok');

    try {
      const imageBytes = base64ToByteArray(base64);
      
      const searchParams = {
        CollectionId: cfgCollection,
        Image: { Bytes: imageBytes },
        MaxFaces: 1,
        FaceMatchThreshold: 80
      };

      rekClient.searchFacesByImage(searchParams, async (err, data) => {
        if (err) {
          console.error(err);
          setQsMsg('AWS Rekognition Error: ' + err.message);
          setQsMsgType('fail');
          return;
        }

        if (data.FaceMatches && data.FaceMatches.length > 0) {
          const studentId = data.FaceMatches[0].Face.ExternalImageId;
          
          try {
            const dbData = await dbClient.send(new GetCommand({
              TableName: cfgTable,
              Key: { studentId }
            }));

            if (dbData.Item) {
              setQsStudent(dbData.Item);
              setQsState('add-event');
              setQsMsg('');
            } else {
              // Indexed in Rekognition but missing in DynamoDB
              setRegNis(studentId);
              setQsState('register');
              setQsMsg('');
            }
          } catch (dbErr) {
            setQsMsg('DynamoDB Error: ' + dbErr.message);
            setQsMsgType('fail');
          }
        } else {
          // New Face unregistered
          setRegNis('');
          setQsState('register');
          setQsMsg('');
        }
      });

    } catch (e) {
      setQsMsg('Error: ' + e.message);
      setQsMsgType('fail');
    }
  };

  const resetQs = () => {
    setQsState('scanner');
    setQsStudent(null);
    setQsMsg('');
    setRegNis('');
    setRegName('');
    setRegClass('');
    setRegReligion('');
    setRegCustomTitle('');
    setRegCustomTagline('');
  };

  // ── Register New Student ──
  const registerStudent = async () => {
    if (!regNis || !regName || !regClass || !regReligion) {
      triggerToast('Semua bidang wajib diisi!', 'fail');
      return;
    }

    if (!rekClient || !dbClient) return;

    triggerToast('Mendaftarkan wajah...', 'ok');

    try {
      const imageBytes = base64ToByteArray(lastCapBase64);

      rekClient.indexFaces({
        CollectionId: cfgCollection,
        Image: { Bytes: imageBytes },
        ExternalImageId: regNis,
        MaxFaces: 1
      }, async (idxErr, idxData) => {
        if (idxErr) {
          triggerToast('Index wajah gagal: ' + idxErr.message, 'fail');
          return;
        }

        if (idxData.FaceRecords && idxData.FaceRecords.length > 0) {
          const faceId = idxData.FaceRecords[0].Face.FaceId;
          
          const newStudent = {
            studentId: regNis,
            faceId: faceId,
            name: regName,
            kelas: regClass,
            agama: regReligion,
            thumbnail: lastCapBase64,
            grades: { rel: 80, ppkn: 80, indo: 80, eng: 80, math: 80, ipas: 80, art: 80, pe: 80, jawa: 80 },
            grades_history: {},
            violations_history: [],
            customTitle: regCustomTitle.trim(),
            customTagline: regCustomTagline.trim()
          };

          try {
            await dbClient.send(new PutCommand({
              TableName: cfgTable,
              Item: newStudent
            }));
            triggerToast('Registrasi Siswa Baru Sukses!', 'ok');
            resetQs();
          } catch (dbErr) {
            triggerToast('Gagal simpan DynamoDB: ' + dbErr.message, 'fail');
          }
        } else {
          triggerToast('Tidak ada wajah terdeteksi pada foto!', 'fail');
        }
      });

    } catch (e) {
      triggerToast('Error: ' + e.message, 'fail');
    }
  };

  // ── Submit Score / Violation ──
  const submitEvent = async () => {
    if (!dbClient || !qsStudent) return;

    try {
      let s = { ...qsStudent };
      s.grades = { ...s.grades };
      s.grades_history = { ...s.grades_history };
      s.violations_history = [...(s.violations_history || [])];

      if (qsEventType === 'grade') {
        const score = parseFloat(qsScore);
        if (isNaN(score) || score < 0 || score > 100) {
          triggerToast('Nilai harus di antara 0-100!', 'fail');
          return;
        }

        s.grades_history[qsSubject] = [...(s.grades_history[qsSubject] || [])];
        s.grades_history[qsSubject].push({
          date: getJakartaTime(),
          val: score
        });

        // Compute the new average including the item we just added
        const historyItems = getSubjectHistory(s, qsSubject);
        const allVals = historyItems.map(h => h.val).filter(v => typeof v === 'number' && !isNaN(v));
        if (allVals.length > 0) {
          const sum = allVals.reduce((a, b) => a + b, 0);
          s.grades[qsSubject] = parseFloat((sum / allVals.length).toFixed(1));
        } else {
          s.grades[qsSubject] = score;
        }

        triggerToast('Nilai berhasil ditambahkan!', 'ok');
      } else {
        if (!qsNote.trim()) {
          triggerToast('Detail catatan pelanggaran wajib diisi!', 'fail');
          return;
        }

        s.violations_history.push({
          date: getJakartaTime(),
          note: qsNote.trim()
        });
        triggerToast('Laporan pelanggaran berhasil disimpan!', 'ok');
      }

      await dbClient.send(new PutCommand({
        TableName: cfgTable,
        Item: s
      }));

      resetQs();
      setQsScore('');
      setQsNote('');
    } catch (e) {
      triggerToast(e.message, 'fail');
    }
  };

  // ── Load All Students List ──
  const loadStudents = async () => {
    if (!dbClient) return;

    try {
      const data = await dbClient.send(new ScanCommand({
        TableName: cfgTable
      }));

      setStudents(data.Items || []);
    } catch (err) {
      console.error(err);
      triggerToast('Gagal memuat daftar siswa: ' + err.message, 'fail');
    }
  };

  useEffect(() => {
    if (screen === 'teacher' && teacherTab === 't-list') {
      loadStudents();
    }
  }, [screen, teacherTab]);

  // ── Delete Student ──
  const deleteStudent = async (sid, faceId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data siswa ini beserta index wajahnya di AWS?')) return;
    if (!rekClient || !dbClient) return;

    triggerToast('Menghapus data...', 'ok');

    if (faceId && faceId !== 'undefined') {
      rekClient.deleteFaces({
        CollectionId: cfgCollection,
        FaceIds: [faceId]
      }, (delErr) => {
        if (delErr) console.error('Rekognition delete face failed:', delErr);
      });
    }

    try {
      await dbClient.send(new DeleteCommand({
        TableName: cfgTable,
        Key: { studentId: sid }
      }));
      triggerToast('Data siswa berhasil dihapus!', 'ok');
      loadStudents();
    } catch (dbErr) {
      triggerToast('Gagal hapus database: ' + dbErr.message, 'fail');
    }
  };

  // ── Edit Student Grades ──
  const openEditGrades = (s) => {
    setEditingStudent(s);
    setEditViolations(s.violations_history ? s.violations_history.map(v => v.note).join(', ') : '');
    setEditCustomTitle(s.customTitle || '');
    setEditCustomTagline(s.customTagline || '');
    const initialGrades = {};
    SUBJECTS.forEach(sub => {
      initialGrades[sub.key] = ''; // Initialize empty as we want to ADD values
    });
    setEditGrades(initialGrades);
  };

  const saveEditGrades = async () => {
    if (!dbClient || !editingStudent) return;

    try {
      let s = { ...editingStudent };
      s.grades = { ...s.grades };
      s.grades_history = { ...s.grades_history };
      
      // We loop through the subject inputs and append the new assignment/exam grade to history
      Object.entries(editGrades).forEach(([key, val]) => {
        if (val !== '' && val !== undefined && val !== null) {
          const newGrade = parseFloat(val);
          if (!isNaN(newGrade) && newGrade >= 0 && newGrade <= 100) {
            // Append to history
            s.grades_history[key] = [...(s.grades_history[key] || [])];
            s.grades_history[key].push({
              date: getJakartaTime(),
              val: newGrade
            });

            // Get all grades from history to compute the new average
            const historyItems = getSubjectHistory(s, key); // retrieves standard mapped { date, val } items
            const allVals = historyItems.map(h => h.val).filter(v => typeof v === 'number' && !isNaN(v));
            
            if (allVals.length > 0) {
              const sum = allVals.reduce((a, b) => a + b, 0);
              const avg = parseFloat((sum / allVals.length).toFixed(1));
              s.grades[key] = avg; // s.grades stores the average!
            } else {
              s.grades[key] = newGrade;
            }
          }
        }
      });
      
      s.customTitle = editCustomTitle.trim();
      s.customTagline = editCustomTagline.trim();

      if (editViolations.trim()) {
        s.violations_history = editViolations.split(',').map(n => ({
          date: getJakartaTime(),
          note: n.trim()
        }));
      } else {
        s.violations_history = [];
      }

      await dbClient.send(new PutCommand({
        TableName: cfgTable,
        Item: s
      }));

      triggerToast('Nilai baru berhasil ditambahkan!', 'ok');
      setEditingStudent(null);
      loadStudents();
    } catch (e) {
      triggerToast('Gagal menyimpan: ' + e.message, 'fail');
    }
  };

  // ── Student Screen Scan Face ──
  const snapStu = async () => {
    const vid = studentVideoRef.current;
    if (!vid) return;

    const cnv = document.createElement('canvas');
    cnv.width = vid.videoWidth;
    cnv.height = vid.videoHeight;
    const ctx = cnv.getContext('2d');
    ctx.drawImage(vid, 0, 0);

    const base64 = cnv.toDataURL('image/jpeg', 0.85);
    stopCamera();

    processStudentFace(base64);
  };

  const handleStuFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      setLastCapBase64(evt.target.result);
      setScanState('upload-confirm');
    };
    reader.readAsDataURL(file);
  };

  const processStudentFace = async (base64) => {
    setLastCapBase64(base64); // Set source target photo instantly so the biometric corner box shows it!

    if (!rekClient || !dbClient) {
      triggerToast('AWS Credentials are not configured!', 'fail');
      setScanState('scan');
      setTimeout(() => startCamera(studentVideoRef), 100);
      return;
    }

    setScanState('loading');

    try {
      const imageBytes = base64ToByteArray(base64);

      // 1. Detect faces to get real attributes from AWS Rekognition
      rekClient.detectFaces({
        Image: { Bytes: imageBytes },
        Attributes: ["ALL"]
      }, (detErr, detData) => {
        let detected = [];
        if (!detErr && detData.FaceDetails && detData.FaceDetails.length > 0) {
          const details = detData.FaceDetails[0];
          detected = [
            { label: 'Gender', val: `${details.Gender?.Value || 'Unknown'} (${(details.Gender?.Confidence || 0).toFixed(0)}%)` },
            { label: 'Estimated Age', val: `${details.AgeRange?.Low || 15} - ${details.AgeRange?.High || 18} years` },
            { 
              label: 'Primary Emotion', 
              val: details.Emotions && details.Emotions.length > 0 
                ? `${details.Emotions[0].Type} (${details.Emotions[0].Confidence.toFixed(0)}%)` 
                : 'CALM (99%)' 
            },
            { label: 'Smiling', val: details.Smile?.Value ? 'Yes' : 'No' },
            { label: 'Wearing Glasses', val: details.Eyeglasses?.Value ? 'Yes' : 'No' }
          ];
        }

        // 2. Search face in collection
        rekClient.searchFacesByImage({
          CollectionId: cfgCollection,
          Image: { Bytes: imageBytes },
          MaxFaces: 1,
          FaceMatchThreshold: 80
        }, async (err, data) => {
          if (err) {
            triggerToast('Gagal mengenali wajah: ' + err.message, 'fail');
            setScanState('scan');
            setTimeout(() => startCamera(studentVideoRef), 100);
            return;
          }

          if (data.FaceMatches && data.FaceMatches.length > 0) {
            const studentId = data.FaceMatches[0].Face.ExternalImageId;
            
            try {
              const dbData = await dbClient.send(new GetCommand({
                TableName: cfgTable,
                Key: { studentId }
              }));

              if (dbData.Item) {
                // Set result and initiate 3D zoom lock-on state
                setMatchedStudent(dbData.Item);
                setMatchedPhoto(base64);
                setScanState('zooming');
                document.body.classList.add('warp-jump');
                
                setTimeout(() => {
                  setShowWarpFlash(true);
                  setScanState('result-ok');
                  document.body.classList.remove('warp-jump');
                  setTimeout(() => setShowWarpFlash(false), 1200);
                }, 800); // Super snappy 800ms zoom pan lock-on sequence
              } else {
                setMatchedPhoto(base64);
                setScanState('zooming');
                document.body.classList.add('warp-jump');
                
                setTimeout(() => {
                  setShowWarpFlash(true);
                  showUnknownResult(base64, detected);
                  document.body.classList.remove('warp-jump');
                  setTimeout(() => setShowWarpFlash(false), 1200);
                }, 800);
              }
            } catch (dbErr) {
              setMatchedPhoto(base64);
              setScanState('zooming');
              document.body.classList.add('warp-jump');
              
              setTimeout(() => {
                setShowWarpFlash(true);
                showUnknownResult(base64, detected);
                document.body.classList.remove('warp-jump');
                setTimeout(() => setShowWarpFlash(false), 1200);
              }, 800);
            }
          } else {
            setMatchedPhoto(base64);
            setScanState('zooming');
            document.body.classList.add('warp-jump');
            
            setTimeout(() => {
              setShowWarpFlash(true);
              showUnknownResult(base64, detected);
              document.body.classList.remove('warp-jump');
              setTimeout(() => setShowWarpFlash(false), 1200);
            }, 800);
          }
        });
      });

    } catch (e) {
      triggerToast(e.message, 'fail');
      setScanState('scan');
      setTimeout(() => startCamera(studentVideoRef), 100);
    }
  };

  const showUnknownResult = (base64, detectedAttrs) => {
    setMatchedPhoto(base64);
    
    if (detectedAttrs && detectedAttrs.length > 0) {
      setUnknownAttrs(detectedAttrs);
    } else {
      // Fallback in case Rekognition returned nothing
      setUnknownAttrs([
        { label: 'Gender', val: 'Unknown' },
        { label: 'Estimated Age', val: '15 - 18 years' },
        { label: 'Primary Emotion', val: 'CALM (95%)' },
        { label: 'Smiling', val: 'No' },
        { label: 'Wearing Glasses', val: 'No' }
      ]);
    }
    
    setScanState('result-no');
  };

  // ── Backward Compatible Grade & History Resolvers ──
  const getGradeValue = (student, subKey) => {
    if (!student) return "-";
    
    // Mapping of alternative keys (backward compatibility)
    const aliases = {
      rel: ['agama', 'religion', 'rel'],
      ppkn: ['ppkn', 'pkn'],
      indo: ['indo', 'bindo', 'bahasa', 'indonesia'],
      eng: ['eng', 'inggris', 'english'],
      math: ['math', 'matematika'],
      ipas: ['ipas', 'science'],
      art: ['art', 'seni', 'sbd', 'senibudaya'],
      pe: ['pe', 'penjas', 'pjok'],
      jawa: ['jawa', 'bjawa']
    };
    
    // 1) Try history average first
    const history = getSubjectHistory(student, subKey);
    if (history && history.length > 0) {
      const allVals = history.map(h => h.val).filter(v => typeof v === 'number' && !isNaN(v));
      if (allVals.length > 0) {
        const sum = allVals.reduce((a, b) => a + b, 0);
        return parseFloat((sum / allVals.length).toFixed(1));
      }
    }
    
    // 2) Try matchedStudent.grades map (default score or manual average)
    const possibleKeys = aliases[subKey] || [subKey];
    if (student.grades) {
      for (const key of possibleKeys) {
        if (student.grades[key] !== undefined && student.grades[key] !== null && student.grades[key] !== '') {
          return parseFloat(student.grades[key]);
        }
      }
    }
    
    return "-";
  };

  const getSubjectHistory = (student, subKey) => {
    if (!student || !student.grades_history) return [];
    
    const aliases = {
      rel: ['rel', 'agama', 'religion'],
      ppkn: ['ppkn', 'pkn'],
      indo: ['indo', 'bindo', 'bahasa', 'indonesia'],
      eng: ['eng', 'inggris', 'english'],
      math: ['math', 'matematika'],
      ipas: ['ipas', 'science'],
      art: ['art', 'seni', 'sbd', 'senibudaya'],
      pe: ['pe', 'penjas', 'pjok'],
      jawa: ['jawa', 'bjawa']
    };
    
    let rawHistory = [];
    const possibleKeys = aliases[subKey] || [subKey];
    for (const key of possibleKeys) {
      if (student.grades_history[key] && Array.isArray(student.grades_history[key])) {
        rawHistory = student.grades_history[key];
        break;
      }
    }
    
    // Map items so they both conform to { date, val }
    return rawHistory.map(h => {
      const val = h.val !== undefined ? h.val : (h.score !== undefined ? h.score : "-");
      const date = h.date || h.timestamp || '—';
      return { date: String(date), val: val !== "-" ? parseFloat(val) : "-" };
    }).filter(h => h.val !== "-");
  };

  // ── Procedural Title Generator (Ultimate Satire Edition) ──
  const getPosterMeta = (s) => {
    const grades = {};
    SUBJECTS.forEach(sub => {
      grades[sub.key] = getGradeValue(s, sub.key);
    });
    const vList = s.violations_history || [];
    const violations = vList.length;
    const agama = (s.agama || '').toLowerCase();

    // Helper untuk randomizer
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const generateTitle = (prefixes, suffixes) => `${getRandom(prefixes)} ${getRandom(suffixes)}`;

    // Gabungkan semua note pelanggaran jadi satu string untuk dicek
    const notes = vList.map(v => v.note.toLowerCase()).join(' ');

    let result = null;

    // Find the highest grade among all mapels
    let bestSubject = 'math';
    let highestGrade = 0;
    Object.entries(grades).forEach(([k, v]) => {
      if (typeof v === 'number' && !isNaN(v) && v > highestGrade) {
        highestGrade = v;
        bestSubject = k;
      }
    });

    // =========================================================================
    // PRIORITY 1: SENSATIONAL ACADEMIC ACHIEVERS (PRESTASI DIUTAMAKAN!)
    // If the student has at least one mapel with grade >= 85
    // =========================================================================
    if (highestGrade >= 85) {
      // 1.1 Bule Jawa Custom Hybrid (English & Javanese are both high!)
      if (grades.eng >= 85 && grades.jawa >= 85) {
        const prefixes = ["Bule", "Lord", "Priyayi", "Mister", "Ndalem", "Den Bagus", "Raden", "Sir", "Gusti"];
        const suffixes = ["Medok", "Ndeso", "Jaksel", "Jowo", "Ningrat", "Blasteran", "Mangkubumi", "Suroboyo"];
        const taglines = [
          "Which is kulo niku saestu mumet jal! So hard but monggo pinarak, literally!",
          "Honestly ya, nek pancen jodoh yo ndak sengaja ketemu di angkringan, my bad yo!",
          "I am sorry ndak sengaja kulo niku medok sanget, brother! Basic-nya priyayi modern!",
          "Literally kulo niku tresno banget kalih panjenengan, deeply falling in love lur!",
          "In contrast, kulo niku mboten ngertos literally artine nopo jal. Monggo sekecaaken!"
        ];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: getRandom(taglines),
          theme: "bjawa",
          bgClass: "bg-math-3",
          stampText: "LEGEND MEDOK",
          stampClass: "prestas-stamp gold"
        };
      }
      // 1.2 Math / IPAS Genius
      else if (bestSubject === 'math' || bestSubject === 'ipas') {
        const prefixes = ["Albert", "Dewa", "Suhu", "Lord", "Profesor", "Doktor", "Ahli", "Kalkulator"];
        const suffixes = ["Einstein", "Rumus", "Fisika", "Angka", "Kalkulus", "Aljabar", "Atom", "Semesta"];
        const taglines = [
          "Otak penuh rumus fisika kuantum sampai lupa caranya bersosialisasi dengan manusia bumi biasa.",
          "Bisa ngitung jarak bumi ke matahari, tapi gak bisa ngitung jarak nembak doi biar diterima.",
          "Kalkulator berjalan kelas yang selalu jadi sasaran tembak contekan pas ujian dadakan.",
          "Menghabiskan waktu istirahat dengan memikirkan teori relativitas daripada memikirkan gebetan."
        ];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: getRandom(taglines),
          theme: bestSubject,
          bgClass: "bg-math-2",
          stampText: "ELITE SAINS",
          stampClass: "prestas-stamp cyan"
        };
      }
      // 1.3 Indo / Eng Sastra Masters
      else if (bestSubject === 'indo' || bestSubject === 'eng') {
        const prefixes = ["Pujangga", "Penyair", "Duta", "Raja", "Sastrawan", "Novelis", "Penyair", "Komunikator"];
        const suffixes = ["Kelas", "Gombal", "Senja", "Kata", "Bucin", "Sastra", "Drama", "Pantun"];
        const taglines = [
          "Membuat untaian puisi indah nan puitis semata-mata untuk merayu nilai tugas dari guru killer.",
          "Bahasa kalbunya lebih tajam dari pedang, hobinya nongkrongin senja sambil ngopi sachet.",
          "Jago nulis essay panjang lebar, tapi giliran dichat doi balesnya cuma 'Y' doang.",
          "Ahli menyusun kata-kata mutiara di bio Instagram, walau tugas kelompok bahasa belum selesai."
        ];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: getRandom(taglines),
          theme: bestSubject,
          bgClass: "bg-bindo-1",
          stampText: "DUTA BAHASA",
          stampClass: "prestas-stamp violet"
        };
      }
      // 1.4 Art & Aesthetics
      else if (bestSubject === 'art') {
        const prefixes = ["Seniman", "Pelukis", "Dewa", "Maestro", "Raja", "Desainer", "Kurator"];
        const suffixes = ["Estetik", "Kanvas", "Abstrak", "Kuas", "Mural", "Sketsa", "Doodle", "Kreatif"];
        const taglines = [
          "Melukis masa depan seindah lukisan pemandangan dua gunung legendaris dan matahari senyum.",
          "Hidupnya terlalu estetik, sampai buku cetak matematika pun penuh coretan doodle nggak jelas.",
          "Uang saku abis bukan buat jajan, tapi buat beli spidol warna-warni demi nyatet yang glowing.",
          "Mengubah coretan meja kelas menjadi karya seni bernilai tinggi yang bikin guru geleng-geleng."
        ];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: getRandom(taglines),
          theme: "art",
          bgClass: "bg-seni-1",
          stampText: "MAESTRO SENI",
          stampClass: "prestas-stamp gold"
        };
      }
      // 1.5 PE & Athletics
      else if (bestSubject === 'pe') {
        const prefixes = ["Atlet", "Panglima", "Raja", "Gladiator", "Dewa", "Juara", "Pelari", "Otot"];
        const suffixes = ["Zumba", "Lari", "Keringat", "Futsal", "Tarkam", "Lapangan", "Maraton", "Stamina"];
        const taglines = [
          "Skill lari dari kenyataan hidup jauh lebih kencang daripada lari keliling lapangan bola.",
          "Badan kekar jiwa Rambo, tapi kalau disuruh ngerjain logaritma langsung berubah jadi hello kitty.",
          "Bawa baju ganti olahraga tiap hari walau jadwalnya lagi biologi. Pokoknya keringetan nomer satu!",
          "Penguasa lapangan futsal sekolah, walau kalau ulangan harian pegang pensilnya gemeteran."
        ];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: getRandom(taglines),
          theme: "pe",
          bgClass: "bg-penjas-1",
          stampText: "ATLET KOSMIK",
          stampClass: "prestas-stamp green"
        };
      }
      // 1.6 Javanese Culture Masters
      else if (bestSubject === 'jawa') {
        const prefixes = ["Ningrat", "Raja", "Sultan", "Dewa", "Dalang", "Priyayi", "Pujangga", "Ksatria"];
        const suffixes = ["Jowo", "Krama", "Keraton", "Wayang", "Sinden", "Wiguna", "Mangkunegara", "Sastra"];
        const taglines = [
          "Melestarikan budaya adiluhung Jawa di tengah gempuran tren joget TikTok modern.",
          "Tata krama bicaranya sehalus krama alus keraton, bikin hati mertua langsung meleleh.",
          "Ahli menulis aksara jawa lebih cepat daripada menulis pesan teks WhatsApp ke gebetan.",
          "Jiwa priyayi sejati yang selalu tenang menghadapi segala ujian hidup dan matematika."
        ];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: getRandom(taglines),
          theme: "bjawa",
          bgClass: "bg-math-3",
          stampText: "PRIYAYI JOWO",
          stampClass: "prestas-stamp gold"
        };
      }
      // 1.7 Religious / Spiritual Achiever
      else if (bestSubject === 'rel') {
        if (agama === 'islam') {
          const prefixes = ["Ustadz", "Mubaligh", "Santri", "Imam", "Khatib", "Duta"];
          const suffixes = ["Gaul", "Digital", "Hijrah", "Keren", "Santuy", "Langit"];
          result = {
            title: generateTitle(prefixes, suffixes),
            tagline: "IPK tinggi hanyalah bonus duniawi, yang penting pahala jalur langit tetap aman sentosa.",
            theme: "islam",
            bgClass: "bg-islam-2",
            stampText: "BINTANG LANGIT",
            stampClass: "prestas-stamp green"
          };
        } else if (agama === 'kristen' || agama === 'katolik') {
          const prefixes = ["Pendeta", "Gembala", "Frater", "Suster", "Duta"];
          const suffixes = ["Muda", "Digital", "Melodi", "Gitar", "Santuy", "Kasih"];
          result = {
            title: generateTitle(prefixes, suffixes),
            tagline: "Berdoa di hari Minggu, mabar di hari Senin, tetap menjadi garam dan terang tongkrongan kelas!",
            theme: "kristen",
            bgClass: "bg-kristen-1",
            stampText: "BINTANG LANGIT",
            stampClass: "prestas-stamp green"
          };
        } else {
          const prefixes = ["Suhu", "Biksu", "Pandita", "Dewa", "Guru"];
          const suffixes = ["Santuy", "Bijak", "Damai", "Tenang", "Semesta"];
          result = {
            title: generateTitle(prefixes, suffixes),
            tagline: "Harmoni kehidupan terpancar dari ketenangan batinnya saat jam pelajaran kosong ditinggal guru rapat.",
            theme: "budha",
            bgClass: "bg-budha-1",
            stampText: "BINTANG LANGIT",
            stampClass: "prestas-stamp green"
          };
        }
      }
    }

    // =========================================================================
    // PRIORITY 2: ONLY TRIGGER VIOLATION SATIRES IF NO EXCELLENT ACADEMIC GRADE
    // (If violations > 0 AND highestGrade < 85)
    // =========================================================================
    if (!result && violations > 0) {
      // Tukang Tidur
      if (notes.includes('tidur') || notes.includes('turu') || notes.includes('ngantuk')) {
        const prefixes = ["Bupati", "Presiden", "Senator", "Camat", "Menteri", "DPR", "Walikota", "Gubernur", "Lurah", "RT"];
        const suffixes = ["Turu", "Merem", "Ngorok", "Bantal", "Rebahan", "Pules", "Kasur", "Mimpi", "Selimut"];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: "Menjaga stabilitas alam bawah sadar di tengah gempuran rumus Fisika yang tidak pro rakyat.",
          theme: "penjas",
          bgClass: "bg-ips-2",
          stampText: "PRESIDEN TURU",
          stampClass: "violation-stamp small warning"
        };
      }
      // Tukang Korupsi Kas
      else if (notes.includes('kas') || notes.includes('nunggak') || notes.includes('uang') || notes.includes('bayar')) {
        const prefixes = ["Pejabat", "Mafia", "Kolektor", "Kapitalis", "Direktur"];
        const suffixes = ["Kas", "Nunggak", "Defisit", "Seblak", "Utang"];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: "Mengalirkan dana kas kelas ke sektor riil: beli es teh manis jumbo dan cilok bumbu kacang.",
          theme: "ips",
          bgClass: "bg-ips-3",
          stampText: "MAFIA KAS",
          stampClass: "violation-stamp small warning"
        };
      }
      // Tukang Bolos
      else if (notes.includes('bolos') || notes.includes('kantin') || notes.includes('cabut') || notes.includes('makan')) {
        const prefixes = ["Presiden", "Jenderal", "Kaisar", "Raja", "Pangeran"];
        const suffixes = ["Kantin", "Gorengan", "Bolos", "Mendoan", "Bakwan"];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: "Hukum rimba berlaku: siapa cepat lari ke kantin pas bel istirahat, dia yang dapat mendoan anget.",
          theme: "seni",
          bgClass: "bg-ips-3",
          stampText: "RAJA BOLOS",
          stampClass: "violation-stamp small warning"
        };
      }
      // Gamer Kelas
      else if (notes.includes('ml') || notes.includes('game') || notes.includes('mabar') || notes.includes('hp')) {
        const prefixes = ["Camat", "Lord", "Dewa", "Pro Player", "Master"];
        const suffixes = ["Mythic", "Epical", "Mabar", "Gacha", "AFK"];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: "Sekolah cuma sampingan, nge-push rank sampai nembus Mythic Immortal adalah jalan ninjaku.",
          theme: "informatika",
          bgClass: "bg-info-4",
          stampText: "SANG GAMER",
          stampClass: "violation-stamp small warning"
        };
      }
      // Default / Other violations
      else {
        const prefixes = ["Agen", "Menteri", "Pelopor", "Provokator", "Pemberontak"];
        const suffixes = ["Anomali", "Chaos", "Nakal", "Bandha", "Rusuh"];
        result = {
          title: generateTitle(prefixes, suffixes),
          tagline: "Melanggar aturan sekolah hari ini murni demi investasi bahan cerita pas reuni 20 tahun lagi.",
          theme: "unknown",
          bgClass: "bg-unknown-2",
          stampText: "SANG ANOMALI",
          stampClass: "violation-stamp small warning"
        };
      }
    }

    // =========================================================================
    // PRIORITY 3: FALLBACK - NPC / RAKYAT BIASA
    // =========================================================================
    if (!result) {
      const prefixes = ["Rakyat", "Warga", "Manusia", "Insan", "Penduduk", "Siswa", "Hamba", "Kader"];
      const suffixes = ["Santuy", "Biasa", "Pasrah", "Rebahan", "Damai", "NPC", "Rileks", "Rukun"];
      const taglines = [
        "Belajar secukupnya, tidur sepuasnya, cita-cita tetap jadi menantu idaman di masa depan.",
        "NPC kelas yang kerjaannya cuma numpang ketawa kalau ada jokes lucu dari cowok belakang.",
        "Eksistensinya di kelas kayak sinyal provider di pedalaman: ada dan tiada, tapi tetap bertahan hidup."
      ];
      result = {
        title: generateTitle(prefixes, suffixes),
        tagline: getRandom(taglines),
        theme: "unknown",
        bgClass: "bg-unknown-3",
        stampText: "SISWA BIASA",
        stampClass: "prestas-stamp silver"
      };
    }

    // Apply optional custom overrides from the teacher/database
    if (s.customTitle && s.customTitle.trim() !== '') {
      result.title = s.customTitle;
    }
    if (s.customTagline && s.customTagline.trim() !== '') {
      result.tagline = s.customTagline;
    }

    return result;
  };

  const showSubjectHistory = (subKey, subName) => {
    if (!matchedStudent) return;
    const history = matchedStudent.grades_history && matchedStudent.grades_history[subKey]
      ? matchedStudent.grades_history[subKey]
      : [];
    setHistorySubject(subName);
    setHistoryData(history);
  };

  // Stop camera when screen changes
  useEffect(() => {
    stopCamera();
    if (screen === 'student') {
      setScanState('scan');
      setMatchedStudent(null);
      setTimeout(() => startCamera(studentVideoRef), 100);
    } else if (screen === 'teacher' && teacherTab === 't-reg') {
      setQsState('scanner');
    }
  }, [screen, teacherTab]);

  return (
    <div>
      {/* Background Majestic 3D Three.js Galaxy Scanner Canvas */}
      <ThreeGalaxyScanner scanState={scanState} screen={screen} />

      {/* Background Starry Canvas */}
      <canvas id="stars-canvas"></canvas>
      <div id="cursor-glow"></div>

      {/* Cosmic Warp Speed Hyperspace transition flash overlay */}
      {showWarpFlash && <div className="cosmic-warp-flash" />}
      
      {/* Physics-based Celestial Universe is completely simulated & drawn inside the Canvas above */}

      <div className="aurora">
        <div className="aurora-band a1"></div>
        <div className="aurora-band a2"></div>
        <div className="aurora-band a3"></div>
      </div>
      <div className="galaxy"></div>


      {/* ═══ SPLASH SCREEN ═══ */}
      {screen === 'splash' && (
        <div className="screen active" id="splash-screen">
          <div className="splash-bg"><div className="orb o1"></div><div className="orb o2"></div><div className="orb o3"></div><div className="noise"></div></div>
          <div className="splash-inner">
            <div className="logo-box">
              <div className="logo-mark">
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 14V8h6M34 8h6v6M40 34v6h-6M14 40H8v-6" stroke="var(--cyan)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="24" cy="24" r="11" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3"/>
                  <path d="M18 20h.01M30 20h.01" stroke="var(--cyan)" strokeWidth="4" strokeLinecap="round"/>
                  <path d="M20 28c1.2 1.5 6.8 1.5 8 0" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <circle cx="24" cy="24" r="2.5" fill="var(--cyan)"/>
                  <circle cx="15" cy="27" r="1.5" fill="var(--primary)"/>
                  <circle cx="33" cy="27" r="1.5" fill="var(--primary)"/>
                </svg>
              </div>
              <h1 className="logo-title">FaceGrade <span>AI</span></h1>
              <p className="logo-desc">Face Recognition & Student Grade System</p>
            </div>
            <div className="mode-grid">
              <button className="mode-card" onClick={() => setShowLogin(true)}>
                <svg className="mode-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
                <strong>Teacher Panel</strong>
                <small>Daftarkan wajah siswa & input nilai</small>
              </button>
              <button className="mode-card" onClick={() => setScreen('student')}>
                <svg className="mode-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                  <path d="M12 9a4 4 0 0 0-4 4"/>
                </svg>
                <strong>Cek Nilai Saya</strong>
                <small>Scan wajah untuk lihat nilai & poster kosmik</small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TEACHER PANEL ═══ */}
      {screen === 'teacher' && (
        <div className="screen active" id="teacher-screen">
          <header className="navbar">
            <div className="nb-logo" onClick={() => setScreen('splash')}>FaceGrade <span>AI</span></div>
            <nav className="nb-tabs">
              <button className={`nb-tab ${teacherTab === 't-reg' ? 'on' : ''}`} onClick={() => setTeacherTab('t-reg')}>📝 Register + Grades</button>
              <button className={`nb-tab ${teacherTab === 't-list' ? 'on' : ''}`} onClick={() => { setTeacherTab('t-list'); loadStudents(); }}>📋 All Students</button>
            </nav>
            <div className="nb-end">
              <span className="pill">👨‍🏫 Teacher</span>
              <button className="btn ghost sm" onClick={() => setScreen('splash')}>Logout</button>
            </div>
          </header>

          <div className="page-body">
            {/* Quick Scanner & Register Form */}
            {teacherTab === 't-reg' && (
              <section className="pane on">
                <div className="pane-head">
                  <h2>📸 Quick Scanner</h2>
                  <p>Scan wajah siswa di tempat untuk nambah nilai atau lapor pelanggaran!</p>
                </div>

                {/* Cam Live Scanner */}
                {qsState === 'scanner' && (
                  <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h3>📷 Arahkan Kamera ke Siswa</h3>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden', background: '#080816', border: '1px solid rgba(124,106,255,0.2)', boxShadow: '0 0 30px rgba(0,0,0,0.6)' }}>
                      {qsMsg === 'MENGANALISIS WAJAH...' && lastCapBase64 ? (
                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={lastCapBase64} alt="Snapshot Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {/* Moving scanner line overlay */}
                          <div className="hologram-scanning-line" style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: 'linear-gradient(to right, transparent, var(--cyan), transparent)',
                            boxShadow: '0 0 12px var(--cyan), 0 0 24px var(--cyan)',
                            animation: 'scanMove 2s ease-in-out infinite'
                          }} />
                          {/* Sci-fi scanner overlay grid */}
                          <div className="scan-grid-overlay" style={{ opacity: 0.6 }} />
                          {/* Glowing analysis circle pulse */}
                          <div className="scanning-pulse" style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '120px',
                            height: '120px',
                            border: '2px dashed var(--cyan)',
                            borderRadius: '50%',
                            animation: 'spin 10s linear infinite',
                            opacity: 0.5
                          }} />
                          {/* Biometric locked rings */}
                          <div className="scanning-pulse-inner" style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '85px',
                            height: '85px',
                            border: '1px solid rgba(92,240,255,0.4)',
                            borderRadius: '50%',
                            boxShadow: 'inset 0 0 15px rgba(92,240,255,0.2)',
                            opacity: 0.8
                          }} />
                        </div>
                      ) : (
                        <video ref={teacherVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}></video>
                      )}
                    </div>
                    <div className="btn-row" style={{ justifyContent: 'center' }}>
                      {!camRunning ? (
                        <button className="btn secondary" onClick={() => startCamera(teacherVideoRef)}>Mulai Kamera</button>
                      ) : (
                        <>
                          <button className="btn primary glow" onClick={snapAndCheck}>🔍 Scan Wajah!</button>
                          <button className="btn ghost" onClick={() => flipCamera(teacherVideoRef)}>🔄 Ganti Kamera</button>
                        </>
                      )}
                    </div>
                    {qsMsg && (
                      <div className={`msg-box ${qsMsgType}`} style={{ marginTop: '16px' }}>
                        {qsMsg === 'MENGANALISIS WAJAH...' ? <span className="ai-loading-pulse">🔍 MENGANALISIS WAJAH...</span> : qsMsg}
                      </div>
                    )}
                  </div>
                )}

                {/* Found - Add Event Score/Violation */}
                {qsState === 'add-event' && qsStudent && (
                  <div className="card" style={{ maxWidth: '600px', margin: '20px auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                      <img src={lastCapBase64} style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} alt="Student Preview" />
                    </div>
                    <h3 style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: '5px', fontSize: '1.8rem' }}>{qsStudent.name}</h3>
                    <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text3)' }}>Kelas: {qsStudent.kelas} | NIS: {qsStudent.studentId}</p>
                    
                    <div className="field">
                      <label>Pilih Jenis Catatan</label>
                      <select value={qsEventType} onChange={(e) => setQsEventType(e.target.value)} style={{ fontSize: '1.1rem', padding: '12px' }}>
                        <option value="grade">🟢 Tambah Nilai Mata Pelajaran</option>
                        <option value="violation">🔴 Lapor Pelanggaran / Kasus</option>
                      </select>
                    </div>

                    {qsEventType === 'grade' ? (
                      <div>
                        <div className="field">
                          <label>Mata Pelajaran</label>
                          <select value={qsSubject} onChange={(e) => setQsSubject(e.target.value)}>
                            {SUBJECTS.map(s => <option key={s.key} value={s.key}>{s.icon} {s.name}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Nilai (1-100)</label>
                          <input type="number" value={qsScore} onChange={(e) => setQsScore(e.target.value)} placeholder="Misal: 95" />
                        </div>
                      </div>
                    ) : (
                      <div className="field">
                        <label>Detail Pelanggaran (Apa & Bagaimana kejadiannya?)</label>
                        <textarea value={qsNote} onChange={(e) => setQsNote(e.target.value)} rows="3" placeholder="Contoh: Ketahuan main Mobile Legends waktu pelajaran Sejarah..."></textarea>
                      </div>
                    )}

                    <button className="btn primary full mt lg glow" onClick={submitEvent}>💾 Simpan ke Database</button>
                    <button className="btn ghost full mt" onClick={resetQs}>← Batal & Kembali</button>
                  </div>
                )}

                {/* Not Found - Register Student */}
                {qsState === 'register' && (
                  <div className="card" style={{ maxWidth: '600px', margin: '20px auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                      <img src={lastCapBase64} style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--warning)' }} alt="Register Preview" />
                    </div>
                    <h3 style={{ color: 'var(--warning)', textAlign: 'center' }}>⚠️ Wajah Belum Terdaftar!</h3>
                    <p style={{ textAlign: 'center', marginBottom: '20px' }}>Silakan daftarkan wajah ini ke database sekolah terlebih dahulu.</p>

                    <div className="field">
                      <label>NIS</label>
                      <input value={regNis} onChange={(e) => setRegNis(e.target.value)} placeholder="Contoh: 2024001" />
                    </div>
                    <div className="field">
                      <label>Nama Lengkap</label>
                      <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Contoh: Ahmad Rizky" />
                    </div>
                    <div className="field">
                      <label>Kelas</label>
                      <select value={regClass} onChange={(e) => setRegClass(e.target.value)}>
                        <option value="">Pilih Kelas...</option>
                        <option>X-A</option><option>X-B</option>
                        <option>XI-A</option><option>XI-B</option>
                        <option>XII-A</option><option>XII-B</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Agama</label>
                      <select value={regReligion} onChange={(e) => setRegReligion(e.target.value)}>
                        <option value="">Pilih Agama...</option>
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Budha">Budha</option>
                        <option value="Konghucu">Konghucu</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Gelar Kosmik Kustom (Optional)</label>
                      <input value={regCustomTitle} onChange={(e) => setRegCustomTitle(e.target.value)} placeholder="Contoh: Sang Master Sepakbola" />
                    </div>
                    <div className="field">
                      <label>Kata-Kata Kustom Poster (Optional)</label>
                      <input value={regCustomTagline} onChange={(e) => setRegCustomTagline(e.target.value)} placeholder="Contoh: Lari 10km sehari, tapi tidak berani lari dari kenyataan." />
                    </div>

                    <button className="btn warning full mt lg" onClick={registerStudent}>✅ Daftarkan Wajah & Simpan</button>
                    <button className="btn ghost full mt" onClick={resetQs}>Batal</button>
                  </div>
                )}
              </section>
            )}

            {/* Student List View */}
            {teacherTab === 't-list' && (
              <section className="pane on">
                <div className="pane-head">
                  <h2>All Students</h2>
                  <p>View, edit grades, and manage student records</p>
                </div>
                <div id="stu-table">
                  {students.length === 0 ? (
                    <p className="empty-state">Belum ada siswa terdaftar.</p>
                  ) : (
                    students.map(s => {
                      const gradesArr = Object.values(s.grades || {});
                      const avg = gradesArr.length > 0 ? (gradesArr.reduce((a, b) => a + b, 0) / gradesArr.length).toFixed(1) : '—';
                      const violations = s.violations_history ? s.violations_history.length : 0;
                      const thumb = s.thumbnail || '/default-avatar.svg';

                      return (
                        <div className="stu-row" key={s.studentId}>
                          <img src={thumb} alt="Avatar" />
                          <div>
                            <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{s.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>NIS: {s.studentId} | Kelas: {s.kelas} | Agama: {s.agama}</div>
                          </div>
                          <div><span className="pill">Avg: {avg}</span></div>
                          <div><span className="pill" style={{ color: 'var(--red)', borderColor: 'var(--red)', background: 'rgba(232,74,90,.05)' }}>Kasus: {violations}</span></div>
                          <div className="stu-actions">
                            <button className="edit-btn" onClick={() => openEditGrades(s)}>✏️ Edit</button>
                            <button className="del-btn" onClick={() => deleteStudent(s.studentId, s.faceId)}>🗑️ Hapus</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* ═══ STUDENT SCREEN ═══ */}
      {screen === 'student' && (
        <div className="screen active" id="student-screen" style={{ position: 'relative', overflow: 'hidden' }}>

          <header className="navbar student-nb">
            <div className="nb-logo" onClick={() => setScreen('splash')}>FaceGrade <span>AI</span></div>
            <button className="btn ghost sm" onClick={() => setScreen('splash')}>← Kembali</button>
          </header>
          <div className="page-body centered">
            
            {/* 1. Cam Live Scan UI */}
            {scanState === 'scan' && (
              <div>
                <h1 className="big-title">Cek Nilai Kamu</h1>
                <p className="subtitle">Arahkan wajahmu ke kamera lalu klik Scan!</p>
                <div className="live-cam-wrap">
                  <video ref={studentVideoRef} autoPlay playsInline></video>
                  {!camRunning && (
                    <div className="cam-ph-student">
                      <div className="spinner"></div>
                      <p>Memulai kamera...</p>
                    </div>
                  )}
                </div>
                <div className="btn-row center" style={{ marginBottom: '20px' }}>
                  {camRunning && (
                    <>
                      <button className="btn primary lg glow scan-btn" onClick={snapStu}>📸 Scan Wajah!</button>
                      <button className="btn ghost" onClick={() => flipCamera(studentVideoRef)} title="Ganti Kamera">🔄 Ganti Kamera</button>
                    </>
                  )}
                </div>
                <div className="upload-alt">
                  <span className="divider-text">atau upload foto</span>
                  <label className="upload-label" htmlFor="s-file">📁 Choose File</label>
                  <input type="file" id="s-file" accept="image/*" className="hidden" onChange={handleStuFile} />
                </div>
              </div>
            )}

            {/* 1b. Upload confirmation */}
            {scanState === 'upload-confirm' && (
              <div className="cam-box">
                <img src={lastCapBase64} className="img-preview-lg" alt="Uploaded Preview" />
                <div className="btn-row center" style={{ marginTop: '20px' }}>
                  <button className="btn primary lg glow" onClick={() => processStudentFace(lastCapBase64)}>🔍 Scan This Face</button>
                  <button className="btn ghost" onClick={() => { setScanState('scan'); setTimeout(() => startCamera(studentVideoRef), 100); }}>Batal</button>
                </div>
              </div>
            )}

            {/* 2. Loading Recognition */}
            {(scanState === 'loading' || scanState === 'zooming') && (
              <div className="scan-loader-galactic">
                {/* Floating Corner Face Biometric Scan Panel */}
                <div className="biometric-corner-box">
                  <div className="corner-box-title">🛰️ SOURCE TARGET DATA</div>
                  <div className="corner-photo-wrapper">
                    <div className="corner-photo" style={lastCapBase64 ? { backgroundImage: `url('${lastCapBase64}')` } : {}}>
                      <div className="corner-laser-line"></div>
                      <div className="corner-bracket tl"></div>
                      <div className="corner-bracket tr"></div>
                      <div className="corner-bracket bl"></div>
                      <div className="corner-bracket br"></div>
                    </div>
                  </div>
                  <div className="corner-metrics font-mono">
                    <div className="status-title">FACE ID: LOCALLY ENROLLED</div>
                    <div className="status-sub text-cyan animate-flicker">
                      {scanState === 'zooming' ? '🎯 TARGET IDENTIFIED!' : 'SCANNING VECTOR MATRIX...'}
                    </div>
                    <div className="status-detail text-purple">
                      {scanState === 'zooming' ? '🔐 PROFILE DECRYPTED' : '128-D EMBEDDING LOCKED'}
                    </div>
                  </div>
                </div>

                {/* Central Futuristic Holographic HUD Overlay */}
                <div className="scan-hud-container">
                  {/* Overlay Sci-fi Grid */}
                  <div className="scan-grid-overlay"></div>

                  {/* Telemetry data display */}
                  <div className="scan-telemetry-hud">
                    <div className="telemetry-log">
                      <div className="log-line text-cyan font-mono animate-flicker">🚀 COGNITIVE SCAN INITIALIZED...</div>
                      <div className="log-line text-purple font-mono delay-1">🔍 LOCKING ON CELESTIAL TARGET COORDINATES</div>
                      <div className="log-line text-green font-mono delay-2">🛰️ CROSS-REFERENCING BIMA SAKTI DATABASES</div>
                      <div className="log-line text-yellow font-mono delay-3">
                        {scanState === 'zooming' 
                          ? '🎯 CONVERGING SENSORS ON IDENTIFIED TARGET STAR!' 
                          : '🌀 EXTRACTING SOUL PROFILE FROM ANDROMEDA ARCHIVES'}
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="ai-loading-pulse mt">
                  {scanState === 'zooming' ? '🎯 PROFIL DITEMUKAN! LOCKING ON COORDINATES...' : 'MENCARI PROFIL JIWA DI ALAM SEMESTA...'}
                </h2>
                <p className="ai-loading-pulse-slow">
                  {scanState === 'zooming' 
                    ? 'Hyperspace jump deep into coordinates of matched student star...' 
                    : 'Scanning 35,000 stars dynamically for matching signatures'}
                </p>
              </div>
            )}

            {/* 3. Matched Result */}
            {scanState === 'result-ok' && matchedStudent && (
              <div>
                {(() => {
                  const gen = getPosterMeta(matchedStudent);
                  const violations = matchedStudent.violations_history ? matchedStudent.violations_history.length : 0;
                  const allGrades = SUBJECTS.map(sub => getGradeValue(matchedStudent, sub.key));
                  const numericGrades = allGrades.filter(val => typeof val === 'number' && !isNaN(val));
                  const avgVal = numericGrades.length > 0 
                    ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(1) 
                    : "-";

                   const stampText = gen.stampText || "";
                   const stampClass = gen.stampClass || "prestas-stamp";

                   return (
                     <div>
                       <div className="res-top-bar">
                         <button className="btn ghost" onClick={() => { setScanState('scan'); setTimeout(() => startCamera(studentVideoRef), 100); }}>← Kembali</button>
                         <div className="res-avg-pill">
                           Rata-Rata: <strong>{avgVal}</strong>
                         </div>
                       </div>

                       <div className="res-layout">
                         <div className="res-left">
                           
                           {/* Compact Cosmic Poster */}
                           <div id="poster-area">
                             <div className={`poster poster-${gen.theme} ${gen.bgClass}`}>
                               <div className="poster-bg" style={{ backgroundImage: `url('${matchedPhoto}')` }}></div>
                               <img className="poster-face" src={matchedPhoto} alt="Student Face" />
                               {stampText && (
                                 <div className={stampClass}>
                                   {stampText}
                                   {stampClass.includes('violation-stamp') && matchedStudent.violations_history && matchedStudent.violations_history.length > 0 && (
                                     <small>
                                       {matchedStudent.violations_history[matchedStudent.violations_history.length - 1].note}
                                     </small>
                                   )}
                                 </div>
                               )}
                              <div className="poster-body">
                                <div className="poster-label">{gen.title}</div>
                                <div className="poster-sub">{matchedStudent.name} | {matchedStudent.kelas}</div>
                                <div className="poster-tag">{gen.tagline}</div>
                              </div>
                              <div className="poster-deco tl">✨</div>
                              <div className="poster-deco br">🪐</div>
                              <div className="poster-extras">
                                <div className="poster-extra" style={{ top: '20%', left: '10%', fontSize: '1.5rem', animationDuration: '4s' }}>⭐</div>
                                <div className="poster-extra" style={{ top: '40%', right: '15%', fontSize: '1.8rem', animationDuration: '6s' }}>🛸</div>
                                <div className="poster-extra" style={{ top: '70%', left: '20%', fontSize: '1.2rem', animationDuration: '5s' }}>☄️</div>
                              </div>
                            </div>
                          </div>

                          {/* Identity Box */}
                          <div className="res-identity">
                            <div className="ri-item"><span className="ri-label">NIS</span><span className="ri-val">{matchedStudent.studentId}</span></div>
                            <div className="ri-item"><span className="ri-label">Nama</span><span className="ri-val">{matchedStudent.name}</span></div>
                            <div className="ri-item"><span className="ri-label">Kelas</span><span className="ri-val">{matchedStudent.kelas}</span></div>
                            <div className="ri-item"><span className="ri-label">Agama</span><span className="ri-val">{matchedStudent.agama}</span></div>
                            <div className="ri-item"><span className="ri-label">Jumlah Kasus</span><span className="ri-val" style={{ color: matchedStudent.violations_history?.length > 0 ? 'var(--red)' : 'var(--green)' }}>{matchedStudent.violations_history?.length || 0} Kasus</span></div>
                          </div>

                          {/* Live Face Analyzer Stats */}
                          {unknownAttrs && unknownAttrs.length > 0 && (
                            <div className="unknown-data" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '20px' }}>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>🔍 Live AI Face Scan:</h4>
                              <div className="attrs-list" style={{ gap: '8px' }}>
                                {unknownAttrs.map((attr, i) => (
                                  <div className="attr-row" key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span className="attr-label" style={{ color: 'var(--text3)' }}>{attr.label}</span>
                                    <span className="attr-val" style={{ fontWeight: 'bold', color: 'var(--text1)' }}>{attr.val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Violations stamp */}
                          {matchedStudent.violations_history?.length > 0 && (
                            <div className="violation-list-box">
                              <h4>⚠️ Catatan Kasus Sekolah:</h4>
                              <ul>
                                {matchedStudent.violations_history.map((v, i) => (
                                  <li key={i}><strong>{(v.date || '').substring(0, 10) || '—'}</strong>: {v.note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Right side - grades grid */}
                        <div className="res-right">
                          <h3>📋 Rincian Nilai</h3>
                          <div className="grade-tiles-compact">
                            {SUBJECTS.map((sub, idx) => {
                              const val = getGradeValue(matchedStudent, sub.key);
                              const isNumeric = typeof val === 'number' && !isNaN(val);

                              let cls = 's-c';
                              if (isNumeric) {
                                if (val >= 85) cls = 's-a';
                                else if (val >= 75) cls = 's-b';
                                else if (val < 60) cls = 's-d';
                              } else {
                                cls = 's-muted';
                              }

                              const isTop = isNumeric && val === Math.max(...allGrades.filter(v => typeof v === 'number' && !isNaN(v)));
                              const history = getSubjectHistory(matchedStudent, sub.key);

                              return (
                                <div className={`grade-tile ${isTop ? 'crown' : ''}`} key={sub.key} style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => showSubjectHistory(sub.key, sub.name)}>
                                  <div className="g-ico">{sub.icon}</div>
                                  <div className="g-name">{sub.name}</div>
                                  <div className={`g-val ${cls}`}>{val}</div>
                                  <div className="g-bar">
                                    <div className={cls} style={{ width: isNumeric ? `${val}%` : '0%', background: isNumeric ? (val >= 85 ? 'var(--green)' : val >= 75 ? 'var(--blue)' : 'var(--red)') : 'rgba(255,255,255,0.08)' }}></div>
                                  </div>
                                  
                                  {/* Tooltip history */}
                                  <div className="g-tooltip">
                                    {history.length === 0 ? (
                                      <div><span>Belum ada history</span></div>
                                    ) : (
                                      history.slice(-3).reverse().map((h, hi) => (
                                        <div key={hi}>
                                          <span>{(h.date || '').substring(5, 10) || '—'}</span>
                                          <strong>{h.val}</strong>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 4. Unmatched Result */}
            {scanState === 'result-no' && (
              <div>
                <button className="btn ghost" onClick={() => { setScanState('scan'); setTimeout(() => startCamera(studentVideoRef), 100); }}>← Kembali</button>
                <div className="unknown-layout">
                  <div className="unknown-visual">
                    <div className="unknown-face-ring">
                      <span>❓</span>
                    </div>
                    <h2>Wajah Belum Terdaftar</h2>
                    <p>Belum ada data nilai. Silakan hubungi Guru Anda untuk mendaftar.</p>
                  </div>
                  <div className="unknown-data">
                    <h3>🔍 Analisis Wajah</h3>
                    <div className="attrs-list">
                      {unknownAttrs.map((attr, i) => (
                        <div className="attr-row" key={i}>
                          <span className="attr-label">{attr.label}</span>
                          <span className="attr-val">{attr.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}


      {/* ═══ LOGIN MODAL ═══ */}
      {showLogin && (
        <div className="modal-bg">
          <div className="modal">
            <button className="close-x" onClick={() => setShowLogin(false)}>×</button>
            <h2>🔐 Teacher Login</h2>
            <div className="field">
              <label>Username</label>
              <input value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="username" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <div className="field">
              <label>Password</label>
              <input value={loginPass} onChange={(e) => setLoginPass(e.target.value)} type="password" placeholder="••••••" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            {loginErr && <p className="err">{loginErr}</p>}
            <button className="btn primary full" onClick={handleLogin}>Sign In</button>
          </div>
        </div>
      )}

      {/* ═══ EDIT GRADES MODAL (TEACHER) ═══ */}
      {editingStudent && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '960px', width: '100%' }}>
            <button className="close-x" onClick={() => setEditingStudent(null)}>×</button>
            <h2>✏️ Add Assignment/Exam Grades</h2>
            <p style={{ color: 'var(--text2)', marginBottom: '15px' }}>{editingStudent.name} ({editingStudent.kelas})</p>
            
            <div className="info-strip" style={{ marginBottom: '20px', background: 'rgba(124, 106, 255, 0.05)', borderLeft: '3px solid var(--accent)' }}>
              💡 <strong>Info Sistem Rata-Rata:</strong> Masukkan nilai ujian atau tugas baru siswa (skala <code>0-100</code>). Nilai baru akan ditambahkan ke riwayat nilai, dan dashboard akan menampilkan rata-rata dari seluruh riwayat nilainya! Kosongkan jika tidak ada perubahan.
            </div>

            <div className="field">
              <label>Catatan Pelanggaran (Pisahkan dengan koma jika lebih dari satu)</label>
              <input type="text" value={editViolations} onChange={(e) => setEditViolations(e.target.value)} placeholder="e.g. Tidur di kelas, Telat masuk gerbang" />
            </div>

            <div className="field-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Gelar Kosmik Kustom (Optional)</label>
                <input type="text" value={editCustomTitle} onChange={(e) => setEditCustomTitle(e.target.value)} placeholder="Contoh: Sang Master Sepakbola" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Kata-Kata Kustom Poster (Optional)</label>
                <input type="text" value={editCustomTagline} onChange={(e) => setEditCustomTagline(e.target.value)} placeholder="Contoh: Lari 10km sehari..." />
              </div>
            </div>
            
            <div className="subjects-grid">
              {SUBJECTS.map(sub => {
                const currentGrade = getGradeValue(editingStudent, sub.key);
                const historyItems = getSubjectHistory(editingStudent, sub.key);
                const val = editGrades[sub.key];
                
                const historyStr = historyItems.length > 0 
                  ? historyItems.map(h => h.val).join(', ') 
                  : 'Belum ada riwayat';

                return (
                  <div className="subj-card" key={sub.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '16px', minHeight: '220px' }}>
                    <div className="ico" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{sub.icon}</div>
                    <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text2)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>{sub.name}</label>
                    
                    <div className="current-grade" style={{ fontSize: '0.88rem', color: 'var(--text1)', marginBottom: '2px', fontWeight: 'bold' }}>
                      Rata-Rata: <span style={{ color: 'var(--cyan)' }}>{currentGrade}</span>
                    </div>

                    <div className="history-scores" style={{ fontSize: '0.72rem', color: 'var(--text3)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '12px' }} title={`Riwayat: ${historyStr}`}>
                      Riwayat: <span style={{ color: 'var(--text2)' }}>{historyStr}</span>
                    </div>

                    <div className="add-input-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Nilai Ujian/Tugas Baru
                      </span>
                      <input 
                        type="number" 
                        value={editGrades[sub.key] === undefined || editGrades[sub.key] === '' ? '' : editGrades[sub.key]} 
                        onChange={(e) => { 
                          const v = e.target.value; 
                          setEditGrades({ ...editGrades, [sub.key]: v === '' ? '' : parseFloat(v) }); 
                        }} 
                        placeholder="0-100" 
                        min="0" 
                        max="100" 
                        style={{ 
                          width: '90px', 
                          textAlign: 'center', 
                          fontSize: '1.1rem',
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          background: 'var(--bg)',
                          color: 'var(--text)',
                          fontWeight: '600',
                          borderColor: val !== '' ? 'var(--accent)' : 'var(--border)',
                          boxShadow: val !== '' ? '0 0 10px var(--accent-glow)' : 'none',
                          transition: 'all 0.2s ease'
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button className="btn primary full" onClick={saveEditGrades}>💾 Simpan Perubahan</button>
          </div>
        </div>
      )}

      {/* ═══ HISTORY DETAIL MODAL (STUDENT) ═══ */}
      {historySubject && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: '500px', padding: '24px' }}>
            <button className="close-x" onClick={() => setHistorySubject(null)}>×</button>
            <h2 style={{ marginTop: 0, color: 'var(--primary)' }}>Riwayat Nilai: {historySubject}</h2>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {historyData.length === 0 ? (
                <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>Belum ada riwayat perubahan nilai mapel ini.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text2)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 5px' }}>Tanggal</th>
                      <th style={{ padding: '10px 5px', textAlign: 'right' }}>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.slice().reverse().map((h, i) => (
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} key={i}>
                        <td style={{ padding: '10px 5px', color: 'var(--text2)' }}>{h.date}</td>
                        <td style={{ padding: '10px 5px', textAlign: 'right', fontWeight: 'bold', color: 'var(--green)' }}>{h.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Stack */}
      <div className="toast-stack">
        {toasts.map(t => (
          <div className={`toast ${t.type}`} key={t.id}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}
