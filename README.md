# Healthcare24R Dashboard Backend

A comprehensive healthcare dashboard backend with role-based access control for managing patients, nurses, and daily care tasks.

## 🏗️ Architecture

### Role Hierarchy

1. **Admin**
   - Creates Owner users
   - Creates Nurse users
   - Assigns Nurses to Patients

2. **Owner**
   - Creates Patients
   - Creates Custom Tasks (Morning Medicine, BP Check, etc.)
   - Views task entries submitted by nurses

3. **Nurse**
   - Sees patients assigned by Admin
   - Completes daily tasks
   - Submits updates with UTC timestamps

## 🔒 Access Control Matrix

| Action | Admin | Owner | Nurse |
|--------|-------|-------|-------|
| Create Owners | ✅ | ❌ | ❌ |
| Create Nurses | ✅ | ❌ | ❌ |
| Create Patients | ❌ | ✅ | ❌ |
| Create Custom Tasks | ❌ | ✅ | ❌ |
| Assign Nurse → Patient | ✅ | ❌ | ❌ |
| Submit Task Entry | ❌ | ❌ | ✅ |
| View Task Entries | ❌ | ✅ | ✅ (only own) |

## 🗄️ Database Schema

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  passwordHash: String,
  role: ['admin', 'owner', 'nurse'],
  timezone: String (default: 'UTC'),
  createdAt: Date
}
```

### Patient Schema
```javascript
{
  ownerId: ObjectId (ref: User),
  name: String,
  dob: Date,
  gender: ['male', 'female', 'other'],
  address: String,
  patientTimezone: String (default: 'Asia/Kolkata'),
  active: Boolean,
  createdAt: Date
}
```

### OwnerTask Schema
```javascript
{
  ownerId: ObjectId (ref: User),
  name: String,
  description: String,
  active: Boolean,
  order: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Assignment Schema
```javascript
{
  patientId: ObjectId (ref: Patient),
  nurseId: ObjectId (ref: User),
  assignedByAdmin: ObjectId (ref: User),
  startDate: Date,
  endDate: Date,
  active: Boolean
}
```

### TaskEntry Schema
```javascript
{
  patientId: ObjectId (ref: Patient),
  nurseId: ObjectId (ref: User),
  ownerTaskId: ObjectId (ref: OwnerTask),
  note: String,
  timestampUTC: Date,
  nurseLocalTime: String,
  nurseTimezone: String
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Healthcare24R-Dashboard-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/healthcare24r
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

5. Start MongoDB:
```bash
# If using local MongoDB
mongod

# Or if using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

6. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will be running at `http://localhost:5000`

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All endpoints (except `/auth/register` and `/auth/login`) require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🔐 Authentication Routes

### Register First Admin
```http
POST /api/auth/register
```
**Note:** Only works when no users exist in the database.

**Request Body:**
```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "password123",
  "phone": "1234567890",
  "timezone": "Asia/Kolkata"
}
```

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "User Name",
      "email": "user@example.com",
      "role": "admin",
      "timezone": "UTC"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User Profile
```http
GET /api/auth/me
```

### Update Profile
```http
PUT /api/auth/me
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "timezone": "America/New_York"
}
```

### Change Password
```http
PUT /api/auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

### Refresh Token
```http
POST /api/auth/refresh
```

---

## 👨‍💼 Admin Routes

### Create Owner
```http
POST /api/admin/create-owner
```

**Request Body:**
```json
{
  "name": "Rohit Patil",
  "email": "rohit@example.com",
  "password": "password123",
  "phone": "9876543210",
  "timezone": "Asia/Kolkata"
}
```

### Create Nurse
```http
POST /api/admin/create-nurse
```

**Request Body:**
```json
{
  "name": "Sunita Jadhav",
  "email": "sunita@example.com",
  "password": "password123",
  "phone": "9876543210",
  "timezone": "Asia/Kolkata"
}
```

### Assign Nurse to Patient
```http
POST /api/admin/assign-nurse
```

**Request Body:**
```json
{
  "patientId": "64abc123...",
  "nurseId": "64def456...",
  "startDate": "2025-11-27T00:00:00Z",
  "endDate": "2025-12-27T00:00:00Z"
}
```

### Get All Assignments
```http
GET /api/admin/assignments?active=true&nurseId=...&patientId=...
```

### Deactivate Assignment
```http
PUT /api/admin/assignments/:id/deactivate
```

### Get All Users
```http
GET /api/admin/users?role=nurse
```

---

## 🏥 Owner Routes

### Patient Management

#### Create Patient
```http
POST /api/owner/patients
```

**Request Body:**
```json
{
  "name": "Bapu Khedekar",
  "dob": "1950-01-15",
  "gender": "male",
  "address": "123 Main St, Pune",
  "patientTimezone": "Asia/Kolkata"
}
```

#### Get All Patients
```http
GET /api/owner/patients?active=true
```

#### Get Single Patient
```http
GET /api/owner/patients/:id
```

#### Update Patient
```http
PUT /api/owner/patients/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "address": "New Address",
  "active": true
}
```

#### Delete Patient (Soft Delete)
```http
DELETE /api/owner/patients/:id
```

### Task Management

#### Create Custom Task
```http
POST /api/owner/tasks
```

**Request Body:**
```json
{
  "name": "Morning Medicine",
  "description": "Administer morning medications",
  "order": 1
}
```

#### Get All Tasks
```http
GET /api/owner/tasks?active=true
```

#### Get Single Task
```http
GET /api/owner/tasks/:id
```

#### Update Task
```http
PUT /api/owner/tasks/:id
```

**Request Body:**
```json
{
  "name": "Updated Task Name",
  "description": "Updated description",
  "order": 2,
  "active": true
}
```

#### Delete Task (Soft Delete)
```http
DELETE /api/owner/tasks/:id
```

### Task Entry Viewing

#### Get Task Entries for Specific Patient
```http
GET /api/owner/patients/:id/tasks?startDate=2025-11-01&endDate=2025-11-30&taskId=...&limit=50
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "patient": {
    "id": "...",
    "name": "Bapu Khedekar"
  },
  "ownerTimezone": "Asia/Kolkata",
  "data": [
    {
      "id": "...",
      "task": {
        "id": "...",
        "name": "Morning Medicine",
        "description": "..."
      },
      "nurse": {
        "id": "...",
        "name": "Sunita Jadhav",
        "email": "sunita@example.com"
      },
      "note": "Patient took medicine without issues",
      "timestampUTC": "2025-11-27T04:30:00.000Z",
      "ownerLocalTime": "2025-11-27 10:00:00",
      "nurseLocalTime": "2025-11-27 10:00:00",
      "nurseTimezone": "Asia/Kolkata"
    }
  ]
}
```

#### Get All Task Entries for All Patients
```http
GET /api/owner/tasks/entries?startDate=...&endDate=...&taskId=...&patientId=...&limit=100
```

---

## 👩‍⚕️ Nurse Routes

### Get Assigned Patients
```http
GET /api/nurse/patients
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "...",
      "name": "Bapu Khedekar",
      "dob": "1950-01-15",
      "gender": "male",
      "address": "123 Main St, Pune",
      "patientTimezone": "Asia/Kolkata",
      "owner": {
        "id": "...",
        "name": "Rohit Patil",
        "email": "rohit@example.com",
        "phone": "9876543210"
      },
      "assignmentId": "...",
      "assignedSince": "2025-11-27T00:00:00.000Z"
    }
  ]
}
```

### Get Patient Details
```http
GET /api/nurse/patients/:id
```

### Get Tasks for Patient
```http
GET /api/nurse/patients/:id/tasks
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "patient": {
    "id": "...",
    "name": "Bapu Khedekar"
  },
  "data": [
    {
      "_id": "...",
      "name": "Morning Medicine",
      "description": "Administer morning medications",
      "order": 1,
      "active": true
    },
    {
      "_id": "...",
      "name": "BP Check",
      "description": "Check blood pressure",
      "order": 2,
      "active": true
    }
  ]
}
```

### Submit Task Completion
```http
POST /api/nurse/patients/:id/tasks
```

**Request Body:**
```json
{
  "ownerTaskId": "64abc123...",
  "note": "Patient took medicine without issues. BP: 120/80",
  "nurseTimezone": "Asia/Kolkata"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "id": "...",
    "patient": {
      "id": "...",
      "name": "Bapu Khedekar"
    },
    "task": {
      "id": "...",
      "name": "Morning Medicine",
      "description": "..."
    },
    "note": "Patient took medicine without issues. BP: 120/80",
    "timestampUTC": "2025-11-27T04:30:00.000Z",
    "nurseLocalTime": "2025-11-27 10:00:00",
    "nurseTimezone": "Asia/Kolkata"
  }
}
```

### Get My Task Entries
```http
GET /api/nurse/my-tasks?startDate=...&endDate=...&patientId=...&limit=50
```

---

## 🔄 Example Workflow

### 1. Initial Setup

```bash
# Register first admin
POST /api/auth/register
{
  "name": "System Admin",
  "email": "admin@healthcare24r.com",
  "password": "securepass123"
}
```

### 2. Admin Creates Owner

```bash
# Login as admin
POST /api/auth/login

# Create owner
POST /api/admin/create-owner
{
  "name": "Rohit Patil",
  "email": "rohit@example.com",
  "password": "password123"
}
```

### 3. Admin Creates Nurse

```bash
POST /api/admin/create-nurse
{
  "name": "Sunita Jadhav",
  "email": "sunita@example.com",
  "password": "password123"
}
```

### 4. Owner Creates Patient

```bash
# Login as owner
POST /api/auth/login

# Create patient
POST /api/owner/patients
{
  "name": "Bapu Khedekar",
  "dob": "1950-01-15",
  "gender": "male"
}
```

### 5. Owner Creates Tasks

```bash
POST /api/owner/tasks
{
  "name": "Morning Medicine",
  "description": "Administer morning medications",
  "order": 1
}

POST /api/owner/tasks
{
  "name": "BP Check",
  "description": "Check blood pressure",
  "order": 2
}
```

### 6. Admin Assigns Nurse to Patient

```bash
# Login as admin
POST /api/admin/assign-nurse
{
  "patientId": "<patient-id>",
  "nurseId": "<nurse-id>"
}
```

### 7. Nurse Completes Tasks

```bash
# Login as nurse
POST /api/auth/login

# Get assigned patients
GET /api/nurse/patients

# Get tasks for patient
GET /api/nurse/patients/<patient-id>/tasks

# Submit task completion
POST /api/nurse/patients/<patient-id>/tasks
{
  "ownerTaskId": "<task-id>",
  "note": "Task completed successfully"
}
```

### 8. Owner Views Task Entries

```bash
# Login as owner
GET /api/owner/patients/<patient-id>/tasks
```

---

## 🧪 Testing with cURL

### Register Admin
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### Create Owner (as Admin)
```bash
curl -X POST http://localhost:5000/api/admin/create-owner \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Owner Name",
    "email": "owner@test.com",
    "password": "password123"
  }'
```

---

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation with express-validator
- CORS protection
- Environment variable configuration
- Secure password requirements (min 6 characters)

---

## 🌍 Timezone Handling

- All timestamps stored in UTC in the database
- Nurse submissions include local time and timezone
- Owner views are converted to owner's timezone
- Supports all IANA timezone identifiers (e.g., 'Asia/Kolkata', 'America/New_York')

---

## 📝 Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]  // Optional validation errors
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔧 Development

### Project Structure
```
Healthcare24R-Dashboard-backend/
├── config/
│   └── db.js                 # Database configuration
├── middleware/
│   ├── auth.js               # Authentication & authorization
│   └── validate.js           # Validation middleware
├── models/
│   ├── User.js               # User schema
│   ├── Patient.js            # Patient schema
│   ├── OwnerTask.js          # Task schema
│   ├── Assignment.js         # Assignment schema
│   └── TaskEntry.js          # Task entry schema
├── routes/
│   ├── auth.js               # Auth routes
│   ├── admin.js              # Admin routes
│   ├── owner.js              # Owner routes
│   └── nurse.js              # Nurse routes
├── .env                      # Environment variables
├── .env.example              # Example environment variables
├── .gitignore                # Git ignore file
├── package.json              # Dependencies
├── README.md                 # Documentation
└── server.js                 # Main server file
```

---

## 📄 License

ISC

---

## 👥 Support

For support, email support@healthcare24r.com or open an issue in the repository.

---

**Built with ❤️ for Healthcare24R**
