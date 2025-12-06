# 🎙️ Cultivator Intent Module — Sinhala-Accented ASR Fine-Tuning

This module implements an end-to-end speech recognition and intent classification pipeline fine-tuned for Sri Lankan English (Sinhala-accented) speakers, built on top of OpenAI's Whisper model.

---

## 📌 Project Highlights

- ✅ **ASR Fine-Tuning**: Fine-tuned `openai/whisper-base` on a Sinhala-accented English dataset for robust regional transcription.
- ✅ **Custom Dataset**: Leveraged a curated voice dataset from Sri Lanka featuring WAV files and aligned transcripts.
- ✅ **Preprocessing**: Cleaned, resampled, and structured data for Hugging Face's `datasets` and `transformers` pipelines.
- ✅ **WER Evaluation**: Tracked performance with Word Error Rate (WER) metrics across train/dev splits.
- ✅ **Model Hub Integration**: Published the fine-tuned model on the Hugging Face Hub for public use.

---

## 🔧 Components

### 1. Data Handling
- Downloaded dataset from Kaggle: [`sri-lankan-accent-voice-data-setenglish`](https://www.kaggle.com/datasets/chamodsr/sri-lankan-accent-voice-data-setenglish)
- Resampled audio (16kHz, mono)
- Structured CSVs for Hugging Face ingestion

### 2. Whisper ASR Fine-Tuning
- Used `openai/whisper-base` as the base model
- Implemented a custom data collator and preprocessing logic
- Applied Hugging Face’s `Seq2SeqTrainer` for supervised learning

### 3. Evaluation
- Reported WER on dev set
- Integrated `jiwer` library for post-processing and scoring

### 4. Model Deployment
- ✅ Uploaded to 🤗 Hugging Face Hub: [Dinaya/whisper-sinhala](https://huggingface.co/Dinaya/whisper-sinhala)
- ✅ Includes model weights, processor, and generation config

---

## 🧠 Example Usage

```python
from transformers import pipeline

asr = pipeline("automatic-speech-recognition", model="Dinaya/whisper-sinhala")
transcription = asr("path/to/audio.wav")["text"]
print(transcription)
