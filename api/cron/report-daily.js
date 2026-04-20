// api/cron/report-daily.js — Reporte diario de citas a las 8pm QRO (02:00 UTC)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if(!getApps().length){
  initializeApp({credential:cert({
    projectId:process.env.FCM_PROJECT_ID,
    clientEmail:process.env.FCM_CLIENT_EMAIL,
    privateKey:process.env.FCM_PRIVATE_KEY?.replace(/\\n/g,'\n'),
  })});
}
const db=getFirestore();

export default async function handler(req,res){
  if(req.method!=='POST'&&req.method!=='GET') return res.status(405).json({error:'Method not allowed'});

  const RESEND_API_KEY=process.env.RESEND_API_KEY;
  if(!RESEND_API_KEY) return res.status(500).json({error:'RESEND_API_KEY no configurado'});

  const MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
               'septiembre','octubre','noviembre','diciembre'];
  const DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

  function fechaLabel(f){
    const [y,m,d]=f.split('-').map(Number);
    const fd=new Date(y,m-1,d);
    return DIAS[fd.getDay()]+' '+d+' de '+MESES[m-1]+' de '+y;
  }

  try{
    // Citas de los próximos 7 días desde hoy
    const hoy=new Date();
    hoy.setHours(hoy.getHours()-6); // Ajuste QRO UTC-6
    const hoyStr=hoy.toISOString().slice(0,10);
    const en7=new Date(hoy.getTime()+7*24*60*60*1000);
    const en7Str=en7.toISOString().slice(0,10);

    const snap=await db.collection('citas')
      .where('fecha','>=',hoyStr)
      .where('fecha','<=',en7Str)
      .where('estado','==','confirmada')
      .orderBy('fecha')
      .get();

    // Agrupar por fecha
    const grupos={};
    snap.forEach(doc=>{
      const c=doc.data();
      if(!grupos[c.fecha]) grupos[c.fecha]=[];
      grupos[c.fecha].push(c);
    });

    const totalCitas=snap.size;

    // Construir tabla HTML segmentada por día
    let tablaHtml='';
    if(!totalCitas){
      tablaHtml='<p style="color:#666;font-size:14px;text-align:center;padding:20px">No hay citas confirmadas para los próximos 7 días.</p>';
    } else {
      Object.keys(grupos).sort().forEach(fecha=>{
        const label=fechaLabel(fecha);
        const citas=grupos[fecha].sort((a,b)=>a.hora.localeCompare(b.hora));
        tablaHtml+=`
          <div style="margin-bottom:20px">
            <div style="background:#FF5C1A;color:#fff;padding:8px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">
              ${label} · ${citas.length} cita${citas.length!==1?'s':''}
            </div>
            <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:0 0 8px 8px;overflow:hidden;border:1px solid #e0e0e0;border-top:none">
              <tr style="background:#f5f5f5">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600">Hora</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600">Miembro</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#666;font-weight:600">Duración</th>
              </tr>
              ${citas.map((c,i)=>`
                <tr style="background:${i%2===0?'#fff':'#fafafa'};border-top:1px solid #e8e8e8">
                  <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#1D9E75;font-family:monospace">${c.hora}</td>
                  <td style="padding:10px 12px;font-size:14px;color:#333">${c.nombre||'—'}</td>
                  <td style="padding:10px 12px;font-size:13px;color:#888">${c.duracion||15} min</td>
                </tr>`).join('')}
            </table>
          </div>`;
      });
    }

    const html=`<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center;border-bottom:1px solid #e0e0e0">
        <h1 style="color:#1a1a1a;margin:0;font-size:22px">be<span style="color:#FF5C1A;font-weight:900">PWR</span></h1>
        <p style="color:#666;margin:4px 0 0;font-size:13px">Reporte de citas · próximos 7 días</p>
      </div>
      <div style="background:#f9f9f9;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none">
        <p style="font-size:15px;color:#333">Hola <strong>Staff</strong>,</p>
        <p style="font-size:14px;color:#666;margin-bottom:20px">Resumen de valoraciones agendadas desde hoy <strong>${fechaLabel(hoyStr)}</strong>. Total: <strong>${totalCitas} cita${totalCitas!==1?'s':''}</strong>.</p>
        ${tablaHtml}
        <p style="font-size:12px;color:#999;margin-top:24px;text-align:center">bePWR Functional Training · Querétaro, México</p>
      </div>
    </div>`;

    const r=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        from:'bePWR <citas@bepwr.vip>',
        to:['blanuza@bepwr.com'],
        cc:['lganem@terrasola.mx'],
        subject:`📅 Reporte bePWR · ${totalCitas} cita${totalCitas!==1?'s':''} próximos 7 días · ${fechaLabel(hoyStr)}`,
        html
      })
    });
    const result=await r.json();
    if(!r.ok) throw new Error(result.message||'Error Resend');

    // Incrementar contador (1 email al staff)
    try{
      const mes=new Date().toISOString().slice(0,7);
      const ref=db.collection('config').doc('resendUsage');
      await db.runTransaction(async t=>{
        const d=await t.get(ref);
        const prev=d.exists&&d.data().mes===mes?d.data().count||0:0;
        t.set(ref,{mes,count:prev+1,updatedAt:new Date().toISOString()},{merge:true});
      });
    }catch(e){console.warn('incResend:',e.message);}

    return res.status(200).json({ok:true,totalCitas,dias:Object.keys(grupos).length,id:result.id});
  }catch(e){
    console.error('report-daily:',e.message);
    return res.status(500).json({error:e.message});
  }
}