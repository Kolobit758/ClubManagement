// เพิ่มใน admin.js ข้างบนสุด
async function checkAdminAccess() {
  const { data: user } = await db.auth.getUser();
  const { data: profile } = await db
    .from('users_profile')
    .select('role')
    .eq('id', user.user.id)
    .single();
  if (profile?.role !== 'admin') location = 'index.html';
}
async function init() {
  await checkAdminAccess();
  initEnrollmentSection();
  loadStats();
}

init();


async function loadStats() {
  let { count: students } = await db
    .from("students")
    .select("*", { count: "exact", head: true });
  let { count: clubs } = await db
    .from("clubs")
    .select("*", { count: "exact", head: true });
  document.getElementById("stats").innerHTML =
    `นักเรียน ${students} คน <br> ชุมนุม ${clubs} ห้อง`;
}


// async function createGoogleForm() {

//   const { data } = await db.from("clubs").select("name");

//   const clubs = data.map(c => c.name).join(",");

//   const url =
//     "https://script.google.com/macros/s/AKfycbzAKDucxvtJDQ_xTQXQDAjm0ApG6fjg62vV9T72aJ42BmqLtXhWXbHZlvSrojg3zAj9/exec"
//     + encodeURIComponent(clubs);

//   window.open(url, "_blank");
// }

window.createGoogleForm = async function () {

  const { data } = await db.from("clubs").select("name");

  const clubs = data.map(c => c.name).join(",");

  const url =
    "https://script.google.com/macros/s/AKfycbzAKDucxvtJDQ_xTQXQDAjm0ApG6fjg62vV9T72aJ42BmqLtXhWXbHZlvSrojg3zAj9/exec" +
    encodeURIComponent(clubs);

  window.open(url, "_blank");
};

// ข้อมูล cache สำหรับ render ซ้ำโดยไม่ต้อง query ใหม่
let _enrollData = [];

async function initEnrollmentSection() {
  // โหลด academic_years ใส่ dropdown
  const { data: years } = await db
    .from('academic_years')
    .select('id, year_name, is_active')
    .order('id', { ascending: false });

  const sel = document.getElementById('filterYear');
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y.id;
    opt.textContent = y.year_name + (y.is_active ? ' (ปัจจุบัน)' : '');
    if (y.is_active) opt.selected = true;
    sel.appendChild(opt);
  });

  // ซ่อน loading เริ่มต้น
  document.getElementById('enrollLoading').classList.add('d-none');
  document.getElementById('enrollEmpty').classList.remove('d-none');

  // ถ้ามีปีที่ active อยู่ให้โหลดเลย
  if (sel.value) loadEnrollmentStatus();
}

async function loadEnrollmentStatus() {
  const yearId = document.getElementById('filterYear').value;
  if (!yearId) return;

  const grade = document.getElementById('filterGrade').value;
  const room  = document.getElementById('filterRoom').value;

  // แสดง loading
  document.getElementById('enrollLoading').classList.remove('d-none');
  document.getElementById('enrollTableWrap').classList.add('d-none');
  document.getElementById('enrollSummary').classList.add('d-none');
  document.getElementById('enrollEmpty').classList.add('d-none');

  // ดึง students ตาม filter
  let query = db
    .from('students')
    .select('id, student_code, firstname, lastname, grade_level, room')
    .eq('status', 'active')
    .order('grade_level')
    .order('room')
    .order('student_code');

  if (grade) query = query.eq('grade_level', grade);
  if (room)  query = query.eq('room', room);

  const { data: students, error: sErr } = await query;
  if (sErr) { alert(sErr.message); return; }

  // ดึง enrollments ของปีนี้ พร้อมชื่อชุมนุม
  const { data: enrollments, error: eErr } = await db
    .from('enrollments')
    .select('student_id, clubs(name)')
    .eq('year_id', yearId);
  if (eErr) { alert(eErr.message); return; }

  // สร้าง map student_id → club_name
  const enrollMap = {};
  enrollments.forEach(e => {
    enrollMap[e.student_id] = e.clubs?.name || 'ไม่ทราบชุมนุม';
  });

  // รวมข้อมูล
  _enrollData = students.map(s => ({
    ...s,
    club_name: enrollMap[s.id] || null
  }));

  document.getElementById('enrollLoading').classList.add('d-none');
  renderEnrollmentTable();
}

function renderEnrollmentTable() {
  const filterStatus = document.getElementById('filterStatus').value;

  let filtered = _enrollData;
  if (filterStatus === 'enrolled')     filtered = _enrollData.filter(s => s.club_name);
  if (filterStatus === 'not_enrolled') filtered = _enrollData.filter(s => !s.club_name);

  const enrolled    = _enrollData.filter(s => s.club_name).length;
  const notEnrolled = _enrollData.filter(s => !s.club_name).length;

  // อัพเดต summary
  document.getElementById('countEnrolled').textContent    = enrolled;
  document.getElementById('countNotEnrolled').textContent = notEnrolled;
  document.getElementById('countTotal').textContent       = _enrollData.length;
  document.getElementById('enrollSummary').classList.remove('d-none');

  // render ตาราง
  const tbody = document.getElementById('enrollTableBody');
  tbody.innerHTML = filtered.map((s, i) => `
    <tr>
      <td class="text-muted small">${i + 1}</td>
      <td><code>${s.student_code}</code></td>
      <td>${s.firstname} ${s.lastname}</td>
      <td><span class="badge bg-light text-dark border">ม.${s.grade_level}/${s.room}</span></td>
      <td>${s.club_name ?? '<span class="text-muted">—</span>'}</td>
      <td>
        ${s.club_name
          ? '<span class="badge bg-success-subtle text-success border border-success-subtle">มีชุมนุมแล้ว</span>'
          : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle">ยังไม่มีชุมนุม</span>'
        }
      </td>
    </tr>
  `).join('');

  document.getElementById('enrollTableWrap').classList.remove('d-none');
}

let _deleteTargetId = null;

// เปิด modal เพิ่มนักเรียนใหม่
function openAddStudent() {
  document.querySelector('#studentModal .modal-title').textContent = 'เพิ่มนักเรียน';
  document.getElementById('editStudentId').value    = '';
  document.getElementById('editStudentCode').value  = '';
  document.getElementById('editFirstname').value    = '';
  document.getElementById('editLastname').value     = '';
  document.getElementById('editGrade').value        = '1';
  document.getElementById('editRoom').value         = '';
  // ซ่อนปุ่มลบตอน add ใหม่
  document.querySelector('#studentModal .btn-outline-danger').classList.add('d-none');
  new bootstrap.Modal(document.getElementById('studentModal')).show();
}

// คลิกแถว → เปิด modal แก้ไข
function openEditStudent(id, code, firstname, lastname, grade, room) {
  document.querySelector('#studentModal .modal-title').textContent = 'แก้ไขข้อมูลนักเรียน';
  document.getElementById('editStudentId').value    = id;
  document.getElementById('editStudentCode').value  = code;
  document.getElementById('editFirstname').value    = firstname;
  document.getElementById('editLastname').value     = lastname;
  document.getElementById('editGrade').value        = grade;
  document.getElementById('editRoom').value         = room;
  // แสดงปุ่มลบตอน edit
  document.querySelector('#studentModal .btn-outline-danger').classList.remove('d-none');
  new bootstrap.Modal(document.getElementById('studentModal')).show();
}

// บันทึก (insert หรือ update)
async function saveStudent() {
  const id           = document.getElementById('editStudentId').value;
  const student_code = document.getElementById('editStudentCode').value.trim();
  const firstname    = document.getElementById('editFirstname').value.trim();
  const lastname     = document.getElementById('editLastname').value.trim();
  const grade_level  = Number(document.getElementById('editGrade').value);
  const room         = Number(document.getElementById('editRoom').value);

  if (!student_code || !firstname || !lastname || !room) {
    return alert('กรุณากรอกข้อมูลให้ครบ');
  }

  let error;
  if (id) {
    ({ error } = await db
      .from('students')
      .update({ student_code, firstname, lastname, grade_level, room })
      .eq('id', id));
  } else {
    ({ error } = await db
      .from('students')
      .insert({ student_code, firstname, lastname, grade_level, room }));
  }

  if (error) return alert('เกิดข้อผิดพลาด: ' + error.message);

  bootstrap.Modal.getInstance(document.getElementById('studentModal')).hide();
  await loadEnrollmentStatus();
  loadStats();
}

// กดปุ่มลบใน modal → ปิด modal แรก แล้วเปิด confirm
function deleteStudent() {
  const id   = document.getElementById('editStudentId').value;
  const name = document.getElementById('editFirstname').value
             + ' ' + document.getElementById('editLastname').value;

  _deleteTargetId = id;
  document.getElementById('deleteStudentName').textContent = name;

  bootstrap.Modal.getInstance(document.getElementById('studentModal')).hide();
  document.getElementById('studentModal').addEventListener('hidden.bs.modal', () => {
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
  }, { once: true });
}

// ยืนยันลบ
async function confirmDelete() {
  if (!_deleteTargetId) return;

  const { error } = await db
    .from('students')
    .delete()
    .eq('id', _deleteTargetId);

  if (error) return alert('เกิดข้อผิดพลาด: ' + error.message);

  bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
  _deleteTargetId = null;
  await loadEnrollmentStatus();
  loadStats();
}

// แก้ renderEnrollmentTable — เพิ่ม onclick ที่ tr
function renderEnrollmentTable() {
  const filterStatus = document.getElementById('filterStatus').value;

  let filtered = _enrollData;
  if (filterStatus === 'enrolled')     filtered = _enrollData.filter(s => s.club_name);
  if (filterStatus === 'not_enrolled') filtered = _enrollData.filter(s => !s.club_name);

  const enrolled    = _enrollData.filter(s => s.club_name).length;
  const notEnrolled = _enrollData.filter(s => !s.club_name).length;

  document.getElementById('countEnrolled').textContent    = enrolled;
  document.getElementById('countNotEnrolled').textContent = notEnrolled;
  document.getElementById('countTotal').textContent       = _enrollData.length;
  document.getElementById('enrollSummary').classList.remove('d-none');

  const tbody = document.getElementById('enrollTableBody');
  tbody.innerHTML = filtered.map((s, i) => `
    <tr onclick="openEditStudent('${s.id}','${s.student_code}','${s.firstname}','${s.lastname}',${s.grade_level},${s.room})">
      <td class="text-muted small">${i + 1}</td>
      <td><code>${s.student_code}</code></td>
      <td>${s.firstname} ${s.lastname}</td>
      <td><span class="badge bg-light text-dark border">ม.${s.grade_level}/${s.room}</span></td>
      <td>${s.club_name ?? '<span class="text-muted">—</span>'}</td>
      <td>
        ${s.club_name
          ? '<span class="badge bg-success-subtle text-success border border-success-subtle">มีชุมนุมแล้ว</span>'
          : '<span class="badge bg-danger-subtle text-danger border border-danger-subtle">ยังไม่มีชุมนุม</span>'
        }
      </td>
    </tr>
  `).join('');

  document.getElementById('enrollTableWrap').classList.remove('d-none');
}

window.exportEnrollment = function () {
  // _enrollData มาจาก admin.js (cache ไว้อยู่แล้ว)
  if (!_enrollData || _enrollData.length === 0) {
    alert("ไม่มีข้อมูล กรุณาเลือกปีการศึกษาก่อน");
    return;
  }
 
  const filterStatus = document.getElementById("filterStatus").value;
 
  let filtered = _enrollData;
  if (filterStatus === "enrolled")     filtered = _enrollData.filter((s) => s.club_name);
  if (filterStatus === "not_enrolled") filtered = _enrollData.filter((s) => !s.club_name);
 
  const rows = filtered.map((s, i) => ({
    no: i + 1,
    student_code: s.student_code,
    firstname: s.firstname,
    lastname: s.lastname,
    grade_level: s.grade_level,
    room: s.room,
    club_name: s.club_name || "ยังไม่มีชุมนุม",
    enroll_status: s.club_name ? "มีชุมนุมแล้ว" : "ยังไม่มีชุมนุม",
  }));
 
  const columns = [
    "no", "student_code", "firstname", "lastname",
    "grade_level", "room", "club_name", "enroll_status",
  ];
  const headers = {
    no: "ลำดับ",
    student_code: "รหัสนักเรียน",
    firstname: "ชื่อ",
    lastname: "นามสกุล",
    grade_level: "ชั้น",
    room: "ห้อง",
    club_name: "ชุมนุม",
    enroll_status: "สถานะ",
  };
 
  // ชื่อไฟล์สะท้อน filter ที่เลือก
  const suffix =
    filterStatus === "enrolled" ? "มีชุมนุม"
    : filterStatus === "not_enrolled" ? "ยังไม่มีชุมนุม"
    : "ทั้งหมด";
 
  const yearSel = document.getElementById("filterYear");
  const yearText = yearSel.options[yearSel.selectedIndex]?.text
    .replace(" (ปัจจุบัน)", "")
    .trim() || "";
 
  const csv = buildCSV(rows, columns, headers);
  downloadCSV(csv, csvFilename(`สถานะชุมนุม_${yearText}_${suffix}`));
};

