"""Enroll facial embeddings for Taha Khebazi for testing."""
import sys
import numpy as np
from sqlalchemy import text

from app.db.session import SessionLocal
from app.models.student import Student
from app.models.user import User


def enroll_taha_embeddings():
    """Create synthetic facial embeddings for Taha Khebazi."""
    db = SessionLocal()
    
    try:
        # Get Taha's user account
        student = db.query(Student).filter(Student.email == 'taha.khebazi@smartpresence.com').first()
        if not student:
            print("ERROR: Student Taha Khebazi not found!")
            return False
        
        user = db.query(User).filter(User.id == student.user_id).first()
        if not user:
            print("ERROR: User account not found!")
            return False
        
        print(f"Found: {student.first_name} {student.last_name} (User ID: {user.id})")
        
        # Check if already has embeddings
        result = db.execute(text("SELECT COUNT(*) FROM facial_embeddings WHERE user_id = :uid"), {"uid": user.id})
        count = result.scalar()
        
        if count > 0:
            print(f"User already has {count} embeddings. Skipping.")
            return True
        
        # Create 3 synthetic embeddings with different lighting conditions
        embeddings_data = [
            {"lighting": "normal", "confidence": 0.95},
            {"lighting": "bright", "confidence": 0.92},
            {"lighting": "dim", "confidence": 0.88},
        ]
        
        print("\nCreating synthetic facial embeddings...")
        
        for idx, emb_data in enumerate(embeddings_data):
            # Generate a random 512-dimensional embedding (InsightFace standard)
            # In production, this would come from actual facial recognition
            embedding_vector = np.random.randn(512).astype(np.float32)
            
            # Normalize the vector
            embedding_vector = embedding_vector / np.linalg.norm(embedding_vector)
            
            # Convert to bytes for pgvector
            embedding_bytes = embedding_vector.tobytes()
            
            # Insert into database
            db.execute(
                text("""
                    INSERT INTO facial_embeddings 
                    (user_id, student_id, embedding, lighting_conditions, confidence_score, is_primary, image_path, capture_angle)
                    VALUES 
                    (:user_id, :student_id, :embedding, :lighting, :confidence, :is_primary, :image_path, :angle)
                """),
                {
                    "user_id": user.id,
                    "student_id": student.id,
                    "embedding": embedding_vector.tolist(),  # pgvector accepts list
                    "lighting": emb_data["lighting"],
                    "confidence": emb_data["confidence"],
                    "is_primary": (idx == 0),
                    "image_path": f"/storage/faces/taha_synthetic_{idx}.jpg",
                    "angle": "frontal"
                }
            )
            
            print(f"  ✓ Created embedding {idx + 1}: {emb_data['lighting']} lighting, {emb_data['confidence']:.2%} confidence")
        
        # Update student's facial_data_encoded flag
        student.facial_data_encoded = True
        
        db.commit()
        
        print(f"\n✅ Successfully enrolled {len(embeddings_data)} facial embeddings for {student.first_name} {student.last_name}")
        print(f"   Email: {user.email}")
        print(f"   User can now use facial recognition check-in!")
        
        return True
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error enrolling embeddings: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = enroll_taha_embeddings()
    sys.exit(0 if success else 1)
