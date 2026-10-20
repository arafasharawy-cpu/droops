function txGo(){tf.d1=$('#t1').value||td();tf.d2=$('#t2').value||td();tf.pm=$('#tp').value;tx()}
function prod(){M().innerHTML=`<div class="card"><h3>إضافة منتج</h3><input id="a1" placeholder="اسم المنتج"><input id="a2" placeholder="الموديل المتوافق (اختياري)">
 <div class="row">${O()?'<input id="a3" type="number" placeholder="تكلفة الشراء">':''}<input id="a4" type="number" placeholder="سعر البيع"></div>
 <div class="row"><input id="a5" type="number" placeholder="الكمية"><input id="a6" type="number" placeholder="حد أدنى" value="3"></div>
 <input id="a7" placeholder="رقم الباركود (مثال 15) أو اتركه فارغاً للترقيم التلقائي"><button class="btn" onclick="addP()">حفظ</button> <button class="btn g" onclick="scanTo('a7')">مسح</button><video id="v" hidden playsinline></video></div>
 ${prods.map((p,i)=>`<div class="card sc"><b>${esc(p.name)}</b> <span class="mu">${esc(p.model)}</span><div class="mu">${O()?`تكلفة ${costs[p.id]??0} • `:''}بيع ${p.price}${O()?` • ربح ${n(p.price-(costs[p.id]||0))}`:''}</div>
 <div>الكمية: <span class="${p.qty<=p.min_qty?'low':''}">${p.qty}</span></div><svg id="b${i}"></svg>
 <div><button class="btn" onclick="img(${i})">حفظ صورة للطباعة</button> ${O()?`<button class="btn g" onclick="del(${p.id})">حذف</button>`:''}</div></div>`).join('')||'<div class="mu">لسه مفيش منتجات</div>'}`;
 prods.forEach((p,i)=>{try{JsBarcode('#b'+i,p.code,{format:'CODE128',height:45,fontSize:13,margin:4,background:'#fff'})}catch(e){}})}
async function addP(){const g=i=>($('#a'+i)||{value:''}).value.trim();if(!g(1))return alert('اكتب اسم المنتج');
 const r=await sb.rpc('add_product',{p_code:g(7),p_name:g(1),p_model:g(2),p_price:+g(4)||0,p_qty:+g(5)||0,p_min:+g(6)||0,p_cost:+g(3)||0});
 if(r.error)return alert(r.error.message.includes('duplicate')?'الباركود ده موجود بالفعل':r.error.message);show('prod')}
async function del(id){if(!confirm('حذف المنتج؟'))return;const r=await sb.rpc('delete_product',{p_id:id});if(r.error)return alert(r.error.message);show('prod')}
function img(i){const p=prods[i],c=document.createElement('canvas');JsBarcode(c,p.code,{format:'CODE128',height:70,fontSize:18,margin:10,background:'#fff'});
 const w=Math.max(c.width,320),o=document.createElement('canvas');o.width=w;o.height=c.height+90;const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,o.height);x.fillStyle='#000';x.textAlign='center';
 x.font='bold 20px Tahoma,sans-serif';x.fillText(p.name,w/2,28);x.drawImage(c,(w-c.width)/2,38);x.font='bold 26px Tahoma,sans-serif';x.fillText(p.price+' ج.م',w/2,c.height+75);
 o.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='label-'+p.code+'.png';a.click()})}
async function stock(){const mv=(await sb.from('stock_moves').select('qty,type,created_at,products(name)').order('id',{ascending:false}).limit(20)).data||[];
 M().innerHTML=`${O()?`<div class="card"><h3>استلام بضاعة / تسوية</h3><div class="row"><input id="sc" placeholder="الباركود"><button class="btn g" onclick="scanTo('sc')">مسح</button></div><video id="v" hidden playsinline></video>
 <input id="sq" type="number" placeholder="الكمية (سالب للخصم)"><input id="sn" type="number" placeholder="تكلفة جديدة (اختياري)"><button class="btn" onclick="recv()">تسجيل</button></div>
 <div class="card"><h3>مرتجع</h3><div class="row"><input id="rc" placeholder="الباركود"><button class="btn g" onclick="scanTo('rc')">مسح</button></div><input id="rq" type="number" placeholder="الكمية المرتجعة"><button class="btn" onclick="ret()">تسجيل المرتجع</button></div>`
 :'<div class="card mu">الاستلام والمرتجع والتسويات من صلاحيات الأونر.</div>'}
 <div class="card"><b>حركة المخزون</b>${mv.map(m=>`<div class="mu">${new Date(m.created_at).toLocaleDateString('ar-EG')} • ${esc(m.products?.name)} • ${m.qty>0?'+':''}${m.qty} • ${esc(m.type)}</div>`).join('')||'<div class="mu">لا يوجد</div>'}</div>`}
