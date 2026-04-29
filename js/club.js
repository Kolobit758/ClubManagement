const params = new URLSearchParams(location.search);
const clubId = params.get('id');

// ─── State ──────────────────────────────────────────────────
let allStudents = [];     // cache นักเรียนทั้งหมด (โหลดครั้งเดียว)
let selGrade = 'all';
let selRoom = 'all';
let searchQuery = '';

// rooms ต่อชั้น (ดึงจาก DB จริงก็ได้ แต่ cache จาก allStudents ได้เลย)
const roomsByGrade = { 4: new Set(), 5: new Set(), 6: new Set() };

// ─── โหลดข้อมูลชุมนุม ───────────────────────────────────────
async function loadClub() {
  const { data: club } = await db.from('clubs').select('*').eq('id', clubId).single();
  document.getElementById('clubName').innerText = club.name;
  await loadAllStudents();
  loadMembers();
}

// โหลดนักเรียนทั้งหมดมา cache ไว้ (เพื่อ filter เร็ว)
async function loadAllStudents() {
  const { data } = await db.from('students').select('*').order('grade_level').order('room').order('firstname');
  allStudents = data || [];
  allStudents.forEach(s => {
    if (roomsByGrade[s.grade_level]) roomsByGrade[s.grade_level].add(s.room);
  });
}

// ─── รายชื่อสมาชิก ──────────────────────────────────────────
async function loadMembers() {
  const { data } = await db.from('enrollments').select('id,students(*)').eq('club_id', clubId);
  const box = document.getElementById('memberList');
  if (!data || data.length === 0) {
    box.innerHTML = '<div style="padding:16px 14px;color:#bbb;font-size:13px">ยังไม่มีสมาชิก</div>';
    document.getElementById('memberCount').textContent = '';
    return;
  }
  document.getElementById('memberCount').textContent = `(${data.length} คน)`;
  box.innerHTML = data.map(r => {
    const s = r.students;
    return `<div class="member-row">
      <span>${s.firstname} ${s.lastname}
        <span style="font-size:11px;color:#bbb;margin-left:6px">ม.${s.grade_level}/${s.room}</span>
      </span>
      <button class="del-btn" onclick="removeStudent(${r.id})">ลบ</button>
    </div>`;
  }).join('');
}

window.removeStudent = async function (id) {
  await db.from('enrollments').delete().eq('id', id);
  loadMembers();
  renderSearchResult(); // refresh เพราะสมาชิกเปลี่ยน
};

// ─── เพิ่มสมาชิก ────────────────────────────────────────────
window.addStudent = async function (studentId) {
  const { data: year } = await db.from('academic_years').select('id').eq('is_active', true).single();
  const { error } = await db.from('enrollments').insert({ student_id: studentId, club_id: clubId, year_id: year.id });
  if (error) return alert(error.message);
  loadMembers();
  renderSearchResult();
};

// ─── Grade / Room filter ─────────────────────────────────────
window.selectGrade = function (g) {
  selGrade = g;
  selRoom = 'all';
  document.querySelectorAll('.grade-tab').forEach(b => b.classList.toggle('active', b.dataset.grade === g));
  renderRoomChips();
  renderSearchResult();
};

window.selectRoom = function (r) {
  selRoom = r;
  document.querySelectorAll('.room-chip').forEach(b => b.classList.toggle('active', b.dataset.room === String(r)));
  renderSearchResult();
};

function renderRoomChips() {
  const box = document.getElementById('roomChips');
  if (selGrade === 'all') { box.innerHTML = ''; return; }
  const rooms = [...(roomsByGrade[Number(selGrade)] || [])].sort((a, b) => a - b);
  box.innerHTML =
    `<button class="room-chip active" data-room="all" onclick="selectRoom('all')">ทุกห้อง</button>` +
    rooms.map(r =>
      `<button class="room-chip" data-room="${r}" onclick="selectRoom(${r})">ห้อง ${r}</button>`
    ).join('');
}

// ─── Search input ────────────────────────────────────────────
window.onSearch = function () {
  searchQuery = document.getElementById('searchBox').value.trim();
  // ถ้าพิมพ์ค้นหา ให้ reset grade/room filter เป็น all
  if (searchQuery) {
    selGrade = 'all';
    selRoom = 'all';
    document.querySelectorAll('.grade-tab').forEach(b => b.classList.toggle('active', b.dataset.grade === 'all'));
    document.getElementById('roomChips').innerHTML = '';
  }
  renderSearchResult();
};

// ─── Render result ────────────────────────────────────────────
async function renderSearchResult() {
  // ต้องรู้ว่าใครอยู่ชุมนุมนี้แล้วเพื่อซ่อนปุ่มเพิ่ม
  const { data: enrolled } = await db.from('enrollments').select('student_id').eq('club_id', clubId);
  const enrolledIds = new Set((enrolled || []).map(e => e.student_id));

  let list = allStudents;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(s =>
      s.firstname.toLowerCase().includes(q) ||
      s.lastname.toLowerCase().includes(q) ||
      (s.student_code || '').toLowerCase().includes(q)
    );
  } else {
    if (selGrade !== 'all') list = list.filter(s => String(s.grade_level) === selGrade);
    if (selRoom !== 'all') list = list.filter(s => s.room === Number(selRoom));
    // ถ้าไม่ได้พิมพ์อะไรและไม่ได้กรองชั้น ไม่แสดงอะไร
    if (selGrade === 'all') {
      document.getElementById('resultList').innerHTML =
        '<div style="padding:20px;text-align:center;color:#bbb;font-size:13px">พิมพ์ชื่อ หรือเลือกชั้น/ห้องเพื่อดูรายชื่อ</div>';
      document.getElementById('resultCount').textContent = '';
      return;
    }
  }

  if (list.length === 0) {
    document.getElementById('resultList').innerHTML =
      '<div style="padding:20px;text-align:center;color:#bbb;font-size:13px">ไม่พบนักเรียน</div>';
    document.getElementById('resultCount').textContent = '';
    return;
  }

  let html = '';
  let lastKey = '';
  list.forEach(s => {
    const key = `ม.${s.grade_level}/${s.room}`;
    if (key !== lastKey) {
      html += `<div class="section-label">${key}</div>`;
      lastKey = key;
    }
    const isIn = enrolledIds.has(s.id);
    html += `<div class="student-row">
      <span>
        ${s.firstname} ${s.lastname}
        <span class="student-code">${s.student_code || ''}</span>
      </span>
      ${isIn
        ? `<span style="font-size:12px;color:#bbb;padding:3px 10px">อยู่แล้ว</span>`
        : `<button class="add-btn" onclick="addStudent('${s.id}')">+ เพิ่ม</button>`
      }
    </div>`;
  });

  document.getElementById('resultList').innerHTML = html;
  document.getElementById('resultCount').textContent = `แสดง ${list.length} คน`;
}

// ─── CSV Import ──────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) parseCSV(file);
});

window.handleFileSelect = function (e) {
  const file = e.target.files[0];
  if (file) parseCSV(file);
};

let pendingRows = [];

function parseCSV(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async function (res) {
      const rows = res.data.map(r => {
        let obj = {};
        for (let k in r) obj[k.toLowerCase().trim()] = r[k].trim();
        return {
          student_code: obj.student_code || obj['รหัสนักเรียน'] || '',
          firstname: obj.firstname || obj['ชื่อ'] || '',
          lastname: obj.lastname || obj['นามสกุล'] || '',
          grade_level: obj.grade_level || obj['ชั้น'] || '',
          room: obj.room || obj['ห้อง'] || '',
        };
      }).filter(x => x.student_code);

      if (rows.length === 0) {
        return alert('ไม่พบข้อมูลในไฟล์ หรือไม่มีคอลัมน์ student_code / รหัสนักเรียน');
      }
      await checkAndPreview(rows);
    }
  });
}

async function checkAndPreview(rows) {
  const { data: year } = await db.from('academic_years').select('id').eq('is_active', true).single();
  const yearId = year?.id;

  const { data: allEnrollments } = await db
    .from('enrollments')
    .select('student_id, club_id, students(student_code)')
    .eq('year_id', yearId);

  const enrolledMap = {};
  (allEnrollments || []).forEach(e => {
    const code = e.students?.student_code;
    if (code) enrolledMap[code] = e.club_id;
  });

  const codes = rows.map(r => r.student_code);
  const { data: students } = await db
    .from('students')
    .select('id, student_code, firstname, lastname, grade_level, room')
    .in('student_code', codes);

  const studentMap = {};
  (students || []).forEach(s => { studentMap[s.student_code] = s; });

  pendingRows = rows.map(r => {
    const s = studentMap[r.student_code];
    if (!s) return { ...r, _status: 'not_found', _studentId: null };
    const existingClub = enrolledMap[r.student_code];
    if (existingClub) {
      if (existingClub === clubId) return { ...r, _status: 'already_here', _studentId: s.id };
      return { ...r, _status: 'in_other_club', _studentId: s.id };
    }
    return { ...r, _status: 'ok', _studentId: s.id, _yearId: yearId, firstname: s.firstname, lastname: s.lastname, grade_level: s.grade_level, room: s.room };
  });

  renderPreview(pendingRows);
}

function renderPreview(rows) {
  const tbody = document.getElementById('previewBody');
  let okCount = 0;
  tbody.innerHTML = rows.map((r, i) => {
    let badge = '';
    if (r._status === 'ok')          { okCount++; badge = '<span class="badge-ok">พร้อมเพิ่ม</span>'; }
    else if (r._status === 'already_here') badge = '<span class="badge-here">อยู่ชุมนุมนี้แล้ว</span>';
    else if (r._status === 'in_other_club') badge = '<span class="badge-other">มีชุมนุมแล้ว</span>';
    else badge = '<span class="badge-none">ไม่พบในระบบ</span>';
    return `<tr class="${r._status === 'ok' ? '' : 'table-secondary'}">
      <td>${i + 1}</td><td>${r.student_code}</td>
      <td>${r.firstname || '-'}</td><td>${r.lastname || '-'}</td>
      <td>${r.grade_level ? `ม.${r.grade_level}/${r.room}` : '-'}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');

  document.getElementById('previewSummary').innerHTML =
    `พร้อมเพิ่ม <strong>${okCount}</strong> คน จากทั้งหมด ${rows.length} แถว`;
  document.getElementById('confirmImportBtn').disabled = okCount === 0;
  document.getElementById('previewSection').style.display = 'block';
}

window.confirmImport = async function () {
  const toInsert = pendingRows
    .filter(r => r._status === 'ok')
    .map(r => ({ student_id: r._studentId, club_id: clubId, year_id: r._yearId }));
  if (toInsert.length === 0) return alert('ไม่มีรายการที่สามารถเพิ่มได้');
  const { error } = await db.from('enrollments').insert(toInsert);
  if (error) return alert('เกิดข้อผิดพลาด: ' + error.message);
  alert(`เพิ่มสมาชิกสำเร็จ ${toInsert.length} คน`);
  cancelImport();
  loadMembers();
  renderSearchResult();
};

window.cancelImport = function () {
  pendingRows = [];
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('previewBody').innerHTML = '';
  document.getElementById('csvInput').value = '';
};

loadClub();