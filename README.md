# AuditAPI

> ¿Tu API es una bomba de tiempo? Audítala en 3 segundos.

AuditAPI es una herramienta CLI de alto rendimiento que analiza especificaciones OpenAPI (Swagger) con reglas de calidad estrictas, puntuación ponderada y detección de vulnerabilidades de seguridad. Diseñada para equipos que toman la calidad de sus APIs en serio.

[![npm version](https://img.shields.io/npm/v/auditapi.svg)](https://www.npmjs.com/package/auditapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/auditapi)

## 🚀 Prueba Inmediata

```bash
# Usando npx (sin instalar)
npx auditapi audit ./openapi.yaml

# O usando Docker
docker run --rm -v $(pwd):/app auditapi audit /app/openapi.yaml
```

## 📸 AuditAPI en Acción

```
╔══════════════════════════════════════════════════════════╗
║                    AUDITAPI REPORT                       ║
╚══════════════════════════════════════════════════════════╝

📄 File:     /tests/casing-mixed.yaml
⏱️  Duration: 180ms
📅 Time:     2026-02-17T11:12:54.767Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    FINAL GRADE: B
                    SCORE: 87/100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Category Breakdown:
  ✅ security        Weight: 0.35  Penalty: 0
  ⚠️  completeness    Weight: 0.25  Penalty: 30
  ✅ structure       Weight: 0.25  Penalty: 0
  ⚠️  consistency     Weight: 0.15  Penalty: 35

📊 Summary:
   Total Violations: 9
   ❌ Errors:         1
   ⚠️  Warnings:       8

✅ PASSED


Detailed Violations:
──────────────────────────────────────────────────────────

❌ [cns-mixed-styles] ERROR
   CNS-01: Mixed property casing detected
   Path: components.schemas
   Line: 37:10
```

## 🎯 ¿Por qué Fallamos?

AuditAPI detecta problemas críticos en 4 categorías:

| Categoría | Peso | Problemas Comunes | Impacto |
|-----------|------|-------------------|---------|
| **🔒 Seguridad** | 35% | OWASP API Top 10, HTTPS no forzado, autenticación débil, mass assignment | Crítico |
| **📝 Completitud** | 25% | Falta de descripciones, ejemplos ausentes, errores no documentados (400, 401, 403, 500) | Alto |
| **🏗️ Estructura** | 25% | Schemas inline, sin $ref, operationId duplicados, tags faltantes | Medio |
| **🎯 Consistencia** | 15% | Mezcla de camelCase/snake_case, paths inconsistentes, formatos de fecha incorrectos | Medio |

### Errores Críticos Detectados

#### 🔒 Seguridad (OWASP API Top 10)
- **SEC-01**: Esquemas de autenticación no definidos (`securitySchemes` vacíos)
- **SEC-02**: API Keys en query parameters (deben ir en headers)
- **SEC-03**: HTTP en lugar de HTTPS
- **SEC-04**: `additionalProperties: true` (riesgo de Mass Assignment)
- **SEC-05**: OAuth2 sin scopes definidos

#### 🎯 Consistencia (CamelCase vs Snake_Case)
- **CNS-01**: Mezcla de estilos en propiedades JSON
  ```yaml
  # ❌ INCORRECTO
  properties:
    firstName:     # camelCase
    last_name:     # snake_case
    email_address: # snake_case
  ```
- **CNS-02**: Paths que no usan kebab-case (`/myEndpoint` vs `/my-endpoint`)
- **CNS-03**: Headers sin Hyphenated-Pascal-Case
- **CNS-04**: Fechas sin formato ISO8601 (`date-time`)

#### 📝 Documentación (Ejemplos Faltantes)
- **COM-01**: Endpoints sin `summary` o `description`
- **COM-02**: Respuestas sin ejemplos (`example` o `examples`)
- **COM-03**: Faltan códigos de error estándar (400, 401, 403, 500)
- **COM-04**: Metadatos incompletos (contact, license)
- **COM-05**: Parámetros sin descripción

## 📦 Instalación

### Opción 1: npm (Global)
```bash
npm install -g auditapi
auditapi audit ./openapi.yaml
```

### Opción 2: Docker
```bash
docker pull auditapi/auditapi
docker run --rm -v $(pwd):/app auditapi audit /app/openapi.yaml
```

### Opción 3: GitHub Actions
```yaml
- name: Audit OpenAPI
  uses: auditapi/auditapi@v1
  with:
    file: 'openapi.yaml'
    fail-on: 'B'
```

## 🛠️ Uso

### Comandos Básicos

```bash
# Auditar un archivo
auditapi audit ./openapi.yaml

# Modo verbose (muestra todas las violaciones)
auditapi audit ./openapi.yaml --verbose

# Fallar si el grado es menor a B
auditapi audit ./openapi.yaml --fail-on B

# Salida JSON
auditapi audit ./openapi.yaml --json

# Guardar reporte en archivo
auditapi audit ./openapi.yaml --output report.json
```

### Configuración Personalizada

Crea un directorio `config/` para personalizar reglas:

```yaml
# config/ruleset.yaml
rules:
  my-custom-rule:
    description: "Mi regla personalizada"
    given: "$.paths.*"
    then:
      function: truthy
      field: description

# config/scoring.yaml
base_score: 100
weights:
  security: 0.40  # Aumentar peso de seguridad
  completeness: 0.20
  structure: 0.20
  consistency: 0.20
```

## 📊 Sistema de Puntuación

### Escala de Calificaciones

| Grado | Rango | Estado | Significado |
|-------|-------|--------|-------------|
| **A** | 90-100 | ✅ Excelente | Cumple todas las mejores prácticas |
| **B** | 80-89 | ✅ Bueno | Pequeñas mejoras necesarias |
| **C** | 70-79 | ⚠️ Aceptable | Problemas menores detectados |
| **D** | 60-69 | ❌ Deficiente | Mejoras significativas requeridas |
| **F** | 0-59 | ❌ Fallido | Problemas críticos de seguridad/calidad |

### Pesos por Categoría

```
🔒 Seguridad:     35% (Crítico - Errores fatales causan F automático)
📝 Completitud:   25% (Alto - Documentación y ejemplos)
🏗️ Estructura:    25% (Medio - Organización del código)
🎯 Consistencia:  15% (Medio - Naming conventions)
```

## 🔧 Características

- ⚡ **Rápido**: Audita archivos complejos en < 200ms
- 🎯 **Preciso**: Basado en Spectral + OWASP API Security
- 🐳 **Containerizado**: Imagen Docker lista para CI/CD
- 🔧 **Configurable**: Reglas personalizables vía YAML
- 📊 **Integración**: GitHub Actions nativo
- 🎨 **Visual**: Output coloreado y legible

## 🏗️ Arquitectura

```
AuditAPI/
├── src/
│   ├── cli/           # Interfaz de línea de comandos
│   ├── config/        # Cargador de configuración YAML
│   ├── core/          # Motor de auditoría Spectral
│   ├── functions/     # Reglas personalizadas
│   └── types/         # Definiciones TypeScript
├── config/
│   ├── ruleset.yaml   # Reglas Spectral
│   └── scoring.yaml   # Configuración de puntuación
└── Dockerfile         # Imagen multi-etapa
```

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu feature branch (`git checkout -b feature/nueva-regla`)
3. Commit tus cambios (`git commit -am 'Agrega nueva regla'`)
4. Push al branch (`git push origin feature/nueva-regla`)
5. Abre un Pull Request

## 📄 Licencia

MIT © [AuditAPI Team](LICENSE)

---

<p align="center">
  <b>Hecho con ❤️ para desarrolladores que valoran la calidad</b>
</p>
