async function recv(){const qq=+$('#sq').value;if(!$('#sc').value||!qq&&!+$('#sn').value)return alert('راجع الباركود والكمية');
 const r=await sb.rpc('receive_stock',{p_code:$('#sc').value.trim(),p_qty:qq,p_cost:+$('#sn').value||null});if(r.error)return alert(r.error.message);show('stock')}
async function ret(){const r=await sb.rpc('return_product',{p_code:$('#rc').value.trim(),p_qty:+$('#rq').value});if(r.error)return alert(r.error.message);alert('تم المرتجع ✅');show('stock')}
async function count(){
 if(!O()){M().innerHTML='<div class="card mu">الجرد من صلاحيات الأونر.</div>';return}
 const r=await sb.from('stocktakes').select('*').eq('status','open').order('id',{ascending:false}).limit(1);
 stk=(r.data||[])[0]||null;cnt={};
 if(!stk){M().innerHTML=`<div class="card"><h3>الجرد</h3><div class="mu">مفيش جرد مفتوح. ابدأ جرد جديد وعدّ كل صنف على الرف. الأرقام بتتحفظ تلقائياً وتظهر على أي جهاز.</div><button class="btn" onclick="stkNew()">بدء جرد جديد</button></div>`;return}
 const it=(await sb.from('stocktake_items').select('product_id,counted_qty').eq('stocktake_id',stk.id)).data||[];
 it.forEach(x=>cnt[x.product_id]=x.counted_qty);
 M().innerHTML=`<div class="card"><h3>جرد مفتوح #${stk.id}</h3><div class="mu">اكتب الكمية الفعلية لكل صنف. الأصناف اللي مش هتعدّها كميتها مش هتتغيّر.</div>
 <div class="row"><input id="cs" placeholder="بحث بالاسم أو الباركود"><button class="btn g" onclick="scanTo('cs')">مسح</button></div><video id="v" hidden playsinline></video></div>
 <div id="cmp"></div>
 <div class="card">${prods.map(p=>`<div class="row crow" data-s="${esc((p.name+' '+p.code+' '+(p.model||'')).toLowerCase())}"><span>${esc(p.name)}<div class="mu">${esc(p.code)}</div></span><input type="number" inputmode="numeric" min="0" value="${cnt[p.id]??''}" oninput="cin(${p.id},this.value)" onchange="csave(${p.id})"></div>`).join('')||'<div class="mu">مفيش منتجات</div>'}</div>
 <div class="card"><button class="btn" onclick="stkApply()">تأكيد الجرد وتعديل المخزون</button> <button class="btn g" onclick="stkCancel()">إلغاء الجرد</button></div>`;
 $('#cs').oninput=cfilter;cmp()}
function cfilter(){const v=$('#cs').value.trim().toLowerCase();document.querySelectorAll('.crow').forEach(r=>r.style.display=!v||r.dataset.s.includes(v)?'':'none')}
function cin(id,v){if(v==='')delete cnt[id];else cnt[id]=Math.max(0,parseInt(v)||0);cmp()}
function cmp(){const el=$('#cmp');if(!el)return;const rows=prods.filter(p=>cnt[p.id]!==undefined),df=rows.filter(p=>cnt[p.id]!==p.qty);
 el.innerHTML=`<div class="card"><b>تم جرد ${rows.length} من ${prods.length} صنف</b><div class="mu">مطابق: ${rows.length-df.length} • فروقات: ${df.length}</div>${df.map(p=>{const d=cnt[p.id]-p.qty;return `<div class="${d<0?'low':''}">${esc(p.name)} — النظام ${p.qty} • الفعلي ${cnt[p.id]} • (${d>0?'+':''}${d})</div>`}).join('')}</div>`}
function csave(id){const v=cnt[id],p=prods.find(x=>x.id===id),sid=stk.id;
 sp=sp.then(async()=>{let r;
  if(v===undefined)r=await sb.from('stocktake_items').delete().eq('stocktake_id',sid).eq('product_id',id);
  else{const f=await sb.from('products').select('qty').eq('id',id).maybeSingle();if(f.data)p.qty=f.data.qty;
   r=await sb.from('stocktake_items').upsert({stocktake_id:sid,product_id:id,system_qty:p.qty,counted_qty:v},{onConflict:'stocktake_id,product_id'})}
  if(r.error)alert(r.error.message);cmp()})}
async function stkNew(){const r=await sb.from('stocktakes').insert({status:'open'}).select().single();if(r.error)return alert(r.error.message);count()}
