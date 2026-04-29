async function checkAuth(){
 const {data}=await db.auth.getSession();
 if(!data.session) location='login.html';
}
async function logout(){
 await db.auth.signOut();
 location='login.html';
}
checkAuth();