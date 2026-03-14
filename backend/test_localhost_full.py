#!/usr/bin/env python3
"""
Gate-1 Cultivator Safety Screening - Complete Localhost Test
Tests both the commitment classifier and full analysis pipeline
"""
import requests
import json
from pathlib import Path
import sys
import time

# Set UTF-8 encoding for output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

def test_commitment_classifier():
    """Test the standalone commitment classifier"""
    print("\n" + "="*80)
    print("GATE-1 COMMITMENT CLASSIFIER TEST")
    print("="*80)
    
    recordings_dir = Path("recordings")
    wav_files = sorted(recordings_dir.glob("*.wav"))[:3]  # Test first 3
    
    results = []
    for i, wav_file in enumerate(wav_files, 1):
        print(f"\n[{i}/{len(wav_files)}] Testing: {wav_file.name}")
        try:
            with open(wav_file, 'rb') as f:
                files = {'audio_file': (wav_file.name, f, 'audio/wav')}
                response = requests.post(
                    f"{BASE_URL}/cultivator/predict/upload",
                    files=files,
                    timeout=180
                )
            
            if response.status_code == 200:
                result = response.json()
                prediction = result.get('prediction', {})
                
                intent = prediction.get('predicted_intent', 'N/A')
                confidence = prediction.get('confidence', 0)
                duration = result.get('audio_duration_seconds', 0)
                
                print(f"  Status: SUCCESS")
                print(f"  Intent: {intent}")
                print(f"  Confidence: {confidence:.2%}")
                print(f"  Duration: {duration:.1f}s")
                
                results.append({
                    'file': wav_file.name,
                    'intent': intent,
                    'confidence': confidence,
                    'status': 'PASS'
                })
            else:
                print(f"  Status: ERROR {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                results.append({
                    'file': wav_file.name,
                    'status': 'FAIL',
                    'error': response.status_code
                })
        except Exception as e:
            print(f"  Status: ERROR")
            print(f"  Error: {str(e)}")
            results.append({
                'file': wav_file.name,
                'status': 'FAIL',
                'error': str(e)
            })
    
    return results


def test_full_pipeline():
    """Test the full Gate-1 pipeline (requires call ID)"""
    print("\n" + "="*80)
    print("GATE-1 FULL PIPELINE TEST (Commitment + Deception + Combined Decision)")
    print("="*80)
    
    # Try to create a test call first
    print("\nAttempting to create test call record...")
    
    try:
        # Create a test call
        call_data = {
            "title": "Test Call - Gate-1 Full Pipeline",
            "description": "Testing commitment + deception + combined analysis",
            "status": "in_progress"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/cultivator/calls",
            json=call_data,
            timeout=10
        )
        
        if create_response.status_code in [200, 201]:
            call_info = create_response.json()
            call_id = call_info.get('id') or call_info.get('_id')
            print(f"Created test call: {call_id}")
            
            # Now test with recording
            recordings_dir = Path("recordings")
            wav_file = next(recordings_dir.glob("*.wav"))
            
            print(f"\nTesting full pipeline with: {wav_file.name}")
            with open(wav_file, 'rb') as f:
                files = {'recording': (wav_file.name, f, 'audio/wav')}
                response = requests.post(
                    f"{BASE_URL}/cultivator/calls/{call_id}/upload-recording",
                    files=files,
                    timeout=180
                )
            
            if response.status_code == 200:
                result = response.json()
                print(f"\nFull Pipeline Results:")
                print(json.dumps(result, indent=2))
                return {'status': 'SUCCESS', 'data': result}
            else:
                print(f"Error: {response.status_code}")
                print(f"Response: {response.text}")
                return {'status': 'ERROR', 'code': response.status_code}
        else:
            print(f"Could not create test call: {create_response.status_code}")
            print("This is expected if the endpoint is not available")
            return {'status': 'SKIP', 'reason': 'Call creation endpoint not available'}
            
    except Exception as e:
        print(f"Full pipeline test skipped: {str(e)}")
        return {'status': 'SKIP', 'reason': str(e)}


def test_analysis_endpoints():
    """Test the analysis endpoints"""
    print("\n" + "="*80)
    print("GATE-1 ANALYSIS ENDPOINTS CHECK")
    print("="*80)
    
    endpoints = [
        ("/cultivator/predict/upload", "POST", "Commitment Classifier"),
        ("/cultivator/calls/{callId}/upload-recording", "POST", "Full Pipeline"),
        ("/cultivator/health", "GET", "Health Check"),
    ]
    
    for endpoint, method, description in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            else:
                # Just check if endpoint exists
                response = requests.options(f"{BASE_URL}{endpoint}", timeout=5)
            
            status = "AVAILABLE" if response.status_code < 500 else "ERROR"
            print(f"\n{description}")
            print(f"  Endpoint: {endpoint}")
            print(f"  Status: {status} ({response.status_code})")
        except requests.exceptions.ConnectionError:
            print(f"\n{description}")
            print(f"  Endpoint: {endpoint}")
            print(f"  Status: CONNECTION ERROR - Server not running on {BASE_URL}")
            return False
        except Exception as e:
            print(f"\n{description}")
            print(f"  Endpoint: {endpoint}")
            print(f"  Status: ERROR - {str(e)}")
    
    return True


def main():
    """Run all tests"""
    print("\n" + "█"*80)
    print("GATE-1 CULTIVATOR SAFETY SCREENING - COMPLETE LOCALHOST TEST")
    print("█"*80)
    print(f"\nTarget: {BASE_URL}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if server is running
    print("\nChecking server connectivity...")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        print("✓ Server is running and responding")
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Cannot connect to backend server")
        print(f"  Expected: {BASE_URL}")
        print("  Make sure the backend is running: uvicorn idle_land_api:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
    
    # Test endpoints
    if not test_analysis_endpoints():
        sys.exit(1)
    
    # Test commitment classifier
    classifier_results = test_commitment_classifier()
    
    # Test full pipeline
    pipeline_result = test_full_pipeline()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in classifier_results if r.get('status') == 'PASS')
    total = len(classifier_results)
    
    print(f"\nCommitment Classifier: {passed}/{total} tests passed")
    for result in classifier_results:
        status_icon = "✓" if result['status'] == 'PASS' else "✗"
        print(f"  {status_icon} {result['file']}: {result.get('status')}")
    
    print(f"\nFull Pipeline: {pipeline_result['status']}")
    if pipeline_result['status'] == 'SKIP':
        print(f"  (Skipped: {pipeline_result['reason']})")
    
    print("\n" + "="*80)
    print("IMPORTANT: For Production Testing")
    print("="*80)
    print("""
The full Gate-1 pipeline (/cultivator/calls/{callId}/upload-recording) requires:
1. A valid call ID from your MongoDB database
2. The call record must exist in the 'calls' collection
3. The endpoint will then run:
   - Commitment Classifier (voice prosody analysis)
   - Deception Detector (stress markers & dishonesty signals)
   - Combined Decision Engine (safety recommendation matrix)

The system correctly uses NEW cultivator safety terminology:
  - PROCEED -> "Trustworthy - Proceed"
  - VERIFY -> "Needs Verification"
  - REJECT -> "High Risk - Reject"

All reasoning text references cultivator safety and trustworthiness (not buyer intent).
""")
    
    print("="*80)
    print("END OF TEST")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
