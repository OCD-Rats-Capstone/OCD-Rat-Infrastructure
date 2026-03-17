"""
Locust Load Testing Scripts for Performance and Reliability Testing
Implements Test 8, Test 9, and Test 10 using Locust framework
"""

from locust import HttpUser, task, between, events
from locust.exception import RescheduleTask
import json
import random
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OCDRatUser(HttpUser):
    """Base user class for OCD Rat application load testing."""

    wait_time = between(1, 3)  # Random wait between 1-3 seconds

    def on_start(self):
        """Initialize user session."""
        self.user_id = random.randint(1, 1000)
        self.session_cookies = {}

    @task(1)
    def health_check(self):
        """Basic health check endpoint."""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

    @task(3)
    def get_filter_options(self):
        """Get available filter options."""
        with self.client.get("/inventory/filter-options", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Filter options failed: {response.status_code}")

    @task(5)
    def apply_filters(self):
        """Apply various filters to data."""
        filters = [
            # Simple rat ID filter
            [{"id": f"user-{self.user_id}-1", "field": "rat_id", "operator": "equal", "value": str(random.randint(1, 10))}],
            # Complex multi-filter
            [
                {"id": f"user-{self.user_id}-2", "field": "rat_id", "operator": "gte", "value": str(random.randint(1, 5))},
                {"id": f"user-{self.user_id}-3", "field": "session_type_id", "operator": "equal", "value": str(random.randint(1, 3))}
            ],
            # Date range filter
            [{"id": f"user-{self.user_id}-4", "field": "session_date", "operator": "between", "value": ["2023-01-01", "2024-12-31"]}],
        ]

        filter_payload = {"filters": random.choice(filters)}

        with self.client.post("/filters/", json=filter_payload, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 400:
                response.failure(f"Filter validation error: {response.text}")
            else:
                response.failure(f"Filter request failed: {response.status_code}")

    @task(4)
    def nlp_query(self):
        """Perform NLP-based queries."""
        nlp_queries = [
            "Show me all sessions",
            "Find sessions with body weight over 300 grams",
            "Show me sessions from apparatus 1",
            "Find all sessions with drug injections",
            "Show sessions from rat strain Long-Evans",
            "Find sessions with rearing behavior",
            "Show me all training sessions",
            "Find sessions in the open field apparatus",
            "Show sessions with grooming behavior",
            "Find all sessions from female rats",
            f"Show me sessions for rat {random.randint(1, 10)}",
            f"Find sessions from {random.choice(['January', 'February', 'March', 'April', 'May', 'June'])} 2024",
        ]

        query = random.choice(nlp_queries)

        with self.client.get(f"/nlp/?text={query}", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 400:
                response.failure(f"NLP query error: {response.text}")
            else:
                response.failure(f"NLP request failed: {response.status_code}")

class FaultInjectionUser(HttpUser):
    """User class for fault tolerance testing (Test 9)."""

    wait_time = between(0.5, 2)

    @task
    def inject_malformed_data(self):
        """Inject malformed payloads to test error handling."""
        malformed_payloads = [
            # Malformed JSON
            '{"filters": [{"field": "rat_id", "operator": "equal", "value": "1"',  # Missing closing brace
            '{"filters": ["invalid", "array", "format"]}',
            # Invalid filter structures
            '{"filters": [{"field": "", "operator": "equal", "value": "1"}]}',  # Empty field
            '{"filters": [{"field": "rat_id", "operator": "", "value": "1"}]}',  # Empty operator
            '{"filters": [{"field": "rat_id", "operator": "invalid_op", "value": "1"}]}',  # Invalid operator
        ]

        payload = random.choice(malformed_payloads)

        headers = {'Content-Type': 'application/json'}

        with self.client.post("/filters/", data=payload, headers=headers, catch_response=True) as response:
            # We expect 400-level errors for malformed data
            if 400 <= response.status_code < 500:
                response.success()
            elif response.status_code >= 500:
                response.failure(f"Server error on malformed data: {response.status_code}")
            else:
                response.failure(f"Unexpected response to malformed data: {response.status_code}")

    @task
    def inject_invalid_nlp_queries(self):
        """Inject invalid NLP queries."""
        invalid_queries = [
            "",  # Empty query
            "   ",  # Whitespace only
            "a" * 1000,  # Very long query
            "<script>alert('xss')</script>",  # XSS attempt
            "SELECT * FROM users;",  # SQL injection attempt
        ]

        query = random.choice(invalid_queries)

        with self.client.get(f"/nlp/?text={query}", catch_response=True) as response:
            if 400 <= response.status_code < 500:
                response.success()
            elif response.status_code >= 500:
                response.failure(f"Server error on invalid NLP: {response.status_code}")
            else:
                response.failure(f"Unexpected response to invalid NLP: {response.status_code}")

    @task
    def test_invalid_endpoints(self):
        """Test invalid endpoints and methods."""
        invalid_requests = [
            ("GET", "/nonexistent/"),
            ("PUT", "/filters/"),
            ("DELETE", "/nlp/"),
            ("POST", "/invalid-endpoint/"),
        ]

        method, endpoint = random.choice(invalid_requests)

        with self.client.request(method, endpoint, catch_response=True) as response:
            if response.status_code in [404, 405]:
                response.success()
            else:
                response.failure(f"Unexpected response to invalid request: {response.status_code}")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Event handler for test start."""
    logger.info("Starting OCD Rat Performance and Reliability Load Test")
    logger.info(f"Target host: {environment.host}")
    logger.info(f"Number of users: {environment.runner.user_count if hasattr(environment.runner, 'user_count') else 'Unknown'}")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Event handler for test stop."""
    logger.info("OCD Rat Load Test completed")

    # Log summary statistics
    if hasattr(environment.runner, 'stats'):
        stats = environment.runner.stats
        logger.info("=== Test Summary ===")
        logger.info(f"Total requests: {stats.num_requests}")
        logger.info(f"Requests per second: {stats.total_rps:.2f}")
        logger.info(f"Average response time: {stats.avg_response_time:.2f}ms")
        logger.info(f"Median response time: {stats.median_response_time:.2f}ms")
        logger.info(f"95th percentile: {stats.get_percentile(95):.2f}ms")
        logger.info(f"99th percentile: {stats.get_percentile(99):.2f}ms")

        # Check against requirements
        logger.info("=== Requirements Check ===")
        logger.info(f"Average < 100ms: {'PASS' if stats.avg_response_time < 100 else 'FAIL'}")
        logger.info(f"Average < 2s: {'PASS' if stats.avg_response_time < 2000 else 'FAIL'}")

if __name__ == "__main__":
    # This file can be run directly with locust
    # Example: locust -f locust_performance_tests.py --host=http://localhost:8000
    print("OCD Rat Performance and Reliability Load Testing Scripts")
    print("Run with: locust -f locust_performance_tests.py --host=http://localhost:8000")
    print("")
    print("Available user classes:")
    print("- OCDRatUser: Normal user behavior for capacity testing")
    print("- FaultInjectionUser: Fault injection for robustness testing")
    print("")
    print("Example commands:")
    print("locust -f locust_performance_tests.py OCDRatUser --host=http://localhost:8000 --users=250 --spawn-rate=10 --run-time=1h")
    print("locust -f locust_performance_tests.py FaultInjectionUser --host=http://localhost:8000 --users=50 --spawn-rate=5 --run-time=10m")