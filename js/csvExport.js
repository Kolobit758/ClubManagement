// ===================================================
//  csvExport.js  —  ใช้ร่วมกันได้ทั้ง club.js และ admin.js
// ===================================================

/**
 * แปลง Array of Objects → CSV string (UTF-8 BOM รองรับภาษาไทยใน Excel)
 * @param {Object[]} data
 * @param {string[]} columns  - กำหนดลำดับ/เฉพาะ column ที่ต้องการ
 * @param {Object}  headers   - map key → ชื่อหัวตาราง เช่น { firstname: "ชื่อ" }
 */
function buildCSV(data, columns, headers) {
  if (!data || data.length === 0) return null;

  const cols = columns || Object.keys(data[0]);
  const headerRow = cols.map((c) => headers?.[c] ?? c).join(",");

  const rows = data.map((row) =>
    cols
      .map((col) => {
        const val = row[col] ?? "";
        // ครอบ "" ทุก cell ป้องกัน comma / newline พัง
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const BOM = "\uFEFF";
  return BOM + [headerRow, ...rows].join("\r\n");
}

/**
 * Trigger download ไฟล์ CSV
 * @param {string} csvContent
 * @param {string} filename
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * สร้างชื่อไฟล์พร้อมวันที่ เช่น  members_2568-05-09.csv
 */
function csvFilename(prefix) {
  const d = new Date();
  const y = d.getFullYear() + 543; // พ.ศ.
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${prefix}_${y}-${m}-${day}.csv`;
}