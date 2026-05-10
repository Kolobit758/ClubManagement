async function startImportStudents() {

  const file =
    document.getElementById('studentCsv').files[0];

  if (!file) {
    return alert('กรุณาเลือกไฟล์ CSV');
  }

  Papa.parse(file, {

    skipEmptyLines: true,

    complete: async function(res) {

      const allRows = res.data;

      // ----------------------------------------
      // หา header row
      // ----------------------------------------
      const headerIdx = allRows.findIndex(row =>
        row.some(cell => {

          const text = String(cell || '')
            .trim()
            .toLowerCase();

          return (
            text === 'เลขประจำตัว' ||
            text === 'student_code'
          );
        })
      );

      if (headerIdx === -1) {
        return alert(
          'ไม่พบ header row ในไฟล์'
        );
      }

      // ----------------------------------------
      // headers
      // ----------------------------------------
      const headers = allRows[headerIdx].map(h =>
        String(h || '')
          .trim()
          .toLowerCase()
      );

      // ----------------------------------------
      // helper
      // ----------------------------------------
      const getCell = (row, idx) =>
        String(row[idx] || '').trim();

      // ----------------------------------------
      // หา index
      // ----------------------------------------
      const studentCodeIdx = headers.findIndex(h =>
        h === 'เลขประจำตัว' ||
        h === 'student_code'
      );

      const firstNameIdx = headers.findIndex(h =>
        h === 'ชื่อ' ||
        h === 'firstname'
      );

      const lastNameIdx = headers.findIndex(h =>
        h === 'นามสกุล' ||
        h === 'lastname'
      );

      const gradeIdx = headers.findIndex(h =>
        h === 'ชั้น' ||
        h === 'grade_level'
      );

      const roomIdx = headers.findIndex(h =>
        h === 'ห้อง' ||
        h === 'room'
      );

      // ----------------------------------------
      // fallback ม. / ห้อง
      // เช่น "ม.1/2"
      // ----------------------------------------
      let fallbackGrade = null;
      let fallbackRoom = null;

      const topText = allRows
        .slice(0, headerIdx)
        .flat()
        .join(' ');

      const topMatch =
        topText.match(/(\d+)\s*\/\s*(\d+)/);

      if (topMatch) {

        fallbackGrade =
          Number(topMatch[1]);

        fallbackRoom =
          Number(topMatch[2]);
      }

      // ----------------------------------------
      // data rows
      // ----------------------------------------
      const dataRows =
        allRows.slice(headerIdx + 1);

      const rows = dataRows
        .map(r => {

          const student_code =
            getCell(r, studentCodeIdx);

          const firstname =
            getCell(r, firstNameIdx);

          const lastname =
            getCell(r, lastNameIdx);

          let gradeText =
            getCell(r, gradeIdx);

          let roomText =
            getCell(r, roomIdx);

          // ----------------------------------------
          // แปลงเป็นเลข
          // ----------------------------------------
          let grade_level =
            Number(
              gradeText.match(/\d+/)?.[0]
            );

          let room =
            Number(
              roomText.match(/\d+/)?.[0]
            );

          // ----------------------------------------
          // fallback
          // ----------------------------------------
          if (!grade_level) {
            grade_level = fallbackGrade;
          }

          if (!room) {
            room = fallbackRoom;
          }

          // ----------------------------------------
          // ข้าม row ว่าง
          // ----------------------------------------
          if (!student_code) {
            return null;
          }

          // ----------------------------------------
          // เช็ค grade / room
          // ----------------------------------------
          if (!grade_level || !room) {

            console.log(
              'หา grade/room ไม่เจอ',
              r
            );

            return null;
          }

          return {
            student_code,
            firstname,
            lastname,
            grade_level,
            room
          };
        })

        .filter(Boolean);

      // ----------------------------------------
      // ไม่มีข้อมูล
      // ----------------------------------------
      if (rows.length === 0) {

        return alert(
          'ไม่พบข้อมูลนักเรียน'
        );
      }

      // ----------------------------------------
      // เช็ครหัสซ้ำ
      // ----------------------------------------
      const duplicateMap = {};
      const duplicates = [];

      rows.forEach(row => {

        if (
          duplicateMap[row.student_code]
        ) {
          duplicates.push(
            row.student_code
          );
        }

        duplicateMap[
          row.student_code
        ] = true;
      });

      if (duplicates.length > 0) {

        console.log(
          'รหัสซ้ำ',
          duplicates
        );

        return alert(
          'พบรหัสนักเรียนซ้ำในไฟล์:\n\n' +
          duplicates.join(', ')
        );
      }

      console.log(rows);

      // ----------------------------------------
      // upsert
      // ----------------------------------------
      const { error } = await db
        .from('students')
        .upsert(rows, {
          onConflict: 'student_code'
        });

      if (error) {

        console.error(error);

        return alert(
          'เกิดข้อผิดพลาด: ' +
          error.message
        );
      }

      alert(
        `นำเข้าข้อมูลสำเร็จ ${rows.length} คน`
      );

      loadStats();
    }
  });
}