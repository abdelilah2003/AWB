import type { AnalysisResult } from './types';

export const mockAnalysisResult: AnalysisResult = {
  context_summary:
    'Application de chatbot RH utilisant un LLM avec RAG, exposée publiquement et traitant des données personnelles.',
  attack_surfaces: ['PROMPT', 'RAG', 'DATA', 'LLM'],
  risk_score: 78,
  threats: [
    {
      id: 'T001',
      name: 'Prompt Injection',
      severity: 'CRITIQUE',
      justification:
        'L\'application permet la saisie libre de prompts sans validation stricte. Un attaquant peut manipuler le comportement du LLM en injectant des instructions malveillantes.',
      attacks: [
        'Injection de commandes système via le prompt',
        'Manipulation du contexte pour extraire des données',
        'Contournement des restrictions de sécurité',
        'Jailbreak du modèle via techniques adversariales',
      ],
      impacts: [
        'Exfiltration de données confidentielles',
        'Compromission de l\'intégrité des réponses',
        'Accès non autorisé aux ressources backend',
        'Violation du RGPD sur les données personnelles',
      ],
      controls: [
        'Implémenter un système de validation et sanitization des prompts',
        'Mettre en place des guardrails avec un modèle de classification',
        'Utiliser des templates de prompts avec paramètres contrôlés',
        'Logger et monitorer les tentatives d\'injection',
      ],
    },
    {
      id: 'T002',
      name: 'RAG Poisoning',
      severity: 'ÉLEVÉ',
      justification:
        'Le système RAG peut être empoisonné par l\'injection de documents malveillants dans la base vectorielle, affectant la qualité et la sécurité des réponses.',
      attacks: [
        'Upload de documents contenant des informations fausses',
        'Injection de backdoors dans les embeddings',
        'Pollution sémantique de la base ChromaDB',
        'Attaques par similarity search manipulation',
      ],
      impacts: [
        'Diffusion de fausses informations',
        'Dégradation de la qualité des réponses',
        'Biais intentionnel dans les recommandations',
        'Compromission de la confiance utilisateur',
      ],
      controls: [
        'Valider et scanner tous les documents avant ingestion',
        'Implémenter une quarantaine pour nouveaux documents',
        'Monitoring de la qualité des embeddings',
        'Système de versioning et rollback de la base vectorielle',
      ],
    },
    {
      id: 'T003',
      name: 'Data Leakage via LLM',
      severity: 'CRITIQUE',
      justification:
        'Le LLM traite des données personnelles et pourrait les exposer dans ses réponses ou via des attaques d\'extraction de mémoire.',
      attacks: [
        'Extraction de données via prompt engineering',
        'Attaques de membership inference',
        'Reconstruction de données d\'entraînement',
        'Exploitation des fuites de contexte conversationnel',
      ],
      impacts: [
        'Violation RGPD - exposition de données personnelles',
        'Risques juridiques et amendes réglementaires',
        'Perte de confiance des utilisateurs',
        'Atteinte à la réputation de l\'entreprise',
      ],
      controls: [
        'Anonymisation des données avant traitement LLM',
        'Filtrage des outputs pour détecter les PII',
        'Isolation des contextes utilisateurs',
        'Audit régulier des logs de conversations',
      ],
    },
    {
      id: 'T004',
      name: 'Insecure Output Handling',
      severity: 'ÉLEVÉ',
      justification:
        'Les outputs du LLM ne sont pas suffisamment validés avant affichage, ouvrant la porte à des injections XSS ou autres attaques côté client.',
      attacks: [
        'Injection XSS via réponse du LLM',
        'Génération de code malveillant',
        'Injection de liens de phishing',
        'Manipulation du DOM via markdown malformé',
      ],
      impacts: [
        'Compromission des sessions utilisateurs',
        'Vol de credentials',
        'Propagation de malware',
        'Défacement de l\'interface',
      ],
      controls: [
        'Sanitization stricte des outputs HTML/Markdown',
        'Content Security Policy (CSP) renforcée',
        'Validation et encoding des réponses LLM',
        'Sandbox pour l\'affichage de contenu dynamique',
      ],
    },
    {
      id: 'T005',
      name: 'Model Denial of Service',
      severity: 'MOYEN',
      justification:
        'L\'absence de rate limiting permet des attaques DoS contre le LLM, entraînant une indisponibilité du service et des coûts élevés.',
      attacks: [
        'Flood de requêtes coûteuses',
        'Génération de prompts maximisant les tokens',
        'Attaques par complexité computationnelle',
        'Épuisement des quotas API',
      ],
      impacts: [
        'Indisponibilité du service',
        'Surcoûts d\'infrastructure importants',
        'Dégradation de l\'expérience utilisateur',
        'Impact sur la réputation',
      ],
      controls: [
        'Implémenter un rate limiting par utilisateur',
        'Limiter la longueur des prompts et outputs',
        'Système de quotas et throttling',
        'Monitoring des coûts en temps réel',
      ],
    },
    {
      id: 'T006',
      name: 'Insufficient Access Controls',
      severity: 'MOYEN',
      justification:
        'Les contrôles d\'accès aux données du RAG et aux fonctionnalités ne sont pas suffisamment granulaires.',
      attacks: [
        'Escalade de privilèges via manipulation de contexte',
        'Accès à des documents non autorisés',
        'Bypass des restrictions par prompt crafting',
        'Énumération des ressources disponibles',
      ],
      impacts: [
        'Accès non autorisé à des informations sensibles',
        'Violation de la confidentialité',
        'Non-conformité réglementaire',
        'Compromission de la séparation des tenants',
      ],
      controls: [
        'Implémenter RBAC granulaire',
        'Filtrage des résultats RAG par permissions',
        'Validation des accès à chaque requête',
        'Audit trail des accès aux données',
      ],
    },
  ],
};
