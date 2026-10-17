/* ============================================================================
   HISTORIAS — acá se editan y se agregan historias. No hace falta tocar index.html.

   Una historia:
     {id:'noe', name:'Noé y el arca', ref:'Génesis 6–9', sky0:'day', beats:[ ...escenas... ]}
       id    nombre corto sin espacios (único)
       name  lo que se ve en el botón y en la portada
       ref   cita bíblica (portada)
       sky0  cielo inicial (day, dawn, dusk, night, storm, void, deep)
       beats lista de escenas, en el orden en que las contás

   Una escena (beat):
     t     texto que ves en pantalla para contar (no se usa para reconocer la voz)
     add   elementos que aparecen (ids de la biblioteca E en index.html)
     rm    elementos que desaparecen
     lv    niveles/posiciones: {flood:2, ark:1}. Número = posición de la lista `lv` del elemento
     sky   cambia el cielo (se funde con el anterior)
     amb   ambientes en bucle que quedan sonando: lluvia, viento, olas, pajaros. [] los apaga todos;
           si no ponés `amb`, se mantienen los de la escena anterior
     snd   efectos al entrar a la escena. 'trueno' o ['trueno',1.5] (con demora en segundos)
     keys  palabras que el narrador dice cuando llega esta escena (modo "Escuchar").
           Sin tildes, en minúscula. Una palabra vale 1 punto, una frase de 2+ palabras vale 2.
           `martill` coincide con "martillaron" (comparan por el comienzo de la palabra);
           las de 3 letras o menos tienen que ser la palabra exacta (luz, mar, oro).
           Se evalúa solo la escena que sigue (y, más exigente, la siguiente a esa).

   Para agregar una historia: copiá un bloque, cambiale id/name/ref y escribí las escenas.
   ============================================================================ */
const STORIES=[
 {id:'noe',name:'Noé y el arca',ref:'Génesis 6–9',sky0:'day',beats:[
  {t:'Hace mucho tiempo el mundo era hermoso, pero la gente se había olvidado de Dios.',add:['land','sun','trees','birds'],amb:['pajaros'],snd:['arpa'],keys:['hace mucho','mundo','hermoso','olvidado']},
  {t:'Vivía un hombre bueno que sí escuchaba a Dios: Noé.',add:['noah'],snd:['pajaro'],keys:['noe','hombre bueno','escuchaba']},
  {t:'Dios le dijo: “Construí un arca enorme, porque va a venir un diluvio.”',add:['godlight'],snd:['coro'],keys:['construi','construy','arca','diluvio','dios le dijo']},
  {t:'Noé y su familia martillaron durante años, y los vecinos se reían de ellos.',rm:['godlight'],add:['ark'],snd:['martillo'],keys:['martill','reian','vecinos','anos']},
  {t:'Pero llegaron los animales, de a dos en dos, listos para entrar.',add:['animals'],snd:['elefante',['oveja',1.1],['pajaro',2.2]],keys:['animales','de a dos','dos en dos']},
  {t:'Noé entró con su familia y Dios cerró la puerta. El cielo empezó a oscurecerse.',rm:['sun','birds','noah','animals'],add:['stormcloud'],sky:'dusk',amb:['viento'],keys:['puerta','oscurec','cerro la puerta','entro']},
  {t:'Empezó a llover. Llovió cuarenta días y cuarenta noches.',add:['rain','lightning','flood'],sky:'storm',lv:{flood:1},amb:['lluvia','viento'],snd:['trueno'],keys:['llover','llovio','cuarenta','lluvia']},
  {t:'El agua cubrió montañas y valles, pero el arca flotaba segura.',lv:{flood:2,ark:1},amb:['lluvia','olas'],snd:[['trueno',1.5]],keys:['cubrio','montanas','flotaba','agua']},
  {t:'Por fin la lluvia paró. Silencio… solo se oía el agua.',rm:['rain','lightning','stormcloud'],sky:'dawn',amb:['olas'],keys:['paro','silencio','dejo de llover']},
  {t:'Noé soltó una paloma, y volvió con una ramita de olivo: la tierra se estaba secando.',add:['dove'],lv:{flood:3,ark:3},snd:['paloma'],keys:['paloma','olivo','ramita']},
  {t:'Dios puso un arcoíris en el cielo: una promesa de que cuidaría siempre al mundo.',rm:['cloud'],add:['rainbow','sun'],sky:'day',amb:['pajaros'],snd:['fanfarria','brillo'],keys:['arcoiris','promesa']}
 ]},
 {id:'david',name:'David y Goliat',ref:'1 Samuel 17',sky0:'day',beats:[
  {t:'David era el menor de su familia y cuidaba las ovejas de su papá.',add:['land','sun','trees','sheep','david','birds'],amb:['pajaros'],snd:['oveja'],keys:['david','ovejas','menor']},
  {t:'Cuando un león atacaba al rebaño, David lo enfrentaba, porque Dios estaba con él.',add:['lion'],snd:['leon'],keys:['leon','rebano','oso']},
  {t:'Mientras tanto, el ejército de Israel y el de los filisteos estaban frente a frente.',rm:['lion','sheep','birds'],add:['tents'],amb:[],snd:['tambores'],keys:['ejercito','filisteos','frente a frente']},
  {t:'Cada día salía un gigante, Goliat, y desafiaba a Israel. Todos temblaban de miedo.',rm:['sun'],add:['goliath'],sky:'dusk',snd:['pasos'],keys:['goliat','gigante','temblaban']},
  {t:'David dijo: “No tengo miedo, Dios está conmigo.” Y no quiso la armadura del rey.',add:['godlight'],snd:['coro'],keys:['no tengo miedo','armadura','rey']},
  {t:'Fue al arroyo y eligió cinco piedras lisas.',rm:['godlight'],snd:['gotas'],keys:['arroyo','cinco piedras','piedras lisas']},
  {t:'Giró la honda… ¡zum!',add:['stone'],lv:{stone:1},snd:['honda'],keys:['honda','giro','zum']},
  {t:'La piedra le dio al gigante en la frente, y Goliat cayó.',rm:['stone'],lv:{goliath:1},snd:['impacto'],keys:['frente','cayo','piedra le dio']},
  {t:'¡Israel gritó de alegría! Dios había salvado a su pueblo por medio de un joven valiente.',add:['banner','sun'],sky:'day',amb:['pajaros'],snd:['multitud','fanfarria'],keys:['alegria','salvado','grito']}
 ]},
 {id:'jonas',name:'Jonás y el gran pez',ref:'Jonás 1–3',sky0:'day',beats:[
  {t:'Dios le pidió a Jonás: “Andá a la gran ciudad de Nínive y avisales que cambien su forma de vivir.”',add:['land','sun','city','jonah','trees','godlight'],snd:['coro'],keys:['jonas','ninive','dios le pidio']},
  {t:'Pero Jonás tuvo miedo y se fue para el lado contrario: se subió a un barco.',rm:['godlight','city','trees'],add:['flood','ship'],lv:{flood:1,jonah:1},amb:['olas'],snd:['arpa'],keys:['miedo','barco','lado contrario']},
  {t:'Dios mandó una gran tormenta. ¡Las olas casi hundían el barco!',rm:['sun'],add:['stormcloud','rain','lightning'],sky:'storm',amb:['lluvia','viento','olas'],snd:['trueno'],keys:['tormenta','olas','hundian']},
  {t:'Jonás dijo: “Es culpa mía. Tírenme al mar.” ¡Splash! Y el mar se calmó.',rm:['rain','lightning','stormcloud'],lv:{jonah:2},sky:'dawn',amb:['olas'],snd:['chapuzon'],keys:['culpa','tirenme','mar se calmo','splash']},
  {t:'Dios envió un gran pez que se lo tragó entero.',add:['whale'],lv:{whale:1,jonah:3},snd:['ballena',['chapuzon',1.4]],keys:['gran pez','pez','trago','ballena']},
  {t:'Tres días y tres noches estuvo adentro. Allí Jonás oró y le pidió perdón a Dios.',rm:['ship'],lv:{flood:4},sky:'deep',amb:[],snd:['latido',['gotas',1.5]],keys:['tres dias','tres noches','oro','perdon']},
  {t:'Dios habló al pez, y este escupió a Jonás en la playa.',rm:['whale'],add:['sun'],lv:{whale:0,flood:5,jonah:4},sky:'day',amb:['olas','pajaros'],snd:['ballena','chapuzon'],keys:['escupio','playa']},
  {t:'Esta vez Jonás obedeció: fue a Nínive, la gente escuchó y decidió cambiar.',add:['city','crowd','trees'],lv:{jonah:5},snd:['fanfarria','multitud'],keys:['obedecio','escucho','cambiar']}
 ]},
 {id:'creacion',name:'La Creación',ref:'Génesis 1–2',sky0:'void',beats:[
  {t:'Al principio todo estaba oscuro y vacío… pero Dios estaba allí.',sky:'void',amb:[],snd:['inicio'],keys:['principio','oscuro','vacio']},
  {t:'Dios dijo: “¡Que haya luz!” Y hubo luz.',add:['godlight'],sky:'dawn',snd:['coro','brillo'],keys:['que haya luz','luz']},
  {t:'Separó la luz de la oscuridad: el día y la noche.',rm:['godlight'],add:['sun','moon','stars'],sky:'dusk',snd:['arpa'],keys:['dia y la noche','separo','oscuridad']},
  {t:'Hizo el cielo con sus nubes y juntó las aguas en el mar.',rm:['moon','stars'],add:['cloud','flood'],lv:{flood:1},sky:'day',amb:['olas'],snd:['chapuzon'],keys:['cielo','nubes','aguas','mar']},
  {t:'Salió la tierra seca, y brotaron árboles y flores de todos los colores.',add:['land','trees','flowers'],lv:{flood:5},snd:['brillo'],keys:['tierra seca','arboles','flores']},
  {t:'Llenó el mar de peces y el cielo de aves.',add:['fish','birds'],amb:['olas','pajaros'],snd:['chapuzon',['pajaro',.8]],keys:['peces','aves']},
  {t:'Luego creó los animales: grandes y pequeños, mansos y feroces.',add:['animals','lion'],snd:['elefante',['oveja',1],['leon',1.8]],keys:['animales','mansos','feroces']},
  {t:'Y por último hizo a las personas, a su imagen, para cuidar de todo lo creado.',add:['people'],snd:['coro'],keys:['personas','imagen']},
  {t:'Dios miró todo y dijo: “Es muy bueno.” Y descansó.',add:['rainbow'],snd:['fanfarria','brillo'],keys:['muy bueno','descanso']}
 ]}
];
if(typeof module!=='undefined') module.exports=STORIES;
