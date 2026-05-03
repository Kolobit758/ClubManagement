
async function checkAdminButton() {
  const { data: user } = await db.auth.getUser();
  if (!user?.user) return;
  const { data: profile } = await db
    .from('users_profile')
    .select('role')
    .eq('id', user.user.id)
    .single();
  if (profile?.role === 'admin') {
    document.getElementById('adminBtn').style.display = '';
  }
}

async function loadClubs() {
  const { data } = await db.from('clubs').select('*');
  const box = document.getElementById('clubList');
  box.innerHTML = '';
  
  data.forEach(c => {
    const shortCode = "C-" + String(c.id).substring(0, 4).toUpperCase();

    box.innerHTML += `
    <div class="col-md-6 col-lg-4">
        <div class="club-card">
            <!-- ส่วนหัว: ป้ายรหัส และ ปุ่มไอคอน -->
            <div class="d-flex justify-content-between align-items-start">
                <span class="badge-code">${shortCode}</span>
                <div class="d-flex gap-1">
                    <button class="action-btn edit" onclick="showEditClubPopup('${c.id}', '${c.name}', '${c.description || ''}')" title="แก้ไข">
                        <i data-lucide="edit-2" style="width: 16px;"></i>
                    </button>
                    <button class="action-btn delete" onclick="showDeleteClubPopup('${c.id}', '${c.name}')" title="ลบ">
                        <i data-lucide="trash-2" style="width: 16px;"></i>
                    </button>
                </div>
            </div>
            
            <!-- ชื่อชุมนุม -->
            <div class="club-title">${c.name}</div>
            
            <!-- ข้อมูล -->
            <div class="info-row dashed">
                <span>คำอธิบายชุมนุม</span>
                <span class="info-value" title="${c.description || '-'}">${c.description || '-'}</span>
            </div>
            <div class="info-row" style="margin-bottom: 0.5rem;">
                <span>จำนวนสมาชิก</span>
                <span class="info-value">${c.capacity} คน</span>
            </div>
            
            <!-- ปุ่มจัดการ -->
            <button class="btn-manage" onclick="location.href='club.html?id=${c.id}'">
                จัดการข้อมูลชุมนุม
            </button>
        </div>
    </div>`;
  });


  lucide.createIcons();
}


//  ตัวปอปอัป

// สร้างชุมนุม
window.showCreateClubPopup = async function () {
  const { value: formValues } = await Swal.fire({
      title: 'สร้างชุมนุมใหม่',
      html:
          `<div class="text-start mt-3">` +
          `<label class="form-label small fw-medium mb-1">ชื่อชุมนุม</label>` +
          `<input id="swal-input-name" class="swal2-input w-100 mx-0 mt-0 mb-3" placeholder="ชื่อชุมนุม">` +
          `<label class="form-label small fw-medium mb-1">รายละเอียด</label>` +
          `<textarea id="swal-input-desc" class="swal2-textarea w-100 mx-0 mt-0" rows="3" placeholder="รายละเอียด"></textarea>` +
          `</div>`,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0D6EFD',
      focusConfirm: false,
      preConfirm: () => {
          const name = document.getElementById('swal-input-name').value;
          if (!name) { Swal.showValidationMessage('กรุณาระบุชื่อชุมนุม'); return false; }
          return { name, desc: document.getElementById('swal-input-desc').value };
      }
  });

  if (formValues) {
      // เรียกdb
      const capacity = 25;
      const { data: year } = await db.from('academic_years').select('id').eq('is_active', true).single();
      const { data: user } = await db.auth.getUser();
      const { data: newClub, error } = await db.from('clubs').insert({ 
          name: formValues.name, description: formValues.desc, capacity, year_id: year.id 
      }).select().single();
      
      if (error) return Swal.fire('ข้อผิดพลาด', error.message, 'error');
      
      await db.from('club_teachers').insert({ club_id: newClub.id, user_id: user.user.id, is_owner: true });
      Swal.fire({ title: 'สำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
      loadClubs();
  }
};

// แก้ไขชุมนุม
window.showEditClubPopup = async function (id, currentName, currentDesc) {
  const { value: formValues } = await Swal.fire({
      title: 'แก้ไขข้อมูลชุมนุม',
      html:
          `<div class="text-start mt-3">` +
          `<label class="form-label small fw-medium mb-1">ชื่อใหม่</label>` +
          `<input id="swal-edit-name" class="swal2-input w-100 mx-0 mt-0 mb-3" value="${currentName}">` +
          `<label class="form-label small fw-medium mb-1">รายละเอียด</label>` +
          `<textarea id="swal-edit-desc" class="swal2-textarea w-100 mx-0 mt-0" rows="3">${currentDesc}</textarea>` +
          `</div>`,
      showCancelButton: true,
      confirmButtonText: 'ตกลง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#283593', 
      cancelButtonColor: '#6C757D',
      focusConfirm: false,
      preConfirm: () => {
          const name = document.getElementById('swal-edit-name').value;
          if (!name) { Swal.showValidationMessage('ชื่อชุมนุมห้ามว่าง'); return false; }
          return { name, desc: document.getElementById('swal-edit-desc').value };
      }
  });

  if (formValues) {
      // อัปเดตข้อมูล
      await db.from('clubs').update({ name: formValues.name, description: formValues.desc }).eq('id', id);
      Swal.fire({ title: 'อัปเดตสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
      loadClubs();
  }
};

// ลบชุมนุม
window.showDeleteClubPopup = function (id, name) {
  Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณต้องการลบ "${name}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'กลับ',
      confirmButtonColor: '#DC3545',
      cancelButtonColor: '#6C757D',
      reverseButtons: true
  }).then(async (result) => {
      if (result.isConfirmed) {
          // เรียก Database ลบข้อมูล
          await db.from('clubs').delete().eq('id', id);
          Swal.fire({ title: 'ลบสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
          loadClubs();
      }
  });
};

// รันเมื่อเปิดหน้า
checkAdminButton();
loadClubs();