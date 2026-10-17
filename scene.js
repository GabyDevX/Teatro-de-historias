/* ============================================================================
   ESCENARIO: biblioteca de elementos (lienzo 800x500, suelo en y=400).
   Los personajes, animales, objetos y cielos son pinturas en img/*.webp (estilo libro
   ilustrado, recortadas con fondo transparente). Los efectos (agua, lluvia, rayos, luz de
   Dios, estrellas, banderas) se dibujan en SVG para poder animarlos.
   Cada elemento es {id, n, svg, from, lv, steps, inst, dur}:
     n      nombre en el modo Libre        from   transform de entrada (aparece desde ahí)
     lv     lista de posiciones/niveles    steps  qué niveles recorre el botón del modo Libre
     inst   sin transición de aparición    dur    duración de la transición de lv
   El orden del arreglo E es el orden de capas (de atrás hacia adelante).
   Para cambiar una imagen: reemplazá el archivo de img/ (mismo nombre) y ajustá su tamaño en IM.
   ============================================================================ */
const DEFS=[];
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
const shade=(hex,p)=>{ /* p>0 aclara, p<0 oscurece */
  const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,t=p<0?0:255,k=Math.abs(p);
  return '#'+[r,g,b].map(c=>clamp(c+(t-c)*k).toString(16).padStart(2,'0')).join('');
};
const grad=(id,stops,o={})=>{
  DEFS.push(`<linearGradient id="${id}" x1="${o.x1??0}" y1="${o.y1??0}" x2="${o.x2??0}" y2="${o.y2??1}">${stops.map(([f,c,op])=>`<stop offset="${f}" stop-color="${c}"${op!=null?` stop-opacity="${op}"`:''}/>`).join('')}</linearGradient>`);
  return `url(#${id})`;
};
const rgrad=(id,stops,o={})=>{
  DEFS.push(`<radialGradient id="${id}" cx="${o.cx??.5}" cy="${o.cy??.5}" r="${o.r??.5}">${stops.map(([f,c,op])=>`<stop offset="${f}" stop-color="${c}"${op!=null?` stop-opacity="${op}"`:''}/>`).join('')}</radialGradient>`);
  return `url(#${id})`;
};
const _cache={};
const lin=(color,horizontal)=>{ /* degradado automático claro -> oscuro de un color */
  const id='c'+color.slice(1)+(horizontal?'h':'v');
  if(!_cache[id]) _cache[id]=grad(id,[[0,shade(color,.22)],[.55,color],[1,shade(color,-.32)]],horizontal?{x2:1,y2:0}:{});
  return _cache[id];
};

DEFS.push(
 '<filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>',
 '<filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>',
 '<filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>',
 '<filter id="grainf" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  1.3 0 0 0 -.55"/></filter>'
);
const G={
  sun:rgrad('gSun',[[0,'#fff6c8'],[.18,'#ffe27a'],[.5,'#ffc247',.35],[1,'#ffc247',0]]),
  moonG:rgrad('gMoon',[[0,'#fffdf0',.9],[.35,'#dfe7ff',.35],[1,'#dfe7ff',0]]),
  glow:rgrad('gGlow',[[0,'#fff3b8',.95],[1,'#fff3b8',0]]),
  beam:grad('beam',[[0,'#fff3b8',.9],[1,'#fff3b8',0]]),
  water1:grad('gW1',[[0,'#69b2e8'],[.4,'#3a86c8'],[1,'#123c66']]),
  water2:grad('gW2',[[0,'#4a96d6'],[.4,'#2766a8'],[1,'#0c2c52']]),
  jonahGlow:rgrad('gJGlow',[[0,'#ffd9a0',.6],[1,'#ffd9a0',0]]),
  belly:rgrad('gBelly',[[0,'#3a2a55',.9],[.75,'#1c1c44',.88],[1,'#1c1c44',0]]),
  mist:grad('gMist',[[0,'#cfe3ff',0],[1,'#cfe3ff',.28]]),
  wfill:grad('gWFill',[[0,'#001f3e'],[1,'#000d1e']])
};

/* tamaño (px) de cada imagen recortada de img/ */
const IM={noah:[272,640],david:[371,640],goliath:[334,700],jonah:[320,640],adam:[216,640],eve:[210,640],giraffe:[509,760],elephant:[800,540],lion:[800,589],sheep:[520,409],whale:[1100,539],dove:[384,420],fish:[420,239],ark:[1300,693],ship:[760,601],city:[1300,682],tents:[1300,676],land:[1600,497],trees:[550,560],sun:[520,504],moon:[420,420],cloud:[1100,489],storm:[1200,631],rainbow:[1300,631],flowers:[1500,638],water:[1500,671],bird:[288,320],banner_red:[399,560],banner_blue:[360,560],stone:[96,70],beach:[1500,370],nin1:[219,640],nin2:[246,640],nin3:[302,640],nin4:[248,600],nin5:[293,640]};
/* imagen centrada en cx, apoyada en by, de alto h (o ancho w); flip la espeja */
const pic=(n,cx,by,o={})=>{
  const [iw,ih]=IM[n],h=o.h||o.w*ih/iw,w=o.w||h*iw/ih,x=cx-w/2,y=by-h;
  const img=`<image href="img/${n}.webp" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"/>`;
  return o.flip?`<g transform="translate(${2*cx},0) scale(-1,1)">${img}</g>`:img;
};
const shadow=(cx,by,rx)=>`<ellipse cx="${cx}" cy="${by}" rx="${rx}" ry="${(rx*.14).toFixed(1)}" fill="#000" opacity=".28" filter="url(#blur2)"/>`;
/* personaje de pie: el origen (0,0) son los pies */
const person=(n,h)=>`<g class="breathe">${shadow(0,1,h*.22)}${pic(n,0,3,{h})}</g>`;

const starsSvg=()=>{
  let s='<g fill="#fff">',x=7; for(let i=0;i<34;i++){x=(x*73+19)%997; const cx=(x*0.8)%790+5,cy=((x*37)%240)+10; s+=`<circle class="star" style="animation-delay:${(i%7)*.4}s" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${i%5?1.3:2.3}"/>`;}
  return s+'</g>';
};
const rainSvg=()=>{
  let s='<g stroke="#cfe3ff" stroke-linecap="round" opacity=".75">',x=5;
  for(let i=0;i<64;i++){x=(x*61+23)%983; const near=i%3===0,xx=(x*0.82)%800;
    s+=`<line class="drop${near?' near':''}" style="animation-delay:-${((x%75)/100).toFixed(2)}s" stroke-width="${near?2.2:1.2}" x1="${xx.toFixed(0)}" y1="-40" x2="${(xx-(near?9:5)).toFixed(0)}" y2="${near?-4:-18}"/>`;}
  return s+`</g><rect x="0" y="340" width="800" height="160" fill="${G.mist}"/>`;
};
const waveD=(()=>{let d='M0 0Q50 -14 100 0'; for(let i=2;i<=12;i++) d+=`T${i*100} 0`; return d;})();

/* aldeano de Nínive dibujado en SVG: el origen (0,0) son los pies */
const villager=(robe,skin,hair)=>`<g class="breathe">${shadow(0,1,16)}<path d="M-13 0L-9 -34Q0 -40 9 -34L13 0Z" fill="${lin(robe,true)}"/><rect x="-9" y="-37" width="18" height="5" rx="2" fill="${shade(robe,-.35)}"/><path d="M-9 -34Q-17 -26 -14 -17" stroke="${robe}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M9 -34Q17 -26 14 -17" stroke="${robe}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-14" cy="-15" r="3" fill="${skin}"/><circle cx="14" cy="-15" r="3" fill="${skin}"/><circle cx="0" cy="-47" r="9" fill="${skin}"/><path d="M-9.5 -48Q-9 -58 0 -58Q9 -58 9.5 -48Q4 -53 -9.5 -48Z" fill="${hair}"/><circle cx="-3.2" cy="-47" r="1.1" fill="#2a1a10"/><circle cx="3.2" cy="-47" r="1.1" fill="#2a1a10"/><path d="M-3 -43Q0 -41 3 -43" stroke="#7a3a2a" stroke-width="1" fill="none"/></g>`;

/* orden de capas: de atrás hacia adelante */
const E=[
 {id:'godlight',n:'Luz de Dios',svg:`<g class="pulse" style="mix-blend-mode:screen"><circle cx="400" cy="-10" r="230" fill="${G.glow}"/><polygon points="400,-10 240,500 560,500" fill="url(#beam)"/><polygon points="400,-10 90,500 230,500" fill="url(#beam)" opacity=".55"/><polygon points="400,-10 570,500 710,500" fill="url(#beam)" opacity=".55"/><polygon points="400,-10 330,500 470,500" fill="url(#beam)" opacity=".5"/></g>${[...Array(16)].map((_,k)=>`<circle class="mote" style="animation-delay:-${(k*.7).toFixed(1)}s;animation-duration:${8+k%5}s" cx="${230+k*22}" cy="${440-(k*37)%120}" r="${1.2+k%3*.5}" fill="#fff6c8"/>`).join('')}`,from:'none'},
 {id:'stars',n:'Estrellas',svg:starsSvg(),from:'none'},
 {id:'moon',n:'Luna',svg:`<circle cx="165" cy="95" r="90" fill="${G.moonG}"/>${pic('moon',165,138,{w:86})}`,from:'translateY(-40px)'},
 {id:'sun',n:'Sol',svg:`<circle cx="660" cy="95" r="175" fill="${G.sun}"/><g class="spin">${pic('sun',660,152,{w:112})}</g>`,from:'translateY(-60px)'},
 {id:'rainbow',n:'Arcoíris',svg:`<g opacity=".9">${pic('rainbow',400,402,{w:720})}</g>`,from:'scale(.7)'},
 {id:'cloud',n:'Nubes',svg:`<g class="drift">${pic('cloud',250,150,{w:380})}${pic('cloud',590,205,{w:300,flip:true})}</g>`,from:'translateX(-120px)'},
 {id:'stormcloud',n:'Nubarrones',svg:`<g class="drift">${pic('storm',110,128,{w:520})}${pic('storm',420,118,{w:520,flip:true})}${pic('storm',720,128,{w:520})}</g>`,from:'translateY(-100px)'},
 {id:'lightning',n:'Rayos',svg:`<rect class="flash" x="0" y="0" width="800" height="500" fill="#dfe8ff"/><g class="bolt"><polygon points="520,60 490,190 530,190 500,320 585,160 540,160 565,60" fill="#fff6b0" filter="url(#blur3)"/><polygon points="520,60 490,190 530,190 500,320 585,160 540,160 565,60" fill="#fffbe6"/></g>`,from:'none'},
 {id:'land',n:'Colinas',svg:pic('land',400,502,{w:820}),from:'translateY(60px)'},
 {id:'tents',n:'Campamentos',svg:pic('tents',95,404,{w:190})+pic('tents',705,404,{w:190,flip:true}),from:'translateY(40px)'},
 {id:'city',n:'Nínive',svg:`${shadow(640,402,170)}${pic('city',640,404,{w:340})}`,from:'translateY(90px)'},
 {id:'trees',n:'Árboles',svg:pic('trees',50,404,{h:170})+pic('trees',752,406,{h:190,flip:true}),from:'scale(.4)'},
 {id:'flowers',n:'Flores',svg:pic('flowers',210,502,{w:430})+pic('flowers',590,502,{w:430,flip:true}),from:'scale(.3)'},
 {id:'ark',n:'Arca',svg:`${shadow(400,398,170)}${pic('ark',400,400,{w:370})}`,from:'translateY(-120px)',
  lv:['translate(0px,0px)','translate(0px,-150px)','translate(0px,-165px)','translate(0px,-20px)'],steps:[0,1,3],dur:'2.2s'},
 {id:'sheep',n:'Ovejas',svg:[[60,405,66],[110,418,66],[255,410,60]].map(([x,y,w])=>`${shadow(x,y,w*.4)}${pic('sheep',x,y+2,{w})}`).join(''),from:'scale(.5)'},
 {id:'lion',n:'León',svg:`${shadow(500,402,70)}${pic('lion',500,404,{w:140})}`,from:'translateX(80px)'},
 {id:'animals',n:'Animales',svg:`${shadow(90,402,50)}${pic('giraffe',90,404,{h:200})}${shadow(215,402,70)}${pic('elephant',215,404,{w:150})}${[[660,402,64],[708,406,58]].map(([x,y,w])=>`${shadow(x,y,w*.4)}${pic('sheep',x,y+2,{w})}`).join('')}`,from:'translateX(-80px)'},
 {id:'crowd',n:'Gente de Nínive',svg:[['nin1',84],['nin2',80],['nin4',58],['nin3',74],['nin5',82]].map(([n,h],i)=>`<g transform="translate(${500+i*54},404)">${person(n,h)}</g>`).join(''),from:'translateX(60px)'},
 {id:'banner',n:'Banderas',svg:`<g class="bob">${pic('banner_red',119,406,{h:190})}${pic('banner_blue',687,406,{h:190})}</g>`,from:'translateY(60px)'},
 {id:'flood',n:'Agua',svg:`<g class="swell2" opacity=".9"><g transform="translate(0 16)">${pic('water',400,403,{w:900,flip:true})}</g></g><g class="swell">${pic('water',400,403,{w:900})}<rect x="-60" y="398" width="920" height="260" fill="${G.wfill}"/></g>`,from:'none',
  lv:['translate(0px,580px)','translate(0px,335px)','translate(0px,205px)','translate(0px,345px)','translate(0px,45px)','translate(0px,452px)','translate(0px,300px)','translate(0px,398px)'],steps:[1,2,4,3,5],dur:'2.6s'},
 {id:'fish',n:'Peces',svg:[[200,452,52,6],[520,466,60,8],[360,482,42,5]].map(([x,y,w,d])=>`<g class="swim" style="animation-duration:${d}s" opacity=".88">${pic('fish',x,y+15,{w})}</g>`).join(''),from:'scale(.5)'},
 {id:'beach',n:'Playa',svg:pic('beach',400,562,{w:820}),from:'translateY(60px)'},
 {id:'ship',n:'Barco',svg:`<g class="rock">${pic('ship',0,36,{w:180})}</g>`,from:'translateX(300px)',lv:['translate(400px,322px)']},
 {id:'whale',n:'Gran pez',svg:`${pic('whale',432,486,{w:640})}<ellipse cx="395" cy="356" rx="150" ry="56" fill="${G.belly}" filter="url(#blur3)"/><ellipse cx="395" cy="360" rx="112" ry="40" fill="${G.jonahGlow}"/>`,from:'none',
  lv:['translate(-820px,0px)','translate(0px,0px)'],steps:[1],dur:'1.8s'},
 {id:'noah',n:'Noé',svg:person('noah',120),from:'scale(.5)',lv:['translate(598px,402px) scale(1.2)']},
 {id:'david',n:'David',svg:person('david',112),from:'scale(.5)',lv:['translate(160px,400px)']},
 {id:'goliath',n:'Goliat',svg:person('goliath',116),from:'translateX(160px)',
  lv:['translate(520px,405px) scale(2.7) rotate(0deg)','translate(470px,392px) scale(2.7) rotate(82deg)'],steps:[0,1],dur:'1.1s'},
 {id:'jonah',n:'Jonás',svg:person('jonah',112),from:'scale(.5)',
  lv:['translate(200px,400px) scale(1)','translate(425px,324px) scale(.7)','translate(525px,385px) scale(.7)','translate(395px,392px) scale(.62)','translate(640px,400px) scale(1)','translate(300px,400px) scale(1)'],steps:[0,1,2,3,4,5],dur:'1.6s'},
 {id:'people',n:'Adán y Eva',svg:`<g transform="translate(325,400)">${person('adam',112)}</g><g transform="translate(378,400)">${person('eve',108)}</g>`,from:'scale(.4)'},
 {id:'stone',n:'Piedra',svg:pic('stone',0,9,{w:20}),from:'none',inst:true,lv:['translate(149px,297px)','translate(512px,146px)'],steps:[0,1],dur:'.5s'},
 {id:'dove',n:'Paloma',svg:`<g class="bob">${pic('dove',410,185,{w:84})}</g>`,from:'translate(-400px,-60px)'},
 {id:'birds',n:'Aves',svg:[[118,34,34,0],[168,28,46,9],[96,30,40,21],[142,24,52,30]].map(([y,w,d,t])=>`<g class="fly" style="animation-duration:${d}s;animation-delay:-${t}s"><g class="flutter" style="animation-delay:-${(t%7)*.13}s">${pic('bird',0,y+w*.55,{w})}</g></g>`).join(''),from:'none'},
 {id:'rain',n:'Lluvia (imagen)',svg:rainSvg(),from:'none'}
];
const EM=Object.fromEntries(E.map(e=>[e.id,e]));
const sky=(file,fallback)=>`url(img/${file}.webp) center/cover,${fallback}`;
const SKIES={
  day:['Día',sky('sky_day','linear-gradient(#4f9fe6,#d9f0ff)')],
  dawn:['Amanecer',sky('sky_dawn','linear-gradient(#4a3f86,#f6a96b)')],
  dusk:['Atardecer',sky('sky_dusk','linear-gradient(#1f1d4f,#e07c58)')],
  night:['Noche',sky('sky_night','linear-gradient(#050818,#1b2650)')],
  storm:['Tormenta',sky('sky_storm','linear-gradient(#1c202e,#6a7280)')],
  void:['Oscuridad','radial-gradient(ellipse at 50% 60%,#14122a,#030409 75%)'],
  deep:['Profundidad',sky('sky_deep','linear-gradient(#0e2a3d,#03101a)')]
};
