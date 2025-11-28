# Healthcare24R Dashboard Backend - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and update the following:
# - MONGODB_URI (if not using default)
# - JWT_SECRET (change to a secure random string)
```

### Step 3: Start MongoDB
Choose one option:

**Option A: Local MongoDB**
```bash
mongod
```

**Option B: Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 4: Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

You should see:
```
✅ MongoDB Connected: localhost
🚀 Server running on port 5000
📍 Environment: development
🌐 API URL: http://localhost:5000
💊 Healthcare24R Dashboard Backend Ready!
```

---

## 🧪 Quick Test

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Register First Admin
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

Copy the `token` from the response and use it in subsequent requests.

---

## 📋 Complete Workflow Example

### 1. Admin Login & Create Owner
```bash
# Login as admin
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "password123"}' | jq -r '.data.token')

# Create owner
curl -X POST http://localhost:5000/api/admin/create-owner \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Rohit Patil",
    "email": "rohit@test.com",
    "password": "password123"
  }'
```

### 2. Admin Creates Nurse
```bash
curl -X POST http://localhost:5000/api/admin/create-nurse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Sunita Jadhav",
    "email": "sunita@test.com",
    "password": "password123"
  }'
```

### 3. Owner Creates Patient
```bash
# Login as owner
OWNER_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rohit@test.com", "password": "password123"}' | jq -r '.data.token')

# Create patient
PATIENT=$(curl -s -X POST http://localhost:5000/api/owner/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "Bapu Khedekar",
    "dob": "1950-01-15",
    "gender": "male"
  }')

PATIENT_ID=$(echo $PATIENT | jq -r '.data._id')
```

### 4. Owner Creates Tasks
```bash
# Create Morning Medicine task
TASK=$(curl -s -X POST http://localhost:5000/api/owner/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "Morning Medicine",
    "description": "Administer morning medications",
    "order": 1
  }')

TASK_ID=$(echo $TASK | jq -r '.data._id')

# Create BP Check task
curl -X POST http://localhost:5000/api/owner/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "BP Check",
    "description": "Check blood pressure",
    "order": 2
  }'
```

### 5. Admin Assigns Nurse to Patient
```bash
# Get nurse ID
NURSE_ID=$(curl -s -X GET http://localhost:5000/api/admin/users?role=nurse \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0]._id')

# Assign nurse to patient
curl -X POST http://localhost:5000/api/admin/assign-nurse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"nurseId\": \"$NURSE_ID\"
  }"
```

### 6. Nurse Submits Task
```bash
# Login as nurse
NURSE_TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sunita@test.com", "password": "password123"}' | jq -r '.data.token')

# View assigned patients
curl -X GET http://localhost:5000/api/nurse/patients \
  -H "Authorization: Bearer $NURSE_TOKEN"

# Submit task completion
curl -X POST http://localhost:5000/api/nurse/patients/$PATIENT_ID/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -d "{
    \"ownerTaskId\": \"$TASK_ID\",
    \"note\": \"Patient took medicine without issues. Vitals normal.\"
  }"
```

### 7. Owner Views Task Entries
```bash
# View task entries for patient
curl -X GET http://localhost:5000/api/owner/patients/$PATIENT_ID/tasks \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

---

## 🐳 Docker Quick Start

### Build and Run with Docker Compose
```bash
# Coming soon - Docker Compose setup
```

---

## 📦 Using Postman

1. Import the `postman_collection.json` file into Postman
2. Set the `baseUrl` variable to `http://localhost:5000/api`
3. Start with "Register Admin" request
4. Copy the token from login response
5. Set the `token` variable in Postman
6. Follow the workflow in order

---

## 🔧 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
ps aux | grep mongo

# Or check with Docker
docker ps | grep mongo

# Restart MongoDB
mongod --dbpath /path/to/data
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=5001

# Or kill the process using port 5000
lsof -ti:5000 | xargs kill -9
```

### Module Not Found Error
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Next Steps

1. ✅ Read the complete API documentation in README.md
2. ✅ Test all endpoints with Postman
3. ✅ Implement the frontend dashboard
4. ✅ Set up production environment
5. ✅ Configure HTTPS and domain
6. ✅ Set up monitoring and logging

---

## 🆘 Support

- 📧 Email: support@healthcare24r.com
- 📖 Documentation: See README.md
- 🐛 Issues: Open an issue in the repository

---

**Happy Coding! 🚀**
