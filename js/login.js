async function login(){
 const email=document.getElementById('email').value;
 const password=document.getElementById('password').value;
 const {error}=await db.auth.signInWithPassword({email,password});
 if(error) return alert(error.message);
 location='index.html';
}