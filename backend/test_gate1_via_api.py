"""
Gate-1 Cultivator Safety Screening - API Test
Tests the full production endpoint with real recordings
"""
import requests
import json
from pathlib import Path
import sys

# Set UTF-8 encoding for output
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Backend server URL
BASE_URL = "http://localhost:8000"

# Find all recordings
recordings_dir = Path("c:/projects/Smart-Agri-Suite/backend/recordings")
wav_files = sorted(recordings_dir.glob("*.wav"))

print("=" * 80)
print("Gate-1 Cultivator Safety Screening - API Test")
print(f"Testing {len(wav_files)} recordings via production endpoint")
print("=" * 80)
print()

for i, wav_file in enumerate(wav_files, 1):
    print(f"\n{'=' * 80}")
    print(f"Test {i}/{len(wav_files)}: {wav_file.name}")
    print('=' * 80)
    
    # Note: This endpoint requires a valid call ID from the database
    # For now, we'll test the commitment-only endpoint
    try:
        with open(wav_file, 'rb') as f:
            files = {'audio_file': (wav_file.name, f, 'audio/wav')}
            response = requests.post(
                f"{BASE_URL}/cultivator/predict/upload",
                files=files,
                timeout=120
            )
        
        if response.status_code == 200:
            result = response.json()
            prediction = result.get('prediction', {})
            
            print("\n[SUCCESS] COMMITMENT ANALYSIS:")
            print(f"   Commitment Level: {prediction.get('predicted_intent', 'N/A')}")
            print(f"   Confidence: {prediction.get('confidence', 0):.2%}")
            print(f"   Audio Duration: {result.get('audio_duration_seconds', 0):.1f}s")
            print(f"   Processing Time: {result.get('processing_time_ms', 0)/1000:.1f}s")
            
            # Show all scores
            all_scores = prediction.get('all_scores', [])
            if all_scores:
                print(f"   Score Breakdown:")
                for score_data in all_scores:
                    print(f"      - {score_data['label']}: {score_data['score']:.2%}")
            
            # Note about full pipeline
            print("\n   NOTE: To test FULL PIPELINE (commitment + deception + combined decision):")
            print("   Use endpoint: POST /cultivator/calls/{callId}/upload-recording")
            print("   This requires a valid call ID from your database")
            
        else:
            print(f"\n[ERROR] Status {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   {json.dumps(error_detail, indent=2)}")
            except:
                print(f"   {response.text}")
            
    except Exception as e:
        print(f"\n[ERROR] Request failed: {str(e)}")

print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print("✓ Tested commitment classifier (standalone endpoint)")
print("⚠ Full pipeline (with deception detection) requires valid call ID")
print("\nTo test the full Gate-1 pipeline:")
print("1. Create a call record in your database")
print("2. Use that call ID with: POST /calls/{callId}/upload-recording")
print("3. Response will include commitment + deception + combined safety decision")
