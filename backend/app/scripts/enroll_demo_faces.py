#!/usr/bin/env python3
"""Enroll demo facial data for testing."""
import sys
import hashlib
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import SessionLocal
from app.models.student import Student
from app.models.user import User
from sqlalchemy import text
import numpy as np


def enroll_demo_student_face(db, email: str):
    """Enroll synthetic face embeddings for a student (FOR TESTING ONLY)."""
    
    # Find student
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"❌ User not found: {email}")
        return False
    
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        print(f"❌ Student profile not found for: {email}")
        return False
    
    # Check if already enrolled
    existing = db.execute(
        text("SELECT COUNT(*) FROM facial_embeddings WHERE student_id = :sid"),
        {"sid": student.id}
    ).scalar()
    
    if existing > 0:
        print(f"⚠️  Student already has {existing} facial embeddings")
        response = input("Overwrite? (yes/no): ")
        if response.lower() != 'yes':
            return False
        
        # Delete existing
        db.execute(
            text("DELETE FROM facial_embeddings WHERE student_id = :sid"),
            {"sid": student.id}
        )
        db.commit()
    
    # Generate 3 synthetic embeddings (512-dimensional vectors)
    # In production, these would be real InsightFace embeddings
    print(f"📸 Enrolling facial data for: {student.first_name} {student.last_name}")
    
    base_seed = hash(email) % (2**32)
    
    for i in range(3):
        # Create a stable random embedding based on email + index
        np.random.seed(base_seed + i)
        embedding = np.random.randn(512).astype(np.float32)
        
        # Normalize to unit vector (standard for face embeddings)
        embedding = embedding / np.linalg.norm(embedding)
        
        # Convert to pgvector format
        embedding_str = "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"
        
        # Create synthetic image hash
        image_hash = hashlib.sha256(f"{email}_{i}".encode()).hexdigest()
        
        # Lighting conditions
        lighting = ["normal", "bright", "normal"][i]
        
        # Insert embedding
        db.execute(
            text("""
                INSERT INTO facial_embeddings 
                (student_id, user_id, image_path, image_hash, is_primary, 
                 embedding, embedding_model, lighting_conditions)
                VALUES 
                (:student_id, :user_id, :image_path, :image_hash, :is_primary,
                 (:embedding)::vector, :embedding_model, :lighting)
            """),
            {
                "student_id": student.id,
                "user_id": user.id,
                "image_path": f"demo/{email}/face_{i+1}.jpg",
                "image_hash": image_hash,
                "is_primary": i == 0,
                "embedding": embedding_str,
                "embedding_model": "insightface",
                "lighting": lighting,
            }
        )
        print(f"  ✅ Enrolled image {i+1}/3 ({lighting} lighting)")
    
    # Update student record
    student.facial_data_encoded = True
    db.commit()
    
    print(f"\n✅ Successfully enrolled 3 facial embeddings for {student.first_name} {student.last_name}")
    print(f"   Student can now use facial recognition for check-in!")
    
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python enroll_demo_faces.py <student_email>")
        print("\nExample:")
        print("  python enroll_demo_faces.py taha.khebazi@smartpresence.com")
        sys.exit(1)
    
    email = sys.argv[1]
    
    db = SessionLocal()
    try:
        success = enroll_demo_student_face(db, email)
        sys.exit(0 if success else 1)
    finally:
        db.close()
