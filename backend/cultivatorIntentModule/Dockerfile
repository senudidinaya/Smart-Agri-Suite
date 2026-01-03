FROM python:3.11-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -U pip \
  && pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart faster-whisper

EXPOSE 8000

CMD ["uvicorn", "app.main_asr:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
