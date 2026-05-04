---
version: "alpha"
name: "Educore"
description: "Sistema SaaS escolar todo-en-uno para LATAM. Identidad profesional, confiable y tecnologica."
colors:
  primary: "#2563EB"
  primary-dark: "#1D4ED8"
  primary-light: "#DBEAFE"
  accent: "#0EA5E9"
  accent-light: "#E0F2FE"
  success: "#10B981"
  success-light: "#D1FAE5"
  warning: "#F59E0B"
  module-admin: "#2563EB"
  module-learn: "#0EA5E9"
  module-eval: "#8B5CF6"
  module-comm: "#10B981"
  ink: "#0F172A"
  ink-2: "#1E293B"
  ink-3: "#334155"
  muted: "#64748B"
  muted-2: "#94A3B8"
  line: "#E2E8F0"
  line-2: "#F1F5F9"
  bg: "#F8FAFC"
  bg-warm: "#FAFAF9"
  theme-normal-bg: "#0F172A"
  theme-normal-surface: "#111827"
  theme-normal-card: "#1E293B"
  theme-normal-text: "#E2E8F0"
  theme-normal-muted: "#CBD5E1"
  theme-dark-bg: "#09090B"
  theme-dark-surface: "#111113"
  theme-dark-card: "#18181B"
  theme-dark-text: "#FAFAFA"
  theme-dark-muted: "#D4D4D8"
typography:
  hero-h1:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "64px"
    fontWeight: "800"
    lineHeight: "1.06"
    letterSpacing: "0"
  section-h2:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "44px"
    fontWeight: "800"
    lineHeight: "1.1"
    letterSpacing: "0"
  card-h3:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "22px"
    fontWeight: "800"
    lineHeight: "1.2"
    letterSpacing: "0"
  body-lg:
    fontFamily: "Inter"
    fontSize: "19px"
    fontWeight: "400"
    lineHeight: "1.55"
    letterSpacing: "0"
  body:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: "0"
  eyebrow:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "12px"
    fontWeight: "800"
    lineHeight: "1.2"
    letterSpacing: "0.12em"
  mono-caption:
    fontFamily: "JetBrains Mono"
    fontSize: "12px"
    fontWeight: "600"
    lineHeight: "1.4"
    letterSpacing: "0"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  "2xl": "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section-mobile: "64px"
  section-desktop: "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.bg-warm}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 20px"
  landing-normal-card:
    backgroundColor: "{colors.theme-normal-card}"
    textColor: "{colors.theme-normal-text}"
    rounded: "{rounded.lg}"
  landing-dark-card:
    backgroundColor: "{colors.theme-dark-card}"
    textColor: "{colors.theme-dark-text}"
    rounded: "{rounded.lg}"
---

## Overview

Educore debe sentirse como un SaaS escolar B2B serio: claro, confiable, rapido y hecho para directores, administradores, profesores y familias. La marca usa azul como senal principal de confianza, cyan para tecnologia y verde para avance operativo.

## Colors

Usa `primary` para CTAs, links activos y acentos criticos. Usa `accent` para elementos tecnologicos o integraciones. Usa `success` para estados positivos, checks y metricas de mejora. Evita paletas de un solo tono: el producto debe combinar azul, cyan, verde y neutrales.

La landing tiene tres temas:
- **Normal:** azul oscuro corporativo, con texto `theme-normal-text` y muted `theme-normal-muted`.
- **Claro:** fondo blanco/gris claro, texto `ink`.
- **Oscuro:** negro profundo, con texto `theme-dark-text` y muted `theme-dark-muted`.

Nunca uses texto de baja opacidad sobre fondos oscuros para contenido importante. Prefiere tokens muted ya contrastados.

## Typography

Usa Plus Jakarta Sans para titulos, CTAs y labels de alto impacto. Usa Inter para parrafos y UI operativa. Usa JetBrains Mono solo para captions tecnicos o microdatos.

No escales texto con viewport width. Mantén letter spacing en `0` salvo labels uppercase, donde se permite `0.12em`.

## Layout & Spacing

Las secciones de landing usan `section-desktop` en escritorio y `section-mobile` en mobile. El contenedor maximo es 1200px con padding lateral 48px en desktop y 20px en mobile.

## Components

Botones primarios deben ser azules con texto blanco y foco visible. Cards deben mantener radio bajo o medio, borde sutil y contraste suficiente en los tres temas. El selector de tema de los modulos (`Normal`, `Claro`, `Oscuro`) es la fuente de verdad para la landing.

## Do's and Don'ts

- Do: usar tokens semanticos y variables CSS existentes antes de introducir colores nuevos.
- Do: probar Normal, Claro y Oscuro despues de cada cambio visual.
- Do: mantener `/educore/` como landing publica y `/educore/login/` como login.
- Don't: hardcodear `bg-white` o `text-slate-950` en componentes compartidos sin fallback de tema.
- Don't: usar `text-white/50`, `text-white/60` o grises muy apagados para contenido legible en fondos oscuros.
