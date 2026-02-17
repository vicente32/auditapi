# AuditAPI

> Is your API a time bomb? Audit it in 3 seconds.

AuditAPI is a high-performance CLI tool that analyzes OpenAPI (Swagger) specifications with strict quality rules, weighted scoring, and security vulnerability detection. Designed for teams who take API quality seriously.

[![npm version](https://img.shields.io/npm/v/auditapi.svg)](https://www.npmjs.com/package/auditapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/auditapi)

## 🚀 Quick Test

```bash
# Using npx (without installing)
npx auditapi audit ./openapi.yaml

# Or using Docker
docker run --rm -v $(pwd):/app auditapi audit /app/openapi.yaml
```

## 📸 AuditAPI in Action

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
   ⚠️  consistency    Weight: 0.15  Penalty: 35

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

## 🎯 Why Do We Fail?

AuditAPI detects critical problems in 4 categories:

| Category | Weight | Common Issues | Impact |
|----------|--------|---------------|--------|
| **🔒 Security** | 35% | OWASP API Top 10, HTTPS not enforced, weak authentication, mass assignment | Critical |
| **📝 Completeness** | 25% | Missing descriptions, absent examples, undocumented error codes (400, 401, 403, 500) | High |
| **🏗️ Structure** | 25% | Inline schemas, no $ref, duplicate operationId, missing tags | Medium |
| **🎯 Consistency** | 15% | Mixed camelCase/snake_case, inconsistent paths, incorrect date formats | Medium |

### Critical Errors Detected

#### 🔒 Security (OWASP API Top 10)
- **SEC-01**: Authentication schemes not defined (empty `securitySchemes`)
- **SEC-02**: API Keys in query parameters (must be in headers)
- **SEC-03**: HTTP instead of HTTPS
- **SEC-04**: `additionalProperties: true` (Mass Assignment risk)
- **SEC-05**: OAuth2 without defined scopes

#### 🎯 Consistency (CamelCase vs Snake_Case)
- **CNS-01**: Mixed styles in JSON properties
  ```yaml
  # ❌ INCORRECT
  properties:
    firstName:     # camelCase
    last_name:     # snake_case
    email_address: # snake_case
  ```
- **CNS-02**: Paths not using kebab-case (`/myEndpoint` vs `/my-endpoint`)
- **CNS-03**: Headers without Hyphenated-Pascal-Case
- **CNS-04**: Dates not in ISO8601 format (`date-time`)

#### 📝 Documentation (Missing Examples)
- **COM-01**: Endpoints without `summary` or `description`
- **COM-02**: Responses without examples (`example` or `examples`)
- **COM-03**: Missing standard error codes (400, 401, 403, 500)
- **COM-04**: Incomplete metadata (contact, license)
- **COM-05**: Parameters without description

## 📦 Installation

### Option 1: npm (Global)
```bash
npm install -g auditapi
auditapi audit ./openapi.yaml
```

### Option 2: Docker
```bash
docker pull auditapi/auditapi
docker run --rm -v $(pwd):/app auditapi audit /app/openapi.yaml
```

### Option 3: GitHub Actions
```yaml
- name: Audit OpenAPI
  uses: auditapi/auditapi@v1
  with:
    file: 'openapi.yaml'
    fail-on: 'B'
```

## 🛠️ Usage

### Basic Commands

```bash
# Audit a file
auditapi audit ./openapi.yaml

# Verbose mode (shows all violations)
auditapi audit ./openapi.yaml --verbose

# Fail if grade is lower than B
auditapi audit ./openapi.yaml --fail-on B

# JSON output
auditapi audit ./openapi.yaml --json

# Save report to file
auditapi audit ./openapi.yaml --output report.json
```

### Custom Configuration

Create a `config/` directory to customize rules:

```yaml
# config/ruleset.yaml
rules:
  my-custom-rule:
    description: "My custom rule"
    given: "$.paths.*"
    then:
      function: truthy
      field: description

# config/scoring.yaml
base_score: 100
weights:
  security: 0.40  # Increase security weight
  completeness: 0.20
  structure: 0.20
  consistency: 0.20
```

## 📊 Scoring System

### Grade Scale

| Grade | Range | Status | Meaning |
|-------|-------|--------|---------|
| **A** | 90-100 | ✅ Excellent | Meets all best practices |
| **B** | 80-89 | ✅ Good | Minor improvements needed |
| **C** | 70-79 | ⚠️ Acceptable | Minor issues detected |
| **D** | 60-69 | ❌ Deficient | Significant improvements required |
| **F** | 0-59 | ❌ Failed | Critical security/quality issues |

### Category Weights

```
🔒 Security:     35% (Critical - Fatal errors cause automatic F)
📝 Completeness: 25% (High - Documentation and examples)
🏗️ Structure:   25% (Medium - Code organization)
🎯 Consistency: 15% (Medium - Naming conventions)
```

## 🔧 Features

- ⚡ **Fast**: Audits complex files in < 200ms
- 🎯 **Precise**: Based on Spectral + OWASP API Security
- 🐳 **Containerized**: Ready-to-use Docker image for CI/CD
- 🔧 **Configurable**: Customizable rules via YAML
- 📊 **Integration**: Native GitHub Actions
- 🎨 **Visual**: Colored and readable output

## 🏗️ Architecture

```
AuditAPI/
├── src/
│   ├── cli/           # Command line interface
│   ├── config/        # YAML configuration loader
│   ├── core/          # Spectral audit engine
│   ├── functions/     # Custom rules
│   └── types/         # TypeScript definitions
├── config/
│   ├── ruleset.yaml   # Spectral rules
│   └── scoring.yaml   # Scoring configuration
└── Dockerfile         # Multi-stage image
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-rule`)
3. Commit your changes (`git commit -am 'Add new rule'`)
4. Push to the branch (`git push origin feature/new-rule`)
5. Open a Pull Request

## 📄 License

MIT © [AuditAPI Team](LICENSE)

---

<p align="center">
  <b>Made with ❤️ for developers who value quality</b>
</p>
