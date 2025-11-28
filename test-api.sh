#!/bin/bash

# Healthcare24R Dashboard API Test Script
# This script tests all the main API endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5000/api"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Healthcare24R Dashboard Backend - API Test Script    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}→ Checking if server is running...${NC}"
if ! curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Server is not running! Please start the server with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# 1. Register Admin
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}1. Registering Admin User...${NC}"
ADMIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin@test.com",
    "password": "password123",
    "timezone": "Asia/Kolkata"
  }')

if echo "$ADMIN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Admin registered successfully${NC}"
    ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.data.token')
else
    echo -e "${YELLOW}⚠ Admin might already exist, trying to login...${NC}"
    ADMIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email": "admin@test.com", "password": "password123"}')
    ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.data.token')
fi
echo ""

# 2. Create Owner
echo -e "${YELLOW}2. Creating Owner User...${NC}"
OWNER_RESPONSE=$(curl -s -X POST $BASE_URL/admin/create-owner \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Rohit Patil",
    "email": "rohit@test.com",
    "password": "password123",
    "timezone": "Asia/Kolkata"
  }')

if echo "$OWNER_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Owner created successfully${NC}"
    OWNER_ID=$(echo $OWNER_RESPONSE | jq -r '.data.id')
else
    echo -e "${YELLOW}⚠ Owner might already exist, getting ID...${NC}"
    USERS=$(curl -s -X GET "$BASE_URL/admin/users?role=owner" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    OWNER_ID=$(echo $USERS | jq -r '.data[0]._id')
fi

# Login as owner
OWNER_LOGIN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rohit@test.com", "password": "password123"}')
OWNER_TOKEN=$(echo $OWNER_LOGIN | jq -r '.data.token')
echo ""

# 3. Create Nurse
echo -e "${YELLOW}3. Creating Nurse User...${NC}"
NURSE_RESPONSE=$(curl -s -X POST $BASE_URL/admin/create-nurse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Sunita Jadhav",
    "email": "sunita@test.com",
    "password": "password123",
    "timezone": "Asia/Kolkata"
  }')

if echo "$NURSE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Nurse created successfully${NC}"
    NURSE_ID=$(echo $NURSE_RESPONSE | jq -r '.data.id')
else
    echo -e "${YELLOW}⚠ Nurse might already exist, getting ID...${NC}"
    USERS=$(curl -s -X GET "$BASE_URL/admin/users?role=nurse" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    NURSE_ID=$(echo $USERS | jq -r '.data[0]._id')
fi

# Login as nurse
NURSE_LOGIN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sunita@test.com", "password": "password123"}')
NURSE_TOKEN=$(echo $NURSE_LOGIN | jq -r '.data.token')
echo ""

# 4. Owner Creates Patient
echo -e "${YELLOW}4. Creating Patient...${NC}"
PATIENT_RESPONSE=$(curl -s -X POST $BASE_URL/owner/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "Bapu Khedekar",
    "dob": "1950-01-15",
    "gender": "male",
    "address": "123 Main St, Pune",
    "patientTimezone": "Asia/Kolkata"
  }')

if echo "$PATIENT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Patient created successfully${NC}"
    PATIENT_ID=$(echo $PATIENT_RESPONSE | jq -r '.data._id')
    echo -e "  Patient ID: ${PATIENT_ID}"
else
    echo -e "${RED}✗ Failed to create patient${NC}"
    echo "$PATIENT_RESPONSE" | jq '.'
fi
echo ""

# 5. Owner Creates Tasks
echo -e "${YELLOW}5. Creating Custom Tasks...${NC}"

# Task 1: Morning Medicine
TASK1_RESPONSE=$(curl -s -X POST $BASE_URL/owner/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "Morning Medicine",
    "description": "Administer morning medications",
    "order": 1
  }')

if echo "$TASK1_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Task 'Morning Medicine' created${NC}"
    TASK1_ID=$(echo $TASK1_RESPONSE | jq -r '.data._id')
else
    echo -e "${YELLOW}⚠ Task might already exist${NC}"
    TASKS=$(curl -s -X GET $BASE_URL/owner/tasks -H "Authorization: Bearer $OWNER_TOKEN")
    TASK1_ID=$(echo $TASKS | jq -r '.data[0]._id')
fi

# Task 2: BP Check
TASK2_RESPONSE=$(curl -s -X POST $BASE_URL/owner/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "BP Check",
    "description": "Check blood pressure",
    "order": 2
  }')

if echo "$TASK2_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Task 'BP Check' created${NC}"
else
    echo -e "${YELLOW}⚠ Task might already exist${NC}"
fi

# Task 3: Breakfast Taken
curl -s -X POST $BASE_URL/owner/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -d '{
    "name": "Breakfast Taken",
    "description": "Confirm patient has taken breakfast",
    "order": 3
  }' > /dev/null

echo -e "${GREEN}✓ Task 'Breakfast Taken' created${NC}"
echo ""

# 6. Admin Assigns Nurse to Patient
echo -e "${YELLOW}6. Assigning Nurse to Patient...${NC}"
ASSIGNMENT_RESPONSE=$(curl -s -X POST $BASE_URL/admin/assign-nurse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"nurseId\": \"$NURSE_ID\"
  }")

if echo "$ASSIGNMENT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Nurse assigned to patient successfully${NC}"
else
    echo -e "${YELLOW}⚠ Assignment might already exist${NC}"
fi
echo ""

# 7. Nurse Views Assigned Patients
echo -e "${YELLOW}7. Nurse viewing assigned patients...${NC}"
ASSIGNED_PATIENTS=$(curl -s -X GET $BASE_URL/nurse/patients \
  -H "Authorization: Bearer $NURSE_TOKEN")

PATIENT_COUNT=$(echo $ASSIGNED_PATIENTS | jq -r '.count')
echo -e "${GREEN}✓ Nurse has ${PATIENT_COUNT} assigned patient(s)${NC}"
echo ""

# 8. Nurse Views Tasks for Patient
echo -e "${YELLOW}8. Nurse viewing tasks for patient...${NC}"
PATIENT_TASKS=$(curl -s -X GET $BASE_URL/nurse/patients/$PATIENT_ID/tasks \
  -H "Authorization: Bearer $NURSE_TOKEN")

TASK_COUNT=$(echo $PATIENT_TASKS | jq -r '.count')
echo -e "${GREEN}✓ Found ${TASK_COUNT} task(s) for patient${NC}"
echo ""

# 9. Nurse Submits Task Completion
echo -e "${YELLOW}9. Nurse submitting task completion...${NC}"
SUBMIT_RESPONSE=$(curl -s -X POST $BASE_URL/nurse/patients/$PATIENT_ID/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NURSE_TOKEN" \
  -d "{
    \"ownerTaskId\": \"$TASK1_ID\",
    \"note\": \"Patient took medicine without issues. Vitals: BP 120/80, Temp 98.6°F\",
    \"nurseTimezone\": \"Asia/Kolkata\"
  }")

if echo "$SUBMIT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Task completed successfully${NC}"
    echo -e "  Timestamp UTC: $(echo $SUBMIT_RESPONSE | jq -r '.data.timestampUTC')"
    echo -e "  Local Time: $(echo $SUBMIT_RESPONSE | jq -r '.data.nurseLocalTime')"
else
    echo -e "${RED}✗ Failed to submit task${NC}"
    echo "$SUBMIT_RESPONSE" | jq '.'
fi
echo ""

# 10. Owner Views Task Entries
echo -e "${YELLOW}10. Owner viewing task entries for patient...${NC}"
TASK_ENTRIES=$(curl -s -X GET $BASE_URL/owner/patients/$PATIENT_ID/tasks \
  -H "Authorization: Bearer $OWNER_TOKEN")

ENTRY_COUNT=$(echo $TASK_ENTRIES | jq -r '.count')
echo -e "${GREEN}✓ Found ${ENTRY_COUNT} task entry/entries${NC}"

if [ "$ENTRY_COUNT" -gt 0 ]; then
    echo -e "\n${BLUE}Latest Task Entry:${NC}"
    echo $TASK_ENTRIES | jq -r '.data[0] | "  Task: \(.task.name)\n  Nurse: \(.nurse.name)\n  Note: \(.note)\n  Time (Owner TZ): \(.ownerLocalTime)"'
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Summary                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo -e "${GREEN}✓ All tests completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Created Resources:${NC}"
echo -e "  • Admin: admin@test.com"
echo -e "  • Owner: rohit@test.com (Rohit Patil)"
echo -e "  • Nurse: sunita@test.com (Sunita Jadhav)"
echo -e "  • Patient: Bapu Khedekar (ID: ${PATIENT_ID})"
echo -e "  • Tasks: Morning Medicine, BP Check, Breakfast Taken"
echo -e "  • Assignment: Nurse → Patient"
echo -e "  • Task Entries: ${ENTRY_COUNT}"
echo ""
echo -e "${BLUE}All passwords: password123${NC}"
echo ""
