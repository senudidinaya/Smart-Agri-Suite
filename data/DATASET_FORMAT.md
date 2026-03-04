# Dataset Format Documentation for Intent Risk Analysis
# Smart Agri-Suite - Cultivator Intent Module V2

## Overview

This document describes the format for the labeled training dataset used to train
the intent risk classification model.

## File: labeled_call_features.csv

### Decision Labels (Target Variable)

| Label   | Description                                                  |
|---------|--------------------------------------------------------------|
| PROCEED | High intent buyer - Confident, positive, ready to purchase   |
| VERIFY  | Medium intent - Uncertain, needs more information            |
| REJECT  | Low/no intent - Negative indicators, unlikely to proceed     |

### Feature Columns

#### Prosodic Features (extracted from audio using librosa)

| Column                | Type  | Description                                      |
|-----------------------|-------|--------------------------------------------------|
| pitch_mean            | float | Average fundamental frequency (Hz)               |
| pitch_std             | float | Standard deviation of pitch (vocal variability)  |
| energy_mean           | float | Average RMS energy (loudness)                    |
| energy_std            | float | Standard deviation of energy                     |
| speech_rate           | float | Words per second                                 |
| pause_ratio           | float | Ratio of silence to speech (0-1)                 |
| spectral_centroid_mean| float | Average spectral centroid (brightness)           |
| mfcc_1_mean           | float | First MFCC coefficient mean                      |
| mfcc_2_mean           | float | Second MFCC coefficient mean                     |
| mfcc_3_mean           | float | Third MFCC coefficient mean                      |

#### Text Features (from transcription)

| Column              | Type | Description                                      |
|---------------------|------|--------------------------------------------------|
| text_word_count     | int  | Total words in transcription                     |
| positive_word_count | int  | Count of positive sentiment words                |
| negative_word_count | int  | Count of negative sentiment words                |
| question_count      | int  | Number of questions asked                        |
| hesitation_count    | int  | Count of hesitation markers (um, uh, etc.)       |

### Feature Interpretation Guide

**High Intent (PROCEED) indicators:**
- Lower pitch_std (confident, steady voice)
- Higher positive_word_count
- Lower hesitation_count
- Lower pause_ratio
- Higher speech_rate

**Low Intent (REJECT) indicators:**
- Higher pitch_std (vocal stress)
- Higher negative_word_count
- Higher hesitation_count
- Higher pause_ratio
- More questions (uncertainty)

**Uncertain (VERIFY) indicators:**
- Mixed signals between PROCEED and REJECT
- Moderate hesitation
- Balanced positive/negative words

## Adding New Training Data

1. Record calls through the app
2. Extract prosodic features using librosa (see extract_features.py)
3. Transcribe audio and count text features
4. Have an expert label the decision (PROCEED/VERIFY/REJECT)
5. Append row to labeled_call_features.csv
6. Re-run training script to update model

## Minimum Dataset Size

- **Recommended minimum:** 50-100 labeled samples per class
- **Current sample:** 20 rows (for testing only)
- **Production:** 300+ samples for reliable predictions
