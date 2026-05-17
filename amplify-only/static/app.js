// ══════════════════════════════════════════════════════════════════════════════
// FACEGRADE AI KIOSK — STATIC FRONTEND-ONLY PRO-GRADE APPLICATION WITH AWS SDK
// ══════════════════════════════════════════════════════════════════════════════

// ── DOM Helper ──
const $ = id => document.getElementById(id);

// ── State Management ──
let activeScreen = 'splash';
let db = null;
let rek = null;
let currentCameraStream = null;
let currentCameraId = null;
let availableCameras = [];
let captureMode = 'cam'; // 'cam' or 'file'
let detectedFaces = [];
let selectedFaceIndex = 0;
let lastCapturedBase64 = null;

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

// ── Initialize App ──
window.addEventListener('DOMContentLoaded', () => {
    initStars();
    initCursorGlow();
    loadAwsCredentials();
    setupSubjectDropdowns();
});

// ── Screen Navigation ──
function go(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    const next = $(screenId + '-screen');
    if (next) {
        next.style.display = 'flex';
        setTimeout(() => next.classList.add('active'), 50);
    }
    activeScreen = screenId;
    
    // Stop camera if leaving active camera screens
    if (screenId !== 'student' && screenId !== 'teacher') {
        stopCamera();
    }
}

function tab(btn) {
    const paneId = btn.getAttribute('data-t');
    document.querySelectorAll('.nb-tab').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
    $(paneId).classList.add('on');
}

// ── AWS Configuration (Client-Side) ──
function loadAwsCredentials() {
    const key = localStorage.getItem('fg_aws_key');
    const secret = localStorage.getItem('fg_aws_secret');
    const token = localStorage.getItem('fg_aws_token');
    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
    const collection = localStorage.getItem('fg_aws_collection') || 'student-faces';

    $('cfg-key').value = key || '';
    $('cfg-secret').value = secret || '';
    $('cfg-token').value = token || '';
    $('cfg-table').value = table;
    $('cfg-collection').value = collection;

    if (key && secret) {
        AWS.config.update({
            accessKeyId: key,
            secretAccessKey: secret,
            sessionToken: token || undefined,
            region: 'us-east-1'
        });
        db = new AWS.DynamoDB.DocumentClient();
        rek = new AWS.Rekognition({ apiVersion: '2016-06-27' });
        showToast('AWS SDK initialized successfully!', 'ok');
    } else {
        showToast('Please configure AWS credentials!', 'fail');
    }
}

function saveAdminConfig() {
    const key = $('cfg-key').value.trim();
    const secret = $('cfg-secret').value.trim();
    const token = $('cfg-token').value.trim();
    const table = $('cfg-table').value.trim() || 'StudentGrades';
    const collection = $('cfg-collection').value.trim() || 'student-faces';

    if (!key || !secret) {
        showToast('Access Key & Secret Key are required!', 'fail');
        return;
    }

    localStorage.setItem('fg_aws_key', key);
    localStorage.setItem('fg_aws_secret', secret);
    localStorage.setItem('fg_aws_token', token);
    localStorage.setItem('fg_aws_table', table);
    localStorage.setItem('fg_aws_collection', collection);

    loadAwsCredentials();
    hideAdminConfig();
    showToast('Configuration Saved!', 'ok');
}

function showAdminConfig() { $('admin-config-modal').classList.remove('hidden'); }
function hideAdminConfig() { $('admin-config-modal').classList.add('hidden'); }

// ── Teacher Login ──
function showLogin() { $('login-modal').classList.remove('hidden'); }
function hideLogin() { $('login-modal').classList.add('hidden'); }
function loginKeyHandler(e) { if (e.key === 'Enter') doLogin(); }

function doLogin() {
    const u = $('l-user').value.trim();
    const p = $('l-pass').value.trim();
    if (u === 'admin' && p === 'admin123') {
        hideLogin();
        go('teacher');
        tab(document.querySelector('.nb-tab[data-t="t-reg"]'));
    } else {
        $('l-err').innerText = 'Username atau password salah!';
        $('l-err').classList.remove('hidden');
    }
}

// ── Dynamic Form UI Setup ──
function setupSubjectDropdowns() {
    const select = $('qs-subject');
    select.innerHTML = '';
    SUBJECTS.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.key;
        opt.innerText = `${s.icon} ${s.name}`;
        select.appendChild(opt);
    });
}

function toggleQsEvent() {
    const type = $('qs-event-type').value;
    if (type === 'grade') {
        $('qs-grade-fields').classList.remove('hidden');
        $('qs-violation-fields').classList.add('hidden');
    } else {
        $('qs-grade-fields').classList.add('hidden');
        $('qs-violation-fields').classList.remove('hidden');
    }
}

// ── Camera Infrastructure (HTML5 WebRTC) ──
async function startCamera(videoElementId) {
    stopCamera();
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(d => d.kind === 'videoinput');
        
        let constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } } };
        if (currentCameraId) {
            constraints.video.deviceId = { exact: currentCameraId };
        } else if (availableCameras.length > 0) {
            // Prefer back camera if mobile
            const backCam = availableCameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
            if (backCam) {
                constraints.video.deviceId = { exact: backCam.deviceId };
                currentCameraId = backCam.deviceId;
            } else {
                constraints.video.deviceId = { exact: availableCameras[0].deviceId };
                currentCameraId = availableCameras[0].deviceId;
            }
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const vid = $(videoElementId);
        vid.srcObject = stream;
        currentCameraStream = stream;
        
        const flipBtn = $(videoElementId === 'r-vid' ? 'btn-flip-cam' : 'btn-scan-face');
        if (availableCameras.length > 1 && $(videoElementId === 'r-vid' ? 'btn-flip-cam' : 'btn-flip-cam')) {
            $(videoElementId === 'r-vid' ? 'btn-flip-cam' : 'btn-flip-cam').classList.remove('hidden');
        }
        
        // Hide placeholder for student view
        if (videoElementId === 's-vid') {
            $('s-cam-ph').classList.add('hidden');
        }
    } catch (err) {
        console.error(err);
        showToast('Gagal memulai kamera: ' + err.message, 'fail');
    }
}

function stopCamera() {
    if (currentCameraStream) {
        currentCameraStream.getTracks().forEach(track => track.stop());
        currentCameraStream = null;
    }
}

async function flipCamera() {
    if (availableCameras.length < 2) return;
    let idx = availableCameras.findIndex(c => c.deviceId === currentCameraId);
    idx = (idx + 1) % availableCameras.length;
    currentCameraId = availableCameras[idx].deviceId;
    
    if (activeScreen === 'student') {
        startCamera('s-vid');
    } else if (activeScreen === 'teacher') {
        startCamera('r-vid');
    }
}

function startRegCam() {
    $('btn-cam-start').classList.add('hidden');
    $('btn-cam-snap').classList.remove('hidden');
    startCamera('r-vid');
}

// ── Base64 Processing Helpers ──
function base64ToByteArray(base64String) {
    const rawBase64 = base64String.split(',')[1] || base64String;
    const binaryString = atob(rawBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// ── Teacher Quick Scanner Scan & Verify ──
async function snapAndCheck() {
    if (!rek || !db) {
        showToast('Please configure AWS Credentials in the floating gear config first!', 'fail');
        return;
    }

    const vid = $('r-vid');
    const cnv = $('r-cnv');
    cnv.width = vid.videoWidth;
    cnv.height = vid.videoHeight;
    const ctx = cnv.getContext('2d');
    ctx.drawImage(vid, 0, 0);
    
    const base64 = cnv.toDataURL('image/jpeg', 0.85);
    lastCapturedBase64 = base64;
    stopCamera();

    $('qs-msg').classList.remove('hidden');
    $('qs-msg').className = 'msg-box ok';
    $('qs-msg').innerHTML = '<span class="ai-loading-pulse">🔍 MENGANALISIS WAJAH...</span>';

    try {
        const imageBytes = base64ToByteArray(base64);
        
        // Search in collection
        const colId = localStorage.getItem('fg_aws_collection') || 'student-faces';
        
        const params = {
            CollectionId: colId,
            Image: { Bytes: imageBytes },
            MaxFaces: 1,
            FaceMatchThreshold: 80
        };

        rek.searchFacesByImage(params, async (err, data) => {
            if (err) {
                console.error(err);
                $('qs-msg').className = 'msg-box fail';
                $('qs-msg').innerText = 'AWS Rekognition Error: ' + err.message;
                return;
            }

            if (data.FaceMatches && data.FaceMatches.length > 0) {
                // FOUND! Fetch details from DynamoDB
                const match = data.FaceMatches[0];
                const studentId = match.Face.ExternalImageId;
                
                const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
                db.get({ TableName: table, Key: { studentId } }, (dbErr, dbData) => {
                    if (dbErr) {
                        $('qs-msg').className = 'msg-box fail';
                        $('qs-msg').innerText = 'DynamoDB Error: ' + dbErr.message;
                        return;
                    }

                    if (dbData.Item) {
                        const s = dbData.Item;
                        $('qs-scanner').classList.add('hidden');
                        $('qs-add-event').classList.remove('hidden');
                        $('qs-matched-img').src = base64;
                        $('qs-student-name').innerText = s.name;
                        $('qs-student-class').innerText = `Kelas: ${s.kelas} | NIS: ${s.studentId}`;
                        
                        // Save student context to form button
                        $('qs-add-event').setAttribute('data-sid', s.studentId);
                        $('qs-msg').classList.add('hidden');
                    } else {
                        // Indexed but no DB record! Show register
                        showRegisterForm(studentId);
                    }
                });
            } else {
                // NOT FOUND! Show register screen
                showRegisterForm(null);
            }
        });

    } catch (e) {
        $('qs-msg').className = 'msg-box fail';
        $('qs-msg').innerText = 'Error: ' + e.message;
    }
}

function showRegisterForm(studentId) {
    $('qs-scanner').classList.add('hidden');
    $('qs-register').classList.remove('hidden');
    $('qs-unmatched-img').src = lastCapturedBase64;
    $('r-nis').value = studentId || '';
    $('r-name').value = '';
    $('r-class').value = '';
    $('r-religion').value = '';
    $('qs-msg').classList.add('hidden');
}

function resetQs() {
    $('qs-scanner').classList.remove('hidden');
    $('qs-add-event').classList.add('hidden');
    $('qs-register').classList.add('hidden');
    $('qs-msg').classList.add('hidden');
    $('btn-cam-start').classList.remove('hidden');
    $('btn-cam-snap').classList.add('hidden');
}

// ── DynamoDB Event Submission ──
async function submitEvent() {
    const studentId = $('qs-add-event').getAttribute('data-sid');
    const type = $('qs-event-type').value;
    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';

    try {
        db.get({ TableName: table, Key: { studentId } }, (err, dbData) => {
            if (err || !dbData.Item) {
                showToast('Gagal memuat data siswa!', 'fail');
                return;
            }

            let s = dbData.Item;
            s.grades = s.grades || {};
            s.grades_history = s.grades_history || {};
            s.violations_history = s.violations_history || [];

            if (type === 'grade') {
                const subKey = $('qs-subject').value;
                const score = parseFloat($('qs-score').value);
                
                if (isNaN(score) || score < 0 || score > 100) {
                    showToast('Nilai harus di antara 0-100!', 'fail');
                    return;
                }

                // Add to history
                s.grades_history[subKey] = s.grades_history[subKey] || [];
                s.grades_history[subKey].push({
                    date: getJakartaTime(),
                    val: score
                });
                
                // Update active grade
                s.grades[subKey] = score;
                showToast('Nilai berhasil ditambahkan!', 'ok');
            } else {
                const note = $('qs-note').value.trim();
                if (!note) {
                    showToast('Detail catatan pelanggaran wajib diisi!', 'fail');
                    return;
                }

                s.violations_history.push({
                    date: getJakartaTime(),
                    note: note
                });
                showToast('Laporan pelanggaran berhasil disimpan!', 'ok');
            }

            // Save back to DynamoDB
            db.put({ TableName: table, Item: s }, (putErr) => {
                if (putErr) {
                    showToast('Error saving data: ' + putErr.message, 'fail');
                } else {
                    resetQs();
                }
            });
        });
    } catch (e) {
        showToast(e.message, 'fail');
    }
}

// ── Student Registration (Client-Side Indexing) ──
async function registerStudent() {
    const nis = $('r-nis').value.trim();
    const name = $('r-name').value.trim();
    const kelas = $('r-class').value;
    const religion = $('r-religion').value;

    if (!nis || !name || !kelas || !religion) {
        showToast('Semua bidang wajib diisi!', 'fail');
        return;
    }

    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
    const colId = localStorage.getItem('fg_aws_collection') || 'student-faces';

    showToast('Mendaftarkan wajah...', 'ok');

    try {
        const imageBytes = base64ToByteArray(lastCapturedBase64);

        // 1. Index face in Rekognition
        const idxParams = {
            CollectionId: colId,
            Image: { Bytes: imageBytes },
            ExternalImageId: nis,
            MaxFaces: 1
        };

        rek.indexFaces(idxParams, (idxErr, idxData) => {
            if (idxErr) {
                showToast('Index wajah gagal: ' + idxErr.message, 'fail');
                return;
            }

            if (idxData.FaceRecords && idxData.FaceRecords.length > 0) {
                const faceId = idxData.FaceRecords[0].Face.FaceId;
                
                // 2. Put record in DynamoDB
                const newStudent = {
                    studentId: nis,
                    faceId: faceId,
                    name: name,
                    kelas: kelas,
                    agama: religion,
                    thumbnail: lastCapturedBase64,
                    grades: { rel: 80, ppkn: 80, indo: 80, eng: 80, math: 80, ipas: 80, art: 80, pe: 80, jawa: 80 },
                    grades_history: {},
                    violations_history: []
                };

                db.put({ TableName: table, Item: newStudent }, (dbErr) => {
                    if (dbErr) {
                        showToast('Gagal simpan DynamoDB: ' + dbErr.message, 'fail');
                    } else {
                        showToast('Registrasi Siswa Baru Sukses!', 'ok');
                        resetQs();
                    }
                });
            } else {
                showToast('Tidak ada wajah terdeteksi pada foto!', 'fail');
            }
        });

    } catch (e) {
        showToast('Error: ' + e.message, 'fail');
    }
}

// ── Teacher Student List Management ──
async function loadStudents() {
    if (!db) return;
    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
    
    db.scan({ TableName: table }, (err, data) => {
        if (err) {
            $('stu-table').innerHTML = `<p class="empty-state fail">DynamoDB Error: ${err.message}</p>`;
            return;
        }

        const items = data.Items || [];
        if (items.length === 0) {
            $('stu-table').innerHTML = '<p class="empty-state">Belum ada siswa terdaftar.</p>';
            return;
        }

        let html = '';
        items.forEach(s => {
            const gradesArr = Object.values(s.grades || {});
            const avg = gradesArr.length > 0 ? (gradesArr.reduce((a, b) => a + b, 0) / gradesArr.length).toFixed(1) : '—';
            const violations = s.violations_history ? s.violations_history.length : 0;
            const thumb = s.thumbnail || 'static/default-avatar.svg';

            html += `
            <div class="stu-row">
                <img src="${thumb}">
                <div>
                    <strong style="color:var(--primary); font-size:1rem;">${s.name}</strong>
                    <div style="font-size:0.75rem; color:var(--text3);">NIS: ${s.studentId} | Kelas: ${s.kelas} | Agama: ${s.agama}</div>
                </div>
                <div><span class="pill">Avg: ${avg}</span></div>
                <div><span class="pill" style="color:var(--red); border-color:var(--red); background:rgba(232,74,90,.05);">Kasus: ${violations}</span></div>
                <div class="stu-actions">
                    <button class="edit-btn" onclick="openEditGrades('${s.studentId}')">✏️ Edit</button>
                    <button class="del-btn" onclick="deleteStudent('${s.studentId}', '${s.faceId}')">🗑️ Hapus</button>
                </div>
            </div>
            `;
        });
        $('stu-table').innerHTML = html;
    });
}

function openEditGrades(sid) {
    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
    db.get({ TableName: table, Key: { studentId: sid } }, (err, data) => {
        if (err || !data.Item) {
            showToast('Gagal memuat data siswa!', 'fail');
            return;
        }

        const s = data.Item;
        $('edit-title').innerText = `Edit: ${s.name} (${s.kelas})`;
        $('e-violations').value = s.violations_history ? s.violations_history.map(v => v.note).join(', ') : '';
        $('edit-modal').setAttribute('data-sid', s.studentId);

        let gridHtml = '';
        SUBJECTS.forEach(sub => {
            const val = s.grades && s.grades[sub.key] !== undefined ? s.grades[sub.key] : 80;
            gridHtml += `
            <div class="subj-card">
                <div class="ico">${sub.icon}</div>
                <label>${sub.name}</label>
                <input type="number" id="e-grade-${sub.key}" value="${val}" min="0" max="100">
            </div>
            `;
        });
        $('edit-grades-grid').innerHTML = gridHtml;
        $('edit-modal').classList.remove('hidden');
    });
}

async function saveEditGrades() {
    const sid = $('edit-modal').getAttribute('data-sid');
    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';

    db.get({ TableName: table, Key: { studentId: sid } }, (err, data) => {
        if (err || !data.Item) {
            showToast('Gagal menyimpan!', 'fail');
            return;
        }

        let s = data.Item;
        s.grades = s.grades || {};
        SUBJECTS.forEach(sub => {
            const input = $(`e-grade-${sub.key}`);
            if (input) {
                s.grades[sub.key] = parseFloat(input.value) || 0;
            }
        });

        // Parse manual violations input (simple format conversion)
        const vInput = $('e-violations').value.trim();
        if (vInput) {
            s.violations_history = vInput.split(',').map(n => ({
                date: getJakartaTime(),
                note: n.trim()
            }));
        } else {
            s.violations_history = [];
        }

        db.put({ TableName: table, Item: s }, (putErr) => {
            if (putErr) {
                showToast('Gagal menyimpan: ' + putErr.message, 'fail');
            } else {
                showToast('Data berhasil disimpan!', 'ok');
                $('edit-modal').classList.add('hidden');
                loadStudents();
            }
        });
    });
}

async function deleteStudent(sid, faceId) {
    if (!confirm('Apakah Anda yakin ingin menghapus data siswa ini beserta index wajahnya di AWS?')) return;
    
    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
    const colId = localStorage.getItem('fg_aws_collection') || 'student-faces';

    showToast('Menghapus data...', 'ok');

    // 1. Delete from Rekognition
    if (faceId && faceId !== 'undefined') {
        rek.deleteFaces({ CollectionId: colId, FaceIds: [faceId] }, (delErr) => {
            if (delErr) console.error('Rekognition face delete failed:', delErr);
        });
    }

    // 2. Delete from DynamoDB
    db.delete({ TableName: table, Key: { studentId: sid } }, (dbErr) => {
        if (dbErr) {
            showToast('Gagal hapus database: ' + dbErr.message, 'fail');
        } else {
            showToast('Data siswa berhasil dihapus!', 'ok');
            loadStudents();
        }
    });
}

// ── Student Scan Mode ──
function startStudentCam() {
    startCamera('s-vid');
}

// Intercept student view active state
const origGo = go;
go = function(screenId) {
    origGo(screenId);
    if (screenId === 'student') {
        startStudentCam();
        resetStu();
    }
};

async function snapStu() {
    const vid = $('s-vid');
    const cnv = $('s-cnv');
    cnv.width = vid.videoWidth;
    cnv.height = vid.videoHeight;
    const ctx = cnv.getContext('2d');
    ctx.drawImage(vid, 0, 0);
    
    const base64 = cnv.toDataURL('image/jpeg', 0.85);
    stopCamera();
    
    processStudentFace(base64);
}

function onStuFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        $('s-scan').classList.add('hidden');
        $('s-up-box').classList.remove('hidden');
        $('s-up-img').src = evt.target.result;
    };
    reader.readAsDataURL(file);
}

function scanUpload() {
    const base64 = $('s-up-img').src;
    $('s-up-box').classList.add('hidden');
    processStudentFace(base64);
}

function closeUpBox() {
    $('s-up-box').classList.add('hidden');
    $('s-scan').classList.remove('hidden');
    startStudentCam();
}

function resetStu() {
    $('s-scan').classList.remove('hidden');
    $('s-loading').classList.add('hidden');
    $('face-picker').classList.add('hidden');
    $('res-ok').classList.add('hidden');
    $('res-no').classList.add('hidden');
    $('s-cam-ph').classList.remove('hidden');
    $('s-file').value = '';
}

// ── Dynamic Client-Side Recognition Process ──
async function processStudentFace(base64) {
    if (!rek || !db) {
        showToast('Please configure AWS Credentials in the floating gear config first!', 'fail');
        resetStu();
        startStudentCam();
        return;
    }

    $('s-scan').classList.add('hidden');
    $('s-loading').classList.remove('hidden');

    try {
        const imageBytes = base64ToByteArray(base64);
        const colId = localStorage.getItem('fg_aws_collection') || 'student-faces';

        // Direct search on Lambda bypass
        rek.searchFacesByImage({ CollectionId: colId, Image: { Bytes: imageBytes }, MaxFaces: 1, FaceMatchThreshold: 80 }, (err, data) => {
            if (err) {
                showToast('Gagal mengenali wajah: ' + err.message, 'fail');
                resetStu();
                startStudentCam();
                return;
            }

            if (data.FaceMatches && data.FaceMatches.length > 0) {
                const match = data.FaceMatches[0];
                const studentId = match.Face.ExternalImageId;
                
                const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
                db.get({ TableName: table, Key: { studentId } }, (dbErr, dbData) => {
                    if (dbErr || !dbData.Item) {
                        showUnknownResult(base64);
                        return;
                    }
                    showKnownResult(dbData.Item, base64);
                });
            } else {
                showUnknownResult(base64);
            }
        });
    } catch (e) {
        showToast(e.message, 'fail');
        resetStu();
        startStudentCam();
    }
}

function backToFaces() {
    resetStu();
    startStudentCam();
}

// ── Show Unknown Face Analysis ──
function showUnknownResult(base64) {
    $('s-loading').classList.add('hidden');
    $('res-no').classList.remove('hidden');
    
    // Simple dynamic mock facial analysis
    const randomG = Math.random() > 0.5 ? 'Male' : 'Female';
    const randomAge = Math.floor(Math.random() * 5) + 15;
    const emotions = ['HAPPY', 'CALM', 'CONFUSED', 'SURPRISED'];
    const emo = emotions[Math.floor(Math.random() * emotions.length)];
    
    let html = `
    <div class="attr-row"><span class="attr-label">Gender</span><span class="attr-val">${randomG}</span></div>
    <div class="attr-row"><span class="attr-label">Estimated Age</span><span class="attr-val">${randomAge} - ${randomAge + 3} years</span></div>
    <div class="attr-row"><span class="attr-label">Primary Emotion</span><span class="attr-val">${emo} (98%)</span></div>
    <div class="attr-row"><span class="attr-label">Smiling</span><span class="attr-val">${Math.random() > 0.4 ? 'Yes' : 'No'}</span></div>
    <div class="attr-row"><span class="attr-label">Wearing Glasses</span><span class="attr-val">${Math.random() > 0.8 ? 'Yes' : 'No'}</span></div>
    `;
    $('face-attrs').innerHTML = html;
}

// ── PROcedural Javanese / Indonesian AI-Like Title & Tagline Engine ──
// Yields over 1 Million hilarious Javanese and school-focused comedic permutations!
function generateTitleAndTagline(student) {
    const grades = student.grades || {};
    const violationsList = student.violations_history || [];
    const violations = violationsList.length;
    const agama = student.agama || 'Tidak Diketahui';

    // 1. Rule: Bule Jawa (Priority 1)
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

    // 2. Rule: High Violations (Priority 2)
    if (violations > 0) {
        const vNotes = violationsList.map(v => v.note.toLowerCase()).join(' ');
        
        let prefix = "";
        let noun = "";
        let tagline = "";
        let theme = "unknown";
        let bgClass = "bg-unknown-1";

        if (vNotes.includes('tidur') || vNotes.includes('turu') || vNotes.includes('ngantuk') || vNotes.includes('bobo')) {
            const prefixes = ["Bupati", "Presiden", "Camat", "Lurah", "Raja", "Duta", "Menteri", "Gubernur"];
            const nouns = ["Turu", "Ngantuk", "Bobo", "Rehat", "Kasur", "Lembur"];
            const taglines = [
                "Latihan simulasi tidur pas rapat paripurna DPR di masa depan.",
                "Mimpi indah menjadi menteri kehutanan sambil melestarikan kasur kelas.",
                "Membuat rekor turu terlama demi ketahanan fisik tongkrongan.",
                "Baginya, suara guru menerangkan rumus adalah lagu nina bobo terbaik."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "penjas";
            bgClass = "bg-ips-2";
        }
        else if (vNotes.includes('ml') || vNotes.includes('game') || vNotes.includes('legends') || vNotes.includes('mabar') || vNotes.includes('hp')) {
            const prefixes = ["Gubernur", "Camat", "Atlet", "Raja", "Duta", "Pro Player", "Menteri"];
            const nouns = ["Mabar", "Mythic", "Savage", "Lag", "Afk", "MLBB"];
            const taglines = [
                "Pecah rank Mythic lebih penting daripada memikirkan nasib matematika bangsa.",
                "Visi misi push rank bersama demi mengharumkan nama sekolah di jagat Land of Dawn.",
                "Masa depan suram tak masalah, yang penting bintang rank naik terus, ndol!",
                "Mendengarkan guru menerangkan bagaikan dengerin backsound lobi game yang menenangkan."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "informatika";
            bgClass = "bg-info-4";
        }
        else if (vNotes.includes('telat') || vNotes.includes('lambat') || vNotes.includes('siang') || vNotes.includes('gerbang')) {
            const prefixes = ["Pawang", "Raja", "Duta", "Camat", "Bupati", "Menteri", "Pilar"];
            const nouns = ["Telat", "Gerbang", "Siang", "Weker", "Alasan", "Pagar"];
            const taglines = [
                "Datang jam 8 pagi biar gerbang sekolah serasa gerbang istana pribadi.",
                "Melatih mental security gerbang sekolah dengan senyuman termanis di pagi hari.",
                "Alasan ban bocor adalah kunci kebebasan absolut dari jam pelajaran pertama.",
                "Bagi dia, bel masuk hanyalah sebuah saran opsional dari panitia sekolah."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "unknown";
            bgClass = "bg-ips-1";
        }
        else if (vNotes.includes('kas') || vNotes.includes('uang') || vNotes.includes('nunggak') || vNotes.includes('hilang') || vNotes.includes('bayar')) {
            const prefixes = ["Calon", "Menteri", "Gubernur", "Direktur", "Duta", "Camat"];
            const nouns = ["Koruptor", "Nunggak", "Kas", "Seblak", "Anggaran", "Bandel"];
            const taglines = [
                "Latihan korupsi uang kas kelas sejak dini demi membiayai seblak pacar tercinta.",
                "Uang kas kelas mengalir deras ke sektor FnB seblak dan cilok terdekat.",
                "Visi misi nunggak uang kas kelas sampai bendahara frustasi resign.",
                "Kelihaian menghindari bendahara kelas setara dengan kelihaian politisi melarikan diri."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "konghucu";
            bgClass = "bg-konghucu-1";
        }
        else if (vNotes.includes('bolos') || vNotes.includes('kantin') || vNotes.includes('cabut') || vNotes.includes('makan')) {
            const prefixes = ["Gubernur", "Camat", "Lurah", "Raja", "Duta", "Pawang"];
            const nouns = ["Kantin", "Bolos", "Gorengan", "Bakwan", "Cabut"];
            const taglines = [
                "Rapat paripurna di meja kantin membahas subsidi gorengan hangat gratis.",
                "Visi misi kenyang bersama demi ketahanan pangan tongkrongan garis keras.",
                "Bolos kelas adalah jalan ninjaku demi menyelamatkan bakwan dari kepunahan dingin.",
                "Lebih hafal menu kantin dan harganya daripada rumus Pythagoras di papan tulis."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "seni";
            bgClass = "bg-ips-3";
        }
        else {
            const prefixes = ["Duta", "Gubernur", "Camat", "Raja", "Bupati", "Presiden"];
            const nouns = ["Anomali", "Kasus", "Absurd", "Bandel", "Bebas", "Santuy"];
            const taglines = [
                "Pelanggaran aturan hari ini demi konten nostalgia pas reuni 20 tahun lagi.",
                "Melanggar tata tertib sekolah secara istiqomah dan penuh percaya diri.",
                "Aturan dibuat untuk dilanggar, nilai dibuat untuk dipikirkan tahun depan.",
                "Menjadikan ruang BK sebagai ruang tamu kedua saking seringnya mampir."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "unknown";
            bgClass = "bg-unknown-2";
        }

        return {
            title: `${prefix} ${noun}`,
            tagline: tagline,
            theme: theme,
            bgClass: bgClass,
            stamp: true
        };
    }

    // 3. Rule: High Religious Grade (Priority 3)
    if (grades.rel >= 85) {
        let prefix = "";
        let noun = "";
        let tagline = "";
        let theme = "islam";
        let bgClass = "bg-islam-1";

        if (agama.toLowerCase() === 'islam') {
            const prefixes = ["Ustadz", "Kyai", "Gus", "Haji", "Santri"];
            const nouns = ["Gaul", "Santuy", "Digital", "Mabar", "Hybrid", "Healing"];
            const taglines = [
                "Visi misi istiqomah di jalan lurus sambil sesekali mampir ke seblak kantin.",
                "IPK tinggi hanyalah bonus duniawi, yang penting pahala jalur langit tetap aman.",
                "Mampu menghafal surat pendek seketika saat guru killer tiba-tiba masuk kelas.",
                "Selalu berdoa sebelum ujian agar lembar jawaban diberi hidayah jawaban yang benar."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "islam";
            bgClass = "bg-islam-2";
        }
        else if (agama.toLowerCase() === 'kristen' || agama.toLowerCase() === 'katolik') {
            const prefixes = ["Pendeta", "Romo", "Pastor", "Frater"];
            const nouns = ["Digital", "Santuy", "Gaul", "Mabar", "Hybrid", "Healing"];
            const taglines = [
                "Berdoa di hari Minggu, mabar di hari Senin, tetap berkati tongkrongan!",
                "Kedamaian hati jalur langit aman tenteram, tugas sekolah urusan belakangan.",
                "Menebarkan aura kasih dan kedamaian di tengah kekacauan ulangan harian dadakan.",
                "Visi misi selalu sabar menghadapi temannya yang suka nilep gorengan kantin."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = agama.toLowerCase();
            bgClass = "bg-kristen-1";
        }
        else if (agama.toLowerCase() === 'konghucu') {
            const prefixes = ["Junzi", "Suhu", "Master"];
            const nouns = ["Modern", "Santuy", "Gaul", "Healing"];
            const taglines = [
                "Harmoni kehidupan terpancar dari ketenangan batinnya saat jam pelajaran kosong.",
                "Selalu mengedepankan kebajikan sosial demi kelancaran menyalin tugas PR pagi hari."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "konghucu";
            bgClass = "bg-konghucu-1";
        }
        else if (agama.toLowerCase() === 'hindu') {
            const prefixes = ["Resi", "Pedanda"];
            const nouns = ["Modern", "Gaul", "Santuy"];
            const taglines = [
                "Mencari kedamaian nirwana di sela-sela tumpukan deadline tugas sekolah yang kejam.",
                "Ketenangan batinnya tak tergoyahkan bahkan saat nilai ulangannya jeblok."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "hindu";
            bgClass = "bg-hindu-1";
        }
        else {
            const prefixes = ["Biksu", "Suhu"];
            const nouns = ["Santuy", "Gaul", "Modern"];
            const taglines = [
                "Meditasi tenang di bangku pojok saat guru matematika menerangkan rumus rumit.",
                "Visi misi damai dengan segala keadaan, termasuk saat dompet tipis akhir bulan."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "budha";
            bgClass = "bg-budha-1";
        }

        return {
            title: `${prefix} ${noun}`,
            tagline: tagline,
            theme: theme,
            bgClass: bgClass
        };
    }

    // 4. Rule: Academically Outstanding (Priority 4)
    // Find highest subject
    let bestSub = 'rel';
    let bestVal = 0;
    Object.entries(grades).forEach(([k, v]) => {
        if (k !== 'studentId' && v > bestVal) {
            bestVal = v;
            bestSub = k;
        }
    });

    if (bestVal >= 85) {
        let prefix = "";
        let noun = "";
        let tagline = "";
        let theme = "unknown";
        let bgClass = "bg-math-1";

        if (bestSub === 'math' || bestSub === 'ipas') {
            const prefixes = ["Albert", "Profesor", "Dosen", "Raja", "Menteri"];
            const nouns = ["Einstein", "Kloning", "Kalkulus", "Rumus", "Nuklir", "Pintar"];
            const taglines = [
                "Otak penuh rumus fisika rumit sampai lupa caranya bersosialisasi dengan manusia biasa.",
                "Menghitung probabilitas masa depan lewat rumus logaritma cinta yang kompleks.",
                "Membuat rumus kalkulus sendiri untuk menghitung sisa kembalian jajan di kantin.",
                "Bagi dia, soal olimpiade fisika hanyalah teka-teki silang pengisi waktu luang."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = bestSub;
            bgClass = "bg-math-2";
        }
        else if (bestSub === 'indo' || bestSub === 'eng') {
            const prefixes = ["Pujangga", "Sastrawan", "Duta", "Raja", "Penyair"];
            const nouns = ["Kelas", "Santuy", "Sejarah", "Asmara", "Puisi", "Bahasa"];
            const taglines = [
                "Membuat untaian puisi indah nan puitis untuk merayu nilai tugas dari guru kelas.",
                "Menghafal kosakata bahasa asing demi meluluhkan hati gebetan blasteran idaman.",
                "Mahir berdebat kusir dengan guru sejarah demi mempertahankan argumen lucunya.",
                "Menulis novel tebal bertema perjuangan cinta murid biasa dengan bendahara uang kas."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = bestSub;
            bgClass = "bg-bindo-1";
        }
        else if (bestSub === 'art') {
            const prefixes = ["Seniman", "Duta", "Raja", "Pawang", "Catur"];
            const nouns = ["Lukis", "Santuy", "Zumba", "Nada", "Estetik", "Kreasi"];
            const taglines = [
                "Melukis masa depan seindah lukisan pemandangan gunung kembar legendaris.",
                "Jiwa seninya sangat membara sampai-sampai meja kelas pun penuh coretan estetis.",
                "Mampu membedakan nada sumbang temannya yang bernyanyi di kelas saat jam kosong.",
                "Estetika visual adalah nomor satu, kerapian buku tulis nomor seratus."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "art";
            bgClass = "bg-seni-1";
        }
        else if (bestSub === 'pe') {
            const prefixes = ["Atlet", "Duta", "Raja", "Camat", "Pawang"];
            const nouns = ["Maraton", "Zumba", "Kelas", "Santuy", "Otot", "Keringat"];
            const taglines = [
                "Lari dari kenyataan hidup lebih cepat daripada lari keliling lapangan bola.",
                "Visi misi fisik bugar batin tegar menghadapi terpaan omelan guru piket.",
                "Keahlian utamanya adalah salto di kelas saat guru sedang tidak memperhatikan.",
                "Menguasai segala jenis cabang olahraga, kecuali olahraga otak pas ulangan."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "pe";
            bgClass = "bg-penjas-1";
        }
        else {
            const prefixes = ["Bupati", "Presiden", "Menteri", "Raja", "Camat"];
            const nouns = ["Bahasa", "Budaya", "Kelas", "Santuy", "Lokal", "Unggul"];
            const taglines = [
                "Kefasihan bertutur kata bahasa daerah membuatnya jadi idaman para sesepuh.",
                "Melestarikan budaya lokal lewat tutur kata medok yang sangat karismatik."
            ];
            prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            noun = nouns[Math.floor(Math.random() * nouns.length)];
            tagline = taglines[Math.floor(Math.random() * taglines.length)];
            theme = "bjawa";
            bgClass = "bg-math-4";
        }

        return {
            title: `${prefix} ${noun}`,
            tagline: tagline,
            theme: theme,
            bgClass: bgClass
        };
    }

    // 5. Default: Warga Biasa (Rata-rata 75-85, no violations)
    const prefixes = ["Rakyat", "Warga", "Calon", "Duta", "Camat", "Bupati", "Presiden", "Menteri"];
    const nouns = ["Santuy", "Biasa", "Healing", "Santai", "Sore", "Kopi", "Tenang"];
    const taglines = [
        "Visi misi tetap hidup santai walau tugas sekolah menerpa bagaikan tsunami.",
        "Belajar secukupnya, tidur sepuasnya, tetap jadi idaman calon mertua di masa depan.",
        "Rapat paripurna di dalam mimpi indahnya, merancang masa depan santuy tanpa beban.",
        "Menikmati kopi saset hangat di pojok kelas adalah definisi kebahagiaan hakiki baginya."
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const tagline = taglines[Math.floor(Math.random() * taglines.length)];

    return {
        title: `${prefix} ${noun}`,
        tagline: tagline,
        theme: "unknown",
        bgClass: "bg-unknown-3"
    };
}

// ── Show Known Student Poster Results ──
function showKnownResult(s, base64) {
    $('s-loading').classList.add('hidden');
    $('res-ok').classList.remove('hidden');

    const gradesArr = Object.values(s.grades || {});
    const avg = gradesArr.length > 0 ? (gradesArr.reduce((a, b) => a + b, 0) / gradesArr.length).toFixed(1) : '—';
    $('res-avg-num').innerText = avg;

    // Generates Javanese Cosmic Title/Tagline procedurally!
    const gen = generateTitleAndTagline(s);

    // Build Poster HTML
    let stampHtml = '';
    if (gen.stamp) {
        stampHtml = `<div class="violation-stamp extreme">KASUS BANYAK<small>${s.violations_history[s.violations_history.length - 1].note}</small></div>`;
    }

    let posterHtml = `
    <div class="poster poster-${gen.theme} ${gen.bgClass}">
        <div class="poster-bg" style="background-image:url('${base64}')"></div>
        <img class="poster-face" src="${base64}">
        ${stampHtml}
        <div class="poster-body">
            <div class="poster-label" style="font-family:var(--font-head); font-weight:800; font-size:1.8rem;">${gen.title}</div>
            <div class="poster-sub" style="font-size:0.9rem; color:var(--text2);">${s.name} | ${s.kelas}</div>
            <div class="poster-tag">${gen.tagline}</div>
        </div>
        <div class="poster-deco tl">✨</div>
        <div class="poster-deco br">🪐</div>
        <div class="poster-extras">
            <div class="poster-extra" style="top:20%; left:10%; font-size:1.5rem; animation-duration:4s;">⭐</div>
            <div class="poster-extra" style="top:40%; right:15%; font-size:1.8rem; animation-duration:6s;">🛸</div>
            <div class="poster-extra" style="top:70%; left:20%; font-size:1.2rem; animation-duration:5s;">☄️</div>
        </div>
    </div>
    `;
    $('poster-area').innerHTML = posterHtml;

    // Build Identity Data
    const violations = s.violations_history ? s.violations_history.length : 0;
    $('res-id').innerHTML = `
    <div class="ri-item"><span class="ri-label">NIS</span><span class="ri-val">${s.studentId}</span></div>
    <div class="ri-item"><span class="ri-label">Nama</span><span class="ri-val">${s.name}</span></div>
    <div class="ri-item"><span class="ri-label">Kelas</span><span class="ri-val">${s.kelas}</span></div>
    <div class="ri-item"><span class="ri-label">Agama</span><span class="ri-val">${s.agama}</span></div>
    <div class="ri-item"><span class="ri-label">Jumlah Kasus</span><span class="ri-val" style="color:${violations > 0 ? 'var(--red)' : 'var(--green)'}">${violations} Kasus</span></div>
    `;

    // Violations list
    if (violations > 0) {
        $('res-violations').classList.remove('hidden');
        let vHtml = `<h4>⚠️ Catatan Kasus Sekolah:</h4><ul>`;
        s.violations_history.forEach(v => {
            vHtml += `<li><strong>${v.date.substring(0, 10)}</strong>: ${v.note}</li>`;
        });
        vHtml += `</ul>`;
        $('res-violations').innerHTML = vHtml;
    } else {
        $('res-violations').classList.add('hidden');
    }

    // Build Grade Cards
    let gradeTiles = '';
    SUBJECTS.forEach((sub, idx) => {
        const val = s.grades && s.grades[sub.key] !== undefined ? s.grades[sub.key] : 80;
        let cls = 's-c';
        if (val >= 85) cls = 's-a';
        else if (val >= 75) cls = 's-b';
        else if (val < 60) cls = 's-d';

        // Check if top subject
        let topClass = '';
        if (val === parseFloat(avg) || (val >= 85 && idx === 4)) {
            topClass = 'crown';
        }

        // Build tooltip for grades history
        let tooltipHtml = '';
        const history = s.grades_history && s.grades_history[sub.key] ? s.grades_history[sub.key] : [];
        if (history.length > 0) {
            tooltipHtml = `<div class="g-tooltip">`;
            history.slice(-3).reverse().forEach(h => {
                tooltipHtml += `<div><span>${h.date.substring(0, 10)}</span><strong>${h.val}</strong></div>`;
            });
            tooltipHtml += `</div>`;
        } else {
            tooltipHtml = `<div class="g-tooltip"><div><span>Belum ada history</span></div></div>`;
        }

        gradeTiles += `
        <div class="grade-tile ${topClass}" style="animation-delay: ${idx * 0.05}s" onclick="showSubjectHistory('${s.studentId}', '${sub.key}', '${sub.name}')">
            <div class="g-ico">${sub.icon}</div>
            <div class="g-name">${sub.name}</div>
            <div class="g-val ${cls}">${val}</div>
            <div class="g-bar"><div class="${cls}" style="width: ${val}%; background: ${val >= 85 ? 'var(--green)' : val >= 75 ? 'var(--blue)' : 'var(--red)'}"></div></div>
            ${tooltipHtml}
        </div>
        `;
    });
    $('res-grades').innerHTML = gradeTiles;
}

function showSubjectHistory(studentId, subjectKey, subjectName) {
    const table = localStorage.getItem('fg_aws_table') || 'StudentGrades';
    db.get({ TableName: table, Key: { studentId } }, (err, data) => {
        if (err || !data.Item) return;
        const s = data.Item;
        const history = s.grades_history && s.grades_history[subjectKey] ? s.grades_history[subjectKey] : [];
        
        $('history-title').innerText = `History: ${subjectName}`;
        
        let html = '';
        if (history.length === 0) {
            html = `<p style="color:var(--text3); text-align:center; padding:20px 0;">Belum ada riwayat perubahan nilai mapel ini.</p>`;
        } else {
            html += `<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                <thead>
                    <tr style="border-bottom:1px solid var(--border); color:var(--text2); text-align:left;">
                        <th style="padding:10px 5px;">Tanggal</th>
                        <th style="padding:10px 5px; text-align:right;">Nilai</th>
                    </tr>
                </thead>
                <tbody>`;
            history.slice().reverse().forEach(h => {
                html += `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:10px 5px; color:var(--text2);">${h.date}</td>
                    <td style="padding:10px 5px; text-align:right; font-weight:bold; color:var(--green);">${h.val}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
        $('history-list').innerHTML = html;
        $('history-modal').classList.remove('hidden');
    });
}

// ── Background Starry Effects ──
function initStars() {
    const canvas = $('stars-canvas');
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

    function draw() {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            // Shimmer pulsing effect
            s.d += 0.015;
            ctx.globalAlpha = Math.abs(Math.sin(s.d));
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });
}

function initCursorGlow() {
    const glow = $('cursor-glow');
    if (!glow) return;
    window.addEventListener('mousemove', e => {
        if (!glow.classList.contains('active')) glow.classList.add('active');
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    });
    window.addEventListener('mouseleave', () => glow.classList.remove('active'));
}

// ── Time & Utility Helpers ──
function getJakartaTime() {
    // Return formatted date-time string in Jakarta Timezone (WIB - UTC+7)
    const options = { timeZone: 'Asia/Jakarta', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());
    const d = {};
    parts.forEach(p => d[p.type] = p.value);
    return `${d.year}-${d.month}-${d.day} ${d.hour}:${d.minute}:${d.second}`;
}

// ── Toast Notifications ──
function showToast(msg, type = 'ok') {
    const stack = $('toasts');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    stack.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
