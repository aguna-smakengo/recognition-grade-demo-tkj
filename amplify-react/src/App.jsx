import React, { useState, useEffect, useRef } from 'react';
import { Rekognition } from "@aws-sdk/client-rekognition";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Subjects Config
const SUBJECTS = [
  { key: 'rel', name: 'Agama', icon: '🕌' },
  { key: 'ppkn', name: 'PPKn', icon: '⚖️' },
  { key: 'indo', name: 'B. Indonesia', icon: '📝' },
  { key: 'eng', name: 'B. Inggris', icon: '🇬🇧' },
  { key: 'math', name: 'Matematika', icon: '📐' },
  { key: 'ipas', name: 'IPAS', icon: '🧬' },
  { key: 'art', name: 'Seni Budaya', icon: '🎨' },
  { key: 'pe', name: 'PJOK', icon: '🏃' },
  { key: 'jawa', name: 'B. Jawa', icon: '👑' }
];

export default function App() {
  // Navigation & UI States
  const [screen, setScreen] = useState('splash');
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

  // Student list
  const [students, setStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editViolations, setEditViolations] = useState('');
  const [editGrades, setEditGrades] = useState({});

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

  // ── Background Starry Effects ──
  useEffect(() => {
    const canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const starCount = 140;
    const stars = [];

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        d: Math.random() * starCount,
        color: ['#7c6aff', '#5cf0ff', '#b07aff', '#ffffff'][Math.floor(Math.random() * 4)]
      });
    }

    let animId;
    function draw() {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        s.d += 0.015;
        ctx.globalAlpha = Math.abs(Math.sin(s.d));
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
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
            violations_history: []
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

        s.grades[qsSubject] = score;
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
    const initialGrades = {};
    SUBJECTS.forEach(sub => {
      initialGrades[sub.key] = s.grades && s.grades[sub.key] !== undefined ? s.grades[sub.key] : 80;
    });
    setEditGrades(initialGrades);
  };

  const saveEditGrades = async () => {
    if (!dbClient || !editingStudent) return;

    try {
      let s = { ...editingStudent };
      s.grades = { ...editGrades };

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

      triggerToast('Data berhasil disimpan!', 'ok');
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
    if (!rekClient || !dbClient) {
      triggerToast('AWS Credentials are not configured!', 'fail');
      setScanState('scan');
      setTimeout(() => startCamera(studentVideoRef), 100);
      return;
    }

    setScanState('loading');

    try {
      const imageBytes = base64ToByteArray(base64);

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
              setMatchedStudent(dbData.Item);
              setMatchedPhoto(base64);
              setScanState('result-ok');
            } else {
              showUnknownResult(base64);
            }
          } catch (dbErr) {
            showUnknownResult(base64);
          }
        } else {
          showUnknownResult(base64);
        }
      });

    } catch (e) {
      triggerToast(e.message, 'fail');
      setScanState('scan');
      setTimeout(() => startCamera(studentVideoRef), 100);
    }
  };

  const showUnknownResult = (base64) => {
    setMatchedPhoto(base64);
    
    // Mock face details
    const randomG = Math.random() > 0.5 ? 'Male' : 'Female';
    const randomAge = Math.floor(Math.random() * 5) + 15;
    const emotions = ['HAPPY', 'CALM', 'CONFUSED', 'SURPRISED'];
    const emo = emotions[Math.floor(Math.random() * emotions.length)];

    setUnknownAttrs([
      { label: 'Gender', val: randomG },
      { label: 'Estimated Age', val: `${randomAge} - ${randomAge + 3} years` },
      { label: 'Primary Emotion', val: `${emo} (98%)` },
      { label: 'Smiling', val: Math.random() > 0.4 ? 'Yes' : 'No' },
      { label: 'Wearing Glasses', val: Math.random() > 0.8 ? 'Yes' : 'No' }
    ]);
    
    setScanState('result-no');
  };

  // ── Procedural Title Generator ──
  const getPosterMeta = (s) => {
    const grades = s.grades || {};
    const vList = s.violations_history || [];
    const violations = vList.length;
    const agama = s.agama || '';

    // Rule: Bule Jawa (Priority 1)
    if (grades.eng >= 85 && grades.jawa >= 85) {
      const taglines = [
        "Which is kulo niku saestu bingung jal! So hard but monggo pinarak!",
        "Honestly ya, nek pancen jodoh yo ndak sengaja jal! Hello guys!",
        "I am sorry ndak sengaja kulo niku medok sanget, brother! My bad yo!",
        "Literally kulo niku tresno banget kalih panjenengan, very deeply jal!",
        "Basic-nya kulo niku priyayi ingkang modern, which is sae sanget!"
      ];
      return {
        title: "Bule Jawa",
        tagline: taglines[Math.floor(Math.random() * taglines.length)],
        theme: "bjawa",
        bgClass: "bg-math-3"
      };
    }

    // Rule: Violations (Priority 2)
    if (violations > 0) {
      const notes = vList.map(v => v.note.toLowerCase()).join(' ');

      if (notes.includes('tidur') || notes.includes('turu') || notes.includes('ngantuk')) {
        return {
          title: `${["Bupati", "Presiden", "Camat", "Raja"][Math.floor(Math.random()*4)]} Turu`,
          tagline: "Latihan simulasi tidur pas rapat paripurna DPR di masa depan.",
          theme: "penjas",
          bgClass: "bg-ips-2",
          stamp: true
        };
      }
      if (notes.includes('ml') || notes.includes('game') || notes.includes('mabar') || notes.includes('hp')) {
        return {
          title: `Gubernur Mabar`,
          tagline: "Pecah rank Mythic lebih penting daripada memikirkan nasib matematika bangsa.",
          theme: "informatika",
          bgClass: "bg-info-4",
          stamp: true
        };
      }
      if (notes.includes('telat') || notes.includes('lambat') || notes.includes('gerbang')) {
        return {
          title: `Pawang Gerbang`,
          tagline: "Datang jam 8 pagi biar gerbang sekolah serasa gerbang istana pribadi.",
          theme: "unknown",
          bgClass: "bg-ips-1",
          stamp: true
        };
      }
      if (notes.includes('kas') || notes.includes('nunggak') || notes.includes('uang')) {
        return {
          title: `Calon Koruptor`,
          tagline: "Latihan korupsi uang kas kelas sejak dini demi membiayai seblak pacar tercinta.",
          theme: "konghucu",
          bgClass: "bg-konghucu-1",
          stamp: true
        };
      }
      if (notes.includes('bolos') || notes.includes('kantin') || notes.includes('cabut')) {
        return {
          title: `Gubernur Kantin`,
          tagline: "Rapat paripurna di meja kantin membahas subsidi bakwan hangat gratis.",
          theme: "seni",
          bgClass: "bg-ips-3",
          stamp: true
        };
      }

      return {
        title: "Duta Anomali",
        tagline: "Pelanggaran aturan hari ini demi konten nostalgia pas reuni 20 tahun lagi.",
        theme: "unknown",
        bgClass: "bg-unknown-2",
        stamp: true
      };
    }

    // Rule: High Religious Grade (Priority 3)
    if (grades.rel >= 85) {
      if (agama.toLowerCase() === 'islam') {
        return {
          title: `Ustadz Gaul`,
          tagline: "IPK tinggi hanyalah bonus duniawi, yang penting pahala jalur langit tetap aman.",
          theme: "islam",
          bgClass: "bg-islam-2"
        };
      }
      if (agama.toLowerCase() === 'kristen' || agama.toLowerCase() === 'katolik') {
        return {
          title: `Pendeta Digital`,
          tagline: "Berdoa di hari Minggu, mabar di hari Senin, tetap berkati tongkrongan!",
          theme: "kristen",
          bgClass: "bg-kristen-1"
        };
      }
      return {
        title: `Suhu Santuy`,
        tagline: "Harmoni kehidupan terpancar dari ketenangan batinnya saat jam pelajaran kosong.",
        theme: "budha",
        bgClass: "bg-budha-1"
      };
    }

    // Rule: Highest grade (Priority 4)
    let best = 'math';
    let val = 0;
    Object.entries(grades).forEach(([k, v]) => {
      if (v > val) {
        val = v;
        best = k;
      }
    });

    if (val >= 85) {
      if (best === 'math' || best === 'ipas') {
        return {
          title: `Albert Einstein`,
          tagline: "Otak penuh rumus fisika rumit sampai lupa caranya bersosialisasi dengan manusia biasa.",
          theme: best,
          bgClass: "bg-math-2"
        };
      }
      if (best === 'indo' || best === 'eng') {
        return {
          title: `Pujangga Kelas`,
          tagline: "Membuat untaian puisi indah nan puitis untuk merayu nilai tugas dari guru kelas.",
          theme: best,
          bgClass: "bg-bindo-1"
        };
      }
      if (best === 'art') {
        return {
          title: `Seniman Estetik`,
          tagline: "Melukis masa depan seindah lukisan pemandangan gunung kembar legendaris.",
          theme: "art",
          bgClass: "bg-seni-1"
        };
      }
      if (best === 'pe') {
        return {
          title: `Atlet Zumba`,
          tagline: "Lari dari kenyataan hidup lebih cepat daripada lari keliling lapangan bola.",
          theme: "pe",
          bgClass: "bg-penjas-1"
        };
      }
    }

    // Default
    return {
      title: "Rakyat Santuy",
      tagline: "Belajar secukupnya, tidur sepuasnya, tetap jadi idaman calon mertua di masa depan.",
      theme: "unknown",
      bgClass: "bg-unknown-3"
    };
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
      {/* Background Starry Canvas */}
      <canvas id="stars-canvas"></canvas>
      <div id="cursor-glow"></div>
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
                <svg viewBox="0 0 48 48" fill="none">
                  <rect x="2" y="2" width="44" height="44" rx="14" stroke="currentColor" strokeWidth="2.5"/>
                  <circle cx="18" cy="20" r="3" fill="currentColor"/>
                  <circle cx="30" cy="20" r="3" fill="currentColor"/>
                  <path d="M16 32c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <h1 className="logo-title">FaceGrade <span>AI</span></h1>
              <p className="logo-desc">Face Recognition & Student Grade System</p>
            </div>
            <div className="mode-grid">
              <button className="mode-card" onClick={() => setShowLogin(true)}>
                <span className="mode-emoji">🔑</span>
                <strong>Teacher Panel</strong>
                <small>Daftarkan wajah siswa & input nilai</small>
              </button>
              <button className="mode-card" onClick={() => setScreen('student')}>
                <span className="mode-emoji">📸</span>
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
                    <video ref={teacherVideoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '12px', marginBottom: '16px', background: '#000' }}></video>
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
        <div className="screen active" id="student-screen">
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
            {scanState === 'loading' && (
              <div className="scan-loader">
                <div className="scan-anim">
                  <div className="scan-circle">
                    <div className="scan-line"></div>
                  </div>
                  <div className="scan-dots"><span></span><span></span><span></span></div>
                </div>
                <h2>Mengidentifikasi Wajah...</h2>
                <p>Memproses dengan AWS Rekognition Client-Side</p>
              </div>
            )}

            {/* 3. Matched Result */}
            {scanState === 'result-ok' && matchedStudent && (
              <div>
                <div className="res-top-bar">
                  <button className="btn ghost" onClick={() => { setScanState('scan'); setTimeout(() => startCamera(studentVideoRef), 100); }}>← Kembali</button>
                  <div className="res-avg-pill">
                    Rata-Rata: <strong>
                      {(Object.values(matchedStudent.grades || {}).reduce((a,b)=>a+b,0) / Object.values(matchedStudent.grades || {}).length).toFixed(1)}
                    </strong>
                  </div>
                </div>
                
                {(() => {
                  const gen = getPosterMeta(matchedStudent);
                  return (
                    <div className="res-layout">
                      <div className="res-left">
                        
                        {/* Compact Cosmic Poster */}
                        <div id="poster-area">
                          <div className={`poster poster-${gen.theme} ${gen.bgClass}`}>
                            <div className="poster-bg" style={{ backgroundImage: `url('${matchedPhoto}')` }}></div>
                            <img className="poster-face" src={matchedPhoto} alt="Student Face" />
                            {gen.stamp && (
                              <div className="violation-stamp extreme">
                                KASUS BANYAK
                                <small>
                                  {matchedStudent.violations_history[matchedStudent.violations_history.length - 1].note}
                                </small>
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
                          <div className="ri-item"><span className="ri-label">NIS</span><span class="ri-val">{matchedStudent.studentId}</span></div>
                          <div className="ri-item"><span className="ri-label">Nama</span><span class="ri-val">{matchedStudent.name}</span></div>
                          <div className="ri-item"><span className="ri-label">Kelas</span><span class="ri-val">{matchedStudent.kelas}</span></div>
                          <div className="ri-item"><span className="ri-label">Agama</span><span class="ri-val">{matchedStudent.agama}</span></div>
                          <div className="ri-item"><span className="ri-label">Jumlah Kasus</span><span class="ri-val" style={{ color: matchedStudent.violations_history?.length > 0 ? 'var(--red)' : 'var(--green)' }}>{matchedStudent.violations_history?.length || 0} Kasus</span></div>
                        </div>

                        {/* Violations stamp */}
                        {matchedStudent.violations_history?.length > 0 && (
                          <div className="violation-list-box">
                            <h4>⚠️ Catatan Kasus Sekolah:</h4>
                            <ul>
                              {matchedStudent.violations_history.map((v, i) => (
                                <li key={i}><strong>{v.date.substring(0, 10)}</strong>: {v.note}</li>
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
                            const val = matchedStudent.grades && matchedStudent.grades[sub.key] !== undefined ? matchedStudent.grades[sub.key] : 80;
                            let cls = 's-c';
                            if (val >= 85) cls = 's-a';
                            else if (val >= 75) cls = 's-b';
                            else if (val < 60) cls = 's-d';

                            const isTop = val === Math.max(...Object.values(matchedStudent.grades || {}));
                            const history = matchedStudent.grades_history && matchedStudent.grades_history[sub.key] ? matchedStudent.grades_history[sub.key] : [];

                            return (
                              <div className={`grade-tile ${isTop ? 'crown' : ''}`} key={sub.key} style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => showSubjectHistory(sub.key, sub.name)}>
                                <div className="g-ico">{sub.icon}</div>
                                <div className="g-name">{sub.name}</div>
                                <div className={`g-val ${cls}`}>{val}</div>
                                <div className="g-bar">
                                  <div className={cls} style={{ width: `${val}%`, background: val >= 85 ? 'var(--green)' : val >= 75 ? 'var(--blue)' : 'var(--red)' }}></div>
                                </div>
                                
                                {/* Tooltip history */}
                                <div className="g-tooltip">
                                  {history.length === 0 ? (
                                    <div><span>Belum ada history</span></div>
                                  ) : (
                                    history.slice(-3).reverse().map((h, hi) => (
                                      <div key={hi}>
                                        <span>{h.date.substring(5, 10)}</span>
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
            <h2>✏️ Edit Grades & Violations</h2>
            <p style={{ color: 'var(--text2)', marginBottom: '15px' }}>{editingStudent.name} ({editingStudent.kelas})</p>
            
            <div className="field">
              <label>Catatan Pelanggaran (Pisahkan dengan koma jika lebih dari satu)</label>
              <input type="text" value={editViolations} onChange={(e) => setEditViolations(e.target.value)} placeholder="e.g. Tidur di kelas, Telat masuk gerbang" />
            </div>
            
            <div className="subjects-grid">
              {SUBJECTS.map(sub => (
                <div className="subj-card" key={sub.key}>
                  <div className="ico">{sub.icon}</div>
                  <label>{sub.name}</label>
                  <input type="number" value={editGrades[sub.key] || 80} onChange={(e) => setEditGrades({ ...editGrades, [sub.key]: parseFloat(e.target.value) || 0 })} min="0" max="100" />
                </div>
              ))}
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
