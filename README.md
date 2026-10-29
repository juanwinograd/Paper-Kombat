# Paper Kombat

Pelea lateral del universo de **Aventura en Papel**, para chicos de 9 y 10 años: ocho personajes iniciales, tres secretos, saltos, superpoderes y golpes de historieta.

## Primera versión

- Contra la PC: dificultad fácil, media o difícil.
- Dos personas en una computadora: teclado compartido o dos mandos.
- Dos dispositivos por internet: sala con código e invitación.
- Controles táctiles con movimiento, salto, golpe, defensa y poderes con recarga.
- Ocho personajes disponibles al comenzar y tres secretos, incluso enfrentamientos espejo.
- Cuartel, cantera y laboratorio como escenarios decorativos.
- Vida de 100 puntos; rounds de 60 segundos; gana quien consigue dos rounds. Los empates no dan puntos.
- Pausa, ayuda, sonido opcional, pantalla completa cuando el navegador lo permite y respeto de reducir movimiento.

## Publicar gratis en GitHub Pages

El proyecto no necesita base de datos, claves ni servidor de partidas de pago. Para habilitarlo por primera vez:

1. Abrir **Settings → Pages** en este repositorio.
2. En **Build and deployment**, elegir **Deploy from a branch**.
3. Seleccionar **main**, carpeta **/ (root)**, y guardar.

La dirección será **https://juanwinograd.github.io/Paper-Kombat/** cuando GitHub termine la publicación. La raíz ya contiene todo lo necesario; no hace falta compilar para Pages. La configuración inicial requiere acceso a Settings: subir archivos por sí solo no habilita el sitio.

El workflow de verificación comprueba sintaxis, reglas, protocolo y build con cada push o pull request. Las rutas de recursos son relativas y funcionan dentro de /Paper-Kombat/.

## Jugar con un amigo online

1. Elegir **Con un amigo online** y **Crear sala**.
2. Pulsar **Copiar invitación** y pasarla al amigo, o darle el código de ocho caracteres.
3. El invitado abre el enlace y pulsa **Entrar**.
4. Cada uno elige su personaje. El anfitrión elige la viñeta.
5. Ambos pulsan **Estoy listo**.
6. Para la revancha vuelven a la selección y ambos confirman otra vez.

Si alguien recarga, sale por accidente y vuelve con Atrás a la misma pestaña, o pierde la conexión brevemente, la sala se reserva durante **dos minutos**. La partida queda pausada y se conservan personajes, vida, reloj y rounds. Al volver los dos, tocar **Seguir peleando**. Funciona también si quien recarga es el anfitrión, e incluso si ambos recargan.

El retorno automático usa un guardado temporal de esa pestaña; no funciona desde otro navegador o dispositivo, ni si el navegador bloquea el almacenamiento. Al ocultar la pestaña se pide pausa. Elegir **Salir** dentro del juego cierra la sesión de forma definitiva; al vencer los dos minutos también se libera. La invitación sigue usando el mismo código durante la espera.

**Límite del alojamiento gratuito:** el online usa la señalización pública gratuita de PeerJS y conexiones WebRTC directas con STUN. No se incluye un servicio TURN de pago. Algunas redes móviles, escolares, corporativas o con NAT restrictivo no permiten la conexión directa; se informa el problema y se puede probar otra red. El servicio público no garantiza disponibilidad. No se promete conexión entre cualquier par de redes.

Referencias: [PeerJS FAQ](https://peerjs.com/client/faq), [PeerServer Cloud](https://peerjs.com/server/getting-started), [TURN en WebRTC](https://webrtc.org/getting-started/turn-server).

## Controles

| Acción | Jugador 1 / online | Jugador 2 local |
| --- | --- | --- |
| Moverse | A / D | ← / → |
| Saltar | W | ↑ |
| Golpear | F | K |
| Cubrirse | G | L |
| Poderes | 1 / 2 / 3 / 4 | 7 / 8 / 9 / 0 |
| Pausa | Escape | Escape |

La defensa frontal reduce el daño y gasta una barra que se recupera al soltarla. Saltar permite esquivar ataques. Los poderes se activan al pulsar; mantener el botón no los repite.

**Teléfonos/tablets:** joystick en pantalla: arrastrar hacia los lados para caminar, hacia arriba para saltar, o en diagonal para saltar avanzando. Al soltarlo se detiene el movimiento. Los botones permiten golpear, cubrirse y usar poderes al mismo tiempo que el joystick. Conviene usar horizontal. Para dos amigos en un mismo teléfono hacen falta dos mandos; hay un solo conjunto de controles táctiles. Para dos teléfonos, usar online. En PC táctil los botones también aparecen.

**Mandos estándar:** palanca izquierda o cruceta para moverse; A/✕ para saltar; X/□ para golpear; B/○ para cubrirse. LB/L1, RB/R1, LT/L2 y RT/R2 activan los poderes. En local, primer y segundo mando controlan a cada jugador. La compatibilidad depende del navegador y mando.

## Personajes

| Personaje | Poderes |
| --- | --- |
| Vicente | Prisma, rayo regalo, espacio-tiempo. |
| Fabrizio | Cubo reflector, invisibilidad, picos y fiesta que hace bailar al rival sin control. |
| Luca | Rayo eléctrico, tormenta, campo de fuerza, hacerse chiquito. |
| Gaspar | Brazo elástico, superpuño, teletransporte, Papapumba. |
| Amaral | Neblina, sol cegador, viento. |
| Aarón Mamani | Burbuja temporal que ralentiza. |
| Sebástian | Espada de piedra, martillo de roca, piedra arrojadiza. |
| Benicio | Un clon autónomo de seis segundos, eliminado de un golpe. |
| Wis negro (secreto) | Lanzar tinta y crear dos monstruos de tinta temporales. |
| Máquina de bobadas (secreta) | Ataque de risa: cinco segundos sin poder controlar al personaje. |
| Baltazar (secreto) | Lanzar cuadrados violetas y camuflarse. |

Prismas y regalos atrapan menos de un segundo, con inmunidad temporal contra cadenas. Atacar cancela invisibilidad. Tormenta y martillo avisan antes de pegar y pueden esquivarse. El clon pega menos y tiene recarga. Los valores están en src/content.js y src/engine.js; el equilibrio definitivo necesita partidas en familia.

## Código secreto

En la barra **Código secreto**, disponible en el inicio y en la selección, escribir **Escuela Bavio 16 12** y pulsar **Desbloquear**. Aparecen Wis negro, la Máquina de bobadas y Baltazar. No se distinguen mayúsculas y minúsculas, y se toleran espacios extra. El desbloqueo se conserva en ese navegador mediante localStorage; si el navegador lo bloquea, funciona mientras la página permanezca abierta.

En una PC compartida habilita los personajes para ambos jugadores. Online, cada jugador desbloquea su propia selección; puede enfrentarse a un personaje secreto aunque todavía no lo haya desbloqueado.

La risa dura cinco segundos y la fiesta de Fabrizio dos segundos y medio. Ambas anuncian el ataque antes de activarse y tienen alcance limitado: alejarse, saltar o cubrirse puede evitarlas. Mientras alguien ríe o baila recibe la mitad del daño; después tiene una breve inmunidad contra repetir estos efectos. El reloj y las recargas siguen avanzando.

## Desarrollo

Requiere **Node.js 20 o posterior**. El juego y el servidor local no tienen dependencias de npm.

~~~
npm run dev
~~~

Abrir **http://localhost:3000**. Para otro puerto, definir PORT.

~~~
npm run check
npm test
npm run build
~~~

El build copia el juego a dist/. También se pueden ejecutar directamente los scripts con node.

### Pruebas de navegador

Instalar Playwright solo para las pruebas:

~~~
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
npm run test:reconnect
npm run test:secrets
npm run test:touch
~~~

CHROMIUM_PATH permite usar un Chrome instalado; PLAYWRIGHT_MODULE indica una instalación existente de Playwright. TEST_OFFLINE=1 sirve los recursos desde memoria para pruebas aisladas donde el navegador no puede acceder a localhost. TEST_ONLINE=1 agrega una prueba real con dos navegadores y el servicio público; requiere acceso WebRTC. El transporte simulado no sustituye una prueba entre redes físicas distintas.

Se revisan selección espejo, ambos teclados, CPU, poderes, pausa, ayuda, rutas de Pages y tamaños 320, 390 y 768 px. La prueba test:reconnect recorre dos pestañas con un transporte de prueba: recarga del invitado, recarga del anfitrión, salir y volver con Atrás, recarga simultánea y continuidad del marcador. Esta prueba no contacta PeerJS ni certifica WebRTC entre redes externas. La prueba test:touch verifica con gestos táctiles el joystick, saltos diagonales, uso de dos dedos, cancelación, pausa, rotación, tamaños de pantalla y movimiento del invitado online con transporte de prueba. Las capturas de diagnóstico quedan en test-results/, ignoradas por Git.

## Estructura y procedencia

- src/content.js: personajes, poderes y escenarios.
- src/unlocks.js: código secreto y persistencia de los desbloqueos.
- src/engine.js: simulación, rounds, daño, IA, recargas y clones.
- src/original-art.js y src/sketch.js: dibujante y trazos originales.
- src/render.js: composición lateral, poses y efectos.
- src/input.js: teclado, táctil y mandos.
- src/network.js: salas, protocolo y validación.
- src/app.js: menús e integración.
- vendor/peerjs.min.js: PeerJS 1.5.5, incluida localmente con licencia MIT.
- docs/diseno.md: acuerdos y parámetros.

Los dibujos, colores, siluetas, fondos y fuente provienen de [Aventura-Papel](https://github.com/juanwinograd/Aventura-Papel), revisión 7248fde42da2b02ee86a4fa9d965f0a71a46d79f. Vicente, Luca, Aarón y Benicio mantienen sus formas sin piernas; Fabrizio sus resortes; Gaspar su cara radial. Las páginas originales de la historieta no se modificaron. Patrick Hand incluye licencia OFL en assets/FONT-LICENSE.txt y PeerJS su licencia en vendor/PEERJS-LICENSE.
