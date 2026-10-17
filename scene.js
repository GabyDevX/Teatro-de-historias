/* ============================================================================
   ESCENARIO: biblioteca de elementos dibujados en SVG (lienzo 800x500, suelo en y=400).
   Cada elemento es {id, n, svg, from, lv, steps, inst, dur}:
     n      nombre en el modo Libre        from   transform de entrada (aparece desde ahí)
     lv     lista de posiciones/niveles    steps  qué niveles recorre el botón del modo Libre
     inst   sin transición de aparición    dur    duración de la transición de lv
   El orden del arreglo E es el orden de capas (de atrás hacia adelante).
   Luces, sombras, degradados y texturas (grano, nubes orgánicas) están en DEFS.
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
  DEFS.push(`<radialGradient id="${id}" cx="${o.cx??.5}" cy="${o.cy??.5}" r="${o.r??.5}"${o.fx!=null?` fx="${o.fx}" fy="${o.fy}"`:''}>${stops.map(([f,c,op])=>`<stop offset="${f}" stop-color="${c}"${op!=null?` stop-opacity="${op}"`:''}/>`).join('')}</radialGradient>`);
  return `url(#${id})`;
};
const _cache={};
const lin=(color,horizontal)=>{ /* degradado automático claro -> oscuro de un color */
  const id='c'+color.slice(1)+(horizontal?'h':'v');
  if(!_cache[id]) _cache[id]=grad(id,[[0,shade(color,.22)],[.55,color],[1,shade(color,-.32)]],horizontal?{x2:1,y2:0}:{});
  return _cache[id];
};

/* filtros y degradados compartidos */
DEFS.push(
 '<filter id="cloudf" x="-25%" y="-60%" width="150%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".011 .02" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/><feGaussianBlur stdDeviation="1.8"/></filter>',
 '<filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>',
 '<filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>',
 '<filter id="blur2"><feGaussianBlur stdDeviation="1.6"/></filter>',
 '<filter id="grainf" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  1.3 0 0 0 -.55"/></filter>'
);
const G={
  skin:rgrad('gSkin',[[0,'#f3cfa8'],[1,'#c98d62']],{cx:.4,cy:.35,r:.75}),
  wood:grad('gWood',[[0,'#b57a40'],[.5,'#8b5a2b'],[1,'#5e3b1b']]),
  woodH:grad('gWoodH',[[0,'#7a4a24'],[.5,'#a56f3a'],[1,'#6a3f1d']],{x2:1,y2:0}),
  roof:grad('gRoof',[[0,'#8d5a2f'],[1,'#523219']]),
  wool:rgrad('gWool',[[0,'#ffffff'],[1,'#d9d4c6']],{cx:.4,cy:.3,r:.8}),
  tan:grad('gTan',[[0,'#efc678'],[.6,'#d09a45'],[1,'#a96f2a']]),
  mane:rgrad('gMane',[[0,'#a2641f'],[1,'#5a2f0e']],{cx:.5,cy:.5,r:.6}),
  grey:grad('gGrey',[[0,'#a6acba'],[.55,'#7f8696'],[1,'#575d6c']]),
  giraffe:grad('gGir',[[0,'#f0c35a'],[1,'#c98d2c']]),
  bronze:grad('gBronze',[[0,'#e6bd72'],[.5,'#b98a3e'],[1,'#7a5420']],{x2:1,y2:0}),
  steel:grad('gSteel',[[0,'#e4e8ef'],[.5,'#aab1bf'],[1,'#6f7686']],{x2:1,y2:0}),
  sand:grad('gSand',[[0,'#e6c88c'],[1,'#b78f55']]),
  sandD:grad('gSandD',[[0,'#d3b074'],[1,'#8f6a38']]),
  whale:grad('gWhale',[[0,'#7d83bb'],[.55,'#575d92'],[1,'#33386a']]),
  belly:grad('gBelly',[[0,'#eef0fa'],[1,'#b8bfdc']]),
  trunk:grad('gTrunk',[[0,'#86603b'],[.5,'#6a4a2e'],[1,'#47301d']],{x2:1,y2:0}),
  leafA:rgrad('gLeafA',[[0,'#6bb06a'],[1,'#2f7243']],{cx:.4,cy:.3,r:.8}),
  leafB:rgrad('gLeafB',[[0,'#4f9a5a'],[1,'#235f39']],{cx:.4,cy:.3,r:.8}),
  cloud:grad('gCloud',[[0,'#ffffff'],[.7,'#f3f6fb'],[1,'#c9d3e6']]),
  storm:grad('gStorm',[[0,'#59607f'],[1,'#2b2f46']]),
  hillFar:grad('gHillFar',[[0,'#6f8fa0'],[1,'#8aa9b0']]),
  hillMid:grad('gHillMid',[[0,'#4f8f63'],[1,'#2e6347']]),
  hillNear:grad('gHillNear',[[0,'#2f6b4a'],[1,'#173d2c']]),
  sun:rgrad('gSun',[[0,'#fff6c8'],[.18,'#ffe27a'],[.5,'#ffc247',.35],[1,'#ffc247',0]]),
  sunDisk:rgrad('gSunDisk',[[0,'#fffbe0'],[1,'#ffd04a']],{cx:.45,cy:.4,r:.7}),
  moonG:rgrad('gMoon',[[0,'#fffdf0',.9],[.35,'#dfe7ff',.35],[1,'#dfe7ff',0]]),
  glow:rgrad('gGlow',[[0,'#fff3b8',.95],[1,'#fff3b8',0]]),
  beam:grad('beam',[[0,'#fff3b8',.9],[1,'#fff3b8',0]]),
  water1:grad('gW1',[[0,'#69b2e8'],[.4,'#3a86c8'],[1,'#123c66']]),
  water2:grad('gW2',[[0,'#4a96d6'],[.4,'#2766a8'],[1,'#0c2c52']]),
  jonahGlow:rgrad('gJGlow',[[0,'#ffd9a0',.55],[1,'#ffd9a0',0]]),
  _end:0
};
const SHADOW='<ellipse cx="0" cy="2" rx="26" ry="5" fill="#000" opacity=".3"/>';

/* persona estilizada con volumen (ropa con pliegues, rostro con sombra, manto, cinturón) */
const fig=(o={})=>{
  const robe=o.robe||'#5b6ee1',skin=o.skin||'#e0b08a',hair=o.hair||'#4a3426',mantle=o.mantle||shade(robe,-.28);
  const sk=o.skin?lin(skin):G.skin;
  const arms=o.arms==='up'
    ?`<path d="M-16 -60Q-31 -72 -29 -94M16 -60Q31 -72 29 -94" stroke="${shade(robe,-.15)}" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="-29" cy="-96" r="4.4" fill="${skin}"/><circle cx="29" cy="-96" r="4.4" fill="${skin}"/>`
    :o.arms==='sling'
    ?`<path d="M-16 -60Q-27 -44 -23 -28" stroke="${shade(robe,-.15)}" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="-23" cy="-26" r="4.2" fill="${skin}"/><path d="M16 -60Q30 -66 31 -84" stroke="${shade(robe,-.15)}" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="31" cy="-86" r="4.2" fill="${skin}"/>`
    :`<path d="M-16 -60Q-28 -44 -24 -28M16 -60Q28 -44 24 -28" stroke="${shade(robe,-.15)}" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="-24" cy="-26" r="4.2" fill="${skin}"/><circle cx="24" cy="-26" r="4.2" fill="${skin}"/>`;
  const body=o.bare
    ?`<path d="M-15 -62Q0 -69 15 -62L13 -30Q0 -26 -13 -30Z" fill="${lin(skin)}"/><path d="M-15 -34Q0 -28 15 -34L19 -6Q0 2 -19 -6Z" fill="#4c8f52"/><path d="M-12 -30l-5 14M-4 -28l-3 18M5 -28l2 18M12 -30l5 14" stroke="#2f6b3a" stroke-width="2.4"/>`
    :`<path d="M-17 -62Q0 -71 17 -62L25 -3Q0 3 -25 -3Z" fill="${lin(robe,true)}"/>
      <path d="M-8 -50Q-10 -26 -13 -3M3 -52Q4 -28 2 0M11 -50Q15 -28 19 -4" stroke="#000" stroke-opacity=".17" stroke-width="2" fill="none"/>
      <path d="M-25 -3Q0 3 25 -3" stroke="${shade(robe,.3)}" stroke-width="2.2" fill="none" opacity=".55"/>
      <path d="M-19 -62Q0 -74 19 -62L17 -44Q0 -52 -17 -44Z" fill="${lin(mantle,true)}"/>
      <path d="M-20 -33Q0 -28 20 -33L21 -28Q0 -22 -21 -28Z" fill="${o.belt||'#7b5a34'}"/>`;
  const clothBack=o.cloth?`<path d="M-15 -80Q-17 -96 0 -96Q17 -96 15 -80L21 -60Q0 -55 -21 -60Z" fill="${lin(o.cloth,true)}"/>`:'';
  const clothTop=o.cloth
    ?`<path d="M-13 -83Q0 -98 13 -83Q9 -79 0 -79Q-9 -79 -13 -83Z" fill="${lin(o.cloth,true)}"/><path d="M-12.6 -85Q0 -80 12.6 -85" stroke="${shade(o.cloth,-.45)}" stroke-width="3" fill="none"/>`
    :`<path d="M-11.5 -80Q-12.5 -94 0 -94Q12.5 -94 11.5 -80Q8 -87 0 -87Q-8 -87 -11.5 -80Z" fill="${hair}"/>`;
  return `<g class="breathe">${SHADOW}<path d="M-14 -2h10v4h-12zM4 -2h10v4h-8z" fill="#3b2a1d"/>${body}${arms}
  <path d="M-5 -66h10v8h-10z" fill="${shade(skin,-.15)}"/>${clothBack}
  <g transform="translate(0,-76)"><circle cx="-10.6" cy="1" r="2.6" fill="${shade(skin,-.1)}"/><circle cx="10.6" cy="1" r="2.6" fill="${shade(skin,-.1)}"/>
  <ellipse cx="0" cy="0" rx="11" ry="13" fill="${sk}"/>
  <path d="M-11 0Q-11 10 0 13Q11 10 11 0Q8 9 0 11Q-8 9 -11 0Z" fill="#000" opacity=".08"/>
  <ellipse cx="-4.4" cy="-1.4" rx="2.3" ry="1.5" fill="#fff"/><ellipse cx="4.4" cy="-1.4" rx="2.3" ry="1.5" fill="#fff"/>
  <circle cx="-4.2" cy="-1.3" r="1.1" fill="#2a1a10"/><circle cx="4.6" cy="-1.3" r="1.1" fill="#2a1a10"/>
  <path d="M-7.4 -4.6Q-4.4 -6.2 -1.6 -4.8M1.6 -4.8Q4.4 -6.2 7.4 -4.6" stroke="${hair}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <path d="M0 -1Q2 3 -.6 4.4" stroke="#9a6440" stroke-width="1" fill="none"/>
  <path d="M-3 7.4Q0 9 3 7.4" stroke="#8a4a3a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <ellipse cx="-6.6" cy="4.2" rx="2.6" ry="1.6" fill="#e0707a" opacity=".16"/><ellipse cx="6.6" cy="4.2" rx="2.6" ry="1.6" fill="#e0707a" opacity=".16"/>
  ${o.beard||''}</g>${clothTop}${o.extra||''}</g>`;
};
const beardOf=(c)=>`<path d="M-10 2Q-12 17 0 26Q12 17 10 2Q6 11 0 11Q-6 11 -10 2Z" fill="${lin(c)}"/><path d="M-3.4 7.4Q0 9.2 3.4 7.4" stroke="#8a4a3a" stroke-width="1.2" fill="none"/>`;

const sheep=(x,y,s=1)=>`<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="0" cy="1" rx="24" ry="4" fill="#000" opacity=".28"/>
 <path d="M-11 -9v10M-3 -9v10M6 -9v10M13 -9v10" stroke="#2d2926" stroke-width="3.4" stroke-linecap="round"/>
 <g fill="${G.wool}"><circle cx="-12" cy="-19" r="11"/><circle cx="0" cy="-25" r="13"/><circle cx="12" cy="-20" r="11"/><circle cx="-4" cy="-13" r="12"/><circle cx="9" cy="-13" r="11"/><circle cx="-14" cy="-11" r="8"/></g>
 <ellipse cx="-24" cy="-20" rx="7" ry="8.5" fill="#3a3430"/><ellipse cx="-29" cy="-27" rx="5" ry="2.4" fill="#2d2926" transform="rotate(-25 -29 -27)"/><ellipse cx="-19" cy="-28" rx="5" ry="2.4" fill="#2d2926" transform="rotate(18 -19 -28)"/>
 <circle cx="-26" cy="-22" r="1.4" fill="#fff"/><circle cx="-26" cy="-22" r=".7" fill="#111"/><ellipse cx="-28.6" cy="-16" rx="2.4" ry="1.5" fill="#5a4a44"/></g>`;
const tree=(x,y,s=1)=>`<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="4" cy="1" rx="34" ry="6" fill="#000" opacity=".25"/>
 <path d="M-8 0Q-4 -30 -6 -60L7 -60Q4 -30 9 0Z" fill="${G.trunk}"/><path d="M-1 -40Q-14 -52 -22 -62M2 -46Q16 -58 24 -64" stroke="#5a3d24" stroke-width="5" stroke-linecap="round" fill="none"/>
 <g><circle cx="-24" cy="-66" r="22" fill="${G.leafB}"/><circle cx="26" cy="-68" r="22" fill="${G.leafB}"/><circle cx="0" cy="-86" r="30" fill="${G.leafA}"/><circle cx="-12" cy="-72" r="20" fill="${G.leafA}"/><circle cx="14" cy="-76" r="20" fill="${G.leafA}"/>
 <circle cx="-10" cy="-96" r="9" fill="#8fd081" opacity=".5"/><circle cx="10" cy="-84" r="7" fill="#8fd081" opacity=".4"/><circle cx="-28" cy="-72" r="6" fill="#7bc474" opacity=".35"/></g></g>`;
const giraffe=`<g transform="translate(110,400)"><ellipse cx="4" cy="2" rx="34" ry="5" fill="#000" opacity=".26"/>
 <path d="M-14 -38L-12 -3M-2 -38L0 -3M12 -38L14 -3M24 -36L26 -3" stroke="#d8a03a" stroke-width="5.6" stroke-linecap="round"/><path d="M-14 -5v5M0 -5v5M14 -5v5M26 -5v5" stroke="#4a3018" stroke-width="6" stroke-linecap="round"/>
 <path d="M24 -50Q40 -44 36 -34" stroke="#d8a03a" stroke-width="3" fill="none"/><ellipse cx="38" cy="-30" rx="2" ry="5" fill="#5a3a18"/>
 <ellipse cx="4" cy="-52" rx="30" ry="17" fill="${G.giraffe}"/>
 <path d="M10 -62L26 -140L40 -136L26 -56Z" fill="${G.giraffe}"/><path d="M38 -137Q44 -112 28 -60" stroke="#8a5a1c" stroke-width="3" fill="none"/>
 <ellipse cx="42" cy="-142" rx="15" ry="8.5" fill="${G.giraffe}" transform="rotate(-16 42 -142)"/><ellipse cx="52" cy="-138" rx="5" ry="4" fill="#e7b563" transform="rotate(-16 52 -138)"/>
 <path d="M34 -150l-2 -10M42 -152l1 -10" stroke="#7a4a18" stroke-width="2.2"/><circle cx="32" cy="-161" r="2.4" fill="#4a2a10"/><circle cx="43" cy="-163" r="2.4" fill="#4a2a10"/>
 <ellipse cx="30" cy="-146" rx="3" ry="5" fill="#d8a03a" transform="rotate(-50 30 -146)"/><circle cx="45" cy="-144" r="2" fill="#2a1a0a"/>
 <g fill="#9a5f1f" opacity=".85"><path d="M-14 -62l9 -3 4 8 -8 5z"/><path d="M2 -66l10 1 1 9 -10 2z"/><path d="M14 -54l9 2 -2 9 -9 -2z"/><path d="M-4 -44l8 -1 2 7 -8 3z"/><path d="M-20 -48l6 -2 3 6 -6 3z"/><path d="M20 -78l8 0 -1 9 -8 0z"/><path d="M26 -100l8 -1 -1 10 -8 1z"/><path d="M30 -122l7 -1 0 9 -7 1z"/><path d="M18 -64l5 -1 0 6 -5 1z"/></g></g>`;
const elephant=`<g transform="translate(195,400)"><ellipse cx="2" cy="2" rx="52" ry="6" fill="#000" opacity=".28"/>
 <path d="M26 -34v33M40 -30v29" stroke="${G.grey}" stroke-width="15" stroke-linecap="round"/><path d="M-26 -34v33M-10 -34v33" stroke="#6f7686" stroke-width="15" stroke-linecap="round"/>
 <g fill="#d9d2c0"><ellipse cx="26" cy="-1" rx="6" ry="3"/><ellipse cx="40" cy="-1" rx="6" ry="3"/><ellipse cx="-26" cy="-1" rx="6" ry="3"/><ellipse cx="-10" cy="-1" rx="6" ry="3"/></g>
 <ellipse cx="6" cy="-52" rx="50" ry="34" fill="${G.grey}"/><path d="M-30 -30Q6 -18 44 -34" stroke="#000" stroke-opacity=".12" stroke-width="10" fill="none"/>
 <path d="M52 -62Q64 -60 66 -44" stroke="#6f7686" stroke-width="3" fill="none"/>
 <circle cx="-42" cy="-58" r="24" fill="${G.grey}"/>
 <ellipse cx="-26" cy="-62" rx="18" ry="27" fill="#6b7282"/><ellipse cx="-27" cy="-62" rx="12" ry="21" fill="#c79a98" opacity=".55"/>
 <path d="M-58 -70Q-84 -52 -76 -26Q-72 -8 -60 -6Q-52 -8 -58 -16Q-66 -28 -62 -44Q-58 -54 -50 -60Z" fill="${G.grey}"/>
 <path d="M-72 -46q5 3 9 0M-74 -36q5 3 9 0M-72 -26q5 3 9 0" stroke="#4a505e" stroke-width="1.6" fill="none"/>
 <path d="M-60 -52Q-80 -44 -78 -34" stroke="#f2ecd6" stroke-width="4.5" stroke-linecap="round" fill="none"/>
 <circle cx="-50" cy="-64" r="2.4" fill="#16161c"/><circle cx="-49.4" cy="-64.8" r=".8" fill="#fff"/></g>`;
const lion=`<g transform="translate(500,400)"><ellipse cx="2" cy="2" rx="52" ry="6" fill="#000" opacity=".28"/>
 <path d="M44 -34Q66 -32 68 -58Q68 -66 62 -68" stroke="#c9922f" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="62" cy="-70" rx="5.5" ry="9" fill="#4a2410" transform="rotate(12 62 -70)"/>
 <path d="M20 -30L24 -3L36 -3L36 -34Z" fill="${G.tan}"/><path d="M-22 -30L-20 -3L-8 -3L-6 -30Z" fill="${G.tan}"/>
 <path d="M-26 -4h13M20 -4h16" stroke="#8a5a1c" stroke-width="5" stroke-linecap="round"/>
 <path d="M-30 -46Q-6 -64 38 -52Q54 -36 40 -22Q10 -12 -26 -22Z" fill="${G.tan}"/><path d="M-20 -22Q10 -12 36 -24" stroke="#f1d49a" stroke-width="5" opacity=".5" fill="none"/>
 <g transform="translate(-36,-38)"><circle r="31" fill="${G.mane}"/>${[...Array(12)].map((_,k)=>`<ellipse rx="8" ry="${k%2?29:34}" fill="${k%2?'#7a4116':'#5a2f0e'}" transform="rotate(${k*30})" opacity=".92"/>`).join('')}<circle r="22" fill="#8f5420"/>
 <ellipse cx="-2" cy="2" rx="16" ry="16.5" fill="#e8bb6a"/><ellipse cx="-9" cy="9" rx="8.5" ry="6.4" fill="#f4dca6"/>
 <path d="M-12 8l3 4 3 -4z" fill="#4a2414"/><path d="M-9 12q-3 4 -6 2M-9 12q3 4 6 2" stroke="#4a2414" stroke-width="1.2" fill="none"/>
 <ellipse cx="-9" cy="-6" rx="3.4" ry="2.2" fill="#3a2410"/><ellipse cx="5" cy="-6" rx="3.4" ry="2.2" fill="#3a2410"/><circle cx="-9" cy="-6" r="1.2" fill="#e8a020"/><circle cx="5" cy="-6" r="1.2" fill="#e8a020"/>
 <circle cx="-14" cy="-19" r="6" fill="#c99038"/><circle cx="8" cy="-21" r="6" fill="#c99038"/><circle cx="-14" cy="-19" r="3" fill="#7a4a20"/><circle cx="8" cy="-21" r="3" fill="#7a4a20"/></g></g>`;

const skyline=()=>{
  let s='<ellipse cx="640" cy="402" rx="190" ry="8" fill="#000" opacity=".22"/>';
  const towers=[[480,300,62],[545,252,52],[602,318,70],[675,276,58],[735,306,58]];
  towers.forEach(([x,y,w],i)=>{
    s+=`<rect x="${x}" y="${y}" width="${w}" height="${400-y}" fill="${G.sand}"/><rect x="${x+w-14}" y="${y}" width="14" height="${400-y}" fill="#000" opacity=".12"/>`;
    for(let c=0;c<Math.floor(w/14);c++) s+=`<rect x="${x+c*14+1}" y="${y-8}" width="9" height="9" fill="${G.sand}"/>`;
    s+=`<path d="M${x+w/2-9} ${y+28}v16a9 9 0 0 0 18 0v-16a9 9 0 0 0 -18 0z" fill="#4a3320"/><path d="M${x+w/2-9} ${y+66}v16a9 9 0 0 0 18 0v-16a9 9 0 0 0 -18 0z" fill="#ffcf72" opacity=".9"/>`;
  });
  s+=`<path d="M600 400v-52a22 22 0 0 1 44 0v52z" fill="#3a2614"/><path d="M606 400v-48a16 16 0 0 1 32 0v48z" fill="#ffb14a" opacity=".55"/>`;
  s+=`<polygon points="545,244 571,214 597,244" fill="${G.sandD}"/><path d="M571 214v-22l14 5-14 6" stroke="#6a2c1e" fill="#d84a4a"/>`;
  return s;
};
const rainbow=()=>{
  const cols=['#ff4d4d','#ff9f40','#ffd93d','#5bd16a','#4da3ff','#7b5cff']; let s='<g filter="url(#blur2)" fill="none" stroke-width="12" opacity=".9">';
  cols.forEach((c,i)=>{const r=330-i*11; s+=`<path d="M${400-r} 400A${r} ${r} 0 0 1 ${400+r} 400" stroke="${c}"/>`;});
  return s+'</g><path d="M80 400A320 320 0 0 1 720 400" stroke="#fff" stroke-width="30" fill="none" opacity=".12" filter="url(#blur8)"/>';
};
const starsSvg=()=>{
  let s='<g fill="#fff">',x=7; for(let i=0;i<34;i++){x=(x*73+19)%997; const cx=(x*0.8)%790+5,cy=((x*37)%240)+10; s+=`<circle class="star" style="animation-delay:${(i%7)*.4}s" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${i%5?1.3:2.3}"/>`;}
  return s+'</g>';
};
const flowersSvg=()=>{
  let s='',x=11; const cols=['#ff6b8b','#ffd23f','#ff9a3d','#c07cff','#ffffff'];
  for(let i=0;i<22;i++){x=(x*53+17)%991; const cx=(x%760)+20,cy=424+((x*7)%60),c=cols[i%5];
    s+=`<path d="M${cx} ${cy}q-2 8 0 16" stroke="#2f7a45" stroke-width="2" fill="none"/>`+[0,72,144,216,288].map(a=>`<ellipse cx="${cx}" cy="${cy-3.4}" rx="2.2" ry="3.6" fill="${c}" transform="rotate(${a} ${cx} ${cy})"/>`).join('')+`<circle cx="${cx}" cy="${cy}" r="1.9" fill="#a8581a"/>`;}
  return s;
};
const rainSvg=()=>{
  let s='<g stroke="#cfe3ff" stroke-linecap="round" opacity=".75">',x=5;
  for(let i=0;i<64;i++){x=(x*61+23)%983; const near=i%3===0,xx=(x*0.82)%800;
    s+=`<line class="drop${near?' near':''}" style="animation-delay:-${((x%75)/100).toFixed(2)}s" stroke-width="${near?2.2:1.2}" x1="${xx.toFixed(0)}" y1="-40" x2="${(xx-(near?9:5)).toFixed(0)}" y2="${near?-4:-18}"/>`;}
  return s+'</g><rect x="0" y="340" width="800" height="160" fill="url(#gMist)"/>';
};
grad('gMist',[[0,'#cfe3ff',0],[1,'#cfe3ff',.28]]);
const waveD=(()=>{let d='M0 0Q50 -14 100 0'; for(let i=2;i<=12;i++) d+=`T${i*100} 0`; return d;})();
const crowd=()=>{
  const c=['#c24d6a','#2f9a8a','#d7a22a','#7b5cd6','#cf6b2c'];
  return c.map((r,i)=>`<g transform="translate(${520+i*46},400) scale(.62)">${fig({robe:r,hair:i%2?'#222':'#6a3f22',arms:i%2?'up':'',cloth:i===1?'#e8e0cc':''})}</g>`).join('');
};
const staff=(x,h=-104)=>`<path d="M${x} 2L${x+2} ${h}" stroke="#5a3d24" stroke-width="3.4" stroke-linecap="round"/><path d="M${x+2} ${h}q4 -4 0 -8" stroke="#5a3d24" stroke-width="3" fill="none" stroke-linecap="round"/>`;

const giant=()=>`<g class="breathe">${SHADOW.replace('rx="26"','rx="30"')}
 <path d="M-15 -2h11v5h-13zM4 -2h11v5h-9z" fill="#3b2a1d"/><path d="M-13 -30v26M10 -30v26" stroke="${G.bronze}" stroke-width="8" stroke-linecap="round"/>
 <path d="M-20 -64Q0 -72 20 -64L27 -6Q0 2 -27 -6Z" fill="${G.bronze}"/>
 ${[...Array(5)].map((_,r)=>[...Array(5)].map((_,c)=>`<path d="M${-17+c*8+(r%2)*4} ${-60+r*10}q4 6 8 0" stroke="#5a3d12" stroke-opacity=".55" stroke-width="1.2" fill="none"/>`).join('')).join('')}
 <path d="M-27 -6Q0 2 27 -6L26 -22Q0 -14 -26 -22Z" fill="#7a4a24"/><path d="M-22 -34Q0 -28 22 -34L22 -28Q0 -22 -22 -28Z" fill="#4a2e16"/>
 <path d="M-18 -62Q-34 -50 -30 -36" stroke="${shade('#c9a15a',-.2)}" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="-30" cy="-33" r="5" fill="#d8aa84"/>
 <path d="M18 -62Q30 -48 26 -36" stroke="${shade('#c9a15a',-.2)}" stroke-width="9" stroke-linecap="round" fill="none"/>
 <path d="M-5 -68h10v8h-10z" fill="#c99872"/>
 <g transform="translate(0,-78)"><ellipse rx="11.5" ry="13.5" fill="#d9a77e"/><ellipse cx="-4.4" cy="-1" rx="2.4" ry="1.4" fill="#fff"/><ellipse cx="4.4" cy="-1" rx="2.4" ry="1.4" fill="#fff"/><circle cx="-4.2" cy="-1" r="1" fill="#1a120c"/><circle cx="4.6" cy="-1" r="1" fill="#1a120c"/>
  <path d="M-8 -4l6 2M8 -4l-6 2" stroke="#2a1a10" stroke-width="1.8"/><path d="M-4 8Q0 6 4 8" stroke="#6a3a2a" stroke-width="1.4" fill="none"/><path d="M-11 4Q0 18 11 4Q8 14 0 15Q-8 14 -11 4Z" fill="#2c211a"/>
  <path d="M-14 -4Q-15 -20 0 -20Q15 -20 14 -4Q12 -8 8 -9L8 -2L5 -2L5 -10L-5 -10L-5 -2L-8 -2L-8 -9Q-12 -8 -14 -4Z" fill="${G.steel}"/><path d="M-1 -20Q0 -34 6 -32Q4 -24 3 -20Z" fill="#b53a3a"/></g>
 <g transform="translate(30,-30)"><circle r="19" fill="${G.bronze}"/><circle r="14" fill="none" stroke="#5a3d12" stroke-width="1.6"/><circle r="5" fill="${G.steel}"/><circle cx="-6" cy="-7" r="4" fill="#fff" opacity=".18"/></g>
 <path d="M-40 4L-38 -120" stroke="#6b4a2a" stroke-width="3.4"/><polygon points="-38,-134 -43.5,-116 -32.5,-116" fill="${G.steel}"/></g>`;

/* orden de capas: de atrás hacia adelante */
const E=[
 {id:'godlight',n:'Luz de Dios',svg:`<g class="pulse" style="mix-blend-mode:screen"><circle cx="400" cy="-10" r="230" fill="${G.glow}"/><polygon points="400,-10 240,500 560,500" fill="url(#beam)"/><polygon points="400,-10 90,500 230,500" fill="url(#beam)" opacity=".55"/><polygon points="400,-10 570,500 710,500" fill="url(#beam)" opacity=".55"/><polygon points="400,-10 330,500 470,500" fill="url(#beam)" opacity=".5"/></g>${[...Array(16)].map((_,k)=>`<circle class="mote" style="animation-delay:-${(k*.7).toFixed(1)}s;animation-duration:${8+k%5}s" cx="${230+k*22}" cy="${440-(k*37)%120}" r="${1.2+k%3*.5}" fill="#fff6c8"/>`).join('')}`,from:'none'},
 {id:'stars',n:'Estrellas',svg:starsSvg(),from:'none'},
 {id:'moon',n:'Luna',svg:`<circle cx="165" cy="95" r="80" fill="${G.moonG}"/><path d="M160 56a34 34 0 1 0 0 68a27 27 0 1 1 0-68z" fill="#f4efdc"/><circle cx="150" cy="88" r="3" fill="#cfc8b0" opacity=".6"/><circle cx="147" cy="104" r="2" fill="#cfc8b0" opacity=".5"/>`,from:'translateY(-40px)'},
 {id:'sun',n:'Sol',svg:`<circle cx="660" cy="95" r="170" fill="${G.sun}"/><circle class="spin" cx="660" cy="95" r="56" fill="none" stroke="#ffe27a" stroke-width="12" stroke-dasharray="3 16" opacity=".8"/><circle cx="660" cy="95" r="38" fill="${G.sunDisk}"/>`,from:'translateY(-60px)'},
 {id:'rainbow',n:'Arcoíris',svg:rainbow(),from:'scale(.7)'},
 {id:'cloud',n:'Nubes',svg:`<g class="drift"><g filter="url(#cloudf)" fill="${G.cloud}"><ellipse cx="260" cy="104" rx="66" ry="22"/><ellipse cx="300" cy="86" rx="42" ry="26"/><ellipse cx="228" cy="94" rx="34" ry="20"/><ellipse cx="562" cy="152" rx="58" ry="19"/><ellipse cx="594" cy="138" rx="36" ry="22"/><ellipse cx="530" cy="146" rx="30" ry="15"/><ellipse cx="250" cy="112" rx="50" ry="16"/><ellipse cx="575" cy="160" rx="44" ry="13"/></g></g>`,from:'translateX(-120px)'},
 {id:'stormcloud',n:'Nubarrones',svg:`<g class="drift"><g filter="url(#cloudf)"><ellipse cx="200" cy="58" rx="150" ry="52" fill="${G.storm}"/><ellipse cx="380" cy="46" rx="130" ry="56" fill="${G.storm}"/><ellipse cx="570" cy="60" rx="160" ry="54" fill="${G.storm}"/><ellipse cx="750" cy="52" rx="110" ry="48" fill="${G.storm}"/><ellipse cx="300" cy="84" rx="120" ry="30" fill="#1f2236" opacity=".7"/><ellipse cx="620" cy="88" rx="130" ry="30" fill="#1f2236" opacity=".7"/></g></g>`,from:'translateY(-100px)'},
 {id:'lightning',n:'Rayos',svg:`<rect class="flash" x="0" y="0" width="800" height="500" fill="#dfe8ff"/><g class="bolt"><polygon points="520,60 490,190 530,190 500,320 585,160 540,160 565,60" fill="#fff6b0" filter="url(#blur3)"/><polygon points="520,60 490,190 530,190 500,320 585,160 540,160 565,60" fill="#fffbe6"/></g>`,from:'none'},
 {id:'land',n:'Colinas',svg:`<path d="M0 372Q90 318 170 346Q260 300 360 352Q470 318 560 350Q680 312 800 356V500H0Z" fill="${G.hillFar}" opacity=".85"/><path d="M0 380Q150 300 320 370T640 350T800 365V500H0Z" fill="${G.hillMid}"/><path d="M0 380Q150 300 320 370T640 350" stroke="#a8e0a0" stroke-opacity=".35" stroke-width="2" fill="none"/><path d="M0 430Q200 380 420 425T800 410V500H0Z" fill="${G.hillNear}"/><path d="M0 430Q200 380 420 425T800 410" stroke="#7fc07a" stroke-opacity=".3" stroke-width="2" fill="none"/>${[...Array(26)].map((_,k)=>{const x=(k*97)%790+5,y=432+(k*53)%58; return `<path d="M${x} ${y}l-2 -9M${x} ${y}l1 -11M${x} ${y}l4 -8" stroke="#8fd08a" stroke-opacity=".45" stroke-width="1.4" fill="none"/>`;}).join('')}`,from:'translateY(60px)'},
 {id:'tents',n:'Campamentos',svg:[[20,'#cdbf9a','#8f8466'],[80,'#d8c9a4','#948968'],[650,'#a8826c','#664a3a'],[710,'#b48f78','#6f503f']].map(([x,a,b],i)=>`<ellipse cx="${x+36}" cy="400" rx="46" ry="5" fill="#000" opacity=".25"/><polygon points="${x},399 ${x+36},${i%2?344:350} ${x+72},399" fill="${a}"/><polygon points="${x+36},${i%2?344:350} ${x+72},399 ${x+36},399" fill="${b}"/><path d="M${x+36} ${i%2?344:350}V399" stroke="#00000033"/><path d="M${x+26} 399l10 -26l10 26z" fill="#2a1c12" opacity=".7"/>`).join('')+'<path d="M55 350v-26l18 6-18 8M686 346v-24l-18 6 18 8" stroke="#333" fill="#d84a4a"/>',from:'translateY(40px)'},
 {id:'city',n:'Nínive',svg:skyline(),from:'translateY(90px)'},
 {id:'trees',n:'Árboles',svg:tree(42,398,.95)+tree(758,402,1.1),from:'scale(.4)'},
 {id:'flowers',n:'Flores',svg:flowersSvg(),from:'scale(.3)'},
 {id:'ark',n:'Arca',svg:`<ellipse cx="400" cy="396" rx="150" ry="8" fill="#000" opacity=".22"/>
  <path d="M236 318H564L526 394Q400 408 274 394Z" fill="${G.wood}"/><path d="M236 318H564L560 330H240Z" fill="#c58a4c"/>
  <path d="M244 340Q400 350 556 340M254 362Q400 372 546 362M264 382Q400 392 536 382" stroke="#3e2410" stroke-opacity=".5" stroke-width="2.2" fill="none"/>
  <g stroke="#3e2410" stroke-opacity=".3" stroke-width="1.4">${[...Array(14)].map((_,k)=>`<path d="M${268+k*22} 322L${278+k*20} 390"/>`).join('')}</g>
  <rect x="320" y="266" width="160" height="54" fill="${G.woodH}"/><g stroke="#3e2410" stroke-opacity=".45" stroke-width="1.6">${[...Array(7)].map((_,k)=>`<path d="M${343+k*22} 268v50"/>`).join('')}</g>
  <path d="M300 270L400 218L500 270Z" fill="${G.roof}"/><path d="M308 270L400 226L492 270" stroke="#2e1a0a" stroke-opacity=".35" stroke-width="3" fill="none"/>${[0,1,2,3].map(k=>`<path d="M${322+k*12} ${262-k*8}L${478-k*12} ${262-k*8}" stroke="#2e1a0a" stroke-opacity=".3" stroke-width="2"/>`).join('')}
  <rect x="388" y="288" width="24" height="32" rx="3" fill="#3a2410"/><g fill="#ffd77a"><rect x="342" y="282" width="18" height="16" rx="2"/><rect x="440" y="282" width="18" height="16" rx="2"/></g><g fill="#ffe9a8" opacity=".5" filter="url(#blur3)"><rect x="338" y="278" width="26" height="24"/><rect x="436" y="278" width="26" height="24"/></g>
  <path d="M236 318v-14h328v14" stroke="#6d4420" stroke-width="3" fill="none"/><path d="M526 394L578 396" stroke="#4a2e16" stroke-width="3"/>`,from:'translateY(-120px)',
  lv:['translate(0px,0px)','translate(0px,-150px)','translate(0px,-165px)','translate(0px,-20px)'],steps:[0,1,3],dur:'2.2s'},
 {id:'sheep',n:'Ovejas',svg:sheep(60,405)+sheep(100,418)+sheep(250,410,.9),from:'scale(.5)'},
 {id:'lion',n:'León',svg:lion,from:'translateX(80px)'},
 {id:'animals',n:'Animales',svg:giraffe+elephant+sheep(660,402)+sheep(705,404,.9),from:'translateX(-80px)'},
 {id:'crowd',n:'Gente',svg:crowd(),from:'translateX(60px)'},
 {id:'banner',n:'Banderas',svg:`<g class="bob">${[[60,'#e0415b',1],[740,'#3d79d6',-1]].map(([x,c,d])=>`<path d="M${x} 404V236" stroke="#6a4a2e" stroke-width="5"/><circle cx="${x}" cy="234" r="5" fill="#d4a84a"/><path d="M${x+d*2} 240Q${x+d*45} 232 ${x+d*90} 250Q${x+d*45} 262 ${x+d*2} 290Z" fill="${lin(c,true)}"/>`).join('')}</g>`,from:'translateY(60px)'},
 {id:'fish',n:'Peces',svg:[[200,470,'#ff9a3d',22,10,6],[520,478,'#c8d4e6',26,11,8],[360,488,'#ffd23f',18,8,5]].map(([x,y,c,rx,ry,d])=>`<g class="swim" style="animation-duration:${d}s"><g transform="translate(${x},${y})"><polygon class="tail" points="${rx-2},0 ${rx+16},-${ry} ${rx+16},${ry}" fill="${shade(c,-.15)}"/><ellipse rx="${rx}" ry="${ry}" fill="${lin(c)}"/><path d="M-${rx*.3} -${ry} Q0 -${ry+7} ${rx*.4} -${ry*.8}" fill="${shade(c,-.2)}"/><circle cx="-${rx*.55}" cy="-${ry*.2}" r="2.4" fill="#fff"/><circle cx="-${rx*.55}" cy="-${ry*.2}" r="1.2" fill="#111"/></g></g>`).join(''),from:'scale(.5)'},
 {id:'flood',n:'Agua',svg:`<g opacity=".92"><g transform="translate(0 14)"><path class="waves2" d="${waveD}V620H0Z" fill="${G.water1}"/><path class="waves2" d="${waveD}" stroke="#d8efff" stroke-opacity=".5" stroke-width="2.4" fill="none"/></g><path class="waves" d="${waveD}V620H0Z" fill="${G.water2}"/><path class="waves" d="${waveD}" stroke="#e8f6ff" stroke-opacity=".6" stroke-width="2.6" fill="none"/><rect y="30" width="800" height="60" fill="#fff" opacity=".05"/></g>`,from:'none',
  lv:['translate(0px,580px)','translate(0px,335px)','translate(0px,205px)','translate(0px,345px)','translate(0px,45px)','translate(0px,452px)'],steps:[1,2,4,3,5],dur:'2.6s'},
 {id:'ship',n:'Barco',svg:`<g class="rock"><ellipse cx="0" cy="30" rx="80" ry="5" fill="#000" opacity=".2"/><path d="M-76 -4H76L54 32Q0 38 -54 32Z" fill="${G.wood}"/><path d="M-76 -4H76L73 3H-73Z" fill="#c58a4c"/><path d="M-60 12Q0 18 60 12M-54 24Q0 30 54 24" stroke="#3e2410" stroke-opacity=".5" stroke-width="2" fill="none"/><rect x="-2.5" y="-96" width="5" height="96" fill="#4a2e16"/><path d="M4 -92Q70 -64 4 -18Z" fill="#f4efe0"/><path d="M4 -92Q40 -70 4 -18" fill="#000" opacity=".08"/><path d="M-3 -96l-18 8 18 4z" fill="#d84a4a"/></g>`,from:'translateX(300px)',lv:['translate(400px,322px)']},
 {id:'whale',n:'Gran pez',svg:`<path d="M130 400Q140 300 330 300Q560 295 640 380Q690 340 735 300Q725 350 715 400Q745 430 700 450Q660 420 630 430Q500 480 330 475Q150 470 130 400Z" fill="${G.whale}"/>
  <path d="M180 425Q400 495 620 432Q500 458 330 452Z" fill="${G.belly}"/><g stroke="#8f96c4" stroke-opacity=".6" stroke-width="1.4" fill="none">${[...Array(9)].map((_,k)=>`<path d="M${200+k*48} ${448+k%2}Q${215+k*48} 458 ${240+k*48} 452"/>`).join('')}</g>
  <path d="M150 410Q300 440 470 436" stroke="#1c2048" stroke-width="3" fill="none"/>
  <path d="M170 360Q330 330 520 340" stroke="#a8afe0" stroke-opacity=".3" stroke-width="10" fill="none" filter="url(#blur3)"/>
  <ellipse cx="400" cy="395" rx="135" ry="55" fill="#1c1c44" opacity=".82"/><ellipse cx="400" cy="400" rx="110" ry="42" fill="${G.jonahGlow}"/>
  <path d="M700 330Q760 300 790 262Q770 320 734 372Z" fill="#33386a"/><path d="M700 380Q770 380 796 430Q750 410 704 410Z" fill="#33386a"/>
  <circle cx="196" cy="378" r="8" fill="#fff"/><circle cx="196" cy="378" r="4.4" fill="#111"/><circle cx="194.6" cy="376.6" r="1.4" fill="#fff"/><path d="M186 370Q196 364 207 369" stroke="#1c2048" stroke-width="2.4" fill="none"/>
  <g class="spout" fill="#dff0ff" opacity=".8"><path d="M330 300q-14 -34 -34 -50M330 300q0 -42 6 -62M330 300q14 -34 34 -46" stroke="#dff0ff" stroke-width="5" stroke-linecap="round" fill="none"/></g>`,from:'none',
  lv:['translate(-820px,0px)','translate(0px,0px)'],steps:[1],dur:'1.8s'},
 {id:'noah',n:'Noé',svg:fig({robe:'#4f6fd6',mantle:'#c9b48a',cloth:'#efe9da',hair:'#e8e2d6',beard:beardOf('#efeae0'),extra:staff(34)}),from:'scale(.5)',lv:['translate(590px,400px) scale(1.05)']},
 {id:'david',n:'David',svg:fig({robe:'#d9b86a',mantle:'#8a5a34',belt:'#5a3a1c',hair:'#6a3f22',arms:'sling',extra:'<path d="M31 -88Q44 -76 38 -60M31 -88Q22 -72 30 -58" stroke="#8a6a3a" stroke-width="1.6" fill="none"/><ellipse cx="34" cy="-56" rx="5" ry="4" fill="#6b4a2a"/><path d="M-30 2L-28 -92" stroke="#6b4a2a" stroke-width="3.2" stroke-linecap="round"/><rect x="-9" y="-30" width="9" height="11" rx="2" fill="#6a4a2a"/>'}),from:'scale(.5)',lv:['translate(160px,400px)']},
 {id:'goliath',n:'Goliat',svg:giant(),from:'translateX(160px)',
  lv:['translate(520px,405px) scale(2.7) rotate(0deg)','translate(470px,392px) scale(2.7) rotate(82deg)'],steps:[0,1],dur:'1.1s'},
 {id:'jonah',n:'Jonás',svg:fig({robe:'#c98a3a',mantle:'#7a5030',cloth:'#e8dcc0',hair:'#3a2a1a',beard:beardOf('#3a2a1a')}),from:'scale(.5)',
  lv:['translate(200px,400px) scale(1)','translate(425px,324px) scale(.7)','translate(525px,385px) scale(.7)','translate(390px,412px) scale(.7)','translate(640px,400px) scale(1)','translate(300px,400px) scale(1)'],steps:[0,1,2,3,4,5],dur:'1.6s'},
 {id:'people',n:'Adán y Eva',svg:`<g transform="translate(320,400)">${fig({bare:true,robe:'#d9a57a',skin:'#d9a57a',hair:'#3a2a1a'})}</g><g transform="translate(375,400)">${fig({bare:true,robe:'#e6b78d',skin:'#e6b78d',hair:'#6a3214',extra:'<path d="M-12 -86Q-26 -66 -20 -36Q-14 -52 -12 -70Z" fill="#6a3214"/><path d="M12 -86Q26 -66 20 -36Q14 -52 12 -70Z" fill="#6a3214"/>'})}</g>`,from:'scale(.4)'},
 {id:'stone',n:'Piedra',svg:'<circle r="7.5" fill="#bdb6a6" stroke="#7a746a" stroke-width="1.6"/><circle cx="-2" cy="-2.4" r="3" fill="#fff" opacity=".35"/>',from:'none',inst:true,lv:['translate(190px,372px)','translate(512px,216px)'],steps:[0,1],dur:'.55s'},
 {id:'dove',n:'Paloma',svg:`<g class="bob"><ellipse cx="410" cy="150" rx="22" ry="12" fill="#fafcff"/><ellipse cx="406" cy="154" rx="16" ry="6" fill="#dbe3ee" opacity=".6"/><circle cx="430" cy="142" r="8.5" fill="#fff"/><polygon points="437,141 449,145 437,149" fill="#f0a030"/><path d="M390 152L366 164L394 160Z" fill="#fff"/><path d="M384 158L364 176L392 164Z" fill="#e6ecf4"/><g class="wing"><path d="M404 146Q388 104 424 118Q430 138 412 150Z" fill="#edf2f8"/><path d="M412 138Q398 112 420 120" stroke="#cbd5e4" stroke-width="1.6" fill="none"/></g><path d="M440 151q14 8 30 -2" stroke="#6b8e23" stroke-width="2.4" fill="none"/><ellipse cx="458" cy="151" rx="6" ry="3" fill="#7fae2f" transform="rotate(-25 458 151)"/><ellipse cx="468" cy="147" rx="6" ry="3" fill="#8cbc38" transform="rotate(10 468 147)"/><circle cx="433" cy="141" r="1.5" fill="#222"/></g>`,from:'translate(-400px,-60px)'},
 {id:'birds',n:'Aves',svg:`<g stroke="#2a2a3a" stroke-width="2.4" fill="none" stroke-linecap="round">${[[120,120,'',20],[200,160,'11s',16],[330,100,'16s',16],[420,140,'13s',13]].map(([x,y,d,w])=>`<g class="drift"${d?` style="animation-duration:${d}"`:''}><g class="flap"><path d="M${x} ${y}q${w/2} -${w*.65} ${w} 0q${w/2} -${w*.65} ${w} 0"/></g></g>`).join('')}</g>`,from:'translateX(-80px)'},
 {id:'rain',n:'Lluvia (imagen)',svg:rainSvg(),from:'none'}
];
const EM=Object.fromEntries(E.map(e=>[e.id,e]));
const SKIES={
  day:['Día','radial-gradient(ellipse at 50% 100%,#fff6d8cc,transparent 60%),linear-gradient(#4f9fe6,#9fd4f5 55%,#d9f0ff 85%)'],
  dawn:['Amanecer','radial-gradient(ellipse at 50% 92%,#ffd28acc,transparent 58%),linear-gradient(#4a3f86,#b86aa0 40%,#f6a96b 82%)'],
  dusk:['Atardecer','radial-gradient(ellipse at 50% 96%,#ffb066cc,transparent 60%),linear-gradient(#1f1d4f,#7b4a86 45%,#e07c58 88%)'],
  night:['Noche','radial-gradient(ellipse at 20% 20%,#3a4a8a55,transparent 55%),linear-gradient(#050818,#1b2650)'],
  storm:['Tormenta','radial-gradient(ellipse at 50% 0%,#00000066,transparent 70%),linear-gradient(#1c202e,#4a5260 70%,#6a7280)'],
  void:['Oscuridad','radial-gradient(ellipse at 50% 60%,#14122a,#030409 75%)'],
  deep:['Profundidad','radial-gradient(ellipse at 50% 0%,#2a7aa022,transparent 60%),linear-gradient(#0e2a3d,#03101a)']
};
