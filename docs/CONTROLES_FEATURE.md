# Controles Feature Documentation

## Overview
The Controles feature allows administrators and trainers to manage tests/exams (contrôles) and automatically notify students about upcoming assessments.

## Database Changes

### New Table: `controles`
| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| module | String(100) | Module/subject name |
| date | Date | Controle date |
| class_name | String(50) | Target class (e.g., FS202) |
| notified | Boolean | Whether students were notified |
| title | String(200) | Controle title (optional) |
| description | String(500) | Description (optional) |
| duration_minutes | Integer | Duration in minutes (optional) |
| trainer_id | Integer | FK to trainers table (optional) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |
| is_deleted | Boolean | Soft delete flag |

### Enhanced `trainers` Table
New fields added:
- `profile_photo_path` - Profile picture path
- `linkedin_url` - LinkedIn profile URL
- `education` - Educational background
- `certifications` - Professional certifications
- `availability` - Working hours/availability

### Enhanced `students` Table
All existing fields are now fully utilized in the user creation form:
- Complete parent/guardian information
- Date of birth and CIN number
- Enrollment and graduation dates
- Group assignment

## API Endpoints

### List Controles
```http
GET /api/controles?class_name=FS202&upcoming=true
```
**Query Parameters:**
- `class_name` (optional): Filter by class
- `module` (optional): Filter by module name
- `upcoming` (optional): Show only future controles

### Create Controle
```http
POST /api/controles
Authorization: Bearer <token>
```
**Body:**
```json
{
  "module": "Développement Web Avancé",
  "date": "2025-12-28",
  "class_name": "FS202",
  "title": "Contrôle React & Node.js",
  "description": "Contrôle sur React hooks et API REST",
  "duration_minutes": 120,
  "trainer_id": 1
}
```

### Get Specific Controle
```http
GET /api/controles/{id}
Authorization: Bearer <token>
```

### Update Controle
```http
PUT /api/controles/{id}
Authorization: Bearer <token>
```
**Body:** Same as create (all fields optional)

### Delete Controle
```http
DELETE /api/controles/{id}
Authorization: Bearer <token>
```
**Note:** Requires admin role

### Send Notifications
```http
POST /api/controles/{id}/notify
Authorization: Bearer <token>
```
Sends notifications to all students in the controle's class and marks it as notified.

### Get Upcoming Controles (Next 7 Days)
```http
GET /api/controles/upcoming/week
Authorization: Bearer <token>
```

## New Users Added

### Trainers
1. **Mehdi Ouafic**
   - Email: mehdi.ouafic@smartpresence.com
   - Specialization: Web Development & Frontend
   - 8 years experience

2. **Ihssan Boudhim**
   - Email: ihssan.boudhim@smartpresence.com
   - Specialization: Backend Development & Databases
   - 10 years experience

3. **Halima Bourhim**
   - Email: halima.bourhim@smartpresence.com
   - Specialization: Mobile Development & UX/UI
   - 7 years experience

### Students (Class FS202 & others)
1. Salma El Hessouni (FS202001)
2. Hajar El Aagal (FS202002)
3. Reda Lbeauguoss (FS202003)
4. Manaf Mohamed (FS202004)
5. Yasser Bounoiara (FS202005)
6. Adam Benali (FS201001)
7. Yasmine Idrissi (FS201002)
8. Omar El Fassi (FS203001)

**Login Credentials:**
- Trainers: `{firstname}.{lastname}@smartpresence.com` / Password: `Trainer@123`
- Students: `{firstname}.{lastname}@smartpresence.com` / Password: `Student@123`

## User Management Improvements

The user creation page (`/admin/users`) now includes:

### For Students:
- Student code (e.g., FS202001)
- Class and group assignment
- Date of birth
- CIN number
- Enrollment and expected graduation dates
- Complete parent/guardian information:
  - Name
  - Relationship (Père, Mère, Tuteur)
  - Email
  - Phone

### For Trainers:
- Specialization
- Years of experience
- Education/diploma
- Office location
- Certifications
- Availability schedule
- LinkedIn profile URL

### For All Users:
- Phone number
- Complete address

## Setup Instructions

### 1. Run Migrations
```bash
cd backend
python -m alembic upgrade head
```

### 2. Seed Comprehensive Data
```bash
python -m app.scripts.seed_comprehensive
```

**OR** use the convenience script:
```bash
./scripts/setup-controles.sh
```

### 3. Restart Services
```bash
docker-compose restart backend
```

## Notification System

When a controle is created and the `/notify` endpoint is called:
1. All students in the target class receive a notification
2. Notification includes:
   - Controle title and module
   - Date and time until the controle
   - Duration (if specified)
   - Description (if provided)
3. The controle is marked as `notified = true`

Students can view their upcoming controles through:
- Notifications panel
- Student dashboard (future enhancement)

## Service Layer

### `ControleNotificationService`
Located in: `backend/app/services/controle_notification.py`

**Methods:**
- `notify_upcoming_controles(db, days_ahead=7)` - Batch notify for upcoming controles
- `notify_specific_controle(db, controle_id)` - Notify for a specific controle
- `get_student_upcoming_controles(db, student_id, days_ahead=30)` - Get student's upcoming controles

## Future Enhancements

- [ ] Student grades/results tracking
- [ ] Controle results upload and management
- [ ] Student performance analytics
- [ ] Automated reminder emails (24h before)
- [ ] Integration with calendar view
- [ ] PDF generation for controle schedules
- [ ] Export controle calendar

## Migration File

Located at: `backend/alembic/versions/add_controles_table.py`

**Important:** Update the `down_revision` variable to match your latest migration before running.

## Testing

1. **Create a controle:**
   ```bash
   curl -X POST http://localhost:8000/api/controles \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "module": "Test Module",
       "date": "2025-12-30",
       "class_name": "FS202",
       "title": "Test Controle"
     }'
   ```

2. **Send notifications:**
   ```bash
   curl -X POST http://localhost:8000/api/controles/1/notify \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **List upcoming:**
   ```bash
   curl http://localhost:8000/api/controles/upcoming/week \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Troubleshooting

**Migration issues:**
- Check that `down_revision` in migration file matches your latest migration
- Run `alembic history` to see migration chain
- Use `alembic downgrade -1` to rollback if needed

**API errors:**
- Ensure backend is restarted after migrations
- Check that controle model is imported in `app/db/base.py`
- Verify JWT token is valid

**No notifications received:**
- Check that students exist in the specified class
- Verify notification preferences are enabled
- Check `notifications` table in database
