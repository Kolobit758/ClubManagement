async function startImportStudents() {
  const file = document.getElementById('studentCsv').files[0];
  if (!file) return alert('กรุณาเลือกไฟล์ CSV');

  Papa.parse(file, {
    skipEmptyLines: true,
    complete: async function(res) {
      const allRows = res.data;

      // --- ดึง grade_level และ room จาก row แรก ---
      // "รายชื่อนักเรียนชั้นมัธยมศึกษาปีที่ 1/1 ปีการศึกษา 2569"
      const titleRow = (allRows[1] || []).join(' ');
      const match = titleRow.match(/ปีที่\s*(\d+)\/(\d+)/);
      if (!match) return alert('ไม่พบข้อมูลชั้น/ห้องในไฟล์ กรุณาตรวจสอบรูปแบบ CSV');
      const grade_level = Number(match[1]);
      const room = Number(match[2]);

      // --- หา index ของ header row (row ที่มี "เลขประจำตัว") ---
      const headerIdx = allRows.findIndex(row =>
        row.some(cell => cell.includes('เลขประจำตัว'))
      );
      if (headerIdx === -1) return alert('ไม่พบ header row ในไฟล์');

      // --- แปลง data rows (ข้ามหัวตาราง) ---
      const dataRows = allRows.slice(headerIdx + 1);

      const rows = dataRows
        .map(r => {
          // คอลัมน์: [ที่, เลขประจำตัว, ชื่อ, สกุล, หมายเหตุ]
          const student_code = (r[1] || '').trim();
          const firstname    = (r[2] || '').trim();
          const lastname     = (r[3] || '').trim();
          if (!student_code) return null;
          return { student_code, firstname, lastname, grade_level, room };
        })
        .filter(Boolean);

      if (rows.length === 0) return alert('ไม่พบข้อมูลนักเรียนในไฟล์');

      const { error } = await db
        .from('students')
        .upsert(rows, { onConflict: 'student_code' });

      if (error) return alert('เกิดข้อผิดพลาด: ' + error.message);
      alert(`นำเข้าข้อมูลนักเรียนสำเร็จ ${rows.length} รายการ (ม.${grade_level}/${room})`);
      loadStats();
    }
  });
}