"""
Tests for health check endpoints.
"""

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for the /api/v1/health endpoint."""

    def test_health_check_returns_200(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that health check returns 200 OK."""
        response = test_client.get(f"{api_prefix}/health")
        
        assert response.status_code == 200

    def test_health_check_response_structure(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that health check response has correct structure."""
        response = test_client.get(f"{api_prefix}/health")
        data = response.json()
        
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
        assert "environment" in data
        assert "checks" in data

    def test_health_check_status_is_healthy(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that health status is healthy when model is loaded."""
        response = test_client.get(f"{api_prefix}/health")
        data = response.json()
        
        assert data["status"] in ["healthy", "degraded"]

    def test_health_check_has_correlation_id(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that response includes correlation ID header."""
        response = test_client.get(f"{api_prefix}/health")
        
        assert "X-Correlation-ID" in response.headers

    def test_health_check_respects_provided_correlation_id(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that provided correlation ID is returned."""
        correlation_id = "test-correlation-id-12345"
        response = test_client.get(
            f"{api_prefix}/health",
            headers={"X-Correlation-ID": correlation_id},
        )
        
        assert response.headers["X-Correlation-ID"] == correlation_id


class TestReadyEndpoint:
    """Tests for the /api/v1/ready endpoint."""

    def test_ready_check_returns_200(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that ready check returns 200 OK."""
        response = test_client.get(f"{api_prefix}/ready")
        
        assert response.status_code == 200

    def test_ready_check_response_structure(
        self,
        test_client: TestClient,
        api_prefix: str,
    ) -> None:
        """Test that ready check response has correct structure."""
        response = test_client.get(f"{api_prefix}/ready")
        data = response.json()
        
        assert "ready" in data
        assert "timestamp" in data
        assert isinstance(data["ready"], bool)


class TestRootEndpoint:
    """Tests for the root endpoint."""

    def test_root_returns_200(
        self,
        test_client: TestClient,
    ) -> None:
        """Test that root endpoint returns 200 OK."""
        response = test_client.get("/")
        
        assert response.status_code == 200

    def test_root_response_structure(
        self,
        test_client: TestClient,
    ) -> None:
        """Test that root response has expected info."""
        response = test_client.get("/")
        data = response.json()
        
        assert "name" in data
        assert "version" in data
        assert "docs" in data
        assert "health" in data
