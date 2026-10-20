const sb=supabase.createClient(window.SB_URL,window.SB_KEY);
const PAYS={cash:'كاش',card:'فيزا',instapay:'انستاباي',wallet:'محفظة'};
let me=null,prods=[],costs={},cart=[],ch='محل',stream=null,scanning=false,busy=false,pay='cash',dv='',INV=null,stk=null,cnt={},sp=Promise.resolve(),tf={d1:'',d2:'',pm:''};
const $=s=>document.querySelector(s),n=x=>Math.round(x*100)/100,M=()=>$('#m'),O=()=>me&&me.role==='owner',find=c=>prods.find(p=>p.code===String(c).trim());
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lsGet=k=>{try{return localStorage.getItem('inv_'+k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem('inv_'+k,v)}catch(e){}};
const td=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.t));
async function init(){const{data:{session}}=await sb.auth.getSession();session?boot():login()}
async function boot(){const{data:{user}}=await sb.auth.getUser();const{data}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
 if(!data){await sb.auth.signOut();return login('الحساب غير مجهز، كلم الأونر')}me=data;
 document.querySelectorAll('nav [data-o]').forEach(b=>b.style.display=O()?'':'none');show('home')}
function login(err){stop();$('nav').style.display='none';M().innerHTML=`<div class="card"><h3>تسجيل الدخول</h3>${err?`<div class="low">${esc(err)}</div>`:''}
 <input id="em" type="email" placeholder="البريد الإلكتروني" autocomplete="username"><input id="pw" type="password" placeholder="الباسورد" autocomplete="current-password"><button class="btn" onclick="go()">دخول</button></div>`}
async function go(){const{error}=await sb.auth.signInWithPassword({email:$('#em').value.trim(),password:$('#pw').value});if(error)return login('البريد أو الباسورد غلط');boot()}
async function logout(){await sb.auth.signOut();me=null;cart=[];login()}
async function loadP(){const a=await sb.from('products').select('*').order('id');prods=a.data||[];costs={};
 if(O()){const c=await sb.from('product_costs').select('*');(c.data||[]).forEach(x=>costs[x.product_id]=+x.cost)}}
async function show(t){stop();$('nav').style.display='flex';document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 await loadP();({home,sell,prod,stock,tx,count})[t]()}
async function home(){const d=new Date();d.setHours(0,0,0,0);
 const r=await sb.from('sales').select(O()?'total,created_by,sale_costs(cost)':'total,created_by').gte('created_at',d.toISOString()),s=r.data||[];
 const cost=x=>{const c=x.sale_costs;return Array.isArray(c)?(c[0]?.cost||0):(c?.cost||0)};
 const tot=s.reduce((a,x)=>a+ +x.total,0),pf=s.reduce((a,x)=>a+ +x.total-cost(x),0),low=prods.filter(p=>p.qty<=p.min_qty);
 let by='';if(O()){const pr=(await sb.from('profiles').select('id,name')).data||[],g={};s.forEach(x=>g[x.created_by]=(g[x.created_by]||0)+ +x.total);
  by=`<div class="card"><b>مبيعات اليوم لكل موظف</b>${pr.map(p=>`<div class="mu">${esc(p.name)}: ${n(g[p.id]||0)} ج.م</div>`).join('')}</div>`}
 M().innerHTML=`<div class="mu">أهلاً ${esc(me.name)} (${O()?'أونر':'موظف'})</div><div class="kpi"><div class="card">مبيعات اليوم<b>${n(tot)} ج.م</b></div>
 ${O()?`<div class="card">ربح اليوم<b>${n(pf)} ج.م</b></div><div class="card">قيمة المخزون (تكلفة)<b>${n(prods.reduce((a,p)=>a+p.qty*(costs[p.id]||0),0))}</b></div>`:''}
 <div class="card">قطع في المخزن<b>${prods.reduce((a,p)=>a+p.qty,0)}</b></div></div>${by}
 <div class="card"><b>أصناف ناقصة (${low.length})</b>${low.map(p=>`<div class="low">${esc(p.name)} — ${p.qty}</div>`).join('')||'<div class="mu">لا يوجد</div>'}</div>
 ${O()?'<div class="card mu">لإضافة موظف: Supabase ← Authentication ← Users ← Add user (ويفضل إيقاف التسجيل العام).</div>':''}
 <button class="btn g" onclick="logout()">خروج</button>`}
