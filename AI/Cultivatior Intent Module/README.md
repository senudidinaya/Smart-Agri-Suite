1. Installed compatible libraries and used a fixed transformers version.<br/>
2. Loaded audio (Wav2Vec2), text (BERT), and ASR (Whisper) models.<br/>
3. Built a featurizer that combines audio + ASR-text into a 1792-dim feature vector.<br/>
4. Downloaded and extracted MELD data.<br/>
5. Converted .mp4 to .wav.<br/>
6. Generated manifest CSVs mapping audio paths to intent labels.<br/>
7. Built and saved .npz files containing final combined features.<br/>
