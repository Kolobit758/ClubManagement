async function loadClubs(){
 const {data}=await db.from('clubs').select('*');
 const box=document.getElementById('clubList');
 box.innerHTML='';
 data.forEach(c=>{
  box.innerHTML += `
  <div class='col-md-4'>
   <div class='card h-100'><div class='card-body'>
    <h5>${c.name}</h5>
    <p>${c.description||''}</p>
    <p>จำนวน ${c.capacity} คน</p>
    <a href='club.html?id=${c.id}' class='btn btn-primary btn-sm'>เปิด</a>
    <button class='btn btn-warning btn-sm ms-2' onclick="editClub('${c.id}')">แก้ไข</button>
    <button class='btn btn-danger btn-sm ms-2' onclick="deleteClub('${c.id}')">ลบ</button>
   </div></div>
  </div>`;
 });
}

window.createClub = async function(){
 const name=prompt('ชื่อชุมนุม'); if(!name) return;
 const description=prompt('รายละเอียด')||'';
 const capacity=Number(prompt('จำนวนรับ','30'));
 const {data:year}=await db.from('academic_years').select('id').eq('is_active',true).single();
 const {data:user}=await db.auth.getUser();
 const {data:newClub,error}=await db.from('clubs').insert({name,description,capacity,year_id:year.id}).select().single();
 if(error) return alert(error.message);
 await db.from('club_teachers').insert({club_id:newClub.id,user_id:user.user.id,is_owner:true});
 loadClubs();
}

window.editClub = async function(id){
 const {data}=await db.from('clubs').select('*').eq('id',id).single();
 const name=prompt('ชื่อใหม่',data.name); if(!name) return;
 const description=prompt('รายละเอียด',data.description||'');
 const capacity=Number(prompt('จำนวนรับ',data.capacity));
 await db.from('clubs').update({name,description,capacity}).eq('id',id);
 loadClubs();
}

window.deleteClub = async function(id){
 if(!confirm('ลบชุมนุมนี้?')) return;
 await db.from('clubs').delete().eq('id',id);
 loadClubs();
}

loadClubs();