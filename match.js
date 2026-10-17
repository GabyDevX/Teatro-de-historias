/* Lógica pura del modo "Escuchar": sin DOM ni micrófono, para poder testearla en Node (test-match.mjs). */
(function(root){
  const WIN=14, THRESH={alta:1,media:2,baja:3};
  const NUM={'0':'cero','1':'un','2':'dos','3':'tres','4':'cuatro','5':'cinco','6':'seis','7':'siete','8':'ocho','9':'nueve','10':'diez','12':'doce','40':'cuarenta'};

  /* minúsculas, sin tildes ni signos; ñ pasa a n; el reconocedor a veces escribe cifras ("40") */
  function norm(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/[^a-z0-9]+/g,' ').trim().replace(/\b\d+\b/g,d=>NUM[d]||d);
  }
  const words=s=>{const n=norm(s); return n?n.split(' '):[];};

  /* una palabra oída coincide con la raíz si empieza igual; las raíces de 3 letras o menos piden palabra exacta */
  const hit=(heard,key)=>key.length<=3?heard===key:heard.startsWith(key);

  const cache=new WeakMap();
  function compile(beat){
    let c=cache.get(beat);
    if(!c){c=(beat.keys||[]).map(k=>words(k)).filter(w=>w.length).map(w=>({w,pts:w.length>1?2:1})); cache.set(beat,c);}
    return c;
  }

  /* puntaje de una escena contra la ventana de palabras ya normalizadas; cada clave suma una sola vez */
  function matchBeat(win,beat){
    let score=0;
    for(const {w,pts} of compile(beat)){
      for(let s=0;s+w.length<=win.length;s++){
        let ok=true; for(let j=0;j<w.length;j++) if(!hit(win[s+j],w[j])){ok=false;break;}
        if(ok){score+=pts; break;}
      }
    }
    return score;
  }

  /* qué escena sigue según lo oído: i+1 con el umbral, i+2 con umbral+1. Nunca hacia atrás. -1 si ninguna */
  function pickNext(win,beats,i,sens){
    const t=THRESH[sens]||THRESH.media;
    if(i+1<beats.length&&matchBeat(win,beats[i+1])>=t) return i+1;
    if(i+2<beats.length&&matchBeat(win,beats[i+2])>=t+1) return i+2;
    return -1;
  }

  const CMD={siguiente:'next',adelante:'next',atras:'back',volver:'back',pausa:'pause',pausar:'pause',seguir:'resume',segui:'resume',continuar:'resume'};
  const FILLER=new Set(['ir','por','favor','ahora','vamos','dale']);
  /* comando hablado: solo si lo oído es una frase cortita (por eso no se confunde con la narración) */
  function parseCommand(ws){
    if(!ws.length||ws.length>4) return null;
    let cmd=null;
    for(const w of ws){ if(CMD[w]){ if(cmd&&cmd!==CMD[w]) return null; cmd=CMD[w]; } else if(!FILLER.has(w)) return null; }
    return cmd;
  }

  const api={WIN,THRESH,norm,words,matchBeat,pickNext,parseCommand};
  root.Match=api;
  if(typeof module!=='undefined') module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
