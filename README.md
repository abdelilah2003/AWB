# AWB Application

Application full-stack avec FastAPI, React, Keycloak, PostgreSQL et integration AI (Mistral + Gemini).

## Stack

- Frontend : React + Vite + Nginx (port 5173)
- Backend  : FastAPI + Uvicorn (port 8000)
- Auth     : Keycloak (port 8080)
- DB       : PostgreSQL (port 5432)
- Storage  : MinIO (S3-compatible)

## Setup local

```bash
git clone https://github.com/abdelilah2003/AWB.git
cd AWB
cp .env.example .env
cp backend.env.example backend.env
# Editer .env et backend.env avec les vraies valeurs
docker compose up -d --build
```

Acces :
- Frontend  : http://localhost:5173
- Backend   : http://localhost:8000/docs
- Keycloak  : http://localhost:8080

## Pipeline DevSecOps

Le `Jenkinsfile` orchestre :

1. Gitleaks (scan secrets)
2. SonarQube (SAST)
3. CycloneDX + Dependency-Track (SCA / SBOM)
4. Tests + Lint (parallele)
5. Build images Docker
6. Trivy (scan vulns)
7. Push Docker Hub
8. Deploy SSH vers VM
9. Health check + monitoring (Prometheus / Grafana)

## Securite

- Aucun secret en clair dans le repo
- .env dans .gitignore
- Cles API en Jenkins Credentials
- Images scannees avant deploiement
