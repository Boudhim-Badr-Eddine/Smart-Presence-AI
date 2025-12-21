import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.chatbot import ChatbotConversation, ChatbotMessage
from app.services.gemini_service import GeminiService


class ChatbotService:
    """Service layer for chatbot."""

    # Simple FAQ knowledge base
    FAQ = {
        "horaires": {
            "keywords": ["horaire", "heure", "temps", "quand", "timing", "schedule"],
            "response": "Les horaires des cours sont affichés dans votre emploi du temps personnel. Veuillez consulter l'onglet 'Emploi du temps'.",
        },
        "absences": {
            "keywords": ["absence", "absent", "manqué", "skip"],
            "response": "Vous pouvez consulter vos absences dans l'onglet 'Présences'. Si vous avez une justification, veuillez la soumettre.",
        },
        "justification": {
            "keywords": ["justification", "justifier", "document", "preuve"],
            "response": "Pour justifier une absence, allez dans 'Présences' et cliquez sur l'absence concernée. Vous pouvez ajouter une justification et des documents.",
        },
        "examen": {
            "keywords": ["examen", "exam", "test", "partiel"],
            "response": "Les dates et heures des examens sont dans votre emploi du temps. Vous recevrez un rappel 24 heures avant.",
        },
        "note": {
            "keywords": ["note", "score", "résultat", "note", "grade"],
            "response": "Les résultats d'examen seront disponibles 3 jours après l'examen. Consultez la section 'Résultats'.",
        },
        "contact": {
            "keywords": ["contact", "formateur", "trainer", "professeur", "mail"],
            "response": "Vous pouvez contacter votre formateur via l'onglet 'Contacts' ou par email indiqué dans votre profil.",
        },
        "notifications": {
            "keywords": ["notification", "notifications", "alerte", "alertes", "notify", "bell"],
            "response": "Vos notifications récentes sont visibles dans l'onglet 'Notifications'. Vous pouvez activer/désactiver les alertes dans les paramètres.",
        },
        "salut": {
            "keywords": ["bonjour", "salut", "hello", "hi"],
            "response": "Bonjour ! Comment puis-je vous aider ? Vous pouvez me demander vos horaires, absences, justifications, examens, notes ou contacts.",
        },
    }

    @staticmethod
    def start_conversation(db: Session, user_id: int, user_type: str) -> ChatbotConversation:
        """Start a new chatbot conversation."""
        conversation = ChatbotConversation(
            user_id=user_id,
            user_type=user_type,
            session_id=f"{user_id}_{datetime.now().timestamp()}",
            context_data=json.dumps({}),
            conversation_history=json.dumps([]),
            is_active=True,
            message_count=0,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def send_message(db: Session, conversation_id: int, user_message: str, user_id: int = None) -> ChatbotMessage:
        """Process user message and return assistant response."""
        conversation = (
            db.query(ChatbotConversation).filter(ChatbotConversation.id == conversation_id).first()
        )
        if not conversation:
            return None

        # Store user message
        user_msg = ChatbotMessage(
            conversation_id=conversation_id,
            message_type="user",
            content=user_message,
        )
        db.add(user_msg)

        # Build user context for Gemini
        user_context = {
            "role": conversation.user_type,
            "user_id": user_id or conversation.user_id,
        }

        # Generate assistant response with Gemini
        response_text = ChatbotService.generate_response(user_message, user_context)
        intent = ChatbotService.detect_intent(user_message)

        assistant_msg = ChatbotMessage(
            conversation_id=conversation_id,
            message_type="assistant",
            content=response_text,
            intent_detected=intent,
            confidence_score=0.85,
        )
        db.add(assistant_msg)

        # Update conversation
        conversation.message_count += 1
        conversation.last_activity = datetime.now()

        db.commit()
        db.refresh(assistant_msg)
        return assistant_msg

    @staticmethod
    def generate_response(user_message: str, user_context: dict = None) -> str:
        """Generate chatbot response using Gemini AI with application context."""
        try:
            # Try to use Gemini AI first
            gemini_service = GeminiService()
            response = gemini_service.generate_response(user_message, user_context)

            if response and not response.startswith("Error"):
                return response

            # Fallback to FAQ-based response if Gemini fails
            return ChatbotService._generate_faq_response(user_message)

        except Exception:
            # Fallback to FAQ if Gemini service fails
            return ChatbotService._generate_faq_response(user_message)

    @staticmethod
    def _generate_faq_response(user_message: str) -> str:
        """Generate response based on FAQ knowledge base (fallback)."""
        user_lower = user_message.lower()

        # Check each FAQ category
        for category, data in ChatbotService.FAQ.items():
            for keyword in data["keywords"]:
                if keyword in user_lower:
                    return data["response"]

        # Default response
        return "Je n'ai pas bien compris. Pouvez-vous reformuler votre question ? (Tapez: horaires, absences, justification, examen, note, contact)"

    @staticmethod
    def detect_intent(user_message: str) -> str:
        """Detect intent from user message."""
        user_lower = user_message.lower()

        for category, data in ChatbotService.FAQ.items():
            for keyword in data["keywords"]:
                if keyword in user_lower:
                    return category

        return "general"

    @staticmethod
    def get_conversation_history(db: Session, conversation_id: int, limit: int = 50):
        """Get conversation history."""
        messages = (
            db.query(ChatbotMessage)
            .filter(ChatbotMessage.conversation_id == conversation_id)
            .order_by(ChatbotMessage.created_at.asc())
            .limit(limit)
            .all()
        )
        return messages

    @staticmethod
    def close_conversation(db: Session, conversation_id: int):
        """Close a conversation."""
        conversation = (
            db.query(ChatbotConversation).filter(ChatbotConversation.id == conversation_id).first()
        )
        if conversation:
            conversation.is_active = False
            db.commit()
            db.refresh(conversation)
        return conversation

    @staticmethod
    def set_satisfaction_score(db: Session, conversation_id: int, score: int, feedback: str = None):
        """Set user satisfaction with chatbot."""
        conversation = (
            db.query(ChatbotConversation).filter(ChatbotConversation.id == conversation_id).first()
        )
        if conversation:
            conversation.user_satisfaction_score = score
            conversation.feedback_text = feedback
            db.commit()
            db.refresh(conversation)
        return conversation
