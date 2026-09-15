# Metric Lab

App de entrenamiento para llevar rutinas, mesociclos y sesiones de gimnasio desde el celular, con progresión histórica (1RM) y estimación de repeticiones/series basada en datos reales de cada sesión.

Monorepo con dos partes independientes: una API serverless y una app mobile.

## Estructura del repo

```
metric-lab-api/       API serverless en TypeScript (Vercel Functions + Supabase/PostgreSQL)
metric-lab-mobile/    App para Android/iOS en Expo / React Native
```

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | TypeScript, Vercel Serverless Functions, Supabase (PostgreSQL), Row-Level Security |
| Mobile | React Native (Expo), React Navigation, Zustand |
| Testing | `node:test` (backend), Jest + React Native Testing Library (mobile) |
| Infra | 12 migraciones SQL incrementales versionadas en `metric-lab-api/migrations/` |

## Backend (`metric-lab-api`)

API sin servidor sobre Supabase. Los endpoints están organizados por dominio:

- `api/auth` — registro y login
- `api/routines` — rutinas de entrenamiento
- `api/mesocycles` — mesociclos (bloques de entrenamiento)
- `api/sessions` — sesiones de entrenamiento y series registradas
- `api/data` — datos de progreso (1RM, históricos)

Lógica de negocio separada en `services/` (con tests unitarios junto a cada servicio) y acceso a datos en `repositories/`. El modelo evolucionó de forma incremental: RLS scoped, mesociclos, ciclo de vida de sesión, soft deletes de ejercicios, equipamiento y anclaje semanal, entre otros — cada cambio versionado como su propia migración.

### Correr en local

```bash
cd metric-lab-api
cp .env.example .env   # completar con tu proyecto de Supabase
npm install
npm test               # corre los tests de services/repositories/utils
vercel dev              # levanta la API local
```

## Mobile (`metric-lab-mobile`)

App en React Native (Expo) con navegación por tabs (`@react-navigation`), estado global en Zustand y persistencia local con AsyncStorage. Permite registrar series/reps durante el entrenamiento y visualizar la progresión histórica (1RM) en gráficos.

### Correr en local

```bash
cd metric-lab-mobile
npm install
npm start        # abre Expo Dev Tools; escaneá el QR con Expo Go
npm test         # tests con Jest + Testing Library
```

## Estado del proyecto

Proyecto personal en desarrollo activo. El backend cubre autenticación, rutinas, mesociclos, sesiones y cálculo de 1RM con tests unitarios; el frontend cubre el flujo completo de entrenamiento y el historial de progreso.
