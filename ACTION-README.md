# 🛡️ AuditAPI GitHub Action

Audita especificaciones OpenAPI con scoring de calidad y validación de seguridad integrada en tus pipelines CI/CD.

## 🚀 Uso Rápido

```yaml
name: API Quality Check

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Audit OpenAPI
        uses: ./  # O: uses: tu-org/auditapi@v1
        with:
          file: 'openapi.yaml'
          fail-on: 'B'
```

## 📋 Inputs

| Input | Descripción | Requerido | Default |
|-------|-------------|-----------|---------|
| `file` | Ruta al archivo OpenAPI (YAML/JSON) | ✅ | `openapi.yaml` |
| `fail-on` | Grado mínimo para pasar (A, B, C, D, F) | ❌ | `D` |
| `verbose` | Mostrar todas las violaciones (true/false) | ❌ | `false` |
| `config` | Directorio de configuración personalizada | ❌ | `./config` |
| `output` | Ruta para guardar el reporte JSON | ❌ | `` |

## 📤 Outputs

| Output | Descripción |
|--------|-------------|
| `score` | Puntuación final (0-100) |
| `grade` | Calificación (A, B, C, D, F) |
| `passed` | ¿Pasó la auditoría? (true/false) |
| `violations` | Total de violaciones |
| `errors` | Número de errores |
| `warnings` | Número de warnings |
| `report` | Reporte completo en JSON |

## 💡 Ejemplos

### Modo Estricto (Calidad Alta)
```yaml
- uses: ./
  with:
    file: 'openapi.yaml'
    fail-on: 'A'  # Solo permite grado A
    verbose: 'true'
```

### Auditoría Múltiples APIs
```yaml
strategy:
  matrix:
    api: ['api-v1.yaml', 'api-v2.yaml']

steps:
  - uses: ./
    with:
      file: ${{ matrix.api }}
      fail-on: 'B'
```

### Usar Outputs en Pasos Posteriores
```yaml
- name: Audit API
  id: audit
  uses: ./
  with:
    file: 'openapi.yaml'

- name: Check Results
  if: always()
  run: |
    echo "Score: ${{ steps.audit.outputs.score }}"
    echo "Grade: ${{ steps.audit.outputs.grade }}"
    echo "Passed: ${{ steps.audit.outputs.passed }}"
```

### Comentar Resultados en PR
```yaml
- name: Audit API
  id: audit
  uses: ./
  with:
    file: 'openapi.yaml'

- name: Comment PR
  if: github.event_name == 'pull_request' && always()
  uses: actions/github-script@v7
  with:
    script: |
      const report = JSON.parse('${{ steps.audit.outputs.report }}');
      const body = `## 🔍 API Audit Results
      
      **Grade:** ${report.grade}  
      **Score:** ${report.finalScore}/100  
      **Status:** ${report.passed ? '✅ PASSED' : '❌ FAILED'}
      
      **Violations:** ${report.summary.totalViolations}  
      - ❌ Errors: ${report.summary.errorCount}
      - ⚠️ Warnings: ${report.summary.warningCount}
      `;
      
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: body
      });
```

## 🔧 Configuración Personalizada

Puedes personalizar las reglas creando un directorio `config/` en tu repositorio:

```
config/
├── ruleset.yaml    # Reglas de validación Spectral
└── scoring.yaml    # Pesos y penalizaciones
```

```yaml
- uses: ./
  with:
    file: 'openapi.yaml'
    config: './mi-config'  # Ruta a tu config personalizada
```

## 🐳 Docker Local

También puedes usar la imagen Docker directamente:

```bash
# Construir
docker build -t auditapi .

# Ejecutar
docker run --rm -v $(pwd):/app auditapi audit /app/openapi.yaml --verbose
```

## 📊 Niveles de Calidad

- **A (90-100)**: Excelente - Cumple todas las mejores prácticas
- **B (80-89)**: Bueno - Pequeñas mejoras necesarias
- **C (70-79)**: Aceptable - Problemas menores detectados
- **D (60-69)**: Deficiente - Mejoras significativas requeridas
- **F (0-59)**: Fallido - Problemas críticos de seguridad/calidad

## 🏷️ Categorías de Reglas

- **🔒 Seguridad (35%)**: Autenticación, HTTPS, validaciones
- **📝 Completitud (25%)**: Documentación, ejemplos, manejo de errores
- **🏗️ Estructura (25%)**: Organización, $ref, operationId
- **🎯 Consistencia (15%)**: Naming conventions, formatos

## 🆘 Soporte

¿Problemas? Crea un issue en el repositorio.

## 📄 Licencia

MIT
