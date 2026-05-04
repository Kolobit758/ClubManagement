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
loadStats();

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