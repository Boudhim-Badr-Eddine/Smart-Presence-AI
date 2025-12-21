from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import VARCHAR

from app.db.base import Base


class FacialEmbedding(Base):
    __tablename__ = "facial_embeddings"

    __table_args__ = (
        Index("ix_embeddings_student", "student_id"),
        Index("ix_embeddings_user", "user_id"),
        Index("ix_embeddings_image_hash", "image_hash"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, nullable=True)
    user_id = Column(Integer, nullable=True)
    # Store vector in pgvector column via raw SQL; ORM keeps path and meta
    image_path = Column(String(255), nullable=False)
    image_hash = Column(String(64))
    confidence_score = Column(Numeric(5, 4))
    embedding_model = Column(VARCHAR(50), default="insightface")
    is_primary = Column(Boolean, default=False)
    capture_angle = Column(VARCHAR(20))
    lighting_conditions = Column(VARCHAR(50))

    embedding = Column(Vector(512), nullable=True)
