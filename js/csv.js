async function importStudentsCSV(file){
 Papa.parse(file,{header:true,skipEmptyLines:true,complete:async function(res){
   const rows=res.data.map(r=>{
     let obj={};
     for(let k in r){ obj[k.toLowerCase().trim()]=r[k]; }
     return {
       student_code: obj.student_code || obj['รหัสนักเรียน'],
       firstname: obj.firstname || obj['ชื่อ'],
       lastname: obj.lastname || obj['นามสกุล'],
       grade_level: Number(obj.grade_level || obj['ชั้น']),
       room: Number(obj.room || obj['ห้อง'])
     };
   }).filter(x=>x.student_code);
   const {error}=await db.from('students').upsert(rows,{onConflict:'student_code'});
   if(error) return alert(error.message);
   alert('นำเข้าข้อมูลนักเรียนสำเร็จ '+rows.length+' รายการ');
   loadStats();
 }});
}