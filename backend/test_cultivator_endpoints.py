#!/usr/bin/env python
import requests
import json
import sys

print("\n" + "=" * 60)
print("Testing Cultivator Endpoints with MongoDB")
print("=" * 60 + "\n")

# Test 1: Health endpoint
print("1️⃣ Testing GET /api/cultivator/health")
try:
    health_resp = requests.get("http://127.0.0.1:8000/api/cultivator/health", timeout=5)
    print(f"   Status Code: {health_resp.status_code}")
    if health_resp.status_code == 200:
        print(f"   ✅ SUCCESS - Endpoint is responding")
        print(f"   Response: {health_resp.json()}")
    else:
        print(f"   ❌ FAILED - Unexpected status code")
        print(f"   Response: {health_resp.text[:300]}")
except Exception as e:
    print(f"   ❌ ERROR: {e}")

# Test 2: Login endpoint (should fail with 401 since user doesn't exist, not 503)
print("\n2️⃣ Testing POST /api/cultivator/auth/login (with non-existent user)")
try:
    login_data = {
        "username": "nonexistentuser",
        "password": "testpass123"
    }
    login_resp = requests.post("http://127.0.0.1:8000/api/cultivator/auth/login", 
                              json=login_data, timeout=5)
    print(f"   Status Code: {login_resp.status_code}")
    
    # Expected: 401 (user not found) or 422 (validation error)
    # NOT expected: 503 (database unavailable)
    if login_resp.status_code in [401, 422]:
        print(f"   ✅ SUCCESS - MongoDB is working (endpoint accessible)")
        print(f"   Response: {login_resp.json()}")
    elif login_resp.status_code == 503:
        print(f"   ❌ FAILED - Database connection unavailable (MongoDB not working)")
        print(f"   Response: {login_resp.json()}")
    else:
        print(f"   ⚠️ Unexpected status code")
        print(f"   Response: {login_resp.json()}")
except Exception as e:
    print(f"   ❌ ERROR: {e}")

# Test 3: Register endpoint (create a test user)
print("\n3️⃣ Testing POST /api/cultivator/auth/register")
try:
    register_data = {
        "fullName": "Test User",
        "username": "testuser001",
        "email": "test@example.com",
        "address": "Test Address",
        "age": 25,
        "role": "client",
        "password": "test12121"
    }
    register_resp = requests.post("http://127.0.0.1:8000/api/cultivator/auth/register",
                                 json=register_data, timeout=5)
    print(f"   Status Code: {register_resp.status_code}")
    
    if register_resp.status_code == 200:
        print(f"   ✅ SUCCESS - User registered")
        print(f"   Response: {register_resp.json()}")
    elif register_resp.status_code == 503:
        print(f"   ❌ FAILED - Database connection unavailable")
        print(f"   Response: {register_resp.json()}")
    else:
        print(f"   ⚠️ Status {register_resp.status_code}: {register_resp.json()}")
except Exception as e:
    print(f"   ❌ ERROR: {e}")

# Test 4: Login with newly created user
print("\n4️⃣ Testing POST /api/cultivator/auth/login (with created user)")
try:
    login_data = {
        "username": "testuser001",
        "password": "test12121"
    }
    login_resp = requests.post("http://127.0.0.1:8000/api/cultivator/auth/login",
                              json=login_data, timeout=5)
    print(f"   Status Code: {login_resp.status_code}")
    
    if login_resp.status_code == 200:
        print(f"   ✅ SUCCESS - Login successful")
        data = login_resp.json()
        print(f"   User ID: {data.get('user', {}).get('id')}")
        print(f"   Token: {data.get('token', 'N/A')[:50]}...")
    elif login_resp.status_code == 503:
        print(f"   ❌ FAILED - Database connection unavailable")
        print(f"   Response: {login_resp.json()}")
    else:
        print(f"   Response: {login_resp.json()}")
except Exception as e:
    print(f"   ❌ ERROR: {e}")

print("\n" + "=" * 60)
print("Test Summary:")
print("=" * 60)
print("✅ = MongoDB is working correctly")
print("❌ = MongoDB is not working or unavailable")
print("=" * 60 + "\n")
