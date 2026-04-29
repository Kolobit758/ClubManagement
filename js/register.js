async function register() {
  const firstname = document.getElementById("firstname").value.trim();
  const lastname = document.getElementById("lastname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;
  if (password !== confirm) return alert("รหัสผ่านไม่ตรงกัน");
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) return alert(error.message);
  await db.from("users_profile").insert({
    id: data.user.id,
    firstname,
    lastname,
    role: "teacher",
  });
  alert("สมัครสมาชิกสำเร็จ");
  location = "login.html";
}
