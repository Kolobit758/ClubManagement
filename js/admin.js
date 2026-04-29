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
