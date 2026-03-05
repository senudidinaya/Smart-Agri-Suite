"""
Tests for prediction endpoints.
"""

import io

import pytest
from fastapi.testclient import TestClient


class TestPredictUploadEndpoint:
    """Tests for the /api/v1/predict/upload endpoint."""

    def test_predict_upload_returns_200(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_bytes: bytes,
    ) -> None:
        """Test that predict upload returns 200 OK with valid audio."""
        response = test_client.post(
            f"{api_prefix}/predict/upload",
            files={"audio_file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")},
        )
        
        assert response.status_code == 200

    def test_predict_upload_response_structure(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_bytes: bytes,
    ) -> None:
        """Test that predict upload response has correct structure."""
        response = test_client.post(
            f"{api_prefix}/predict/upload",
            files={"audio_file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")},
        )
        data = response.json()
        
        assert data["success"] is True
        assert "prediction" in data
        assert "processing_time_ms" in data
        assert "correlation_id" in data
        
        prediction = data["prediction"]
        assert "predicted_intent" in prediction
        assert "confidence" in prediction
        assert "all_scores" in prediction

    def test_predict_upload_confidence_range(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_bytes: bytes,
    ) -> None:
        """Test that confidence is within valid range [0, 1]."""
        response = test_client.post(
            f"{api_prefix}/predict/upload",
            files={"audio_file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")},
        )
        data = response.json()
        
        confidence = data["prediction"]["confidence"]
        assert 0.0 <= confidence <= 1.0

    def test_predict_upload_all_scores_sum_to_one(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_bytes: bytes,
    ) -> None:
        """Test that all intent scores sum to approximately 1.0."""
        response = test_client.post(
            f"{api_prefix}/predict/upload",
            files={"audio_file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")},
        )
        data = response.json()
        
        all_scores = data["prediction"]["all_scores"]
        total = sum(score["score"] for score in all_scores)
        assert abs(total - 1.0) < 0.01  # Allow small floating point error

    def test_predict_upload_unsupported_format(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that unsupported audio format returns 400."""
        response = test_client.post(
            f"{api_prefix}/predict/upload",
            files={"audio_file": ("test.xyz", io.BytesIO(b"fake audio"), "audio/xyz")},
        )
        
        assert response.status_code == 400

    def test_predict_upload_no_file(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that missing file returns 422."""
        response = test_client.post(f"{api_prefix}/predict/upload")
        
        assert response.status_code == 422

    def test_predict_upload_has_process_time_header(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_bytes: bytes,
    ) -> None:
        """Test that response includes process time header."""
        response = test_client.post(
            f"{api_prefix}/predict/upload",
            files={"audio_file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")},
        )
        
        assert "X-Process-Time-Ms" in response.headers


class TestPredictBase64Endpoint:
    """Tests for the /api/v1/predict/base64 endpoint."""

    def test_predict_base64_returns_200(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_base64: str,
    ) -> None:
        """Test that predict base64 returns 200 OK with valid audio."""
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={
                "audio_base64": sample_audio_base64,
                "audio_format": "wav",
            },
        )
        
        assert response.status_code == 200

    def test_predict_base64_response_structure(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_base64: str,
    ) -> None:
        """Test that predict base64 response has correct structure."""
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={
                "audio_base64": sample_audio_base64,
                "audio_format": "wav",
            },
        )
        data = response.json()
        
        assert data["success"] is True
        assert "prediction" in data
        assert "processing_time_ms" in data
        
        prediction = data["prediction"]
        assert "predicted_intent" in prediction
        assert "confidence" in prediction
        assert "all_scores" in prediction

    def test_predict_base64_invalid_base64(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that invalid base64 returns 400."""
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={
                "audio_base64": "not-valid-base64!!!",
                "audio_format": "wav",
            },
        )
        
        assert response.status_code == 400

    def test_predict_base64_unsupported_format(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_base64: str,
    ) -> None:
        """Test that unsupported audio format returns 400."""
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={
                "audio_base64": sample_audio_base64,
                "audio_format": "xyz",
            },
        )
        
        assert response.status_code == 400

    def test_predict_base64_missing_audio(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that missing audio_base64 returns 422."""
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={"audio_format": "wav"},
        )
        
        assert response.status_code == 422

    def test_predict_base64_empty_audio(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that empty audio_base64 returns 422."""
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={
                "audio_base64": "",
                "audio_format": "wav",
            },
        )
        
        assert response.status_code == 422

    def test_predict_base64_with_sample_rate(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_base64: str,
    ) -> None:
        """Test that sample_rate parameter is accepted."""
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={
                "audio_base64": sample_audio_base64,
                "audio_format": "wav",
                "sample_rate": 16000,
            },
        )
        
        assert response.status_code == 200

    def test_predict_base64_handles_data_uri(
        self,
        test_client: TestClient,
        api_prefix: str,
        sample_audio_base64: str,
    ) -> None:
        """Test that data URI format is handled."""
        data_uri = f"data:audio/wav;base64,{sample_audio_base64}"
        response = test_client.post(
            f"{api_prefix}/predict/base64",
            json={
                "audio_base64": data_uri,
                "audio_format": "wav",
            },
        )
        
        assert response.status_code == 200
