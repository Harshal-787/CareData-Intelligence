package swagger

import (
	_ "embed"
	"net/http"
	"strings"
)

// Embedded OpenAPI 3.0 JSON specification
const OpenAPISpecJSON = `{
  "openapi": "3.0.3",
  "info": {
    "title": "CareData Intelligence Core REST API",
    "description": "Enterprise AI-enabled Healthcare Data Intelligence Platform API.\\n\\nIncludes Endpoints for Authentication, RBAC, Multi-tenancy, User Management, Audit Logging, and System Health.",
    "version": "1.0.0",
    "contact": {
      "name": "CareData Engineering Team",
      "email": "support@caredata.ai"
    }
  },
  "servers": [
    {
      "url": "http://localhost:8080",
      "description": "Local Development Server"
    }
  ],
  "tags": [
    { "name": "System & Health", "description": "Microservice uptime and diagnostics" },
    { "name": "Authentication", "description": "JWT authentication, login, registration, and token rotation" },
    { "name": "User Management", "description": "RBAC user provisioning and permissions" },
    { "name": "Organizations", "description": "Multi-tenant hospital network management" },
    { "name": "Audit Logging", "description": "Immutable security event tracking and HIPAA compliance logs" },
    { "name": "Datasets & Ingestion", "description": "Healthcare data lake ingestion and Parquet partitioning (Phase 2)" },
    { "name": "Data Quality & Profiling", "description": "DuckDB automated profiling and clinical validation rules (Phase 3)" },
    { "name": "Deduplication", "description": "Patient demographic fuzzy matching and MPI merge (Phase 4)" },
    { "name": "Analytics & AI", "description": "DuckDB OLAP queries and Ollama local LLM insights (Phases 5-7)" }
  ],
  "paths": {
    "/api/v1/health": {
      "get": {
        "tags": ["System & Health"],
        "summary": "Health check",
        "description": "Returns operational status and timestamp of the CareData Core API.",
        "responses": {
          "200": {
            "description": "API is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": { "type": "string", "example": "healthy" },
                    "service": { "type": "string", "example": "CareData Intelligence Core API" },
                    "version": { "type": "string", "example": "1.0.0" },
                    "timestamp": { "type": "string", "example": "2026-08-26T09:03:42Z" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/login": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Authenticate user",
        "description": "Authenticates user credentials and returns JWT Access and Refresh tokens.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginRequest"
              },
              "examples": {
                "superAdmin": {
                  "summary": "Super Administrator Login",
                  "value": {
                    "email": "superadmin@caredata.ai",
                    "password": "Password123!"
                  }
                },
                "orgAdmin": {
                  "summary": "Hospital Administrator Login",
                  "value": {
                    "email": "admin@caredata.ai",
                    "password": "Password123!"
                  }
                },
                "analyst": {
                  "summary": "Data Analyst Login",
                  "value": {
                    "email": "analyst@caredata.ai",
                    "password": "Password123!"
                  }
                },
                "viewer": {
                  "summary": "Clinical Viewer Login",
                  "value": {
                    "email": "viewer@caredata.ai",
                    "password": "Password123!"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Authentication successful",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AuthResponse"
                }
              }
            }
          },
          "401": {
            "description": "Invalid credentials",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/register": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Register new organization & administrator",
        "description": "Creates a new multi-tenant organization and provisions the primary Org Admin account.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RegisterRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Organization registered and user created",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/AuthResponse" }
              }
            }
          },
          "400": {
            "description": "Validation error or email already taken",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/refresh": {
      "post": {
        "tags": ["Authentication"],
        "summary": "Rotate refresh token",
        "description": "Exchanges a valid refresh token for a new access token.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["refreshToken"],
                "properties": {
                  "refreshToken": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Token refreshed",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/AuthResponse" }
              }
            }
          },
          "401": {
            "description": "Invalid or expired refresh token",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/api/v1/auth/me": {
      "get": {
        "tags": ["Authentication"],
        "summary": "Get current authenticated profile",
        "security": [{ "BearerAuth": [] }],
        "responses": {
          "200": {
            "description": "Current user profile",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserResponse" }
              }
            }
          },
          "401": { "description": "Unauthorized" }
        }
      }
    },
    "/api/v1/users": {
      "get": {
        "tags": ["User Management"],
        "summary": "List organization users",
        "description": "Returns all users belonging to the active organization (or all organizations if Super Admin).",
        "security": [{ "BearerAuth": [] }],
        "responses": {
          "200": {
            "description": "List of users",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/UserResponse" }
                }
              }
            }
          },
          "403": { "description": "Forbidden: Requires SUPER_ADMIN or ORG_ADMIN role" }
        }
      },
      "post": {
        "tags": ["User Management"],
        "summary": "Provision new user",
        "description": "Creates a new user inside the organization with a designated RBAC role.",
        "security": [{ "BearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateUserRequest" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "User created successfully",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/UserResponse" }
              }
            }
          },
          "400": { "description": "Validation error" },
          "403": { "description": "Forbidden" }
        }
      }
    },
    "/api/v1/organizations": {
      "get": {
        "tags": ["Organizations"],
        "summary": "List all organizations (Super Admin only)",
        "description": "Returns list of all registered healthcare tenant networks.",
        "security": [{ "BearerAuth": [] }],
        "responses": {
          "200": {
            "description": "List of organizations",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/Organization" }
                }
              }
            }
          },
          "403": { "description": "Forbidden: Requires SUPER_ADMIN" }
        }
      }
    },
    "/api/v1/audit-logs": {
      "get": {
        "tags": ["Audit Logging"],
        "summary": "Retrieve security audit trail",
        "description": "Returns immutable audit events for HIPAA compliance and system monitoring.",
        "security": [{ "BearerAuth": [] }],
        "responses": {
          "200": {
            "description": "List of audit log entries",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/AuditLog" }
                }
              }
            }
          },
          "403": { "description": "Forbidden: Requires Admin role" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter JWT Bearer Token (obtain from /api/v1/auth/login)"
      }
    },
    "schemas": {
      "LoginRequest": {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
          "email": { "type": "string", "format": "email", "example": "admin@caredata.ai" },
          "password": { "type": "string", "example": "Password123!" }
        }
      },
      "RegisterRequest": {
        "type": "object",
        "required": ["organizationName", "fullName", "email", "password"],
        "properties": {
          "organizationName": { "type": "string", "example": "Memorial Healthcare System" },
          "fullName": { "type": "string", "example": "Dr. Sarah Jenkins" },
          "email": { "type": "string", "format": "email", "example": "sjenkins@memorial.org" },
          "password": { "type": "string", "minLength": 8, "example": "Password123!" }
        }
      },
      "CreateUserRequest": {
        "type": "object",
        "required": ["fullName", "email", "password", "role"],
        "properties": {
          "fullName": { "type": "string", "example": "Michael Chen" },
          "email": { "type": "string", "format": "email", "example": "mchen@hospital.org" },
          "password": { "type": "string", "example": "Password123!" },
          "role": {
            "type": "string",
            "enum": ["SUPER_ADMIN", "ORG_ADMIN", "DATA_ANALYST", "VIEWER"],
            "example": "DATA_ANALYST"
          }
        }
      },
      "AuthResponse": {
        "type": "object",
        "properties": {
          "accessToken": { "type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6..." },
          "refreshToken": { "type": "string", "example": "eyJhbGciOiJIUzI1NiIsInR5cCI6..." },
          "user": { "$ref": "#/components/schemas/UserResponse" }
        }
      },
      "UserResponse": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "example": "usr-admin-002" },
          "email": { "type": "string", "example": "admin@caredata.ai" },
          "fullName": { "type": "string", "example": "Sarah Jenkins (Hospital Administrator)" },
          "role": { "type": "string", "example": "ORG_ADMIN" },
          "organizationId": { "type": "string", "example": "org-default-001" },
          "organization": { "$ref": "#/components/schemas/Organization" }
        }
      },
      "Organization": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "example": "org-default-001" },
          "name": { "type": "string", "example": "CareData Health System" },
          "slug": { "type": "string", "example": "caredata-health" },
          "createdAt": { "type": "string", "format": "date-time" },
          "updatedAt": { "type": "string", "format": "date-time" }
        }
      },
      "AuditLog": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "example": "audit-8f4b12a" },
          "organizationId": { "type": "string", "example": "org-default-001" },
          "userId": { "type": "string", "example": "usr-admin-002" },
          "userEmail": { "type": "string", "example": "admin@caredata.ai" },
          "action": { "type": "string", "example": "LOGIN" },
          "resource": { "type": "string", "example": "AUTH" },
          "details": { "type": "string", "example": "User logged in successfully" },
          "ipAddress": { "type": "string", "example": "127.0.0.1" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "error": { "type": "string", "example": "Invalid email or password" }
        }
      }
    }
  }
}`

const swaggerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CareData Intelligence — Interactive API Documentation (Swagger)</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/favicon-32x32.png" sizes="32x32" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #0b0f19; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .swagger-ui .topbar { display: none; }
    .custom-header {
      background: linear-gradient(135deg, #083344 0%, #0f172a 100%);
      padding: 20px 30px;
      border-bottom: 1px solid rgba(6, 182, 212, 0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .custom-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .custom-header .badge {
      background: rgba(6, 182, 212, 0.2);
      color: #22d3ee;
      border: 1px solid rgba(6, 182, 212, 0.4);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-family: monospace;
    }
    .custom-header a {
      color: #38bdf8;
      text-decoration: none;
      font-size: 13px;
      padding: 8px 14px;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s;
    }
    .custom-header a:hover {
      background: rgba(6, 182, 212, 0.2);
      border-color: #38bdf8;
    }
    .swagger-ui {
      filter: invert(88%) hue-rotate(180deg);
      padding-bottom: 50px;
    }
    .swagger-ui .info .title { color: #000; }
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>
      <span>🏥 CareData Intelligence</span>
      <span class="badge">OpenAPI 3.0 / Swagger</span>
    </h1>
    <div style="display: flex; gap: 12px;">
      <a href="/swagger/doc.json" target="_blank">📄 Raw OpenAPI JSON</a>
      <a href="http://localhost:5173" target="_blank">🚀 Launch React Dashboard</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/swagger/doc.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true
      });
      window.ui = ui;
    };
  </script>
</body>
</html>`

func Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		if strings.HasSuffix(path, "/doc.json") || strings.HasSuffix(path, "/swagger.json") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(OpenAPISpecJSON))
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(swaggerHTML))
	}
}
