/* ═══════════════════════════════════════════════
   FaceGrade AI — Frontend Logic
   ═══════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
let regStream = null, stuStream = null, regImageData = null, stuImageData = null;
let allFaceData = null, currentFaceIdx = 0;

// ── Subject config ──
const SUBJECTS = [
  { key: 'matematika', name: 'Mathematics', icon: '📐' },
  { key: 'ipa', name: 'Science (IPA)', icon: '🔬' },
  { key: 'ips', name: 'Social Studies (IPS)', icon: '🌍' },
  { key: 'bindo', name: 'Bahasa Indonesia', icon: '📖' },
  { key: 'bing', name: 'English', icon: '🗣️' },
  { key: 'agama', name: 'Religion', icon: '🕊️' },
  { key: 'seni', name: 'Arts & Culture', icon: '🎨' },
  { key: 'penjas', name: 'Sports (PE)', icon: '⚽' },
  { key: 'informatika', name: 'Informatics', icon: '💻' },
];

// ── Poster variants per subject (random pick each scan) ──
const POSTER_VARIANTS = {
  matematika: [
    { title:'Suhu Matematika', tagline:'Liat angka rasanya kayak liat mantan, gampang ditebak', bg:'bg-math-1', extras:['∑','π','∞','+','−','×','÷','√','=','%'] },
    { title:'Kalkulator Berjalan', tagline:'Kalkulator aja kalah cepet sama otak gue', bg:'bg-math-2', extras:['x','y','z','{ }','[ ]','( )','±','≠','≈','≥'] },
    { title:'Anak Olim', tagline:'Soal susah dikit langsung senyum', bg:'bg-math-3', extras:['1','2','3','4','5','6','7','8','9','0'] },
    { title:'Si Paling Logika', tagline:'Semua ada rumusnya, termasuk cinta', bg:'bg-math-4', extras:['A','B','C','∠','△','○','□','◇','∇','Δ'] },
    { title:'Dewa Rumus', tagline:'Bisa nemuin X yang hilang dalam sekejap', bg:'bg-math-5', extras:['ax²+bx','x=','±','{}','≠','≤','≥','∝','⊗','⊙'] },
    { title:'Anti Remedial', tagline:'Remedial? Kata itu gak ada di kamus gue', bg:'bg-math-6', extras:['∞','λ','Σ','θ','∮','∇','n!','log','sin','cos'] },
  ],
  ipa: [
    { title:'Ilmuwan Edan', tagline:'Tiap hari nongkrongnya di lab sekolah', bg:'bg-ipa-1', extras:['🧬','H₂O','⚛️','NaCl','🧪','E=mc²','🔭','Fe','O₂','CO₂'] },
    { title:'Anak Biologi', tagline:'Lebih hafal nama latin tumbuhan daripada nama tetangga', bg:'bg-ipa-2', extras:['🦠','DNA','RNA','ATP','🔬','pH','mol','Ω','μm','nm'] },
    { title:'Pawang Kimia', tagline:'Asam basa aja paham, masa kode dari kamu engga', bg:'bg-ipa-3', extras:['🧬','🦎','🌿','🧫','🦴','🫁','🧠','🫀','🦷','🧬'] },
    { title:'Si Paling Fisika', tagline:'Gaya gravitasi aja bisa gue lawan', bg:'bg-ipa-4', extras:['⚗️','H₂SO₄','CaCO₃','NaOH','→','Δ','mol','pH','🧪','⚛️'] },
    { title:'Bocah Praktikum', tagline:'Pecahin gelas lab? Udah biasa bos', bg:'bg-ipa-5', extras:['F=ma','v=d/t','⚡','🌊','λ','ω','ℏ','Ψ','J','W'] },
    { title:'Dokter Masa Depan', tagline:'Calon mantu idaman, jago bedah katak', bg:'bg-ipa-6', extras:['🌍','🔭','☀️','🌙','⭐','🪐','🌌','💫','🔬','🧲'] },
  ],
  ips: [
    { title:'Si Paling Sejarah', tagline:'Cuma gue yang susah move on dari masa lalu bangsa', bg:'bg-ips-1', extras:['🏛️','📜','⚖️','🗳️','🏔️','🌏','🤝','📊','🗿','🏘️'] },
    { title:'Bocah Geografi', tagline:'Hafal peta buta tutup mata', bg:'bg-ips-2', extras:['📜','🏛️','⚔️','👑','🗡️','🏰','📖','🕰️','🗿','🏺'] },
    { title:'Anak Sosum', tagline:'Ngegosipnya pake teori sosiologi dong', bg:'bg-ips-3', extras:['🗺️','🧭','🏔️','🌋','🏝️','🌍','🌊','🏜️','❄️','🌿'] },
    { title:'Calon Menteri', tagline:'Debat sama gue kelar hidup lu', bg:'bg-ips-4', extras:['📈','💰','📊','🏦','💱','🤝','📉','🏭','🛒','📋'] },
    { title:'Pawang Ekonomi', tagline:'Bakat nyari cuan udah terlihat sejak dini', bg:'bg-ips-5', extras:['🎭','🎪','🏮','🎎','🗽','🏟️','🎡','🌐','🤝','🎊'] },
    { title:'Juragan Cuan', tagline:'Supply and demand adalah jalan ninjaku', bg:'bg-ips-6', extras:['📈','💰','📊','🏦','💱','🤝','📉','🏭','🛒','📋'] },
  ],
  bindo: [
    { title:'Anak Senja', tagline:'Ngopi sore sambil ngerangkai kata-kata galau', bg:'bg-bindo-1', extras:['📝','✒️','📚','✍️','📖','📰','🖋️','💬','📜','🎭'] },
    { title:'Sastrawan Dadakan', tagline:'Bisa bikin puisi rima a-b-a-b dalam 5 detik', bg:'bg-bindo-2', extras:['✒️','📖','🌹','💭','📝','🎭','✨','📜','🖊️','💫'] },
    { title:'Duta Typo', tagline:'Paling gatel liat orang ngetik "di" nya digabung', bg:'bg-bindo-3', extras:['A-Z','📚','🔤','💬','📖','✍️','📝','🗣️','📰','🖋️'] },
    { title:'Si Paling KBBI', tagline:'Bahasa baku adalah harga mati di tongkrongan', bg:'bg-bindo-4', extras:['📄','✏️','📋','💡','📖','🎓','📝','🗒️','📑','🖊️'] },
    { title:'Raja Pantun', tagline:'Jalan-jalan ke kota tua, cakep!', bg:'bg-bindo-1', extras:['📝','✒️','📚','✍️','📖','📰','🖋️','💬','📜','🎭'] },
    { title:'Pujangga Kelas', tagline:'Curhat dikit doang langsung jadi naskah novel', bg:'bg-bindo-2', extras:['A-Z','📚','🔤','💬','📖','✍️','📝','🗣️','📰','🖋️'] },
  ],
  bing: [
    { title:'Anak Jaksel', tagline:'Which is literally gue tuh fasih banget', bg:'bg-bing-1', extras:['ABC','Hello','📝','🎓','🌐','💬','📖','✍️','🗣️','📚'] },
    { title:'Bule Nyasar', tagline:'Ngomong indo malah blepotan bro', bg:'bg-bing-2', extras:['A+','📖','The','An','✓','🎯','📝','Is','Was','💡'] },
    { title:'Polisi Grammar', tagline:'Lu salah tenses dikit langsung gue koreksi', bg:'bg-bing-3', extras:['🎤','🗣️','💬','🏆','📢','🎭','🎯','💡','📋','🌟'] },
    { title:'Nonton Tanpa Sub', tagline:'Nonton drakor aja pakenya sub inggris', bg:'bg-bing-4', extras:['📖','🎭','✒️','🌹','📜','💭','🎬','✨','🖋️','📚'] },
    { title:'Pawang Tenses', tagline:'Masa lalu, masa kini, masa depan, paham semua', bg:'bg-bing-1', extras:['A+','📖','The','An','✓','🎯','📝','Is','Was','💡'] },
    { title:'Kang Debat', tagline:'Paling maju kalo disuruh debat bahasa inggris', bg:'bg-bing-2', extras:['🎤','🗣️','💬','🏆','📢','🎭','🎯','💡','📋','🌟'] },
  ],
  agama: [
    { title:'Si Paling Religius', tagline:'Rajin ibadah, fix calon mantu idaman', bg:'bg-agama-1', extras:['📿','🙏','☮️','💫','📖','🕯️','⭐','🌙','🕊️','💎'] },
    { title:'Suhu Spiritual', tagline:'Selalu berjalan di jalan yang lurus dan benar', bg:'bg-agama-2', extras:['🙏','🕊️','✨','📖','💫','🕯️','⭐','☮️','💎','🌿'] },
    { title:'Penerang Kelas', tagline:'Kalo mau ujian pada minta doa ke gue', bg:'bg-agama-1', extras:['📿','🙏','☮️','💫','📖','🕯️','⭐','🌙','🕊️','💎'] },
    { title:'Anti Dosa', tagline:'Buku catatan amal baiknya tebel banget bro', bg:'bg-agama-2', extras:['🙏','🕊️','✨','📖','💫','🕯️','⭐','☮️','💎','🌿'] },
  ],
  seni: [
    { title:'Anak Nyeni', tagline:'Semua hal bisa jadi karya seni di tangan gue', bg:'bg-seni-1', extras:['🖌️','🎵','🎶','🎹','🎻','🖼️','🎬','📸','🎪','🌈'] },
    { title:'Gitaris Tongkrongan', tagline:'Ada gitar nganggur dikit langsung gue sikat', bg:'bg-seni-2', extras:['🎨','🖼️','🎭','📸','🌈','✨','🎬','🖌️','🎪','💫'] },
    { title:'Tukang Gambar', tagline:'Meja kelas penuh sama coretan karya gue', bg:'bg-seni-3', extras:['🎵','🎶','🎹','🎸','🎻','🥁','🎤','🎼','🎷','🎺'] },
    { title:'Bintang Pensi', tagline:'Langganan manggung tiap acara sekolah', bg:'bg-seni-4', extras:['🎭','🎬','🎪','🌟','✨','🎤','📸','💫','🏆','🎊'] },
    { title:'Suara Emas', tagline:'Kamar mandi adalah panggung utama gue', bg:'bg-seni-1', extras:['🎵','🎶','🎹','🎸','🎻','🥁','🎤','🎼','🎷','🎺'] },
    { title:'Si Paling Estetik', tagline:'Liat font jelek dikit mata langsung perih', bg:'bg-seni-2', extras:['🎨','🖼️','🎭','📸','🌈','✨','🎬','🖌️','🎪','💫'] },
  ],
  penjas: [
    { title:'Anak Bola', tagline:'Panas-panasan jam 12 siang demi sebuah gol', bg:'bg-penjas-1', extras:['🏃','🏅','💪','🥇','🏀','🏐','🎯','🏊','⏱️','🔥'] },
    { title:'Atlet Tarkam', tagline:'Napas kuda, lari bolak-balik gak ada capenya', bg:'bg-penjas-2', extras:['🏆','⚽','🥇','💪','🔥','🏅','🎯','🏃','⚡','🌟'] },
    { title:'Jagoan Lapangan', tagline:'Praktek olahraga gue selalu yang paling depan', bg:'bg-penjas-3', extras:['💪','🏋️','🤸','🧘','⏱️','❤️','🔥','🏃','🥇','⚡'] },
    { title:'Pawang Olahraga', tagline:'Basket, volly, futsal, renang, gue borong semua', bg:'bg-penjas-4', extras:['🏐','⚽','🏀','🤝','🏆','👑','💪','🎯','🏅','🔥'] },
    { title:'Tukang Keringat', tagline:'Sehari gak olahraga rasanya badan meriang', bg:'bg-penjas-1', extras:['🏃','🏅','💪','🥇','🏀','🏐','🎯','🏊','⏱️','🔥'] },
    { title:'Suhu Futsal', tagline:'Sepatu Specs ori adalah harga diri tertinggi', bg:'bg-penjas-2', extras:['🏆','⚽','🥇','💪','🔥','🏅','🎯','🏃','⚡','🌟'] },
  ],
  informatika: [
    { title:'Anak Warnet', tagline:'Ngetik keyboard gak pake liat layar lagi', bg:'bg-info-1', extras:['{ }','</>','HTML','if()','&&','=>','npm','git','[ ]','::'] },
    { title:'Tukang Service', tagline:'Disuruh benerin proyektor sama guru terus', bg:'bg-info-2', extras:['API','SQL','CSS','<div>','JSON','HTTP','DOM','async','🖥️','⚡'] },
    { title:'Hacker Kelas', tagline:'Bisa ngehack wifi guru pake CMD doang', bg:'bg-info-3', extras:['RAM','CPU','Web','→','λ','App','OS','bug','tree','🧠'] },
    { title:'Suhu Coding', tagline:'Ngobrol sama komputer lebih nyambung', bg:'bg-info-4', extras:['🔐','SSH','VPN','🛡️','404','200','TCP','UDP','ping','🌐'] },
    { title:'Si Paling IT', tagline:'Semua masalah komputer solusinya: Restart', bg:'bg-info-5', extras:['🎮','⌨️','🖱️','🎧','🚀','🔥','👾','🎯','🏆','💯'] },
    { title:'Kang Instal Ulang', tagline:'Flashdisk isi Rufus selalu sedia di tas', bg:'bg-info-6', extras:['💻','💾','💿','🔌','🔋','⚡','⚙️','🔧','🪛','🖥️'] },
  ],
};

// ── Religion poster variants ──
const RELIGION_VARIANTS = {
  Islam: [
    { title:'Ustaz Tongkrongan', tagline:'Suka nyeramahin temen yang lagi bandel', bg:'bg-islam-1', extras:['🕌','📖','🤲','☪️','🌙','📿','✨','🕋','🤝','💫'] },
    { title:'Garda Depan Rohis', tagline:'Pantang pulang sebelum kajian selesai', bg:'bg-islam-2', extras:['📖','🤲','🕌','🌙','☪️','📿','🙏','✨','🕋','🌟'] },
    { title:'Hafiz Andalan', tagline:'Hafalan nambah terus, temen pada insecure', bg:'bg-islam-3', extras:['📖','☪️','🌙','🤲','📿','🕌','✨','💚','🕋','🌿'] },
  ],
  Kristen: [
    { title:'Anak Rohani', tagline:'Rajin ibadah minggu, fix teladan di sekolah', bg:'bg-kristen-1', extras:['⛪','✝️','📖','🙏','🕊️','🎵','♱','🕯️','❤️','✨'] },
    { title:'Ketua Remaja', tagline:'Membawa terang buat teman-teman sekelas', bg:'bg-kristen-2', extras:['✝️','🙏','📖','🕊️','⛪','💜','🎵','🕯️','✨','💫'] },
    { title:'Gitaris Gereja', tagline:'Pujian dan penyembahan full pakai nada chord C', bg:'bg-kristen-3', extras:['🎵','🙏','✝️','🎤','⛪','🕊️','🎶','📖','❤️','✨'] },
  ],
  Katolik: [
    { title:'Romo Gaul', tagline:'Melayani altar dengan santuy dan penuh kasih', bg:'bg-katolik-1', extras:['⛪','✝️','🕯️','📿','🙏','🍞','🍷','♱','📖','💜'] },
    { title:'Misdinar Sejati', tagline:'Pelayan altar yang selalu siap sedia kapanpun', bg:'bg-katolik-2', extras:['⛪','🕯️','📿','✝️','🙏','💜','♱','🔔','📖','✨'] },
    { title:'Lektor Muda', tagline:'Suara lantang pas baca Sabda di hari minggu', bg:'bg-katolik-3', extras:['📖','⛪','✝️','🕯️','🙏','📿','♱','💜','✨','🌹'] },
  ],
  Hindu: [
    { title:'Pecinta Dharma', tagline:'Selalu ngikutin jalan kebenaran anti belok', bg:'bg-hindu-1', extras:['🕉️','🪷','🔥','🙏','🏵️','🌺','🪔','📿','🌸','✨'] },
    { title:'Pandita Muda', tagline:'Rajin sembahyang, bawaannya tentram terus', bg:'bg-hindu-2', extras:['🕉️','🪷','🪔','🔥','🌺','📿','🙏','🏵️','💛','✨'] },
  ],
  Budha: [
    { title:'Si Paling Meditasi', tagline:'Ketenangan batin di atas segalanya bro', bg:'bg-budha-1', extras:['☸️','🧘','🪷','🕯️','📿','🙏','🏔️','🌸','🔔','☯️'] },
    { title:'Sabar Paripurna', tagline:'Di-bully diem aja, sabarnya level dewa', bg:'bg-budha-2', extras:['☸️','🧘','🪷','🌸','📿','🙏','🕯️','☯️','🔔','💫'] },
  ],
  Konghucu: [
    { title:'Pecinta Kebajikan', tagline:'Hormat orang tua, sayang sesama', bg:'bg-konghucu-1', extras:['☯️','📜','🏮','🎋','🐉','📿','🙏','🎎','🏛️','🌿'] },
    { title:'Junzi Muda', tagline:'Bijaksana melampaui usianya', bg:'bg-konghucu-2', extras:['☯️','📜','🏮','🐉','🎎','🎋','🏛️','📿','🌿','✨'] },
  ],
};

// ── Unknown face poster variants ──
const UNKNOWN_VARIANTS = [
  { title:'Penyusup Misterius', tagline:'Wajah lu nggak kedaftar di server sekolah!', bg:'bg-unknown-1', extras:['❓','🕵️','👀','🚫','🔒','⚠️','📸','🤔','🛑','👤'] },
  { title:'Warga Asing', tagline:'Mending lu lapor ke ruang guru sekarang deh', bg:'bg-unknown-2', extras:['🛑','⚠️','❓','👁️','📸','🕵️','❗','👤','🤔','🚫'] },
  { title:'Muka Tak Dikenal', tagline:'Siapa nih? Coba scan ulang yang bener', bg:'bg-unknown-3', extras:['🤔','❓','👀','👤','❗','🕵️','⚠️','🛑','📸','🔒'] },
  { title:'Ghost Student', tagline:'Ga pake seragam ya? Kok ga kedetect?', bg:'bg-unknown-1', extras:['❓','🕵️','👀','🚫','🔒','⚠️','📸','🤔','🛑','👤'] },
];

// ═══ NAVIGATION ═══
function go(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(`${screen}-screen`).classList.add('active');
  stopAllStreams();
  localStorage.setItem('facegrade_current_screen', screen);

  if (screen === 'student') {
    autoStartStudentCam();
  } else if (screen === 'teacher') {
    loadStudents();
  }
}

function showLogin() {
  $('login-modal').classList.remove('hidden');
}
function hideLogin() {
  $('login-modal').classList.add('hidden');
}

function loginKeyHandler(e) {
  if (e.key === 'Enter') doLogin();
}

function doLogin() {
  const userEl = $('l-user'), passEl = $('l-pass');
  const u = userEl.value.trim(), p = passEl.value.trim();
  if (!u) { userEl.focus(); return; }
  if (!p) { passEl.focus(); return; }
  fetch('/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p })
  }).then(r => r.json()).then(d => {
    if (d.success) { hideLogin(); go('teacher'); }
    else { $('l-err').textContent = d.message || 'Invalid credentials'; $('l-err').classList.remove('hidden'); passEl.select(); }
  }).catch(() => { $('l-err').textContent = 'Connection error'; $('l-err').classList.remove('hidden'); });
}

function tab(btn) {
  document.querySelectorAll('.nb-tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
  btn.classList.add('on');
  $(btn.dataset.t).classList.add('on');
}

// ═══ CAMERA HELPERS ═══
async function getCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
  videoEl.srcObject = stream;
  return stream;
}

function stopStream(stream) {
  if (stream) stream.getTracks().forEach(t => t.stop());
}

function stopAllStreams() {
  stopStream(regStream); regStream = null;
  stopStream(stuStream); stuStream = null;
}

function captureCanvas(video, canvas) {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

// ═══ STUDENT: AUTO CAMERA ═══
async function autoStartStudentCam() {
  const ph = $('s-cam-ph');
  if (ph) ph.classList.remove('hidden');
  try {
    stuStream = await getCamera($('s-vid'));
    if (ph) ph.classList.add('hidden');
  } catch (e) {
    if (ph) { ph.innerHTML = '<span style="font-size:2rem">📷</span><p>Camera unavailable — use upload below</p>'; }
  }
}

// ═══ TEACHER: REGISTER ═══
function capMode(mode, btn) {
  document.querySelectorAll('.cap-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  $('cap-cam').classList.toggle('hidden', mode !== 'cam');
  $('cap-file').classList.toggle('hidden', mode !== 'file');
  regImageData = null;
}

async function startRegCam() {
  try {
    regStream = await getCamera($('r-vid'));
    $('r-ph').classList.add('hidden');
    $('r-vid').classList.remove('hidden');
    $('btn-cam-start').classList.add('hidden');
    $('btn-cam-snap').classList.remove('hidden');
  } catch (e) { toast('Camera access denied', 'fail'); }
}

function snapReg() {
  regImageData = captureCanvas($('r-vid'), $('r-cnv'));
  $('r-vid').classList.add('hidden');
  $('r-cnv').classList.remove('hidden');
  $('btn-cam-snap').classList.add('hidden');
  $('btn-cam-redo').classList.remove('hidden');
  stopStream(regStream); regStream = null;
}

function redoReg() {
  regImageData = null;
  $('r-cnv').classList.add('hidden');
  $('r-ph').classList.remove('hidden');
  $('btn-cam-start').classList.remove('hidden');
  $('btn-cam-redo').classList.add('hidden');
}

function onRegFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    regImageData = ev.target.result;
    $('r-fprev').src = regImageData;
    $('r-fprev').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function registerStudent() {
  const nis = $('r-nis').value.trim();
  const name = $('r-name').value.trim();
  const kelas = $('r-class').value;
  const agama = $('r-religion').value;
  const pelanggaran = $('r-violations').value.trim();
  const msgEl = $('reg-msg');

  if (!nis) { $('r-nis').focus(); showMsg(msgEl, 'Please fill Student ID', false); return; }
  if (!name) { $('r-name').focus(); showMsg(msgEl, 'Please fill Name', false); return; }
  if (!kelas) { $('r-class').focus(); showMsg(msgEl, 'Please select Class', false); return; }
  if (!agama) { $('r-religion').focus(); showMsg(msgEl, 'Please select Religion', false); return; }
  if (!regImageData) { showMsg(msgEl, 'Please capture or upload a face photo', false); return; }

  // Collect grades from inline inputs
  const grades = {};
  SUBJECTS.forEach(s => {
    const inp = $(`ri-${s.key}`);
    if (inp && inp.value !== '') grades[s.key] = parseFloat(inp.value);
  });

  showMsg(msgEl, 'Registering...', true);
  try {
    // Step 1: Register student
    const r = await fetch('/api/register-student', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: nis, name, kelas, agama, pelanggaran, image: regImageData })
    });
    const d = await r.json();
    if (!d.success) { showMsg(msgEl, d.message, false); return; }

    // Step 2: Save grades if any were entered
    if (Object.keys(grades).length > 0) {
      await fetch('/api/save-grades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: nis, grades })
      });
    }

    showMsg(msgEl, d.message, true);
    toast(`${name} registered with ${Object.keys(grades).length} grades!`, 'ok');
    // Reset form
    $('r-nis').value = ''; $('r-name').value = ''; $('r-class').value = ''; $('r-religion').value = '';
    SUBJECTS.forEach(s => { const inp = $(`ri-${s.key}`); if (inp) inp.value = ''; });
    regImageData = null; redoReg();
    $('r-fprev').classList.add('hidden');
  } catch (e) { showMsg(msgEl, 'Connection error', false); }
}

// ═══ TEACHER: GRADES (inline in register) ═══
let gradeStudentId = '';

function buildRegGradeInputs() {
  const grid = $('reg-grades-grid');
  if (!grid) return;
  grid.innerHTML = SUBJECTS.map(s => `
    <div class="subj-card">
      <div class="ico">${s.icon}</div>
      <label>${s.name}</label>
      <input type="number" id="ri-${s.key}" min="0" max="100" placeholder="—">
    </div>
  `).join('');
}
// Build on page load
document.addEventListener('DOMContentLoaded', buildRegGradeInputs);

function buildEditGradeInputs(grades) {
  const grid = $('edit-grades-grid');
  grid.innerHTML = SUBJECTS.map(s => `
    <div class="subj-card">
      <div class="ico">${s.icon}</div>
      <label>${s.name}</label>
      <input type="number" id="ei-${s.key}" min="0" max="100" placeholder="—" value="${grades[s.key] !== undefined ? grades[s.key] : ''}">
    </div>
  `).join('');
}

async function openEditGrades(sid) {
  try {
    const r = await fetch(`/api/get-student/${sid}`);
    const d = await r.json();
    if (!d.success) { toast(d.message, 'fail'); return; }
    gradeStudentId = sid;
    $('edit-title').textContent = `Edit Grades & Data — ${d.student.name}`;
    $('e-violations').value = d.student.pelanggaran || 0;
    buildEditGradeInputs(d.student.grades || {});
    $('edit-modal').classList.remove('hidden');
  } catch (e) { toast('Connection error', 'fail'); }
}

async function saveEditGrades() {
  if (!gradeStudentId) return;
  const grades = {};
  SUBJECTS.forEach(s => {
    const v = $(`ei-${s.key}`).value;
    if (v !== '') grades[s.key] = parseFloat(v);
  });
  const pelanggaran = $('e-violations').value.trim();
  const msgEl = $('edit-msg');
  try {
    const r = await fetch('/api/save-grades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: gradeStudentId, grades, pelanggaran })
    });
    const d = await r.json();
    if (d.success) {
      toast('Grades saved!', 'ok');
      $('edit-modal').classList.add('hidden');
      loadStudents();
    } else {
      showMsg(msgEl, d.message, false);
    }
  } catch (e) { showMsg(msgEl, 'Connection error', false); }
}

// ═══ TEACHER: LIST ═══
async function loadStudents() {
  try {
    const r = await fetch('/api/all-students');
    const d = await r.json();
    if (!d.success) { toast(d.message, 'fail'); return; }
    const el = $('stu-table');
    if (!d.students.length) { el.innerHTML = '<p class="empty-state">No students registered yet</p>'; return; }
    el.innerHTML = d.students.map(s => {
      const thumb = s.thumbnail ? `data:image/jpeg;base64,${s.thumbnail}` : '';
      const avg = calcAvg(s.grades);
      const gradeCount = s.grades ? Object.keys(s.grades).length : 0;
      return `<div class="stu-row">
        <img src="${thumb}" alt="${s.name}">
        <div><strong>${s.name}</strong><br><span style="color:var(--text2);font-size:.78rem">${s.studentId}</span></div>
        <div>${s.kelas}</div>
        <div>${s.agama || '-'}</div>
        <div style="font-weight:600">${avg} <small style="color:var(--text3)">(${gradeCount})</small></div>
        <div class="stu-actions">
          <button class="edit-btn" onclick="openEditGrades('${s.studentId}')">✏️</button>
          <button class="del-btn" onclick="delStudent('${s.studentId}')">🗑️</button>
        </div>
      </div>`;
    }).join('');
  } catch (e) { toast('Connection error', 'fail'); }
}

async function delStudent(sid) {
  if (!confirm(`Delete student ${sid}?`)) return;
  try {
    const r = await fetch(`/api/delete-student/${sid}`, { method: 'DELETE' });
    const d = await r.json();
    toast(d.message, d.success ? 'ok' : 'fail');
    if (d.success) loadStudents();
  } catch (e) { toast('Error', 'fail'); }
}

// ═══ STUDENT: SCAN ═══

function snapStu() {
  stuImageData = captureCanvas($('s-vid'), $('s-cnv'));
  stopStream(stuStream); stuStream = null;
  doRecognize(stuImageData);
}

function onStuFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    stuImageData = ev.target.result;
    $('s-up-img').src = stuImageData;
    $('s-up-box').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function scanUpload() {
  $('s-up-box').classList.add('hidden');
  doRecognize(stuImageData);
}

function closeUpBox() {
  $('s-up-box').classList.add('hidden');
  stuImageData = null;
}

function resetStu() {
  $('face-picker').classList.add('hidden');
  $('res-ok').classList.add('hidden');
  $('res-no').classList.add('hidden');
  $('s-scan').style.display = '';
  $('s-loading').classList.add('hidden');
  stuImageData = null; allFaceData = null;
  autoStartStudentCam();
}

function backToFaces() {
  $('res-ok').classList.add('hidden');
  $('res-no').classList.add('hidden');
  if (allFaceData && allFaceData.length > 1) {
    $('face-picker').classList.remove('hidden');
  } else {
    resetStu();
  }
}

// ═══ RECOGNITION ═══
async function doRecognize(imageData) {
  $('s-scan').style.display = 'none';
  $('s-loading').classList.remove('hidden');
  const sc = document.querySelector('.scan-circle');
  if (sc) sc.style.backgroundImage = `url('${imageData}')`;

  try {
    const r = await fetch('/api/recognize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    });
    const d = await r.json();
    $('s-loading').classList.add('hidden');

    if (!d.success) { toast(d.message, 'fail'); resetStu(); return; }

    allFaceData = d.faces;

    if (d.total === 0) {
      toast('No face detected', 'fail');
      resetStu();
      return;
    }

    if (d.total === 1) {
      // Single face — show result directly
      showFaceResult(0);
    } else {
      // Multiple faces — show picker
      showFacePicker(imageData);
    }
  } catch (e) {
    $('s-loading').classList.add('hidden');
    toast('Recognition failed', 'fail');
    resetStu();
  }
}

function showFacePicker(imageData) {
  $('face-picker').classList.remove('hidden');
  $('fp-info').textContent = `${allFaceData.length} faces detected — click one to see details`;
  $('fp-img').src = imageData;

  // Draw bounding boxes
  const boxesEl = $('fp-boxes');
  boxesEl.innerHTML = '';
  const thumbsEl = $('fp-thumbs');
  thumbsEl.innerHTML = '';

  allFaceData.forEach((f, i) => {
    const box = document.createElement('div');
    box.className = `face-box ${f.matched ? 'matched' : ''}`;
    box.style.left = `${f.box.l * 100}%`;
    box.style.top = `${f.box.t * 100}%`;
    box.style.width = `${f.box.w * 100}%`;
    box.style.height = `${f.box.h * 100}%`;
    const label = f.matched ? f.student.name : `Face ${i + 1}`;
    box.innerHTML = `<span class="fb-tag">${label}</span>`;
    box.onclick = () => showFaceResult(i);
    boxesEl.appendChild(box);

    // Create cropped thumbnail from the image
    const thumb = document.createElement('canvas');
    const img = $('fp-img');
    // We'll generate thumbs after image loads
    const thumbImg = document.createElement('img');
    thumbImg.className = 'face-thumb';
    thumbImg.dataset.idx = i;
    thumbImg.onclick = () => showFaceResult(i);
    thumbsEl.appendChild(thumbImg);
  });

  // Generate thumbnails after image loads
  $('fp-img').onload = () => generateThumbnails();
}

function generateThumbnails() {
  const img = $('fp-img');
  allFaceData.forEach((f, i) => {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const sx = f.box.l * img.naturalWidth;
    const sy = f.box.t * img.naturalHeight;
    const sw = f.box.w * img.naturalWidth;
    const sh = f.box.h * img.naturalHeight;
    // Make square crop centered
    const cropSize = Math.max(sw, sh) * 1.2;
    const cx = sx + sw / 2 - cropSize / 2;
    const cy = sy + sh / 2 - cropSize / 2;
    ctx.drawImage(img, Math.max(0, cx), Math.max(0, cy), cropSize, cropSize, 0, 0, size, size);
    const thumbEl = $('fp-thumbs').querySelectorAll('img')[i];
    if (thumbEl) thumbEl.src = canvas.toDataURL('image/jpeg', 0.85);
  });
}

function showFaceResult(idx) {
  currentFaceIdx = idx;
  const face = allFaceData[idx];
  $('face-picker').classList.add('hidden');

  if (face.matched && face.student) {
    showRecognizedResult(face);
  } else {
    showUnknownResult(face);
  }
}

// ═══ RESULT: RECOGNIZED ═══
function showRecognizedResult(face) {
  const s = face.student;
  $('res-ok').classList.remove('hidden');
  $('res-no').classList.add('hidden');

  // Identity strip (compact)
  $('res-id').innerHTML = `
    <div class="ri-item"><span class="ri-label">Name</span><span class="ri-val">${s.name}</span></div>
    <div class="ri-item"><span class="ri-label">NIS</span><span class="ri-val">${s.studentId}</span></div>
    <div class="ri-item"><span class="ri-label">Class</span><span class="ri-val">${s.kelas}</span></div>
    <div class="ri-item"><span class="ri-label">Match</span><span class="ri-val">${s.similarity}%</span></div>
  `;

  // Process Violations
  const violationsText = s.pelanggaran || '';
  const violationsList = violationsText ? violationsText.split(',').map(v => v.trim()).filter(v => v) : [];

  const vBox = $('res-violations');
  if (violationsList.length > 0) {
    vBox.innerHTML = `
      <h4>🚨 Catatan Pelanggaran (${violationsList.length}):</h4>
      <ul>${violationsList.map(v => `<li>${v}</li>`).join('')}</ul>
    `;
    vBox.classList.remove('hidden');
  } else {
    vBox.classList.add('hidden');
  }

  // Grades
  const grades = s.grades || {};
  const entries = SUBJECTS.map(sub => ({ ...sub, val: grades[sub.key] })).filter(e => e.val !== undefined);
  const avg = entries.length ? (entries.reduce((a, e) => a + e.val, 0) / entries.length).toFixed(1) : '—';
  $('res-avg-num').textContent = avg;

  // Find highest grade and all subjects that share it
  let topVal = -1;
  entries.forEach(e => { if (e.val > topVal) topVal = e.val; });
  let topKeys = entries.filter(e => e.val === topVal).map(e => e.key);

  // Grade tiles
  $('res-grades').innerHTML = entries.map(e => {
    const cls = e.val >= 85 ? 's-a' : e.val >= 70 ? 's-b' : e.val >= 55 ? 's-c' : 's-d';
    const crown = e.val === topVal ? 'crown' : '';
    const barColor = e.val >= 85 ? 'var(--green)' : e.val >= 70 ? 'var(--blue)' : e.val >= 55 ? 'var(--yellow)' : 'var(--red)';
    return `<div class="grade-tile ${crown}">
      <div class="g-ico">${e.icon}</div>
      <div class="g-name">${e.name}</div>
      <div class="g-val ${cls}">${e.val}</div>
      <div class="g-bar"><div style="width:${e.val}%;background:${barColor}"></div></div>
    </div>`;
  }).join('');

  // Generate poster
  generatePoster(face, s, topKeys, topVal);
}

function generatePoster(face, student, topKeys, topVal) {
  const area = $('poster-area');

  // Pool variants from ALL top subjects
  let variants = [];
  topKeys.forEach(k => {
    if (k === 'agama' && RELIGION_VARIANTS[student.agama]) {
      variants.push(...RELIGION_VARIANTS[student.agama]);
    } else if (POSTER_VARIANTS[k]) {
      variants.push(...POSTER_VARIANTS[k]);
    }
  });
  if (variants.length === 0) variants = POSTER_VARIANTS.matematika;

  // Create combination from the unified pool
  const title = variants[Math.floor(Math.random() * variants.length)].title;
  const tagline = variants[Math.floor(Math.random() * variants.length)].tagline;
  const bg = variants[Math.floor(Math.random() * variants.length)].bg;
  const extrasArr = variants[Math.floor(Math.random() * variants.length)].extras;

  const cfg = { title, tagline, bg, extras: extrasArr };

  // Always prefer the live face scan over the registration thumbnail
  const faceImg = generateFaceCrop(face) || (student.thumbnail ? `data:image/jpeg;base64,${student.thumbnail}` : '');

  let subjectNameText = '';
  if (topKeys.length >= Math.floor(SUBJECTS.length * 0.8)) {
    subjectNameText = 'All-Rounder Scholar';
  } else if (topKeys.length > 2) {
    subjectNameText = `${topKeys.length} Subjects Mastered`;
  } else {
    subjectNameText = topKeys.map(k => SUBJECTS.find(s => s.key === k)?.name || k).join(' & ');
  }
  const extrasHtml = buildExtrasHtml(cfg.extras || []);

  // Check for violations to show a stamp
  const violationsText = student.pelanggaran || '';
  const violationsList = violationsText ? violationsText.split(',').map(v => v.trim()).filter(v => v) : [];
  const violationsCount = violationsList.length;

  let stampHtml = '';
  if (violationsCount >= 7) {
    stampHtml = `<div class="violation-stamp extreme">BURONAN SEKOLAH<br><small>${violationsCount} PELANGGARAN</small></div>`;
  } else if (violationsCount >= 5) {
    stampHtml = `<div class="violation-stamp">TARGET BK<br><small>${violationsCount} Pelanggaran</small></div>`;
  } else if (violationsCount >= 3) {
    stampHtml = `<div class="violation-stamp warning">LANGGANAN BK<br><small>${violationsCount} Pelanggaran</small></div>`;
  } else if (violationsCount > 0) {
    stampHtml = `<div class="violation-stamp warning small">TERPANTAU BANDEL (${violationsCount})</div>`;
  }

  area.innerHTML = `
    <div class="poster ${cfg.bg}">
      <div class="poster-bg" style="background-image:url('${faceImg}')"></div>
      <div class="poster-extras">${extrasHtml}</div>
      <img class="poster-face" src="${faceImg}" alt="${student.name}">
      ${stampHtml}
      <div class="poster-body">
        <div class="poster-label">${cfg.title}</div>
        <div class="poster-sub">${student.name}</div>
        <div class="poster-tag">${subjectNameText}: ${topVal} — "${cfg.tagline}"</div>
      </div>
    </div>
  `;
}

function buildExtrasHtml(extras) {
  return extras.map((e, i) => {
    const top = 5 + Math.random() * 85;
    const left = 3 + Math.random() * 90;
    const size = 0.7 + Math.random() * 0.9;
    const delay = (i * 0.3).toFixed(1);
    const dur = (4 + Math.random() * 4).toFixed(1);
    return `<span class="poster-extra" style="top:${top}%;left:${left}%;font-size:${size}rem;animation-delay:${delay}s;animation-duration:${dur}s">${e}</span>`;
  }).join('');
}

function generateFaceCrop(face) {
  if (!stuImageData) return '';
  const img = new Image();
  img.src = stuImageData;
  const canvas = document.createElement('canvas');
  canvas.width = 300; canvas.height = 300;
  const ctx = canvas.getContext('2d');
  const sx = face.box.l * img.naturalWidth;
  const sy = face.box.t * img.naturalHeight;
  const sw = face.box.w * img.naturalWidth;
  const sh = face.box.h * img.naturalHeight;
  const size = Math.max(sw, sh) * 1.3;
  const cx = sx + sw / 2 - size / 2;
  const cy = sy + sh / 2 - size / 2;
  ctx.drawImage(img, Math.max(0, cx), Math.max(0, cy), size, size, 0, 0, 300, 300);
  return canvas.toDataURL('image/jpeg', 0.85);
}

// ═══ RESULT: UNKNOWN ═══
function showUnknownResult(face) {
  $('res-no').classList.remove('hidden');
  $('res-ok').classList.add('hidden');

  // Generate mystery poster with combinatorial logic
  const faceCrop = generateFaceCrop(face);
  const title = UNKNOWN_VARIANTS[Math.floor(Math.random() * UNKNOWN_VARIANTS.length)].title;
  const tagline = UNKNOWN_VARIANTS[Math.floor(Math.random() * UNKNOWN_VARIANTS.length)].tagline;
  const bg = UNKNOWN_VARIANTS[Math.floor(Math.random() * UNKNOWN_VARIANTS.length)].bg;
  const extrasArr = UNKNOWN_VARIANTS[Math.floor(Math.random() * UNKNOWN_VARIANTS.length)].extras;

  const cfg = { title, tagline, bg, extras: extrasArr };
  const extrasHtml = buildExtrasHtml(cfg.extras);

  const unknownPoster = document.querySelector('.unknown-visual');
  if (unknownPoster) {
    unknownPoster.innerHTML = `
      <div class="poster poster-unknown ${cfg.bg}" style="padding-bottom:130%">
        <div class="poster-bg" ${faceCrop ? `style="background-image:url('${faceCrop}')"` : ''}></div>
        <div class="poster-extras">${extrasHtml}</div>
        ${faceCrop ? `<img class="poster-face" src="${faceCrop}" alt="Unknown">` : ''}
        <div class="poster-body">
          <div class="poster-label">${cfg.title}</div>
          <div class="poster-sub">Unknown Person</div>
          <div class="poster-tag">"${cfg.tagline}"</div>
        </div>
      </div>
    `;
  }

  const emotions = (face.emotions || []).map(e => `${e.type} (${e.conf}%)`).join(', ') || '-';
  const gender = face.gender || '-';
  const age = face.age ? `${face.age.low} — ${face.age.high}` : '-';

  $('face-attrs').innerHTML = `
    <div class="attr-row"><span class="attr-label">Estimated Age</span><span class="attr-val">${age} years</span></div>
    <div class="attr-row"><span class="attr-label">Gender</span><span class="attr-val">${gender}</span></div>
    <div class="attr-row"><span class="attr-label">Emotions</span><span class="attr-val">${emotions}</span></div>
    <div class="attr-row"><span class="attr-label">Smile</span><span class="attr-val">${face.smile ? 'Yes 😊' : 'No'}</span></div>
    <div class="attr-row"><span class="attr-label">Glasses</span><span class="attr-val">${face.glasses ? 'Yes 👓' : 'No'}</span></div>
    <div class="attr-row"><span class="attr-label">Confidence</span><span class="attr-val">${face.confidence}%</span></div>
  `;
}

// ═══ UTILITIES ═══
function calcAvg(grades) {
  if (!grades) return '-';
  const vals = Object.values(grades).filter(v => typeof v === 'number');
  if (!vals.length) return '-';
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

function showMsg(el, msg, success) {
  el.textContent = msg;
  el.className = `msg-box ${success ? 'ok' : 'fail'}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded', () => {
  buildRegGradeInputs();
  const lastScreen = localStorage.getItem('facegrade_current_screen');
  if (lastScreen && ['splash', 'teacher', 'student'].includes(lastScreen)) {
    go(lastScreen);
  } else {
    go('splash');
  }
});
