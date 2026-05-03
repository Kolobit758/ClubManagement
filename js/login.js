async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // เช็คว่ากรอกข้อมูลครบไหม
    if (!email || !password) {
        return Swal.fire({
            icon: 'warning',
            title: 'แจ้งเตือน',
            text: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน',
            confirmButtonColor: '#1E40AF'
        });
    }

//   เชื่อม db supa
    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        let msg = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        if (error.message.includes('Invalid login credentials')) {
            msg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'; // แปลงข้อความเป็นภาษาไทยให้
        }
        
        return Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบล้มเหลว',
            text: msg,
            confirmButtonColor: '#DC2626'
        });
    }

  
    Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'เข้าสู่ระบบเรียบร้อย',
        timer: 1500,
        showConfirmButton: false
    }).then(() => {
        location = 'index.html';
    });
}