"""
Gemini AI Service for SmartPresence Application.
Integrates Google's Gemini 2.0 Flash model with application context.
"""

import google.generativeai as genai
from app.core.config import get_settings

settings = get_settings()


class GeminiService:
    """Service for Gemini AI integration with SmartPresence context."""

    # Application context to provide Gemini with understanding of SmartPresence
    APPLICATION_CONTEXT = """
    You are an intelligent assistant for SmartPresence, an advanced AI-powered attendance and presence management system.
    
    SmartPresence System Overview:
    - Automated Attendance Tracking: Uses facial recognition technology to track student/trainer attendance
    - Intelligent Dashboard: Real-time analytics and attendance insights for students, trainers, and administrators
    - Facial Recognition: Secure biometric enrollment and verification system (insightface model)
    - Session Management: Track sessions, courses, and training programs with automated attendance
    - Notification System: Real-time alerts for absences, late arrivals, and system events
    - Chatbot Support: Intelligent Q&A system for students and staff
    
    Key Features:
    - Multi-role support: Students, Trainers, Admins
    - Database tracking with PostgreSQL + pgvector for facial embeddings
    - Real-time Redis caching for performance
    - REST API backend (FastAPI) and modern frontend (Next.js)
    - Role-based access control and security
    
    Common Topics:
    - Schedules/Timetables (emploi du temps)
    - Attendance/Presence (présences)
    - Absences and Justifications
    - Exam dates and results
    - Grades and Scores
    - Contact information for trainers/instructors
    - Notifications and system alerts
    - Facial recognition enrollment and verification
    
    Tone & Guidelines:
    - Professional yet friendly and helpful
    - Support both French and English languages
    - Provide clear, concise answers
    - For technical issues, suggest contacting support
    - For specific attendance data, refer users to their personal dashboard
    - Be knowledgeable about the system's capabilities and limitations
    - Explain facial recognition safety and privacy measures when asked
    
    When users ask about:
    - Their specific attendance: Recommend checking their dashboard
    - System errors: Suggest contacting the technical support team
    - Feature requests: Acknowledge and note for development team
    - Privacy/Security: Assure about secure facial recognition and data protection
    """

    def __init__(self):
        """Initialize Gemini service with API key."""
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=self.APPLICATION_CONTEXT,
            generation_config={
                "temperature": settings.gemini_temperature,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": settings.gemini_max_tokens,
            },
        )
        self.chat_history = []

    def generate_response(self, user_message: str, user_context: dict = None) -> str:
        """
        Generate AI response using Gemini with application context.

        Args:
            user_message: The user's input message
            user_context: Optional context about the user (role, department, etc.)

        Returns:
            str: The generated response from Gemini
        """
        try:
            # Build context-aware prompt
            context_prompt = self._build_context_prompt(user_message, user_context)

            # Generate response
            response = self.model.generate_content(context_prompt)
            return response.text

        except Exception as e:
            return f"Error generating response: {str(e)}"

    def chat_with_context(self, user_message: str, user_context: dict = None) -> str:
        """
        Multi-turn conversation with context awareness.

        Args:
            user_message: The user's message
            user_context: Optional user context for personalization

        Returns:
            str: The assistant's response
        """
        try:
            context_prompt = self._build_context_prompt(user_message, user_context)

            # Use chat for multi-turn conversation
            chat = self.model.start_chat(history=self.chat_history)
            response = chat.send_message(context_prompt)

            # Update history for context
            self.chat_history.append({"role": "user", "parts": [context_prompt]})
            self.chat_history.append({"role": "model", "parts": [response.text]})

            return response.text

        except Exception as e:
            return f"Error in chat: {str(e)}"

    def _build_context_prompt(self, user_message: str, user_context: dict = None) -> str:
        """
        Build a context-aware prompt with user information.

        Args:
            user_message: The user's input
            user_context: Optional context dict with keys like 'role', 'department', 'name'

        Returns:
            str: The enhanced prompt with context
        """
        prompt = user_message

        if user_context:
            context_info = []

            if user_context.get("name"):
                context_info.append(f"User name: {user_context['name']}")

            if user_context.get("role"):
                context_info.append(f"User role: {user_context['role']}")

            if user_context.get("department"):
                context_info.append(f"Department: {user_context['department']}")

            if context_info:
                prompt = f"{'. '.join(context_info)}\n\nUser question: {user_message}"

        return prompt

    def analyze_intent(self, user_message: str) -> dict:
        """
        Analyze user intent and extract key information.

        Args:
            user_message: The user's message

        Returns:
            dict: Intent analysis with 'intent' and 'confidence' keys
        """
        try:
            analysis_prompt = f"""
            Analyze this user message and identify the intent.
            Respond in JSON format only with: {{"intent": "...", "category": "...", "confidence": 0.0-1.0}}
            
            Message: {user_message}
            
            Possible categories: schedule, attendance, absence, justification, exam, grades, contact, technical, general
            """

            response = self.model.generate_content(analysis_prompt)
            import json

            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                return {"intent": "general", "category": "general", "confidence": 0.5}

        except Exception as e:
            return {"intent": "error", "category": "error", "confidence": 0.0}

    def clear_history(self):
        """Clear chat history for new conversation."""
        self.chat_history = []

    @staticmethod
    def get_system_capabilities() -> dict:
        """Return information about SmartPresence capabilities."""
        return {
            "name": "SmartPresence AI Assistant",
            "model": settings.gemini_model,
            "features": [
                "Attendance tracking and reporting",
                "Facial recognition enrollment",
                "Schedule management",
                "Absence justification",
                "Real-time notifications",
                "Admin dashboard analytics",
                "Multi-language support (French/English)",
            ],
            "supported_languages": ["fr", "en"],
            "timezone": "Europe/Paris",
        }
