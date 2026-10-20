function sell(){const tot=cart.reduce((a,c)=>a+c.price*c.q,0);
 M().innerHTML=`<div class="card"><select id="ch" onchange="ch=this.value">${['محل','فيسبوك','واتساب','متجر إلكتروني'].map(c=>`<option ${c==ch?'selected':''}>${c}</option>`).join('')}</select>
 <video id="v" hidden playsinline></video><div class="row"><input id="code" placeholder="الباركود"><button class="btn" onclick="addC($('#code').value)">إضافة</button></div>
 <button class="btn g" onclick="scanTo(null)">فتح الكاميرا للمسح</button></div>
 <div class="card"><b>السلة</b>${cart.map((c,i)=>`<div class="row"><span>${esc(c.name)}</span><span>${c.price} × <button class="btn g" onclick="q(${i},-1)">−</button> ${c.q} <button class="btn g" onclick="q(${i},1)">+</button></span></div>`).join('')||'<div class="mu">فاضية</div>'}
 <h3>الإجمالي: ${n(tot)} ج.م</h3>${O()?`<input id="disc" type="number" placeholder="خصم (اختياري)" value="${esc(dv)}" oninput="dv=this.value">`:''}
 <div class="mu">طريقة الدفع</div><div class="row pay">${Object.entries(PAYS).map(([k,v])=>`<button class="btn ${k==pay?'':'g'}" onclick="pay='${k}';sell()">${v}</button>`).join('')}</div>
 <button class="btn" onclick="done()">إتمام البيع</button></div>`}
function addC(c){const p=find(c);if(!p)return alert('المنتج غير موجود');const x=cart.find(i=>i.code===p.code);if((x?x.q:0)+1>p.qty)return alert('الكمية المتاحة لا تكفي');x?x.q++:cart.push({...p,q:1});sell()}
function q(i,d){const c=cart[i],p=find(c.code);c.q=Math.min(c.q+d,p.qty);if(c.q<=0)cart.splice(i,1);sell()}
async function done(){if(!cart.length||busy)return;busy=true;const disc=O()?+(dv||0):0;
 const r=await sb.rpc('make_sale',{p_channel:ch,p_discount:disc,p_items:cart.map(c=>({code:c.code,qty:c.q})),p_payment:pay});busy=false;
 if(r.error)return alert(r.error.message);
 const items=cart.map(c=>({name:c.name,qty:c.q,price:+c.price})),sub=items.reduce((a,x)=>a+x.price*x.qty,0);
 const pre={s:{id:r.data,kind:null,channel:ch,discount:disc,total:Math.max(sub-disc,0),payment_method:pay,created_at:new Date().toISOString(),created_by:me.id},it:items,who:me.name};
 cart=[];dv='';await showInv(r.data,true,pre)}
function invHTML(i,c,pp){const{s,it,who}=INV,ret=s.kind==='return',sub=it.reduce((a,x)=>a+x.price*x.qty,0),d=new Date(s.created_at);
 const sn=lsGet('sn')||'اسم المحل',ph=lsGet('sph')||'';
 return `<div class="inv ${pp==='a4'?'a4':'th'}"><div class="c"><div class="big">${esc(sn)}</div>${ph?`<div>${esc(ph)}</div>`:''}<div>${ret?'إيصال مرتجع':'فاتورة بيع'} رقم #${s.id}</div>${c>1?`<div class="sm">نسخة ${i} من ${c}</div>`:''}</div>
 <div class="sm">${d.toLocaleDateString('ar-EG')} ${d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}${who?` — ${esc(who)}`:''}</div>
 <table><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>${it.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.qty}</td><td>${n(x.price)}</td><td>${n(x.price*x.qty)}</td></tr>`).join('')}</tbody></table>
 <div class="tt">${ret?'':`<div>المجموع: ${n(sub)}</div>`}${+s.discount>0?`<div>الخصم: ${n(s.discount)}</div>`:''}<div class="big">الإجمالي: ${n(Math.abs(s.total))} ج.م${ret?' (مرتجع)':''}</div>
 <div>طريقة الدفع: ${esc(PAYS[s.payment_method]||s.payment_method||'')}</div>${ret?'':`<div class="sm">القناة: ${esc(s.channel||'')}</div>`}</div>
 <div class="c sm" style="margin-top:6px">شكراً لتعاملكم معنا</div></div>`}
