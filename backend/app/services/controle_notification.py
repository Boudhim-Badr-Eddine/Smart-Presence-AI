"""Service for Controles notifications."""

from datetime import date, timedelta
from typing import List

from sqlalchemy.orm import Session

from app.models.controle import Controle
from app.models.notification import Notification
from app.models.student import Student


class ControleNotificationService:
    """Service for sending controle notifications to students."""
    
    @staticmethod
    def notify_upcoming_controles(db: Session, days_ahead: int = 7) -> int:
        """
        Send notifications for upcoming controles.
        
        Args:
            db: Database session
            days_ahead: How many days ahead to check (default: 7)
            
        Returns:
            int: Number of notifications sent
        """
        today = date.today()
        end_date = today + timedelta(days=days_ahead)
        
        # Get unnotified controles in the next X days
        controles = db.query(Controle).filter(
            Controle.is_deleted == False,
            Controle.notified == False,
            Controle.date >= today,
            Controle.date <= end_date
        ).all()
        
        notifications_sent = 0
        
        for controle in controles:
            # Get all students in this class
            students = db.query(Student).filter(
                Student.class_name == controle.class_name,
                Student.is_deleted == False,
                Student.academic_status == "active"
            ).all()
            
            for student in students:
                days_until = (controle.date - today).days
                
                if days_until == 0:
                    time_desc = "aujourd'hui"
                elif days_until == 1:
                    time_desc = "demain"
                else:
                    time_desc = f"dans {days_until} jours"
                
                message = (
                    f"📝 Contrôle à venir: {controle.title or controle.module}\n"
                    f"📅 Date: {controle.date.strftime('%d/%m/%Y')} ({time_desc})\n"
                    f"📚 Module: {controle.module}\n"
                    f"⏱️ Durée: {controle.duration_minutes} minutes" if controle.duration_minutes else ""
                )
                
                notification = Notification(
                    user_id=student.user_id,
                    user_type="student",
                    type="controle_reminder",
                    title=f"Contrôle {controle.module} - {time_desc}",
                    message=message,
                    is_read=False,
                )
                
                db.add(notification)
                notifications_sent += 1
            
            # Mark controle as notified
            controle.notified = True
        
        db.commit()
        return notifications_sent
    
    @staticmethod
    def notify_specific_controle(db: Session, controle_id: int) -> int:
        """
        Send notification for a specific controle.
        
        Args:
            db: Database session
            controle_id: Controle ID
            
        Returns:
            int: Number of notifications sent
        """
        controle = db.query(Controle).filter(
            Controle.id == controle_id,
            Controle.is_deleted == False
        ).first()
        
        if not controle:
            return 0
        
        # Get all students in this class
        students = db.query(Student).filter(
            Student.class_name == controle.class_name,
            Student.is_deleted == False,
            Student.academic_status == "active"
        ).all()
        
        notifications_sent = 0
        today = date.today()
        days_until = (controle.date - today).days
        
        for student in students:
            if days_until == 0:
                time_desc = "aujourd'hui"
            elif days_until == 1:
                time_desc = "demain"
            else:
                time_desc = f"dans {days_until} jours"
            
            message = (
                f"📝 Contrôle à venir: {controle.title or controle.module}\n"
                f"📅 Date: {controle.date.strftime('%d/%m/%Y')} ({time_desc})\n"
                f"📚 Module: {controle.module}\n"
                f"⏱️ Durée: {controle.duration_minutes} minutes" if controle.duration_minutes else ""
            )
            
            notification = Notification(
                user_id=student.user_id,
                user_type="student",
                type="controle_reminder",
                title=f"Contrôle {controle.module} - {time_desc}",
                message=message,
                is_read=False,
            )
            
            db.add(notification)
            notifications_sent += 1
        
        controle.notified = True
        db.commit()
        
        return notifications_sent
    
    @staticmethod
    def get_student_upcoming_controles(db: Session, student_id: int, days_ahead: int = 30) -> List[Controle]:
        """
        Get upcoming controles for a specific student.
        
        Args:
            db: Database session
            student_id: Student ID
            days_ahead: How many days ahead to check (default: 30)
            
        Returns:
            List[Controle]: List of upcoming controles
        """
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return []
        
        today = date.today()
        end_date = today + timedelta(days=days_ahead)
        
        controles = db.query(Controle).filter(
            Controle.class_name == student.class_name,
            Controle.is_deleted == False,
            Controle.date >= today,
            Controle.date <= end_date
        ).order_by(Controle.date).all()
        
        return controles
