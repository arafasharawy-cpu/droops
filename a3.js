async function showInv(id,fresh,pre){let d=pre;
 if(!d){const s=(await sb.from('sales').select('*').eq('id',id).maybeSingle()).data;if(!s)return alert('الفاتورة غير موجودة');
  const it=(await sb.from('sale_items').select('*').eq('sale_id',id).order('id')).data||[];let who='';
  try{const p=(await sb.from('profiles').select('name').eq('id',s.created_by).maybeSingle()).data;who=p?.name||''}catch(e){}
  d={s,it,who}}
 INV=d;let el=$('#ov');if(!el){el=document.createElement('div');el.id='ov';document.body.appendChild(el)}
 el.innerHTML=`<div style="max-width:640px;margin:auto"><div class="row" style="margin-top:10px"><button class="btn g" onclick="closeInv(${fresh?1:0})">${fresh?'بيع جديد':'إغلاق'}</button></div>
 ${fresh?'<div class="card"><b>✅ تم البيع</b></div>':''}
 <div class="card"><input id="sn2" placeholder="اسم المحل" value="${esc(lsGet('sn')||'')}" oninput="pv()"><input id="sph" placeholder="تليفون المحل (اختياري)" value="${esc(lsGet('sph')||'')}" oninput="pv()">
 <div class="row"><select id="pp" onchange="pv()"><option value="th">طابعة حرارية 80مم</option><option value="a4" ${lsGet('paper')==='a4'?'selected':''}>A4</option></select>
 <div class="row"><span class="mu">عدد النسخ</span><input id="cp" type="number" inputmode="numeric" min="1" max="10" value="${esc(lsGet('copies')||1)}"></div></div>
 <button class="btn" onclick="prn()">🖨️ طباعة</button> <span class="mu">ومن شاشة الطباعة تقدر تحفظها PDF</span></div><div id="pv"></div></div>`;pv()}
function pv(){lsSet('sn',$('#sn2').value.trim());lsSet('sph',$('#sph').value.trim());lsSet('paper',$('#pp').value);$('#pv').innerHTML=invHTML(1,1,$('#pp').value)}
function prn(){pv();const c=Math.max(1,Math.min(10,parseInt($('#cp').value)||1)),pp=$('#pp').value;lsSet('copies',c);
 $('#pg').textContent=pp==='a4'?'@page{size:A4;margin:12mm}':'@page{size:80mm auto;margin:3mm}';
 let h='';for(let i=1;i<=c;i++)h+=invHTML(i,c,pp);$('#pr').innerHTML=h;window.print()}
function closeInv(fresh){const el=$('#ov');if(el)el.remove();$('#pr').innerHTML='';if(fresh)show('sell')}
async function tx(){if(!tf.d1)tf.d1=td();if(!tf.d2)tf.d2=td();
 const a=new Date(tf.d1+'T00:00:00'),b=new Date(tf.d2+'T23:59:59.999');
 let qq=sb.from('sales').select('id,kind,channel,discount,total,payment_method,created_by,created_at').gte('created_at',a.toISOString()).lte('created_at',b.toISOString()).order('id',{ascending:false}).limit(200);
 if(tf.pm)qq=qq.eq('payment_method',tf.pm);const r=await qq,s=r.data||[];
 let names={};if(O()){((await sb.from('profiles').select('id,name')).data||[]).forEach(p=>names[p.id]=p.name)}
 const by={};s.forEach(x=>by[x.payment_method||'cash']=(by[x.payment_method||'cash']||0)+ +x.total);const tot=s.reduce((a,x)=>a+ +x.total,0);
 M().innerHTML=`<div class="card"><h3>المعاملات</h3><div class="row"><input type="date" id="t1" value="${tf.d1}"><input type="date" id="t2" value="${tf.d2}"></div>
 <select id="tp"><option value="">كل طرق الدفع</option>${Object.entries(PAYS).map(([k,v])=>`<option value="${k}" ${tf.pm===k?'selected':''}>${v}</option>`).join('')}</select><button class="btn" onclick="txGo()">عرض</button></div>
 <div class="card"><b>الملخص: ${n(tot)} ج.م (${s.length} عملية)</b>${Object.entries(by).map(([k,v])=>`<div class="mu">${esc(PAYS[k]||k)}: ${n(v)} ج.م</div>`).join('')}${s.length>=200?'<div class="mu">معروض آخر 200 عملية فقط، ضيّق التاريخ.</div>':''}</div>
 ${s.map(x=>{const d=new Date(x.created_at);return `<div class="card clk" onclick="showInv(${x.id},false)"><div class="row"><b>#${x.id}${x.kind==='return'?' <span class="low">مرتجع</span>':''}</b><b>${n(x.total)} ج.م</b></div>
 <div class="mu">${d.toLocaleDateString('ar-EG')} ${d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})} — ${esc(PAYS[x.payment_method]||x.payment_method||'')} — ${esc(x.channel||'')}${names[x.created_by]?' — '+esc(names[x.created_by]):''}</div></div>`}).join('')||'<div class="card mu">مفيش معاملات في الفترة دي</div>'}`}
