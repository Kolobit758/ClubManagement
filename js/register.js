async function register() {
  const firstname = document.getElementById("firstname").value.trim();
  const lastname = document.getElementById("lastname").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm").value;
 
  if (password !== confirm) return alert("รหัสผ่านไม่ตรงกัน");
 
  const { error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { firstname, lastname }  // trigger จะดึงไป insert users_profile ให้อัตโนมัติ
    }
  });
 
  if (error) return alert(error.message);
 
  alert("สมัครสมาชิกสำเร็จ");
  location = "login.html";
}