// Tests de la lógica pura del modo "Escuchar". Correr con:  node test-match.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const M=require('./match.js'), STORIES=require('./stories.js');
const {norm,words,matchBeat,pickNext,parseCommand,WIN}=M;

let n=0; const t=(name,fn)=>{try{fn(); n++;}catch(e){console.error('FALLÓ:',name); throw e;}};
const beat=(...keys)=>({keys});

/* ---- normalización ---- */
t('norm: minúsculas, tildes, signos, ñ',()=>{
  assert.equal(norm('¡Nínive, ARCOÍRIS!'),'ninive arcoiris');
  assert.equal(norm('niño “Es culpa mía.”'),'nino es culpa mia');
  assert.deepEqual(words('  '),[]);
});
t('norm: cifras del reconocedor pasan a palabras',()=>{
  assert.equal(norm('llovió 40 días y 40 noches'),'llovio cuarenta dias y cuarenta noches');
  assert.equal(norm('3 días'),'tres dias');
});

/* ---- coincidencia por raíz ---- */
t('raíz: martill ~ martillaron, arcoiris ~ arcoíris',()=>{
  assert.equal(matchBeat(words('ellos martillaron mucho'),beat('martill')),1);
  assert.equal(matchBeat(words('un Arcoíris enorme'),beat('arcoiris')),1);
});
t('raíz corta (≤3 letras) pide palabra exacta',()=>{
  assert.equal(matchBeat(words('martillaron en marzo'),beat('mar')),0);
  assert.equal(matchBeat(words('junto al mar azul'),beat('mar')),1);
  assert.equal(matchBeat(words('luces'),beat('luz')),0);
});
t('frases: valen 2, completas y seguidas',()=>{
  assert.equal(matchBeat(words('van de a dos'),beat('de a dos')),2);
  assert.equal(matchBeat(words('van de dos en dos'),beat('de a dos')),0);
  assert.equal(matchBeat(words('de a luego dos'),beat('de a dos')),0);
});
t('cada clave suma una sola vez',()=>{
  assert.equal(matchBeat(words('agua agua agua'),beat('agua')),1);
});
t('beat sin keys puntúa 0',()=>assert.equal(matchBeat(words('hola'),{t:'x'}),0));

/* ---- umbrales y dirección ---- */
const B=[beat('uno'),beat('perro','gato','loro'),beat('sol','luna','estrella'),beat('mesa','silla','casa')];
t('umbral por sensibilidad en i+1',()=>{
  const w=words('un perro'); // 1 punto
  assert.equal(pickNext(w,B,0,'alta'),1);
  assert.equal(pickNext(w,B,0,'media'),-1);
  assert.equal(pickNext(words('perro gato'),B,0,'media'),1);
  assert.equal(pickNext(words('perro gato'),B,0,'baja'),-1);
  assert.equal(pickNext(words('perro gato loro'),B,0,'baja'),1);
});
t('i+2 pide un punto más; permite saltear una escena',()=>{
  assert.equal(pickNext(words('sol'),B,0,'alta'),-1);
  assert.equal(pickNext(words('sol luna'),B,0,'alta'),2);
  assert.equal(pickNext(words('sol luna'),B,0,'media'),-1);
  assert.equal(pickNext(words('sol luna estrella'),B,0,'media'),2);
});
t('no mira hacia atrás ni más allá de i+2',()=>{
  assert.equal(pickNext(words('uno perro gato'),B,2,'alta'),-1);
  assert.equal(pickNext(words('mesa silla casa'),B,0,'alta'),-1);
  assert.equal(pickNext(words('mesa silla casa'),B,3,'alta'),-1);
});
t('i+1 tiene prioridad sobre i+2',()=>assert.equal(pickNext(words('perro gato sol luna'),B,0,'media'),1));
t('desde el inicio (i=-1) se evalúa la escena 0',()=>assert.equal(pickNext(words('uno'),B,-1,'alta'),0));

/* ---- ventana ---- */
t('la ventana de ~14 palabras: lo más viejo ya no cuenta',()=>{
  const w=words('perro '+'relleno '.repeat(WIN)+'gato');
  const win=w.slice(-WIN);
  assert.equal(pickNext(win,B,0,'media'),-1);
});
t('al avanzar se vacía la ventana: no dispara dos veces',()=>{
  const heard=words('perro gato');
  let i=0,base=0;
  const step=()=>{const j=pickNext(heard.slice(base).slice(-WIN),B,i,'media'); if(j>=0){i=j; base=heard.length;} return j;};
  assert.equal(step(),1); assert.equal(step(),-1); assert.equal(i,1);
});
t('lo oído de una escena no dispara las siguientes',()=>{
  assert.equal(pickNext(words('perro gato'),B,1,'alta'),-1);
});

/* ---- comandos ---- */
t('comandos hablados',()=>{
  assert.equal(parseCommand(words('Siguiente')),'next');
  assert.equal(parseCommand(words('adelante')),'next');
  assert.equal(parseCommand(words('Atrás')),'back');
  assert.equal(parseCommand(words('volver')),'back');
  assert.equal(parseCommand(words('pausa')),'pause');
  assert.equal(parseCommand(words('seguir')),'resume');
  assert.equal(parseCommand(words('ir atrás por favor')),'back');
  assert.equal(parseCommand(words('siguiente atrás')),null);
  assert.equal(parseCommand(words('Noé fue a seguir con el arca')),null);
  assert.equal(parseCommand([]),null);
});

/* ---- historias reales: frases parafraseadas (no copiadas del cue) ---- */
const PARA={
 noe:['hace mucho tiempo el mundo era un lugar hermoso pero ya se habían olvidado de Dios',
  'había un hombre bueno llamado Noé que escuchaba a Dios',
  'Dios le dijo a Noé que construyera un arca por el diluvio',
  'la familia de Noé martillaba todo el día y los vecinos se burlaban',
  'entonces vinieron los animales de dos en dos',
  'entraron todos y se cerró la puerta',
  'comenzó a llover y llovió 40 días',
  'el agua subió y cubrió las montañas pero el arca flotaba',
  'paró de llover y hubo un gran silencio',
  'mandó una paloma que trajo una ramita de olivo',
  'apareció un arcoíris, una promesa de Dios'],
 david:['David era el hijo menor y cuidaba las ovejas',
  'un león y un oso atacaban el rebaño',
  'los ejércitos de los filisteos y de Israel estaban frente a frente',
  'apareció Goliat, un gigante, y todos temblaban',
  'el rey le ofreció una armadura',
  'David buscó en el arroyo cinco piedras',
  'hizo girar la honda y zum',
  'la piedra le dio en la frente y el gigante cayó',
  'todos festejaron con alegría, Dios los había salvado'],
 jonas:['Dios le pidió a Jonás que fuera a Nínive',
  'Jonás sintió miedo y se subió a un barco que iba para el lado contrario',
  'vino una tormenta con olas gigantes que hundían el barco',
  'Jonás dijo que era su culpa que lo tiren, y el mar se calmó',
  'un pez enorme se lo tragó',
  'pasó tres días y tres noches ahí y pidió perdón',
  'el pez lo escupió en la playa',
  'Jonás obedeció, la gente escuchó y quiso cambiar'],
 creacion:['en el principio todo era oscuro y vacío',
  'Dios dijo que haya luz',
  'separó el día y la noche',
  'hizo el cielo con nubes y el mar',
  'apareció la tierra seca con árboles y flores',
  'creó los peces y las aves',
  'después los animales mansos y feroces',
  'creó a las personas a su imagen',
  'todo era muy bueno y Dios descansó']
};
for(const st of STORIES){
  const para=PARA[st.id]; assert.ok(para,'faltan frases de prueba para '+st.id);
  t(`${st.id}: hay una frase por escena`,()=>assert.equal(para.length,st.beats.length));
  for(const sens of ['alta','media']){
    t(`${st.id}: cada escena dispara con su paráfrasis (${sens}) y no antes`,()=>{
      para.forEach((p,k)=>{
        const w=words(p);
        assert.equal(pickNext(w,st.beats,k-1,sens),k,`escena ${k}: "${p}"`);
        assert.notEqual(pickNext(w,st.beats,k,sens),k,`escena ${k} no debe repetirse`);
      });
    });
  }
  t(`${st.id}: recorrido completo con ventana que se vacía (media)`,()=>{
    let i=-1; const heard=[]; let base=0;
    for(const p of para){
      heard.push(...words(p));
      const j=pickNext(heard.slice(base).slice(-WIN),st.beats,i,'media');
      assert.equal(j,i+1,`en "${p}"`); i=j; base=heard.length;
    }
    assert.equal(i,st.beats.length-1);
  });
  t(`${st.id}: ninguna paráfrasis dispara una escena equivocada desde el comienzo de la anterior`,()=>{
    para.forEach((p,k)=>{
      const j=pickNext(words(p),st.beats,k-1,'media');
      assert.equal(j,k);
    });
  });
}
t('Nínive repetida en Jonás: la escena final no se confunde con la inicial',()=>{
  const j=STORIES.find(s=>s.id==='jonas');
  assert.equal(pickNext(words('Jonás fue a Nínive'),j.beats,3,'media'),-1);
});
t('saltear una escena: Noé 2→4 con frase rica',()=>{
  const e=STORIES[0];
  assert.equal(pickNext(words('llegaron los animales de a dos en dos'),e.beats,2,'media'),4);
});

/* ---- integridad de stories.js contra la biblioteca de index.html ---- */
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const ids=re=>new Set([...html.matchAll(re)].map(m=>m[1]));
const EL=ids(/^ \{id:'(\w+)',n:/gm), SN=ids(/^  (\w+):\{n:'[^']+',f\(\)/gm),
      AM=ids(/^  (\w+):\{n:'[^']+',mk:/gm), SK=ids(/^  (\w+):\['[^']+','/gm);
t('index.html expone ids para validar',()=>{assert.ok(EL.size>25&&SN.size>15&&AM.size===4&&SK.size>=7,[EL.size,SN.size,AM.size,SK.size].join());});
for(const st of STORIES) st.beats.forEach((b,k)=>t(`${st.id}[${k}]: ids válidos y keys normalizadas`,()=>{
  [...(b.add||[]),...(b.rm||[]),...Object.keys(b.lv||{})].forEach(x=>assert.ok(EL.has(x),'elemento '+x));
  (b.snd||[]).map(s=>Array.isArray(s)?s[0]:s).forEach(x=>assert.ok(SN.has(x),'sonido '+x));
  (b.amb||[]).forEach(x=>assert.ok(AM.has(x),'ambiente '+x));
  if(b.sky) assert.ok(SK.has(b.sky),'cielo '+b.sky);
  assert.ok(b.keys&&b.keys.length,'sin keys');
  b.keys.forEach(x=>assert.equal(norm(x),x,'clave sin normalizar: '+x));
}));

console.log(`OK: ${n} pruebas`);
