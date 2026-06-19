# 08 — UX/UI y Sistema de Diseño

> Objetivo estético: **minimalista, tecnológico, moderno, premium**. Alta conversión en lo público; claridad y densidad útil en lo administrativo. **Cero relleno.**

## 8.1 Principios de diseño
1. **Jerarquía clara**: una acción primaria por pantalla.
2. **Espacio en blanco generoso**, tipografía grande y legible.
3. **Movimiento con propósito**: microanimaciones que confirman acciones (Framer Motion), nunca decorativas porque sí.
4. **Consistencia**: todos los componentes del mismo design system (`packages/ui`).
5. **Accesibilidad AA**: contraste, foco visible, navegación por teclado, ARIA (Radix lo facilita).
6. **Dark mode** nativo.

## 8.2 Tokens de diseño
- **Tipografía:** sans-serif moderna geométrica (ej. *Inter*, *Geist* o *Satoshi*). Escala tipográfica modular.
- **Color:** base neutra (zinc/slate) + **acento por tenant** (branding). Estados: success/warning/danger/info.
- **Radios:** suaves (xl/2xl) para look moderno. **Sombras** sutiles + *glassmorphism* puntual en hero.
- **Grid/espaciado:** sistema de 4px. Layouts responsive 12 columnas.
- Implementados como variables CSS + preset de Tailwind; el acento del tenant se inyecta en runtime.

## 8.3 Componentes (shadcn/ui extendido)
Botones, inputs, selects, date/time pickers, tablas con filtros y columnas configurables, modales, drawers, tabs, toasts, badges de estado (registrado/confirmado/asistió/no-show con color), command palette (⌘K) para admins, skeletons de carga, empty states ilustrados, stepper/wizard.

## 8.4 Flujos clave (mapa)
- **Público:** Landing tenant → Página de evento (hero + countdown + CTA sticky) → Formulario de registro → Pantalla de éxito con QR → Email confirmación → Email reconfirmación → Página de confirmación → (recordatorios) → día del evento.
- **Admin evento:** Lista → Wizard de creación → Detalle con pestañas → Publicar → Monitoreo en vivo (registros/check-in) → Sorteo → Reportes/export.
- **Asesor (PWA):** Login → Selección de evento/puerta → Cámara de escaneo → Feedback OK/Error → Contador en vivo.
- **Sorteo:** Configuración → Pantalla show (proyector) → Draw → Confirmar/Re-sortear → Siguiente premio → Resumen.

## 8.5 Landing de alta conversión (requisitos concretos)
- **Above the fold:** propuesta de valor en 1 frase, fecha/lugar, countdown, CTA grande. Prueba social (logos/asistentes/"+X registrados").
- Secciones de beneficios, agenda, ponentes con foto, FAQ, urgencia ("cupos limitados", aforo restante real).
- **CTA sticky** y formulario corto (menos campos = más conversión; campos extra solo si imprescindibles).
- Velocidad: SSG/ISR, imágenes optimizadas (next/image), LCP < 2.5s.
- Tracking de funnel y UTM.

## 8.6 El "show" del sorteo (especificación de UX)
- Pantalla a fullscreen, fondo oscuro premium, tipografía gigante.
- **Fase 1 (giro):** "bombo" con números/nombres barajándose rápido (efecto slot machine), **redoble de tambores** in crescendo (audio), luz/vibración visual.
- **Fase 2 (suspenso):** desaceleración, latido, foco en un candidato.
- **Fase 3 (revelación):** **explosión de confeti** (canvas-confetti), sonido de celebración, nombre del ganador en grande + su nº.
- **Control del presentador (panel lateral o segunda pantalla):** botón "Sortear", indicador **Presente/Ausente**, botón **"Re-sortear"** (si ausente), "Confirmar ganador", "Siguiente premio".
- Realtime: si hay segunda pantalla de control, se sincroniza con la de proyección (Supabase Realtime/Socket.IO).
- Accesible y con opción de silenciar audio.

## 8.7 PWA de check-in
- Instalable, splash, funciona offline (cola local + sync).
- Escáner a pantalla completa con marco guía, feedback háptico y sonoro, resultado en color (verde/rojo) y datos del asistente.
- Selector de **puerta/gate** al iniciar sesión de escaneo.

## 8.8 Responsividad y rendimiento
- Mobile-first en público y check-in. Desktop-first en panel.
- Presupuesto de rendimiento: JS inicial reducido, code-splitting por ruta, lazy de componentes pesados (escáner, sorteo).

### Criterios de Aceptación (CA-08)
- CA-08.1: El design system está en `packages/ui` y todas las apps lo consumen (sin estilos sueltos).
- CA-08.2: Dark mode y branding por tenant funcionan en público y admin.
- CA-08.3: La landing cumple Core Web Vitals "good" en móvil.
- CA-08.4: El sorteo corre fluido en pantalla grande con audio + confeti y control de re-sorteo.


---

> **Actualización de implementación (ver `13`):** sistema visual premium aplicado — **Fraunces** (serif display variable) + **Inter**, textura de **grano** + **aurora**, microanimaciones con **framer-motion**, countdown animado, widget de chat y "show" de sorteo con **canvas-confetti** + Web Audio. Páginas públicas con routing por ruta `/o/{tenant}/{evento}`. Acento por tenant inyectado vía CSS variables desde el branding.
