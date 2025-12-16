# Intégration Gemini AI dans SmartPresence

## Vue d'ensemble

SmartPresence intègre maintenant **Google Gemini 2.0 Flash** comme moteur IA intelligent pour le chatbot. Cette intégration fournit des réponses contextualisées avec la connaissance complète du système SmartPresence.

## Configuration

### Paramètres de Configuration (backend/app/core/config.py)

```python
# Gemini API Configuration
gemini_api_key: str = "AIzaSyDqXW1mIeNEVfXqmITTW74UcnraHkAoh8U"
gemini_model: str = "gemini-2.0-flash"
gemini_temperature: float = 0.7
gemini_max_tokens: int = 1024
```

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `gemini_api_key` | `AIzaSyDqXW1mIeNEVfXqmITTW74UcnraHkAoh8U` | Clé d'authentification Google Cloud |
| `gemini_model` | `gemini-2.0-flash` | Modèle Gemini 2.0 Flash (ultra-rapide, haute qualité) |
| `gemini_temperature` | `0.7` | Équilibre créativité/cohérence (0=déterministe, 1=créatif) |
| `gemini_max_tokens` | `1024` | Limite de tokens pour la réponse |

## Architecture

### 1. Service Gemini (`backend/app/services/gemini_service.py`)

Le service principal qui gère toutes les interactions avec l'API Gemini.

**Classe principale**: `GeminiService`

**Méthodes clés**:

#### `generate_response(user_message, user_context=None)`
Génère une réponse simple avec contexte utilisateur.

```python
response = gemini_service.generate_response(
    "Quels sont mes horaires ?",
    user_context={"role": "student", "name": "Jean"}
)
```

#### `chat_with_context(user_message, user_context=None)`
Conversation multi-tours avec historique.

```python
chat = gemini_service.chat_with_context("Je suis absent demain")
chat = gemini_service.chat_with_context("Puis-je justifier ?")
```

#### `analyze_intent(user_message)`
Analyse l'intention de l'utilisateur.

```python
intent = gemini_service.analyze_intent("Je dois m'inscrire à un examen")
# Retourne: {"intent": "exam", "category": "exam", "confidence": 0.95}
```

#### `clear_history()`
Réinitialise l'historique de conversation.

### 2. Contexte de l'Application

Gemini reçoit automatiquement le contexte SmartPresence:

```
Tu es un assistant intelligent pour SmartPresence, un système avancé 
de gestion de présence et d'assistance basé sur l'IA.

SmartPresence comprend:
- Suivi automatisé de la présence (reconnaissance faciale)
- Tableau de bord en temps réel
- Gestion des sessions et cours
- Système de notifications
- Support multi-rôles (étudiants, formateurs, administrateurs)
```

**Sujets couverts**:
- ✅ Horaires et emploi du temps
- ✅ Présences et absences
- ✅ Justifications d'absence
- ✅ Dates et résultats d'examens
- ✅ Notes et scores
- ✅ Contacts des formateurs
- ✅ Notifications et alertes
- ✅ Reconnaissance faciale

### 3. Intégration ChatbotService

Le `ChatbotService` utilise maintenant Gemini comme moteur principal.

**Flux**:
1. Message utilisateur → ChatbotService.send_message()
2. Construction du contexte (rôle utilisateur, ID)
3. Appel à Gemini avec contexte SmartPresence
4. **Fallback automatique** au FAQ si Gemini échoue
5. Stockage dans la base de données

```python
# Avant: Réponses basiques de FAQ
# Maintenant: Réponses intelligentes avec Gemini

message = ChatbotService.send_message(
    db=session,
    conversation_id=123,
    user_message="Pourquoi suis-je marqué absent ?",
    user_id=456
)
# Gemini répond avec contexte du rôle de l'utilisateur
```

## Dépendances

Ajoutée au `backend/requirements.txt`:
```
google-generativeai==0.7.2
```

Installation:
```bash
pip install google-generativeai==0.7.2
```

## Flux d'Utilisation

### Endpoint Chatbot Existant

Aucune modification nécessaire - tout fonctionne automatiquement:

```
POST /api/chatbot/start
Démarre une nouvelle conversation

POST /api/chatbot/{conversation_id}/ask
Envoie un message (utilise maintenant Gemini)

GET /api/chatbot/{conversation_id}/history
Récupère l'historique
```

### Exemple Complet

```python
from app.services.chatbot import ChatbotService
from app.services.gemini_service import GeminiService

# 1. Démarrer conversation
conversation = ChatbotService.start_conversation(
    db=session,
    user_id=user_id,
    user_type="student"
)

# 2. Envoyer message (utilise Gemini automatiquement)
response = ChatbotService.send_message(
    db=session,
    conversation_id=conversation.id,
    user_message="Je suis absent depuis 3 jours, comment justifier ?",
    user_id=user_id
)

# 3. Réponse intelligente de Gemini:
# "En tant qu'étudiant, vous pouvez justifier vos absences en..."
```

## Avantages de Gemini 2.0 Flash

| Caractéristique | Gemini 2.0 Flash |
|-----------------|------------------|
| **Vitesse** | Ultra-rapide (< 1s) |
| **Qualité** | Excellente compréhension contextuelle |
| **Langues** | Support multilingue (FR/EN) |
| **Intelligence** | Compréhension nuancée du domaine |
| **Coût** | Très économique |

## Gestion des Erreurs

**Fallback automatique**:
```python
# Si Gemini échoue:
1. Tenter connexion à l'API Gemini
2. Si timeout/erreur → Utiliser réponses FAQ
3. Log des erreurs pour monitoring
```

**Codes d'erreur courants**:
- `INVALID_API_KEY`: Vérifier la clé Gemini
- `RATE_LIMIT`: API limitée temporairement
- `MODEL_NOT_FOUND`: Vérifier le nom du modèle

## Configuration Avancée

### Ajuster la Température

Plus élevée = Plus créatif
```python
gemini_temperature: float = 0.9  # Très créatif
gemini_temperature: float = 0.3  # Déterministe
```

### Modifier le Contexte Système

Éditer `GeminiService.APPLICATION_CONTEXT` pour:
- Ajouter/modifier les sujets
- Changer le ton et le style
- Ajouter des directives spécifiques

### Limiter les Tokens

```python
gemini_max_tokens: int = 2048  # Réponses plus longues
gemini_max_tokens: int = 512   # Réponses courtes
```

## Monitoring et Logs

Les appels Gemini sont loggés automatiquement:
```bash
./scripts/logs.sh backend | grep -i gemini
```

## Sécurité

### Clé API
- ✅ Stockée dans config.py (à migrer vers .env en prod)
- ✅ Jamais exposée au frontend
- ✅ Utilisée uniquement côté serveur

### Données Utilisateur
- ✅ Contexte minimal envoyé à Gemini (rôle, ID)
- ✅ Pas d'données sensibles personnelles
- ✅ Conformité RGPD

## Troubleshooting

### "Error generating response"
```
Vérifier:
1. Clé API correcte dans config.py
2. Connexion internet disponible
3. Quota API Google Cloud
```

### Réponses génériques/mauvaises
```
1. Vérifier le contexte utilisateur passé
2. Ajuster la température de Gemini
3. Améliorer le contexte système
```

### Latence élevée
```
1. Gemini 2.0 Flash est optimisé pour la vitesse
2. Vérifier la bande passante réseau
3. Réduire max_tokens pour plus de rapidité
```

## Prochaines Étapes

- [ ] Migrer la clé API vers fichier `.env`
- [ ] Ajouter support multilingue avancé
- [ ] Implémenter semantic search avec pgvector
- [ ] Caching des réponses courantes
- [ ] Analytics des conversations Gemini
- [ ] Fine-tuning du modèle avec données SmartPresence

## Support

Pour les issues:
1. Vérifier les logs: `./scripts/logs.sh backend`
2. Tester l'API directement: `curl http://localhost:8000/docs`
3. Consulter la documentation Google Gemini: https://ai.google.dev/

---

**Créé**: Décembre 2025
**Version**: 1.0
**Modèle**: Gemini 2.0 Flash
**Clé API**: AIzaSyDqXW1mIeNEVfXqmITTW74UcnraHkAoh8U
