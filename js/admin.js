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

async function createGoogleForm() {

  const { data } = await db.from("clubs").select("name");

  const clubs = data.map(c => c.name).join(",");

  const url =
    "https://script.google.com/macros/s/AKfycbzAKDucxvtJDQ_xTQXQDAjm0ApG6fjg62vV9T72aJ42BmqLtXhWXbHZlvSrojg3zAj9/exec"
    + encodeURIComponent(clubs);

  window.open(url, "_blank");
}