#!/usr/bin/env python3
"""
Quick Test - Gate-1 Cultivator Safety Screening
Simple examples of how to test the API
"""
import requests
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"

print("\n" + "="*80)
print("QUICK TEST - Gate-1 Cultivator Safety Screening")
print("="*80)

# ============================================================================
# TEST 1: COMMITMENT CLASSIFIER (Standalone)
# ============================================================================
print("\n[TEST 1] Commitment Classifier - Single Recording")
print("-" * 80)

recording = Path("recordings/69ae4c085f5e89bcd5d5f706.wav")
print(f"Testing with: {recording.name}")
print(f"File size: {recording.stat().st_size / (1024*1024):.1f} MB")

with open(recording, 'rb') as f:
    files = {'audio_file': (recording.name, f, 'audio/wav')}
    response = requests.post(
        f"{BASE_URL}/cultivator/predict/upload",
        files=files,
        timeout=180
    )

if response.status_code == 200:
    result = response.json()
    prediction = result.get('prediction', {})
    
    print(f"\nResult:")
    print(f"  Status: SUCCESS")
    print(f"  Commitment Level: {prediction.get('predicted_intent')}")
    print(f"  Confidence: {prediction.get('confidence'):.2%}")
    print(f"  Processing Time: {result.get('processing_time_ms')/1000:.1f}s")
    print(f"  Audio Duration: {result.get('audio_duration_seconds'):.1f}s")
else:
    print(f"Error: {response.status_code}")


# ============================================================================
# TEST 2: BATCH TEST - ALL RECORDINGS
# ============================================================================
print("\n" + "="*80)
print("[TEST 2] Batch Test - All Recordings")
print("-" * 80)

recordings_dir = Path("recordings")
wav_files = sorted(recordings_dir.glob("*.wav"))

print(f"Found {len(wav_files)} recordings to test\n")

batch_results = []
for i, wav_file in enumerate(wav_files, 1):
    print(f"[{i}/{len(wav_files)}] {wav_file.name}...", end=" ", flush=True)
    
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
            intent = prediction.get('predicted_intent')
            confidence = prediction.get('confidence')
            duration = result.get('audio_duration_seconds')
            
            batch_results.append({
                'file': wav_file.name,
                'intent': intent,
                'confidence': confidence,
                'duration': duration,
                'status': 'PASS'
            })
            
            print(f"PASS ({intent}, {confidence:.0%})")
        else:
            print(f"FAIL (HTTP {response.status_code})")
            batch_results.append({
                'file': wav_file.name,
                'status': 'FAIL',
                'error': response.status_code
            })
    except Exception as e:
        print(f"ERROR ({str(e)[:30]}...)")
        batch_results.append({
            'file': wav_file.name,
            'status': 'ERROR',
            'error': str(e)
        })

# Summary table
print("\nSummary:")
print(f"{'Filename':<40} {'Intent':<12} {'Confidence':<12}")
print("-" * 80)
for result in batch_results:
    if result['status'] == 'PASS':
        print(f"{result['file']:<40} {result['intent']:<12} {result['confidence']:.0%}")
    else:
        print(f"{result['file']:<40} {'ERROR':<12} {result['status']}")

passed = sum(1 for r in batch_results if r['status'] == 'PASS')
print(f"\nTotal: {passed}/{len(batch_results)} passed")


# ============================================================================
# TECHNICAL INFO
# ============================================================================
print("\n" + "="*80)
print("TECHNICAL INFORMATION")
print("="*80)

print("""
COMMITMENT CLASSIFIER (Current Status: WORKING)
  Endpoint: POST /cultivator/predict/upload
  Input: WAV audio file
  Output: PROCEED | VERIFY | REJECT
  Analysis: Voice prosody (pitch, pauses, speech patterns)
  Confidence: 0-100%
  
FULL PIPELINE (requires valid call ID)
  Endpoint: POST /cultivator/calls/{callId}/upload-recording
  Includes:
    1. Commitment Classifier - Voice commitment analysis
    2. Deception Detector - Stress markers & dishonesty signals
    3. Combined Decision Engine - Safety recommendation matrix
  Output: APPROVE | VERIFY | REJECT + Trust Score 0-1 + Risk Level
  
TERMINOLOGY
  Old → New
  ----   ----
  PROCEED → Trustworthy - Proceed
  VERIFY → Needs Verification
  REJECT → High Risk - Reject
  
All backend reasoning references CULTIVATOR SAFETY & TRUSTWORTHINESS
(not buyer intent)
""")

print("="*80)
print("END OF QUICK TEST")
print("="*80 + "\n")
