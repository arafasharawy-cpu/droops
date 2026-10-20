async function stkApply(){if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();await sp;
 if(!Object.keys(cnt).length)return alert('لسه ما جردتش أي صنف');
 const df=prods.filter(p=>cnt[p.id]!==undefined&&cnt[p.id]!==p.qty).length;
 if(!confirm(`هيتم تعديل ${df} صنف حسب الجرد. العملية لا يمكن التراجع عنها. تأكيد؟`))return;
 const r=await sb.rpc('apply_stocktake',{p_id:stk.id});if(r.error)return alert(r.error.message);alert(`تم الجرد ✅ اتعدّل ${r.data} صنف`);show('count')}
async function stkCancel(){if(!confirm('إلغاء الجرد المفتوح؟ الأرقام اللي اتسجلت هتتجاهل.'))return;
 const r=await sb.from('stocktakes').update({status:'cancelled'}).eq('id',stk.id);if(r.error)return alert(r.error.message);show('count')}
async function scanTo(id){const v=$('#v');if(!('BarcodeDetector' in window))return alert('المتصفح لا يدعم مسح الباركود بالكاميرا. افتح الصفحة في Chrome أو اكتب الكود يدويًا.');
 try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})}catch(e){return alert('لازم تسمح بالكاميرا')}
 v.srcObject=stream;v.hidden=false;await v.play();scanning=true;const d=new BarcodeDetector();
 (async function loop(){if(!scanning)return;try{const r=await d.detect(v);if(r.length){const c=r[0].rawValue;stop();if(id){const e=$('#'+id);e.value=c;e.dispatchEvent(new Event('input'))}else addC(c);return}}catch(e){}setTimeout(loop,300)})()}
function stop(){scanning=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
init();
