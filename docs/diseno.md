# Diseño acordado — Paper Kombat

## Alcance

Pelea cómica lateral con saltos para chicos de 9–10 años. Ocho integrantes del equipo de Aventura-Papel disponibles al comenzar. Enfrentamientos espejo permitidos. PC con tres dificultades, dos personas localmente y salas online por invitación. Teclado, táctil y mandos estándar. Escenarios decorativos: cuartel, cantera y laboratorio.

Sin torneo. Victoria al ganar dos rounds de 60 segundos. Igualdad de vida al terminar el tiempo no otorga puntos. Vida inicial: 100.

## Reglas comunes

- Golpe básico: 8 puntos, alcance 94, recarga 0,42 s. Aarón: recarga 0,34 s para compensar su único poder.
- Defensa frontal: daño al 18%, mínimo un punto. Consume defensa por tiempo e impacto. Al agotarse hay una breve interrupción.
- Invulnerabilidad breve tras impactos contra daño superpuesto.
- Prismas y regalos: encierro menor a un segundo y posterior inmunidad contra nuevas cadenas.
- J1/J2 y orientación distinguen a personajes idénticos.
- Poderes independientes con botón y recarga visibles; hay que volver a pulsar.
- Sonido opcional, movimiento reducido según sistema, sin sangre ni voces.

## Adaptaciones autorizadas

- Amaral: sol que ciega, neblina que oculta, viento que empuja y desvía.
- Fabrizio: reflector, invisibilidad y picos; se elimina fiesta. Atacar lo revela.
- Sebástian: espada, martillo y piedra arrojadiza en lugar de puentes.
- Benicio: un clon, seis segundos, cinco puntos de daño, diez segundos de recarga, cae de un golpe.
- Los demás mantienen las ideas originales, ajustadas al combate.

## Online

Anfitrión: simulación a 60 pasos/s y estados a 20 Hz. Invitado: controles a 30 Hz. Validación de versión, selección, estructura y rangos básicos. Sin texto libre, chat, voz ni nombres personales.

Código aleatorio de ocho caracteres sin ambigüedades. Invitación con fragmento URL. Máximo dos conexiones. Ambos confirman antes de empezar. Entradas remotas caducan si no llegan. Desconexión o pérdida de estado detienen la partida. Ocultar la pestaña pide pausa.

PeerJS 1.5.5 con señalización pública gratuita, WebRTC directo y STUN. No incluye TURN: ciertas redes restrictivas no pueden conectarse. Se explica el error y se permite reintentar. Sin promesa de conectividad universal ni disponibilidad garantizada.

## Publicación y revisión

Archivos estáticos preparados para GitHub Pages desde main, raíz. No se modifica Aventura-Papel. La primera habilitación se realiza en Settings → Pages.

Jugar en familia para revisar dificultad fácil, legibilidad en teléfonos pequeños, sensación de los saltos, latencia real y equilibrio. Las pruebas automáticas no sustituyen partidas humanas ni certifican todos los mandos o navegadores.
