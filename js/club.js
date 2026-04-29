const params = new URLSearchParams(location.search);
const clubId = params.get('id');
 
// ─── โหลดข้อมูลชุมนุม ───────────────────────────────────────
async function loadClub() {
  const { data: club } = await db.from('clubs').select('*').eq('id', clubId).single();
  document.getElementById('clubName').innerText = club.name;
  loadMembers();
}
 
async function loadMembers() {
  const { data } = await db.from('enrollments').select('id,students(*)').eq('club_id', clubId);
  const box = document.getElementById('memberList');
  box.innerHTML = '';
  if (!data || data.length === 0) {
    box.innerHTML = '<p class="text-muted">ยังไม่มีสมาชิก</p>';
    return;
  }
  data.forEach(r => {
    const s = r.students;
    box.innerHTML += `
      <div class='border p-2 mb-2 d-flex justify-content-between align-items-center'>
        <span>${s.firstname} ${s.lastname} ม.${s.grade_level}/${s.room}</span>
        <button class='btn btn-danger btn-sm' onclick='removeStudent(${r.id})'>ลบ</button>
      </div>`;
  });
}
 
// ─── ค้นหานักเรียน ──────────────────────────────────────────
window.searchStudents = async function () {
  const q = document.getElementById('searchText').value;
  const { data } = await db.from('students').select('*').or(`firstname.ilike.%${q}%,lastname.ilike.%${q}%`).limit(20);
  const box = document.getElementById('searchResult');
  box.innerHTML = '';
  data.forEach(s => {
    box.innerHTML += `
      <div class='border p-2 mb-2 d-flex justify-content-between align-items-center'>
        <span>${s.firstname} ${s.lastname} ม.${s.grade_level}/${s.room}</span>
        <button class='btn btn-success btn-sm' onclick="addStudent('${s.id}')">เพิ่ม</button>
      </div>`;
  });
};
 
window.addStudent = async function (studentId) {
  const { data: year } = await db.from('academic_years').select('id').eq('is_active', true).single();
  const { error } = await db.from('enrollments').insert({ student_id: studentId, club_id: clubId, year_id: year.id });
  if (error) return alert(error.message);
  loadMembers();
};
 
window.removeStudent = async function (id) {
  await db.from('enrollments').delete().eq('id', id);
  loadMembers();
};
 
// ─── CSV Import ──────────────────────────────────────────────
 
// Drag & Drop events
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
 
// เก็บข้อมูลที่รอการ import
let pendingRows = [];
 
function parseCSV(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async function (res) {
      // normalize keys
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
        alert('ไม่พบข้อมูลในไฟล์ หรือไม่มีคอลัมน์ student_code / รหัสนักเรียน');
        return;
      }
 
      await checkAndPreview(rows);
    }
  });
}
 
async function checkAndPreview(rows) {
  // 1. ดึง active year
  const { data: year } = await db.from('academic_years').select('id').eq('is_active', true).single();
  const yearId = year?.id;
 
  // 2. ดึง enrollment ทั้งหมดของ year นี้ (ทุกชุมนุม) พร้อม student_code
  const { data: allEnrollments } = await db
    .from('enrollments')
    .select('student_id, club_id, students(student_code)')
    .eq('year_id', yearId);
 
  // สร้าง map: student_code -> club_id ที่สมัครอยู่แล้ว
  const enrolledMap = {};
  (allEnrollments || []).forEach(e => {
    const code = e.students?.student_code;
    if (code) enrolledMap[code] = e.club_id;
  });
 
  // 3. ดึงข้อมูล students จาก DB ตาม student_code ใน CSV
  const codes = rows.map(r => r.student_code);
  const { data: students } = await db
    .from('students')
    .select('id, student_code, firstname, lastname, grade_level, room')
    .in('student_code', codes);
 
  const studentMap = {};
  (students || []).forEach(s => { studentMap[s.student_code] = s; });
 
  // 4. สร้าง preview rows พร้อม status
  pendingRows = rows.map(r => {
    const s = studentMap[r.student_code];
    if (!s) {
      return { ...r, _status: 'not_found', _studentId: null };
    }
    const existingClub = enrolledMap[r.student_code];
    if (existingClub) {
      if (existingClub === clubId) {
        return { ...r, _status: 'already_here', _studentId: s.id };
      } else {
        return { ...r, _status: 'in_other_club', _studentId: s.id, _inClub: existingClub };
      }
    }
    // พร้อมเพิ่ม
    return { ...r, _status: 'ok', _studentId: s.id, _yearId: yearId, firstname: s.firstname, lastname: s.lastname, grade_level: s.grade_level, room: s.room };
  });
 
  renderPreview(pendingRows);
}
 
function renderPreview(rows) {
  const tbody = document.getElementById('previewBody');
  tbody.innerHTML = '';
 
  let okCount = 0;
  rows.forEach((r, i) => {
    let badge = '';
    if (r._status === 'ok') {
      okCount++;
      badge = '<span class="badge bg-success status-badge">พร้อมเพิ่ม</span>';
    } else if (r._status === 'already_here') {
      badge = '<span class="badge bg-secondary status-badge">อยู่ชุมนุมนี้แล้ว</span>';
    } else if (r._status === 'in_other_club') {
      badge = '<span class="badge bg-warning text-dark status-badge">มีชุมนุมแล้ว</span>';
    } else if (r._status === 'not_found') {
      badge = '<span class="badge bg-danger status-badge">ไม่พบในระบบ</span>';
    }
 
    tbody.innerHTML += `
      <tr class="${r._status === 'ok' ? '' : 'table-secondary'}">
        <td>${i + 1}</td>
        <td>${r.student_code}</td>
        <td>${r.firstname || '-'}</td>
        <td>${r.lastname || '-'}</td>
        <td>${r.grade_level ? `ม.${r.grade_level}/${r.room}` : '-'}</td>
        <td>${badge}</td>
      </tr>`;
  });
 
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
 
  alert(`✅ เพิ่มสมาชิกสำเร็จ ${toInsert.length} คน`);
  cancelImport();
  loadMembers();
};
 
window.cancelImport = function () {
  pendingRows = [];
  document.getElementById('previewSection').style.display = 'none';
  document.getElementById('previewBody').innerHTML = '';
  document.getElementById('csvInput').value = '';
};
 
loadClub();