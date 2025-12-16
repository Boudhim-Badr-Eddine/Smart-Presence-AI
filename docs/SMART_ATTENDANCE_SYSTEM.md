# 🎯 Smart Attendance System - Architecture & Design

## Vision
Transform SmartPresence from a manual attendance tracker into an **autonomous, AI-powered presence management system** that eliminates trainer overhead and provides predictive insights.

---

## 🚀 Core Features

### 1. **Zero-Touch Attendance Capture**

#### In-Person Sessions (Présentiel)
- **Continuous Face Detection**: Webcam at classroom entrance or tablet on trainer's desk
- **Auto Check-in**: Face recognized → Attendance logged automatically (no QR scan, no button click)
- **Presence Monitoring**: Periodic snapshots (every 15 min) to verify students remain in class
- **Early Departure Alerts**: Notify trainer if student leaves before session end
- **Multi-face Batch Processing**: Process 20-30 faces simultaneously during class entry rush

#### Remote Sessions (À Distance - Teams)
- **Microsoft Teams Integration**: 
  - Auto-fetch participant join/leave timestamps via Graph API
  - Match Teams user email to SmartPresence student records
- **Optional Facial Verification**: 
  - First 60 seconds: prompt student to enable camera for face match
  - Falls back to email-based presence if camera unavailable
- **Engagement Scoring**:
  - Camera-on duration
  - Mic usage (questions/participation)
  - Chat activity
  - Reactions (👍, ❤️, etc.)
  - Combined into 0-100 "participation score"

---

### 2. **AI-Powered Intelligence**

#### Predictive Absence Detection
- **ML Model**: LSTM/GRU trained on historical attendance patterns
- **Features**: Day of week, time of day, weather, previous absences, session subject, proximity to exams
- **Output**: 24-48h advance prediction of likely absences with confidence score
- **Action**: Auto-notify trainer + student (gentle reminder)

#### Behavioral Anomaly Detection
- **Proxy Attendance**: Face mismatch → immediate alert
- **Location Anomalies**: Student present in 2 locations simultaneously → fraud flag
- **Ghost Attendances**: Marked present but never on camera → review queue
- **Pattern Break**: Student with 95% attendance suddenly absent 3 days → auto-escalate

#### Smart Justification Processing
- **NLP Categorization**: "J'ai eu une consultation médicale" → Medical, Auto-approved if note exists
- **Auto-Approval Rules**: 
  - Medical with doctor's note → instant approval
  - Family emergency (1st occurrence) → auto-approved, notify admin
  - Transport strike (city-wide alert detected) → batch auto-approve all affected students
- **Escalation Queue**: Suspicious/repeated unjustified absences → admin review

---

### 3. **Trainer Workflow Optimization**

#### Before Session
- ✅ **Pre-session Report** (30 min before): 
  - Expected attendees (based on schedule)
  - Predicted absentees (AI forecast)
  - Students flagged for follow-up

#### During Session
- ✅ **Live Dashboard**: 
  - Real-time face detection feed
  - Auto-check-in confirmations
  - Anomaly alerts (unknown face, early departure)
- ✅ **Zero Manual Entry**: Trainer only intervenes for exceptions

#### After Session
- ✅ **Auto-generated Report**: 
  - Final attendance roster (present/absent/late)
  - Engagement scores (for remote sessions)
  - Follow-up suggestions (students needing outreach)

---

### 4. **Student Experience**

#### In-Person
- **Walk in, get detected, done** → No app opening, no QR scan
- Notification: "✅ Présence confirmée - Cours Développement Web"

#### Remote (Teams)
- Join Teams meeting as usual
- Optional: Show face for 10s at start for verification
- Auto-notification: "✅ Participation enregistrée (Score: 85/100)"

#### Absence Management
- Push notification: "Vous avez été marqué absent. Justifier?"
- One-tap justification: Select reason + upload document
- Real-time status: "Absence justifiée et approuvée ✓"

---

## 🏗️ Technical Architecture

### Database Schema

```sql
-- Attendance Session Configuration
CREATE TABLE attendance_sessions (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES sessions(id),
    mode VARCHAR(20) NOT NULL, -- 'facial_auto', 'teams_auto', 'manual'
    
    -- Facial settings
    detection_enabled BOOLEAN DEFAULT FALSE,
    detection_start_time TIMESTAMPTZ,
    detection_end_time TIMESTAMPTZ,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.75,
    periodic_check_interval_min INT DEFAULT 15,
    
    -- Teams settings
    teams_meeting_id VARCHAR(255),
    teams_engagement_tracking BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time Facial Detections (ephemeral - processed into attendance)
CREATE TABLE facial_detections (
    id SERIAL PRIMARY KEY,
    attendance_session_id INT REFERENCES attendance_sessions(id),
    student_id INT REFERENCES students(id),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    confidence_score DECIMAL(3,2),
    image_snapshot_path VARCHAR(512),
    processed BOOLEAN DEFAULT FALSE,
    
    INDEX idx_session_processed (attendance_session_id, processed)
);

-- Teams Participation Logs
CREATE TABLE teams_participation (
    id SERIAL PRIMARY KEY,
    attendance_session_id INT REFERENCES attendance_sessions(id),
    student_id INT REFERENCES students(id),
    
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    duration_minutes INT,
    
    camera_on_minutes INT DEFAULT 0,
    mic_used_minutes INT DEFAULT 0,
    chat_messages_count INT DEFAULT 0,
    reactions_count INT DEFAULT 0,
    
    engagement_score INT, -- 0-100
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Predictions
CREATE TABLE absence_predictions (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    session_id INT REFERENCES sessions(id),
    
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    prediction_for_date DATE,
    absence_probability DECIMAL(3,2), -- 0.00 to 1.00
    
    model_version VARCHAR(50),
    features JSONB, -- Store input features for explainability
    
    actual_outcome VARCHAR(20), -- 'present', 'absent', 'justified' (filled post-session)
    prediction_accuracy DECIMAL(3,2) -- Calculated after session
);

-- Anomaly Detections
CREATE TABLE attendance_anomalies (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    session_id INT REFERENCES sessions(id),
    
    anomaly_type VARCHAR(50), -- 'proxy_attendance', 'location_conflict', 'ghost_presence', 'pattern_break'
    severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB,
    
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by INT REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    resolution VARCHAR(20), -- 'confirmed_fraud', 'false_positive', 'needs_investigation'
    
    INDEX idx_unreviewed (reviewed, severity)
);

-- Enhanced Absence Justifications
ALTER TABLE absence_justifications ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE absence_justifications ADD COLUMN ai_category VARCHAR(50);
ALTER TABLE absence_justifications ADD COLUMN confidence_score DECIMAL(3,2);
```

### AI/ML Services

#### 1. Facial Detection Service (`FacialDetectionService`)
- **Input**: Video stream or periodic image captures
- **Processing**: 
  - Detect faces using OpenCV/MTCNN
  - Extract embeddings with InsightFace
  - Match against enrolled student embeddings
  - Batch process for efficiency
- **Output**: List of (student_id, confidence, timestamp)

#### 2. Absence Prediction Service (`AbsencePredictionService`)
- **Model**: LSTM or XGBoost
- **Training Data**: Historical attendance + contextual features
- **Inference**: Nightly batch job for next 48h predictions
- **API**: `/api/ai/predict-absences?session_id=123`

#### 3. Anomaly Detection Service (`AnomalyDetectionService`)
- **Rules Engine + ML**: 
  - Rules: Simple logic (e.g., 2 locations simultaneously)
  - ML: Isolation Forest for pattern anomalies
- **Real-time**: Check each attendance record on creation
- **Output**: Flag + severity + details

#### 4. NLP Justification Service (`JustificationNLPService`)
- **Model**: Multilingual BERT or GPT-3.5
- **Task**: Classify justification text into categories
- **Auto-approval Logic**: Category + supporting docs → approve/escalate

#### 5. Teams Integration Service (`TeamsIntegrationService`)
- **Microsoft Graph API**: 
  - Fetch meeting participants
  - Pull engagement signals (reactions, chat)
- **Webhook**: Real-time participant join/leave events
- **Scoring Algorithm**: Weighted sum of engagement metrics

---

## 📊 Frontend Components

### Trainer Dashboard
- **Live Attendance Monitor**: Real-time face detection feed with auto-check-ins
- **Predicted Absences Widget**: "3 students likely absent tomorrow"
- **Anomaly Alerts**: Red banner for fraud/anomaly detections
- **Session Analytics**: Engagement heatmap for remote sessions

### Student Portal
- **Auto-notification Toast**: "✅ Présence confirmée"
- **Absence Justification Flow**: 1-tap categorization + file upload
- **Attendance History**: Calendar view with engagement scores

### Admin Panel
- **Anomaly Review Queue**: List of flagged incidents with evidence
- **Model Performance Dashboard**: Prediction accuracy, false positive rates
- **System Settings**: Configure thresholds, auto-approval rules

---

## 🔐 Privacy & Security

- **GDPR Compliance**: Facial snapshots auto-deleted after 72h
- **Consent**: Students opt-in to facial recognition during enrollment
- **Data Minimization**: Only store embeddings, not raw images
- **Audit Trail**: All auto-approvals logged with reasoning
- **Encryption**: Facial embeddings encrypted at rest (AES-256)

---

## 🚀 Rollout Plan

### Phase 1: Facial Auto-Attendance (Présentiel)
- Deploy classroom tablets with continuous detection
- Trainer approval required for 2 weeks (shadow mode)
- Gradual shift to full automation

### Phase 2: Teams Integration (À Distance)
- Beta test with 2-3 classes
- Refine engagement scoring algorithm
- Full rollout after validation

### Phase 3: AI Predictions & Anomalies
- Train models on 6 months of data
- Deploy prediction service (read-only alerts)
- Enable auto-actions after accuracy validation

---

## 📈 Success Metrics

- **Time Saved**: Reduce trainer attendance overhead from 10 min/session to < 1 min
- **Accuracy**: 98%+ facial recognition accuracy
- **Prediction**: 80%+ accuracy for absence predictions
- **Fraud Reduction**: 95% decrease in proxy attendances
- **Student Satisfaction**: 85%+ prefer auto-attendance over manual
