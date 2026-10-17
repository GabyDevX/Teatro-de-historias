/* ============================================================================
   Motor de sonido: todo se sintetiza en el navegador (sin archivos de audio).
   Cadena: voces -> (seco + reverberación de sala) -> compresor -> limitador -> salida.
   Técnicas: síntesis aditiva y por formantes (coro, voces), Karplus-Strong (arpa),
   ruido rosa/marrón filtrado (lluvia, viento, mar, truenos), modelos de golpe
   con resonancias (martillo, tambores, armadura) y reverberación por convolución.
   audioInit(ctx) devuelve el nodo de volumen general que controla index.html.
   ============================================================================ */
let A=null,BUS=null;
const NOISE={}, KS={};
const rnd=(a,b)=>a+Math.random()*(b-a);
const choose=a=>a[Math.floor(Math.random()*a.length)];

function audioInit(ctx){
  A=ctx; for(const k in KS) delete KS[k];
  const master=A.createGain(); master.gain.value=.8;
  const comp=A.createDynamicsCompressor();
  comp.threshold.value=-20; comp.knee.value=22; comp.ratio.value=3.5; comp.attack.value=.005; comp.release.value=.3;
  const lim=A.createDynamicsCompressor();
  lim.threshold.value=-2; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=.001; lim.release.value=.1;
  const sh=A.createBiquadFilter(); sh.type='highshelf'; sh.frequency.value=7000; sh.gain.value=-3;
  master.connect(sh); sh.connect(comp); comp.connect(lim); lim.connect(A.destination);
  BUS={dry:A.createGain(),wet:A.createGain()};
  BUS.dry.connect(master);
  const conv=A.createConvolver(); conv.buffer=impulse(2.8,2.4);
  const rv=A.createGain(); rv.gain.value=.85; BUS.wet.connect(conv); conv.connect(rv); rv.connect(master);
  ['white','pink','brown'].forEach(c=>NOISE[c]=noiseBuf(c,4));
  loadSamples();
  return master;
}

/* respuesta al impulso de una sala grande: ruido que decae y se va oscureciendo */
function impulse(sec,pow){
  const sr=A.sampleRate,n=Math.floor(sr*sec),b=A.createBuffer(2,n,sr),pre=Math.floor(sr*.018);
  for(let ch=0;ch<2;ch++){
    const d=b.getChannelData(ch); let lp=0;
    for(let i=pre;i<n;i++){
      const t=(i-pre)/(n-pre), a=.55*(1-t)+.05;
      lp+=((Math.random()*2-1)-lp)*a;
      d[i]=lp*Math.pow(1-t,pow)*1.6;
    }
  }
  return b;
}
function noiseBuf(kind,sec){
  const sr=A.sampleRate,n=Math.floor(sr*sec),b=A.createBuffer(1,n,sr),d=b.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,last=0;
  for(let i=0;i<n;i++){
    const w=Math.random()*2-1;
    if(kind==='white') d[i]=w;
    else if(kind==='pink'){ /* Paul Kellet */
      b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759; b2=.969*b2+w*.153852;
      b3=.8665*b3+w*.3104856; b4=.55*b4+w*.5329522; b5=-.7616*b5-w*.016898;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*.11; b6=w*.115926;
    } else { last=(last+.02*w)/1.02; d[i]=last*3.5; }
  }
  return b;
}

/* ---- piezas básicas ---- */
function env(g,t0,d,v,a,hold,rel){
  a=Math.min(a,d*.8); g.gain.setValueAtTime(.0001,t0);
  g.gain.exponentialRampToValueAtTime(Math.max(v,.0002),t0+a);
  if(hold){ g.gain.setValueAtTime(Math.max(v,.0002),t0+Math.max(a,d-rel)); }
  g.gain.exponentialRampToValueAtTime(.0001,t0+d);
}
function route(n,o,t0,d){
  let x=n;
  if(o.pan!=null&&A.createStereoPanner){
    const p=A.createStereoPanner(); p.pan.setValueAtTime(o.pan,t0);
    if(o.pan2!=null) p.pan.linearRampToValueAtTime(o.pan2,t0+d);
    x.connect(p); x=p;
  }
  x.connect(BUS.dry);
  const r=o.rv??.18;
  if(r>0){ const w=A.createGain(); w.gain.value=r; x.connect(w); w.connect(BUS.wet); }
}
function shaperCurve(k){ const c=new Float32Array(1024); for(let i=0;i<1024;i++){const x=i/512-1; c[i]=Math.tanh(k*x);} return c; }
/* filtros opcionales: hp, lp, bp:[f,q], formants:[[f,q,ganancia],...], shape */
function filt(n,o){
  if(o.hp){const f=A.createBiquadFilter(); f.type='highpass'; f.frequency.value=o.hp; n.connect(f); n=f;}
  if(o.lp){const f=A.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lp; n.connect(f); n=f;}
  if(o.bp){const f=A.createBiquadFilter(); f.type='bandpass'; f.frequency.value=o.bp[0]; f.Q.value=o.bp[1]; n.connect(f); n=f;}
  if(o.shape){const s=A.createWaveShaper(); s.curve=shaperCurve(o.shape); n.connect(s); n=s;}
  if(o.formants){
    const sum=A.createGain();
    o.formants.forEach(([f,q,g])=>{const b=A.createBiquadFilter(); b.type='bandpass'; b.frequency.value=f; b.Q.value=q; const gg=A.createGain(); gg.gain.value=g*3; n.connect(b); b.connect(gg); gg.connect(sum);});
    n=sum;
  }
  return n;
}
/* oscilador con envolvente: f->f2, vibrato, filtros, panorama y reverb */
function osc(o){
  const t0=A.currentTime+(o.t||0),d=o.dur||.5,v=o.vol??.2;
  const os=A.createOscillator(); os.type=o.type||'sine';
  os.frequency.setValueAtTime(o.f,t0);
  if(o.f2) os.frequency.exponentialRampToValueAtTime(o.f2,t0+d);
  if(o.det) os.detune.value=o.det;
  if(o.vib){const l=A.createOscillator(),lg=A.createGain(); l.frequency.value=o.vib; lg.gain.value=o.vd||8; l.connect(lg); lg.connect(os.frequency); l.start(t0); l.stop(t0+d+.1);}
  let n=filt(os,o);
  const g=A.createGain(); env(g,t0,d,v,o.a??.01,o.hold,o.rel||.4);
  if(o.am){const l=A.createOscillator(),lg=A.createGain(),b=A.createGain(); b.gain.value=1-o.am[1]; l.frequency.value=o.am[0]; lg.gain.value=o.am[1]; l.connect(lg); lg.connect(b.gain); n.connect(b); n=b; l.start(t0); l.stop(t0+d+.1);}
  n.connect(g); route(g,o,t0,d); os.start(t0); os.stop(t0+d+.1);
}
/* ruido de color con filtro que barre f->f2 y modulación de amplitud (am:[hz,prof], amr:[hz0,hz1]) */
function nz(o){
  const t0=A.currentTime+(o.t||0),d=o.dur||.5,v=o.vol??.3;
  const s=A.createBufferSource(); s.buffer=NOISE[o.c||'white']; s.loop=true;
  const f=A.createBiquadFilter(); f.type=o.type||'lowpass';
  f.frequency.setValueAtTime(o.f,t0); if(o.f2) f.frequency.exponentialRampToValueAtTime(o.f2,t0+d); f.Q.value=o.q||.7;
  s.connect(f); let n=f;
  if(o.am){
    const l=A.createOscillator(),lg=A.createGain(),b=A.createGain(); b.gain.value=1-o.am[1]; lg.gain.value=o.am[1];
    l.frequency.setValueAtTime(o.am[0],t0); if(o.amr) l.frequency.linearRampToValueAtTime(o.amr,t0+d);
    l.connect(lg); lg.connect(b.gain); n.connect(b); n=b; l.start(t0); l.stop(t0+d+.1);
  }
  n=filt(n,o);
  const g=A.createGain(); env(g,t0,d,v,o.a??.01,o.hold,o.rel||.4);
  n.connect(g); route(g,o,t0,d); s.start(t0,Math.random()*3); s.stop(t0+d+.1);
}
/* buffer ya calculado (cuerda pulsada) */
function playBuf(b,o){
  const t0=A.currentTime+(o.t||0),s=A.createBufferSource(); s.buffer=b;
  const g=A.createGain(); g.gain.value=o.vol??.5; s.connect(g); route(g,o,t0,b.duration); s.start(t0);
}
/* Karplus-Strong: cuerda pulsada (arpa) */
function pluck(f,dur,bright,fade){
  const key=[f.toFixed(1),dur,bright,fade].join('_'); if(KS[key]) return KS[key];
  const sr=A.sampleRate,len=Math.floor(sr*dur),b=A.createBuffer(1,len,sr),y=b.getChannelData(0);
  const N=Math.max(2,Math.round(sr/f)),ring=new Float32Array(N); let lp=0;
  for(let i=0;i<N;i++){lp+=((Math.random()*2-1)-lp)*bright; ring[i]=lp;}
  let p=0,peak=0;
  for(let i=0;i<len;i++){
    const nx=ring[(p+1)%N]; y[i]=ring[p]; ring[p]=(ring[p]+nx)*.5*fade; p=(p+1)%N;
    const a=Math.abs(y[i]); if(a>peak) peak=a;
  }
  const k=.8/(peak||1); for(let i=0;i<len;i++){ y[i]*=k*Math.min(1,(len-i)/(sr*.08)); }
  return KS[key]=b;
}
/* amplitud con vaivén irregular (ecos de trueno, oleaje) */
function bumpy(g,t0,d,peak,n=28,floor=.25){
  const c=new Float32Array(n); let x=.6;
  for(let i=0;i<n;i++){ x=Math.max(floor,Math.min(1,x+rnd(-.35,.35))); const t=i/(n-1); c[i]=peak*x*Math.pow(1-t,1.5)*Math.min(1,t*14); }
  g.gain.setValueCurveAtTime(c,t0,d);
}
const VOW={a:[[800,9,1],[1150,10,.55],[2900,12,.25]],o:[[450,9,1],[800,10,.45],[2830,12,.15]],e:[[600,9,1],[1700,10,.4],[2600,12,.2]],eh:[[650,6,1],[1250,6,.6],[2500,8,.3]]};

/* ---- efectos puntuales ---- */
const SND={
  trueno:{n:'Trueno',f(){
    const t0=A.currentTime;
    nz({c:'white',type:'highpass',f:900,dur:.18,vol:.5,a:.002,rv:.5});
    nz({t:.02,c:'white',type:'bandpass',f:380,q:.8,dur:.7,vol:.55,a:.004,rv:.6});
    const s=A.createBufferSource(); s.buffer=NOISE.brown; s.loop=true;
    const f=A.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(520,t0+.1); f.frequency.exponentialRampToValueAtTime(55,t0+4.6);
    const g=A.createGain(); s.connect(f); f.connect(g); bumpy(g,t0+.1,4.4,1.3,30);
    route(g,{rv:.5,pan:-.2,pan2:.25},t0,4.5); s.start(t0,Math.random()*3); s.stop(t0+4.7);
    osc({t:.1,f:62,f2:30,dur:3.6,vol:.5,a:.15,rv:.3});
    nz({t:1.2,c:'brown',f:260,f2:50,dur:3,vol:.5,a:.4,rv:.6});
  }},
  martillo:{n:'Martillazos',f(){
    [0,.41,.8,1.25,1.58].forEach((t,k)=>{
      const p=rnd(-.2,.2),v=.8+Math.random()*.25;
      nz({t,c:'white',type:'bandpass',f:3200,q:1.2,dur:.03,vol:.35*v,a:.001,pan:p,rv:.25});
      osc({t,f:190,f2:95,dur:.09,vol:.55*v,a:.001,type:'triangle',pan:p,rv:.2});
      [[540,.11],[830,.09],[1330,.06]].forEach(([fr,dd])=>osc({t,f:fr*rnd(.97,1.03),dur:dd,vol:.1*v,a:.001,pan:p,rv:.3}));
      if(k===1||k===3) osc({t:t+.02,f:2900,dur:.16,vol:.05,a:.001,pan:p,rv:.4});
    });
  }},
  elefante:{n:'Elefante',f(){
    const trump=(t,len,top)=>{
      osc({t,f:300,f2:top,dur:len*.45,vol:.2,type:'sawtooth',a:.06,vib:11,vd:18,formants:[[1100,3,1],[2400,4,.5],[3600,6,.2]],shape:2.5,rv:.35});
      osc({t:t+len*.45,f:top,f2:340,dur:len*.55,vol:.2,type:'sawtooth',a:.02,vib:13,vd:26,formants:[[1100,3,1],[2400,4,.5],[3600,6,.2]],shape:2.5,rv:.35});
      nz({t,c:'pink',type:'bandpass',f:2200,q:.9,dur:len,vol:.08,a:.05,rv:.3});
    };
    trump(0,.9,720); trump(1,.5,640);
  }},
  oveja:{n:'Oveja',f(){
    [0,.95].forEach((t,k)=>{
      const f0=k?330:390;
      osc({t,f:f0,f2:f0*.82,dur:.8,vol:.75,type:'sawtooth',a:.05,am:[36,.55],vib:5,vd:10,formants:VOW.e,shape:1.5,rv:.25,pan:-.15});
      nz({t,c:'pink',type:'bandpass',f:1600,q:1.5,dur:.5,vol:.08,a:.05,rv:.2});
    });
  }},
  leon:{n:'León',f(){
    osc({f:75,f2:135,dur:.8,vol:.35,type:'sawtooth',a:.25,am:[27,.7],formants:VOW.a,shape:3,rv:.45,vib:6,vd:5});
    osc({t:.8,f:135,f2:62,dur:1.5,vol:.35,type:'sawtooth',a:.02,am:[24,.75],formants:VOW.o,shape:3,rv:.5,vib:5,vd:6});
    osc({t:.1,f:60,f2:38,dur:2,vol:.3,a:.2,rv:.3});
    nz({c:'pink',type:'bandpass',f:1400,q:.7,dur:2.2,vol:.1,a:.3,am:[25,.6],rv:.4});
  }},
  pajaro:{n:'Pájaros',f(){ birdPhrase(0,rnd(-.5,.5)); birdPhrase(.55,rnd(-.5,.5)); }},
  paloma:{n:'Paloma',f(){
    [0,1.05].forEach(t=>{
      [[0,.16,400,370],[.2,.4,470,360],[.66,.3,420,330]].forEach(([dt,dd,f1,f2])=>{
        osc({t:t+dt,f:f1,f2,dur:dd,vol:.2,a:.04,vib:7,vd:6,lp:1500,rv:.4});
        osc({t:t+dt,f:f1*2,f2:f2*2,dur:dd,vol:.04,a:.04,lp:1800,rv:.4});
      });
    });
  }},
  ballena:{n:'Canto de ballena',f(){
    const call=(t,a,b,d)=>{
      [1,2,3].forEach(h=>osc({t,f:a*h,f2:b*h,dur:d,vol:.2/(h*h*.8),a:.7,vib:2.4,vd:10*h,hold:true,rel:1,rv:1}));
    };
    call(0,140,400,2.4); call(2.2,420,170,2.6); call(4.4,150,260,1.8);
    for(let k=0;k<8;k++) nz({t:rnd(.2,4.6),c:'white',type:'bandpass',f:rnd(1800,2800),q:6,dur:.03,vol:.05,a:.002,rv:.8,pan:rnd(-.6,.6)});
  }},
  arpa:{n:'Arpa',f(){
    [261.63,329.63,392,523.25,659.25].forEach((f,k)=>playBuf(pluck(f,2.2,.45,.9985),{t:k*.15,vol:.6,pan:-.3+k*.15,rv:.55}));
  }},
  coro:{n:'Coro celestial',f(){
    [130.8,196,261.6,329.6,392,523.3].forEach((f,k)=>[-9,0,9].forEach(c=>
      osc({f,det:c,dur:4.6,vol:.05,type:'sawtooth',a:1.5,hold:true,rel:1.9,vib:5.1+Math.random()*.6,vd:3,formants:k%2?VOW.o:VOW.a,rv:1,pan:rnd(-.6,.6)})));
  }},
  fanfarria:{n:'Fanfarria',f(){
    const note=(t,f,d)=>[0,6,-6].forEach(c=>osc({t,f,det:c,dur:d,vol:.06,type:'sawtooth',a:.035,hold:true,rel:.12,lp:3200,hp:200,vib:5.5,vd:2,rv:.45}));
    note(0,392,.24); note(.22,523.25,.24); note(.44,659.25,.24); note(.7,784,1.5); note(.7,523.25,1.5); note(.7,392,1.5);
    nz({t:.69,c:'white',type:'highpass',f:5000,dur:.06,vol:.04,rv:.4});
  }},
  tambores:{n:'Tambores',f(){
    [0,.44,.88,1.32,1.76,2.2].forEach((t,k)=>{
      const v=k%3===0?1:.65;
      osc({t,f:125,f2:48,dur:.5,vol:.7*v,a:.002,rv:.45});
      osc({t,f:190,f2:90,dur:.2,vol:.25*v,a:.002,type:'triangle',rv:.4});
      nz({t,c:'pink',f:900,dur:.1,vol:.18*v,a:.002,rv:.4});
    });
  }},
  pasos:{n:'Pasos del gigante',f(){
    for(let k=0;k<4;k++){
      const t=k*.75,v=.55+k*.15;
      osc({t,f:72,f2:26,dur:.7,vol:.8*v,a:.004,rv:.5});
      nz({t,c:'brown',f:200,f2:60,dur:.7,vol:.6*v,a:.004,rv:.4});
      nz({t:t+.02,c:'pink',type:'bandpass',f:1400,q:.8,dur:.18,vol:.1*v,a:.003,rv:.3});
    }
  }},
  honda:{n:'Honda',f(){
    nz({c:'pink',type:'bandpass',f:350,f2:1900,q:2,dur:1.2,vol:2.2,a:.7,hold:true,rel:.12,am:[4,.85],amr:15,pan:-.5,pan2:.6,rv:.2});
    nz({t:1.18,c:'white',type:'highpass',f:3000,dur:.07,vol:.25,a:.002,pan:.6,rv:.3});
  }},
  impacto:{n:'Impacto y caída',f(){
    nz({c:'white',type:'bandpass',f:900,q:1.2,dur:.12,vol:.6,a:.002,rv:.3});
    osc({f:120,f2:34,dur:.55,vol:.8,a:.003,rv:.4});
    [410,1130,2210,3470].forEach((fr,k)=>[.02,.1,.19,.32].forEach(dt=>osc({t:dt+k*.01,f:fr*rnd(.97,1.03),dur:.5,vol:.05,a:.001,type:'square',lp:5000,rv:.5})));
    osc({t:.45,f:70,f2:26,dur:1.1,vol:.9,a:.01,rv:.6});
    nz({t:.45,c:'brown',f:300,f2:60,dur:1.4,vol:.7,a:.02,rv:.5});
    nz({t:.5,c:'pink',type:'bandpass',f:700,q:.6,dur:1.2,vol:.1,a:.1,rv:.4});
  }},
  chapuzon:{n:'Chapuzón',f(){
    nz({c:'white',type:'bandpass',f:3600,f2:700,q:.9,dur:.6,vol:1,a:.01,rv:.4});
    osc({t:.03,f:240,f2:62,dur:.4,vol:.7,a:.005,rv:.35});
    nz({t:.05,c:'pink',type:'lowpass',f:1800,f2:300,dur:1.5,vol:.7,a:.12,rv:.4});
    for(let k=0;k<14;k++){ const f=rnd(450,1700); osc({t:rnd(.12,1.5),f,f2:f*1.7,dur:.07,vol:.1,a:.004,pan:rnd(-.5,.5),rv:.4}); }
  }},
  multitud:{n:'Multitud',f(){
    for(let k=0;k<14;k++){
      const f=rnd(150,330);
      osc({t:rnd(0,.5),f,f2:f*rnd(.95,1.2),dur:3.3,vol:.08,type:'sawtooth',a:.8,hold:true,rel:1.4,vib:rnd(4,6.5),vd:rnd(4,12),formants:k%3?VOW.a:VOW.o,pan:rnd(-.8,.8),rv:.5});
    }
    nz({c:'pink',type:'bandpass',f:1500,q:.6,dur:3.3,vol:.5,a:.6,hold:true,rel:1.4,rv:.4});
    for(let k=0;k<36;k++) nz({t:rnd(.3,2.7),c:'white',type:'bandpass',f:rnd(1500,3200),q:1.2,dur:.035,vol:.25,a:.002,pan:rnd(-.8,.8),rv:.4});
  }},
  brillo:{n:'Brillos',f(){
    const sc=[1046.5,1318.5,1568,1760,2093,2637];
    for(let k=0;k<11;k++){
      const f=choose(sc),t=rnd(0,1.5),p=rnd(-.7,.7);
      [[1,1],[2.76,.35],[5.4,.15]].forEach(([r,g])=>osc({t,f:f*r,dur:rnd(1.2,1.8)/r**.4,vol:.12*g,a:.003,pan:p,rv:.8}));
    }
  }},
  inicio:{n:'Inicio del mundo',f(){
    osc({f:36,f2:56,dur:5,vol:.7,a:2.2,rv:.7});
    [55,82.4,110].forEach(f=>[-8,8].forEach(c=>osc({f,det:c,dur:5,vol:.05,type:'sawtooth',a:2.6,lp:700,rv:.9})));
    nz({c:'brown',f:100,f2:600,dur:5,vol:.5,a:2.4,rv:.7});
    nz({t:1.5,c:'pink',type:'highpass',f:2500,dur:3.5,vol:.04,a:2,rv:.8});
    [440,660,880].forEach((f,k)=>osc({t:2.5+k*.4,f,dur:2.2,vol:.025,a:1,rv:1}));
  }},
  gotas:{n:'Gotas',f(){
    [0,.7,1.3,2.2].forEach(t=>{ const f=rnd(850,1300);
      osc({t,f,f2:f*.55,dur:.14,vol:.4,a:.002,rv:1,pan:rnd(-.5,.5)});
      osc({t:t+.05,f:f*1.8,f2:f,dur:.08,vol:.05,a:.002,rv:1}); });
  }},
  latido:{n:'Latido',f(){
    for(let k=0;k<5;k++){ const t=k*.9;
      osc({t,f:64,f2:36,dur:.18,vol:.7,a:.005,lp:160,rv:.5});
      nz({t,c:'brown',f:120,dur:.15,vol:.4,a:.005,rv:.5});
      osc({t:t+.23,f:56,f2:36,dur:.16,vol:.45,a:.005,lp:150,rv:.5}); }
  }}
};

/* Grabaciones reales de animales (snd/*.wav, ver snd/LICENCIAS.md). Si no cargan, suena la versión sintetizada. */
const SAMPLES={};
function loadSamples(){
  [['elefante','snd/elephant.wav',.9],['leon','snd/lion.wav',1],['oveja','snd/sheep.wav',.85]].forEach(([id,url,vol])=>{
    fetch(url).then(r=>r.arrayBuffer()).then(b=>A.decodeAudioData(b)).then(buf=>{ SAMPLES[id]={buf,vol}; }).catch(()=>{});
  });
}
['elefante','oveja','leon'].forEach(id=>{
  const synth=SND[id].f;
  SND[id].f=function(){ const s=SAMPLES[id]; if(!s) return synth(); playBuf(s.buf,{vol:s.vol,pan:rnd(-.2,.2),rv:.22}); };
});

/* una frase de pájaro: gorjeo, trino o silbido */
function birdPhrase(t,pan,rv=.35){
  const kind=choose(['tweet','tweet','trill','whistle']);
  if(kind==='tweet'){
    const n=2+Math.floor(Math.random()*4),b=rnd(2800,4200);
    for(let k=0;k<n;k++){ const f=b+rnd(-300,300); osc({t:t+k*.11,f,f2:f*rnd(.85,1.4),dur:.07,vol:.22,a:.006,pan,rv,hp:1500}); }
  } else if(kind==='trill'){
    const b=rnd(3000,4000);
    for(let k=0;k<11;k++) osc({t:t+k*.05,f:b+(k%2?250:-250),f2:b+(k%2?-200:200),dur:.045,vol:.16,a:.004,pan,rv});
  } else {
    const b=rnd(1800,2400);
    osc({t,f:b,f2:b*1.35,dur:.28,vol:.28,a:.04,vib:30,vd:60,pan,rv});
    osc({t:t+.34,f:b*1.4,f2:b*.9,dur:.34,vol:.28,a:.04,vib:26,vd:50,pan,rv});
  }
}

/* ---- ambientes en bucle (devuelven {stop()}) ---- */
function lfoTo(param,rate,depth,nodes){
  const l=A.createOscillator(),g=A.createGain(); l.frequency.value=rate; g.gain.value=depth; l.connect(g); g.connect(param); l.start(); nodes.push(l);
}
function ambBed(layers,vol){
  const nodes=[],master=A.createGain(); master.gain.value=0; route(master,{rv:.25},A.currentTime,0);
  layers.forEach(L=>{
    const s=A.createBufferSource(); s.buffer=NOISE[L.c]; s.loop=true;
    const f=A.createBiquadFilter(); f.type=L.type; f.frequency.value=L.f; f.Q.value=L.q||.7; s.connect(f);
    let n=f; if(L.hp){const h=A.createBiquadFilter(); h.type='highpass'; h.frequency.value=L.hp; n.connect(h); n=h;}
    const g=A.createGain(); g.gain.value=L.v; n.connect(g); g.connect(master);
    if(L.fm) lfoTo(f.frequency,L.fm[0],L.fm[1],nodes);
    if(L.am) lfoTo(g.gain,L.am[0],L.am[1],nodes);
    s.start(0,Math.random()*3); nodes.push(s);
  });
  master.gain.setTargetAtTime(vol,A.currentTime,.6);
  return {master,nodes};
}
function stopBed(b,extra){
  const t=A.currentTime; b.master.gain.setTargetAtTime(0,t,.5);
  b.nodes.forEach(n=>{try{n.stop(t+2.6);}catch(e){}}); if(extra) extra();
}
const AMBDEF={
  lluvia:{n:'Lluvia',mk(){
    const b=ambBed([
      {c:'pink',type:'highpass',f:1000,v:.5,am:[.17,.1]},
      {c:'pink',type:'bandpass',f:3400,q:.5,v:.35,am:[.09,.2]},
      {c:'brown',type:'lowpass',f:260,v:.5}
    ],.34);
    const id=setInterval(()=>{ const f=rnd(2200,5800); osc({f,f2:f*rnd(.6,.9),dur:.03,vol:.018,a:.002,pan:rnd(-.9,.9),rv:.3}); },55);
    return {stop(){stopBed(b,()=>clearInterval(id));}};
  }},
  viento:{n:'Viento',mk(){
    const b=ambBed([
      {c:'pink',type:'bandpass',f:520,q:1.1,v:.55,fm:[.07,260],am:[.12,.25]},
      {c:'pink',type:'bandpass',f:900,q:14,v:.12,fm:[.19,260],am:[.15,.08]},
      {c:'brown',type:'lowpass',f:220,v:.35,am:[.05,.2]}
    ],.34);
    return {stop(){stopBed(b);}};
  }},
  olas:{n:'Olas',mk(){
    const b=ambBed([
      {c:'brown',type:'lowpass',f:700,v:.5,am:[.085,.42]},
      {c:'pink',type:'highpass',f:2500,v:.1,am:[.085,.1]},
      {c:'pink',type:'bandpass',f:500,q:.5,v:.2,am:[.12,.12]}
    ],.4);
    return {stop(){stopBed(b);}};
  }},
  pajaros:{n:'Pájaros de fondo',mk(){
    let alive=true,tm=null;
    const loop=()=>{ if(!alive) return; birdPhrase(0,rnd(-.9,.9),.5); tm=setTimeout(loop,rnd(500,2600)); };
    tm=setTimeout(loop,300);
    return {stop(){alive=false; clearTimeout(tm);}};
  }}
};

/* colchón de tonos sostenidos (música y sonidos de fondo con altura definida) */
function padBed(freqs,o){
  const nodes=[],master=A.createGain(); master.gain.value=0; route(master,{rv:o.rv??.6},A.currentTime,0);
  let tail=master;
  if(o.lp){const f=A.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lp; f.connect(master); tail=f;}
  freqs.forEach((f,k)=>[-7,7].forEach(c=>{
    const os=A.createOscillator(); os.type=o.type||'sawtooth'; os.frequency.value=f; os.detune.value=c;
    const g=A.createGain(); g.gain.value=1/freqs.length/2; os.connect(g); g.connect(tail); os.start(); nodes.push(os);
    if(o.vib){ lfoTo(os.frequency,o.vib+k*.13,f*.004,nodes); }
  }));
  if(o.am) lfoTo(master.gain,o.am[0],o.am[1],nodes);
  master.gain.setTargetAtTime(o.vol,A.currentTime,1.5);
  return {master,nodes};
}
/* secuenciador: llama fn() cada rnd(a,b) ms hasta que se detiene */
function everyMs(a,b,fn){ let alive=true,tm=null; const loop=()=>{ if(!alive) return; fn(); tm=setTimeout(loop,rnd(a,b)); }; tm=setTimeout(loop,rnd(a,b)); return ()=>{alive=false; clearTimeout(tm);}; }
const PENTA=[293.66,329.63,369.99,440,493.88,587.33,659.25,739.99];     /* Re mayor pentatónica */
const MENOR=[220,261.63,293.66,329.63,392,440,523.25,587.33];           /* La menor pentatónica */
const pluckNote=(f,vol,rv=.55)=>playBuf(pluck(f,2.4,.4,.9988),{vol,pan:rnd(-.5,.5),rv});
const musicBed=(padF,padO,seq)=>{
  const b=padBed(padF,padO), st=seq(), id=b;
  return {stop(){ st(); stopBed(b); }};
};
Object.assign(AMBDEF,{
  grillos:{n:'Grillos',mk(){
    const stops=[0,1,2].map(i=>{ const base=rnd(4100,4900),pan=rnd(-.8,.8);
      return everyMs(500+i*90,800+i*120,()=>{ for(let k=0;k<3;k++) osc({t:k*.045,f:base+k*30,dur:.03,vol:.13,a:.004,pan,rv:.3}); }); });
    return {stop(){stops.forEach(s=>s());}};
  }},
  fuego:{n:'Fogata',mk(){
    const b=ambBed([{c:'brown',type:'lowpass',f:260,v:.5,am:[.4,.25]},{c:'pink',type:'bandpass',f:1100,q:.7,v:.18,am:[.7,.2]}],.4);
    const st=everyMs(40,260,()=>{ nz({c:'white',type:'bandpass',f:rnd(1800,5500),q:1.5,dur:rnd(.01,.04),vol:rnd(.1,.35),a:.001,pan:rnd(-.4,.4),rv:.15}); });
    return {stop(){st(); stopBed(b);}};
  }},
  murmullo:{n:'Murmullo de gente',mk(){
    const b=ambBed([{c:'pink',type:'bandpass',f:520,q:.9,v:.5,am:[.31,.3]},{c:'pink',type:'bandpass',f:1500,q:.8,v:.25,am:[.23,.3]}],.32);
    const st=everyMs(300,900,()=>{ const f=rnd(120,230); osc({f,f2:f*rnd(.85,1.2),dur:rnd(.25,.6),vol:.03,type:'sawtooth',a:.06,formants:pick2([VOW.a,VOW.o,VOW.e]),pan:rnd(-.9,.9),rv:.5,vib:5,vd:5}); });
    return {stop(){st(); stopBed(b);}};
  }},
  submarino:{n:'Bajo el agua',mk(){
    const b=ambBed([{c:'brown',type:'lowpass',f:320,v:.7,am:[.07,.2]},{c:'pink',type:'lowpass',f:700,q:.5,v:.25,am:[.11,.15]}],.4);
    const st=everyMs(400,1500,()=>{ const f=rnd(300,900); osc({f,f2:f*rnd(1.5,2.2),dur:.09,vol:.06,a:.004,pan:rnd(-.7,.7),rv:.9}); });
    return {stop(){st(); stopBed(b);}};
  }},
  musica_calma:{n:'Música: calma',mk(){
    return musicBed([73.42,110,146.83],{type:'triangle',lp:520,vol:.07,rv:.7,am:[.06,.02]},
      ()=>everyMs(900,1700,()=>{ pluckNote(choose(PENTA),.3); if(Math.random()<.3) setTimeout(()=>pluckNote(choose(PENTA),.2),rnd(150,350)); }));
  }},
  musica_tension:{n:'Música: tensión',mk(){
    return musicBed([73.42,77.78,110,116.54],{type:'sawtooth',lp:380,vol:.12,rv:.8,am:[5.2,.04],vib:.2},
      ()=>everyMs(2800,5200,()=>{ osc({f:choose([622.25,466.16,311.13]),dur:2.4,vol:.09,a:.8,rv:1,pan:rnd(-.6,.6)}); }));
  }},
  musica_misterio:{n:'Música: misterio',mk(){
    return musicBed([110,164.81,220],{type:'sine',vol:.09,rv:.95,am:[.05,.03]},
      ()=>everyMs(1800,3600,()=>{ const f=choose(MENOR)*2; [1,2.76].forEach((r,i)=>osc({f:f*r,dur:2.8,vol:.07/(i+1),a:.01,rv:1,pan:rnd(-.7,.7)})); }));
  }},
  musica_triunfo:{n:'Música: triunfo',mk(){
    const G=[392,493.88,587.33,783.99,987.77];
    return musicBed([98,146.83,196,246.94],{type:'sawtooth',lp:1300,vol:.07,rv:.6,vib:.3},
      ()=>everyMs(260,560,()=>{ pluckNote(choose(G),.3,.45); }));
  }}
});
const pick2=choose;
