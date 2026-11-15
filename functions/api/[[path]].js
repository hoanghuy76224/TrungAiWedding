
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{...headers,...extra}});
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b)).map(v=>v.toString(16).padStart(2,'0')).join('');
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
async function equal(a,b){const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);return hex(x)===hex(y);}
async function isAdmin(req,env){const token=(req.headers.get('Cookie')||'').match(/(?:^|; )ta_admin=([^;]+)/)?.[1]||'';const [exp,sig]=token.split('.');return /^\d+$/.test(exp||'')&&Number(exp)>Date.now()&&Number(exp)<Date.now()+21601000&&await equal(sig||'',await sign(exp,env.ADMIN_PASSWORD));}
async function init(db){await db.batch([db.prepare("CREATE TABLE IF NOT EXISTS rsvp (id TEXT PRIMARY KEY, guestName TEXT NOT NULL, invitedAs TEXT, attend TEXT NOT NULL, side TEXT NOT NULL, numGuest INTEGER NOT NULL, wish TEXT, createdAt TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0)"),db.prepare("CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)")]);}
async function rate(db,key,max){const now=Date.now(),bucket=Math.floor(now/3600000);const k=key+':'+bucket;await db.prepare('INSERT INTO limits(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(k,now+3600000).run();const r=await db.prepare('SELECT count FROM limits WHERE key=?').bind(k).first();await db.prepare('DELETE FROM limits WHERE expires<?').bind(now).run();return r.count<=max;}
async function body(req){if(Number(req.headers.get('content-length')||0)>8192)throw new Error('Dữ liệu quá dài.');const t=await req.text();if(t.length>8192)throw new Error('Dữ liệu quá dài.');return JSON.parse(t);}
export async function onRequest({request:req,env,params}){
try{
const path=Array.isArray(params.path)?params.path.join('/'):params.path;
if(path==='config'&&req.method==='GET'){const r=await env.ASSETS.fetch(new URL('/music.mp3',req.url),{method:'HEAD'});return json({music:r.ok&&r.headers.get('content-type')?.startsWith('audio/')?'/music.mp3':null});}
if(!env.DB)return json({error:'Thiệp chưa được kết nối dữ liệu. Vui lòng thử lại sau.'},503);
await init(env.DB);
if(!['GET','HEAD'].includes(req.method)){const origin=req.headers.get('Origin');if(origin!==new URL(req.url).origin)return json({error:'Yêu cầu không hợp lệ.'},403);}
const ipHash=await sign(req.headers.get('CF-Connecting-IP')||'unknown',env.ADMIN_PASSWORD||'trungaiwedding-rsvp-rate-v1');
if(path==='login'&&req.method==='POST'){
if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<16)return json({error:'Chưa đặt mật khẩu quản trị trên máy chủ.'},503);
if(!await rate(env.DB,'login:'+ipHash,12))return json({error:'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'},429);
const d=await body(req);if(!await equal(String(d.password||''),env.ADMIN_PASSWORD))return json({error:'Mật khẩu chưa đúng.'},401);
const exp=String(Date.now()+21600000),token=exp+'.'+await sign(exp,env.ADMIN_PASSWORD);
return json({ok:true},200,{'Set-Cookie':'ta_admin='+token+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=21600'});
}
if(path==='logout'&&req.method==='POST')return json({ok:true},200,{'Set-Cookie':'ta_admin=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
if(path==='rsvp'&&req.method==='POST'){
if(!await rate(env.DB,'rsvp:'+ipHash,20))return json({error:'Bạn đã gửi nhiều lần. Vui lòng thử lại sau.'},429);
const d=await body(req),name=String(d.guestName||'').trim(),wish=String(d.wish||'').trim(),count=Number(d.numGuest);
if(!name||name.length>80||wish.length>600||!['Nhà trai','Nhà gái'].includes(d.side)||!['Có tham dự','Không tham dự'].includes(d.attend)||!Number.isInteger(count)||(d.attend==='Có tham dự'?(count<1||count>10):count!==0))return json({error:'Thông tin xác nhận chưa hợp lệ.'},400);
const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO rsvp(id,guestName,invitedAs,attend,side,numGuest,wish,createdAt) VALUES (?,?,?,?,?,?,?,?)').bind(id,name,String(d.invitedAs||'').slice(0,80),d.attend,d.side,count,wish,new Date().toISOString()).run();return json({ok:true,id},201);
}
if(path==='wishes'&&req.method==='GET'){const r=await env.DB.prepare("SELECT guestName AS name,wish FROM rsvp WHERE hidden=0 AND length(trim(wish))>0 ORDER BY createdAt DESC LIMIT 100").all();return json(r.results);}
if(path==='admin'){
if(!env.ADMIN_PASSWORD||env.ADMIN_PASSWORD.length<16)return json({error:'Chưa đặt mật khẩu quản trị trên máy chủ.'},503);
if(!await isAdmin(req,env))return json({error:'Vui lòng đăng nhập quản trị.'},401);
if(req.method==='GET'){const r=await env.DB.prepare('SELECT id,guestName,invitedAs,attend,side,numGuest,wish,createdAt FROM rsvp WHERE hidden=0 ORDER BY createdAt DESC LIMIT 10000').all();return json(r.results);}
if(req.method==='DELETE'){const d=await body(req);if(!/^[a-f0-9-]{36}$/.test(d.id||''))return json({error:'Mã không hợp lệ.'},400);await env.DB.prepare('UPDATE rsvp SET hidden=1 WHERE id=?').bind(d.id).run();return json({ok:true});}
}
return json({error:'Không tìm thấy.'},404);
}catch(e){return json({error:e instanceof SyntaxError?'Dữ liệu không hợp lệ.':'Chưa xử lý được yêu cầu. Vui lòng thử lại.'},e instanceof SyntaxError?400:500);}
}
