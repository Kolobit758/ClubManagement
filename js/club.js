const params=new URLSearchParams(location.search);
const clubId=params.get('id');

async function loadClub(){
 const {data:club}=await db.from('clubs').select('*').eq('id',clubId).single();
 document.getElementById('clubName').innerText=club.name;
 loadMembers();
}

async function loadMembers(){
 const {data}=await db.from('enrollments').select('id,students(*)').eq('club_id',clubId);
 const box=document.getElementById('memberList');
 box.innerHTML='';
 data.forEach(r=>{
  const s=r.students;
  box.innerHTML += `<div class='border p-2 mb-2'>${s.firstname} ${s.lastname} ม.${s.grade_level}/${s.room}
  <button class='btn btn-danger btn-sm float-end' onclick='removeStudent(${r.id})'>ลบ</button></div>`;
 });
}

window.searchStudents = async function(){
 const q=document.getElementById('searchText').value;
 const {data}=await db.from('students').select('*').or(`firstname.ilike.%${q}%,lastname.ilike.%${q}%`).limit(20);
 const box=document.getElementById('searchResult');
 box.innerHTML='';
 data.forEach(s=>{
  box.innerHTML += `<div class='border p-2 mb-2'>${s.firstname} ${s.lastname} ม.${s.grade_level}/${s.room}
  <button class='btn btn-success btn-sm float-end' onclick="addStudent('${s.id}')">เพิ่ม</button></div>`;
 });
}

window.addStudent = async function(studentId){
 const {data:year}=await db.from('academic_years').select('id').eq('is_active',true).single();
 const {error}=await db.from('enrollments').insert({student_id:studentId,club_id:clubId,year_id:year.id});
 if(error) return alert(error.message);
 loadMembers();
}

window.removeStudent = async function(id){
 await db.from('enrollments').delete().eq('id',id);
 loadMembers();
}

loadClub();