# Teatro de Historias

Una página única (sin build, sin librerías) para contar historias bíblicas en vivo: mientras contás, aparece la escena dibujada y suenan los efectos.

Archivos: `index.html` (la página y el motor), `stories.js` (las historias), `scene.js` (los dibujos: personajes, animales, escenarios y cielos), `audio.js` (los sonidos), `match.js` (el reconocimiento de palabras clave), `test-match.mjs` (pruebas).

Todo se genera en el navegador: los dibujos son SVG con luces y texturas, y los sonidos se sintetizan con Web Audio (reverberación de sala, ruido de lluvia/viento/mar, voces por formantes, cuerdas de arpa). No hay imágenes ni archivos de audio.

## Cómo usar el modo voz ("Escuchar")

1. Abrí la página en **Chrome o Edge** (también funciona en Chrome para Android y Safari en iPhone). Tiene que ser por HTTPS o `localhost`.
2. Elegí la historia y tocá **Escuchar**. El navegador te pide permiso de micrófono: tocá Permitir.
3. Contá la historia con tus palabras. Cuando oye las palabras clave de la escena que sigue, avanza sola y suenan los efectos. Abajo del botón ves las últimas palabras que entendió.
4. **Pausar voz** frena el avance automático (sigue escuchando). También podés decir:
   - “siguiente” o “adelante”: avanza
   - “atrás” o “volver”: retrocede
   - “pausa”: suspende el avance automático
   - “seguir”: lo reanuda

   Para que cuenten como comando tienen que ser una frase corta, dicha después de una pausa.
5. **Dejar de escuchar** apaga el micrófono. Siguiente, Atrás, los puntos de progreso y el teclado funcionan siempre, con o sin voz.

Consejos: usá auricular con micrófono o de solapa (mejora mucho, porque los efectos de la página no se mezclan con tu voz). Mientras escucha, los efectos suenan a menos volumen.

Privacidad: en Chrome, el audio se envía al servicio de voz de Google para transcribirlo. La página no guarda ni registra nada.

### Sensibilidad

Baja, Media (por defecto) o Alta. Es cuántos puntos tienen que sumar las palabras clave para avanzar: Alta = 1, Media = 2, Baja = 3. Una palabra suma 1 y una frase de dos o más palabras suma 2. Si avanza sola sin que hayas dicho nada de la escena, subí a Baja; si se queda esperando, bajá a Alta. Se acuerda de tu elección.

Solo se mira la escena que sigue; si te salteás una, también la siguiente a esa (pidiendo un punto más). Nunca retrocede sola. Después de cada avance espera 1,5 segundos.

### Ensayar sin hablar

Agregá `?sim` a la dirección (por ejemplo `http://localhost:3000/?sim`). Aparece un campo donde escribís lo que “se oye”; usa el mismo algoritmo que el micrófono.

## Agregar o editar historias

Todo está en `stories.js` (arriba hay un comentario con el formato). Una historia es `{id, name, ref, sky0, beats:[…]}` y cada escena (beat) tiene:

| Campo | Qué hace |
|---|---|
| `t` | Texto que ves para contar. No se usa para reconocer la voz. |
| `add` | Elementos que aparecen (ids de la biblioteca `E` en `scene.js`: `ark`, `lion`, `sun`…). |
| `rm` | Elementos que desaparecen. |
| `lv` | Posición o nivel de un elemento: `{flood:2, ark:1}`. El número elige una posición de la lista `lv` de ese elemento. |
| `sky` | Cielo: `day`, `dawn`, `dusk`, `night`, `storm`, `void`, `deep`. Se funde con el anterior. |
| `amb` | Ambientes en bucle: `lluvia`, `viento`, `olas`, `pajaros`. `[]` los apaga todos; sin `amb` siguen los de la escena anterior. |
| `snd` | Efectos al entrar: `'trueno'` o `['trueno', 1.5]` (con demora en segundos). |
| `keys` | Palabras clave para el modo voz (abajo). |

**Palabras clave (`keys`)**: escribilas sin tildes y en minúscula. Se comparan por el comienzo de la palabra: `martill` coincide con “martillaron”. Las de 3 letras o menos tienen que ser la palabra exacta (`luz`, `mar`). Elegí 3 o 4 palabras o frases que **solo** digas en esa escena (las repetidas entre escenas no molestan, porque solo se mira la escena que sigue). Si querés más precisión, usá frases (`de a dos`, `cerro la puerta`), que valen 2.

Para una historia nueva: copiá un bloque de `stories.js`, cambiale `id`, `name`, `ref` y escribí las escenas. Aparece sola como botón. Corré `node test-match.mjs` para chequear que los ids existan y que las claves estén bien escritas.

## Probar en tu computadora

```bash
npx serve .
node test-match.mjs
```

## Publicar

Es un sitio estático: en Vercel se publica la carpeta tal cual (`vercel.json` ya incluye lo mínimo).

## Agregar un sonido o un dibujo

- Sonido puntual: en `audio.js`, dentro de `SND`, agregá `{n:'Nombre', f(){ … }}` usando `osc({...})` (tonos) y `nz({...})` (ruidos). Después usá su id en `snd`.
- Ambiente en bucle: en `AMBDEF`, con `mk()` que devuelve `{stop(){…}}`.
- Dibujo: en `scene.js`, agregá un objeto a `E` (el orden es el de las capas, de atrás hacia adelante). Para personas usá `fig({robe:'#…', beard:…})`.
