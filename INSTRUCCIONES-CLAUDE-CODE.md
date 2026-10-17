# Teatro de Historias: agregar modo "me escucha" y publicarlo en Vercel

Pegá este documento completo en Claude Code, dentro de la carpeta que contiene `index.html`.

## 1. Qué es esto

`index.html` es una página única (HTML + CSS + JS, sin build, sin librerías) que usa un narrador para contar historias bíblicas en vivo. Mientras él cuenta, la página muestra escenas dibujadas en SVG y reproduce sonidos sintetizados con Web Audio. Hoy el narrador avanza tocando "Siguiente" (o con teclado, o con un control remoto de presentaciones).

Ya existe y funciona (el JS pasó `node --check`, pero **nunca se abrió en un navegador real**, ver sección 8).

## 2. Objetivo

Agregar un **modo de voz**: la página escucha al narrador con el micrófono, reconoce en español lo que va diciendo y avanza sola a la escena siguiente cuando detecta las palabras clave de esa escena. Después, publicarla en Vercel con HTTPS (el reconocimiento de voz y el micrófono lo exigen).

El modo manual (botones, teclado) tiene que seguir funcionando siempre como respaldo.

## 3. Cómo está armado el código actual

Todo está en `index.html`, en este orden:

1. `<style>`: tokens de diseño en `:root` (tema nocturno único, tipografías Lilita One para títulos y Nunito para texto), estilos de la UI y animaciones CSS de la escena.
2. Markup: header (botones Sonido y Pantalla completa), chips de historias, escenario (`#stage` con `#skies` y `<svg id="svg">`), pestañas Guion/Libre, panel Guion (`#secGuion`: cue actual, "Sigue", puntos de progreso, botones Atrás/Siguiente) y panel Libre (`#secLibre` con botones para disparar imágenes, sonidos y cielos a mano).
3. `<script>`:
   - **Audio**: `ac()`, `tone()`, `noise()`, diccionario `SND` (efectos puntuales: trueno, martillo, león, coro, etc.), `AMBDEF` y `syncAmb()` (ambientes en bucle: lluvia, viento, olas, pájaros), `playSnd()`, `setMuted()`.
   - **Biblioteca de elementos** `E`: cada elemento es `{id, n, svg, from, lv, steps, inst, dur}`. `lv` es una lista de transforms CSS (posiciones o niveles, por ejemplo nivel del agua, arca flotando, Goliat de pie o caído). El orden del arreglo es el orden de capas (de atrás hacia adelante).
   - `SKIES`: fondos de cielo que se funden entre sí.
   - **`STORIES`**: 4 historias (Noé, David y Goliat, Jonás, La Creación). Cada escena (beat) tiene `t` (texto del cue), `add`/`rm` (elementos que aparecen o desaparecen), `lv` (niveles), `sky`, `amb` (ambientes activos) y `snd` (efectos; puede ser `'trueno'` o `['trueno', 1.5]` con demora en segundos).
   - **Motor**: `fold()` calcula el estado visual acumulado hasta la escena `i`, `apply()` lo pinta, `go(i, play)` navega y dispara sonidos, `next()`/`back()`, `buildPads()` arma el modo Libre.

Respetá esta estructura y el diseño existente. No migres a frameworks ni agregues build tools.

## 4. Qué construir

### 4.1 Reconocimiento de voz

- Usar la Web Speech API: `window.SpeechRecognition || window.webkitSpeechRecognition`.
- Configuración: `continuous = true`, `interimResults = true`, `lang = 'es-UY'` con respaldo `'es-419'` y luego `'es-ES'` si el navegador rechaza el idioma.
- **Reinicio automático**: el navegador corta el reconocimiento tras silencios o cada cierto tiempo. En `onend`, si el usuario sigue en modo escucha, volver a llamar `start()` (con una espera corta de unos 300 ms y protección contra bucles de error).
- Manejar `onerror`: `not-allowed` y `service-not-allowed` (mostrar cómo dar permiso), `no-speech` (ignorar y reiniciar), `audio-capture` (no hay micrófono), `network` (avisar que el reconocimiento necesita internet), `aborted`.
- Detección de soporte: si no existe la API (por ejemplo Firefox), ocultar el modo voz y mostrar un aviso breve y amable; el resto de la página no debe romperse.
- Pedir permiso de micrófono solo cuando el usuario toca "Escuchar" (nunca al cargar).
- Mantener pantalla encendida (`wakeLock`, ya existe `wake()`).

### 4.2 Interfaz del modo voz (panel Guion)

- Botón grande **"Escuchar"** / **"Dejar de escuchar"** junto a Atrás/Siguiente, con `aria-pressed`.
- Indicador de estado: "Escuchando…", "Pausado", "Sin permiso de micrófono", "Sin conexión".
- Una línea con las **últimas palabras oídas** (texto tenue, para que el narrador vea que lo está entendiendo).
- Control de **sensibilidad** con 3 opciones (Baja, Media, Alta) que ajusta el umbral de coincidencia (sección 4.3). Por defecto Media. Guardar la elección en `localStorage` (con try/catch).
- Botón **Pausar voz** y comandos hablados: "siguiente" / "adelante" avanzan, "atrás" / "volver" retroceden, "pausa" suspende el avance automático, "seguir" lo reanuda.
- Todo en español rioplatense con voseo ("Tocá", "Elegí").
- Aviso pequeño de privacidad: "En Chrome, el audio se envía al servicio de voz de Google para transcribirlo. Esta página no guarda ni registra nada." No agregar analytics ni logs de audio o texto.

### 4.3 Algoritmo de coincidencia (función pura, testeable)

Cada escena gana un campo `keys`: lista de palabras o frases clave **ya normalizadas** (minúsculas, sin tildes, sin signos). Normalizar así tanto el texto reconocido como las claves.

- Mantener una **ventana** con las últimas ~14 palabras oídas (interinas + finales). Al avanzar de escena, **vaciar la ventana** para no re-disparar.
- Las claves se comparan por **prefijo o raíz** (por ejemplo `martill` coincide con "martillaron"; `arcoiris` con "arcoíris").
- Solo se evalúan la **escena siguiente** (`i+1`) y, con umbral más exigente, la `i+2` (por si el narrador se saltea una). **Nunca retroceder automáticamente.** Esto también resuelve claves repetidas entre escenas (por ejemplo "Nínive" aparece al principio y al final de Jonás).
- Puntaje: cada clave de una sola palabra vale 1; cada frase de 2+ palabras que aparece completa vale 2. Umbral por sensibilidad: Alta = 1, Media = 2, Baja = 3 (para `i+2`, sumar 1).
- **Enfriamiento** de ~1,5 s tras cada avance.
- Al avanzar por voz llamar a `go(i, true)` (con sonidos), igual que `next()`.
- Escribir la lógica como función pura, por ejemplo `matchBeat(windowWords, beat, threshold) -> score`, separada de la API de voz, para poder testearla en Node.

### 4.4 Palabras clave propuestas por escena

(Sin tildes. Ajustalas si al probar quedan muy sensibles o poco sensibles. Los índices coinciden con el orden de `beats` en `STORIES`.)

**Noé y el arca**
0. `hace mucho`, `mundo`, `hermoso`, `olvidado`
1. `noe`, `hombre bueno`, `escuchaba`
2. `construi`, `arca`, `diluvio`, `dios le dijo`
3. `martill`, `reian`, `vecinos`, `anos`
4. `animales`, `de a dos`, `dos en dos`
5. `puerta`, `oscurec`, `cerro la puerta`, `entro`
6. `llover`, `llovio`, `cuarenta`, `lluvia`
7. `cubrio`, `montanas`, `flotaba`, `agua`
8. `paro`, `silencio`, `dejo de llover`
9. `paloma`, `olivo`, `ramita`
10. `arcoiris`, `promesa`

**David y Goliat**
0. `david`, `ovejas`, `menor`
1. `leon`, `rebano`, `oso`
2. `ejercito`, `filisteos`, `frente a frente`
3. `goliat`, `gigante`, `temblaban`
4. `no tengo miedo`, `armadura`, `rey`
5. `arroyo`, `cinco piedras`, `piedras lisas`
6. `honda`, `giro`, `zum`
7. `frente`, `cayo`, `piedra le dio`
8. `alegria`, `salvado`, `grito`

**Jonás y el gran pez**
0. `jonas`, `ninive`, `dios le pidio`
1. `miedo`, `barco`, `lado contrario`
2. `tormenta`, `olas`, `hundian`
3. `culpa`, `tirenme`, `mar se calmo`, `splash`
4. `gran pez`, `pez`, `trago`, `ballena`
5. `tres dias`, `tres noches`, `oro`, `perdon`
6. `escupio`, `playa`
7. `obedecio`, `escucho`, `cambiar`

**La Creación**
0. `principio`, `oscuro`, `vacio`
1. `que haya luz`, `luz`
2. `dia y la noche`, `separo`, `oscuridad`
3. `cielo`, `nubes`, `aguas`, `mar`
4. `tierra seca`, `arboles`, `flores`
5. `peces`, `aves`
6. `animales`, `mansos`, `feroces`
7. `personas`, `imagen`
8. `muy bueno`, `descanso`

### 4.5 Eco de los efectos de sonido

Los efectos de la propia página los va a captar el micrófono y pueden confundir al reconocimiento. Mitigar:

- Mientras el modo voz está activo, bajar el volumen general de efectos (por ejemplo `out.gain` a ~0.5) y restaurarlo al dejar de escuchar.
- Mostrar un consejo en la UI: "Usá auricular con micrófono o un micrófono de solapa; mejora mucho".
- Ignorar transcripciones que lleguen durante ~700 ms después de disparar un efecto largo (trueno, multitud).

### 4.6 Modo simulación (para probar sin micrófono)

Con `?sim` en la URL, mostrar un campo de texto donde se escribe lo que "se oye". Cada vez que cambia, alimentar la misma ventana y el mismo algoritmo que usa el reconocimiento real. Sirve para tests manuales y para que Gabriel ensaye sin hablar.

## 5. Calidad y pruebas

1. `node --check` sobre el script extraído.
2. Tests en Node (archivo aparte, por ejemplo `test-match.mjs`) de la función pura: normalización, coincidencia por raíz, umbrales, que no se evalúe hacia atrás, que se pueda saltar una escena, que no dispare dos veces con la misma ventana. Frases de prueba por historia (parafraseadas, no copiadas literal del cue).
3. Abrir `index.html` en un navegador real (Chrome o Edge) y revisar la consola.
4. Probar en un servidor local (`npx serve` o similar; `localhost` permite micrófono) y luego en la URL de Vercel con HTTPS.
5. Probar en: Chrome de escritorio, Chrome en Android y Safari en iPhone. En iOS verificar que `webkitSpeechRecognition` funciona y que el audio se desbloquea con el primer toque.

## 6. Publicar en Vercel

- Es un sitio estático: no hace falta framework ni build. Publicar la carpeta tal cual.
- **Antes de publicar, preguntale a Gabriel** el nombre del proyecto y si quiere un dominio propio (no conectar dominios sin su confirmación). Publicar es una acción pública: pedir su OK explícito.
- No incluir secretos, tokens ni variables de entorno (no hacen falta).
- Agregar `vercel.json` mínimo si hace falta (por ejemplo `cleanUrls`) y, opcionalmente, la cabecera `Permissions-Policy: microphone=(self)`.
- Al terminar, entregar la URL de producción y confirmar que carga por HTTPS y que el botón "Escuchar" pide permiso de micrófono.

## 7. Restricciones de diseño

- Mantener el diseño actual (tokens en `:root`, tema nocturno, tipografías, layout mobile-first). No agregar librerías externas; solo se permiten las fuentes de Google ya cargadas.
- Debe funcionar bien a 400 px de ancho; objetivos táctiles grandes (los botones principales miden unos 54 px de alto).
- Respetar `prefers-reduced-motion`, foco visible por teclado y `aria-live` en el cue.
- Textos de la interfaz en español rioplatense, directos y sin tecnicismos.

## 8. Cosas conocidas para revisar al abrirla en el navegador

La página nunca se vio renderizada, así que mirá con ojo:

- Posiciones superpuestas en las escenas: animales vs. el arca, león vs. Goliat, Jonás sobre el barco, Jonás dentro de la ballena, personas (Adán y Eva) vs. el león.
- Que Goliat al caer (`rotate(82deg)`) no se salga del escenario por la derecha.
- Que la piedra vuele de la mano de David a la frente de Goliat.
- Que el nivel del agua (`flood`) cubra bien el casco del arca y que la ballena se vea bajo el agua en la escena "Profundidad".
- Transiciones de `lv` al volver atrás en el guion.
- Que los sonidos no clippeen y que los ambientes (lluvia, viento, olas) arranquen y se apaguen bien.

Corregí lo que encuentres sin cambiar el estilo general.

## 9. Entregables

1. `index.html` actualizado (modo voz incluido).
2. `test-match.mjs` con los tests de la función pura.
3. Un `README.md` corto en español: cómo usar el modo voz, cómo ajustar sensibilidad, y cómo editar palabras clave de una historia o agregar una nueva (explicar los campos `t`, `add`, `rm`, `lv`, `sky`, `amb`, `snd`, `keys`).
4. URL de producción en Vercel.
5. Un resumen breve de qué probaste, qué quedó sin probar (por ejemplo iOS si no hubo dispositivo) y los problemas de la sección 8 que corregiste.

## 10. Siguiente paso opcional

Una vez funcionando, Gabriel quiere poder **agregar sus propias historias** (Daniel, Moisés, el hijo pródigo…). Dejá el código preparado para eso: idealmente mover `STORIES` a una sección bien delimitada al inicio del script (o a un `stories.js`), con un comentario que explique el formato de una escena.
