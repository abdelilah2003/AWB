# 🔐 APP_PFE_AWB

> **Plateforme de modélisation des menaces pilotée par IA pour les infrastructures AWB.**

[![Security - Threat Modeling](https://img.shields.io/badge/Security-Threat%20Modeling-red?style=for-the-badge)]([https://stride.org/](https://atlas.mitre.org/))
[![AI - Ollama](https://img.shields.io/badge/AI-Ollama%20RAG-blue?style=for-the-badge)](https://ollama.ai/)
[![Stack - FastAPI/React](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React-green?style=for-the-badge)](https://fastapi.tiangolo.com/)

---

## 📖 À propos
NOT YET - SOON INCHALLAH 

## ⚙️ Fonctionnement du Pipeline
Le workflow est conçu pour être fluide et itératif :
1. **Input Architecture** : Description textuelle ou schématique des flux.
2. **Génération DFD** : Création visuelle du *Data Flow Diagram*.
3. **Analyse IA** : Traitement par LLM (Ollama) enrichi par le contexte local (ChromaDB).
4. **Validation** : Revue des impacts et prérequis de remédiation.

## 🧱 Stack Technique

| Layer | Technologie |
| :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite) |
| **Backend** | ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi) ![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white) |
| **AI Engine** | ![Ollama](https://img.shields.io/badge/Ollama-LLM-white?style=flat) (Mistral/Llama3) |
| **Vector DB** | ![FAISS](https://img.shields.io/badge/RAG-FAISS%20%2F%20ChromaDB-yellow?style=flat) |
| **Reporting** | Jinja2 Templates (Export PDF/HTML) |

---

## 🚀 Livrables (Output)
L'application génère automatiquement :
- 📊 **Diagramme DFD** dynamique.
- 📋 **Liste des menaces** structurée (Méthode STRIDE / MITRE).
- 🛡️ **Impacts & Exigences** de sécurité spécifiques au secteur bancaire.

---
### 🎓 Stagiaires (PFE)
| Collaborateur | Rôle Principal | GitHub |
| :--- | :--- | :--- |
| **[NADA BELLAALI]** | R&D ENGINEER | [@NADA_BELLAALI](https://github.com/) |
| **[SAAFLAOUKETE ABDELILAH ]** | CYBERSECURITY ENGINEER | [@SAAF_ABDEL](https://github.com/username2) |
## 🛠️ Installation & Lancement

```bash
# 1. Cloner le repository
git clone [https://github.com/votre-user/APP_PFE_AWB.git](https://github.com/votre-user/APP_PFE_AWB.git)

# 2. Lancer le Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload

# 3. Lancer le Frontend
cd ../frontend
npm install
npm run dev




