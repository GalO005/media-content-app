# Testing Guide

This guide explains how to run tests for the Media Content App server.

## Test Types

The application has two types of tests:

1. **Unit Tests**: Test individual components in isolation with mocked dependencies.
2. **Integration Tests**: Test components working together with real or mocked services.

## Running Tests

### Unit Tests with Mocks

To run unit tests with mocked dependencies:

```bash
npm test
```

This will run all tests using mocked services, which is fast and doesn't require any external dependencies.

### Integration Tests with External Services

To run tests with real external services:

```bash
# Set the URL to your Elasticsearch server
export ELASTICSEARCH_URL=http://your-elasticsearch-server:9200

# Run the integration tests
npm run test:integration
```

This will run the tests using the real external Elasticsearch service.

### Integration Tests with Docker

If you're running the application in Docker, you can run tests inside the Docker container:

```bash
# First, start the Docker environment if not already running
# Make sure to set the ELASTICSEARCH_URL environment variable to point to your Elasticsearch server
export ELASTICSEARCH_URL=http://your-elasticsearch-server:9200
docker compose up -d

# Then run the tests inside the Docker container
npm run test:docker
```

This command:

1. Checks if the external Elasticsearch service is available
2. Runs the tests against the real service

## Test Configuration

The test configuration is defined in `src/config/test.config.ts`. You can modify this file to change:

- Whether to use real services or mocks
- Elasticsearch connection settings
- Test data

## Docker Environment

The project uses Docker Compose to set up the development environment:

- **Main Docker Compose file**: `docker-compose.yaml` in the root directory
- **Server Dockerfile**: `server/Dockerfile.node`
- **Client Dockerfile**: `client/Dockerfile.react`

The Docker environment includes:

- Node.js server running on port 3000
- React client running on port 5173
- A bridge network for communication between services

To start the Docker environment:

```bash
# Set the URL to your Elasticsearch server
export ELASTICSEARCH_URL=http://your-elasticsearch-server:9200

# Start the Docker environment
docker compose up -d
```

To stop the Docker environment:

```bash
docker compose down
```

## Troubleshooting

### Elasticsearch Connection Issues

If you're having trouble connecting to your Elasticsearch server, check the following:

1. **Verify the URL**: Make sure the URL is correct and includes the protocol, host, and port.
2. **Check Network Access**: Ensure your machine can access the Elasticsearch server. Try using `curl` to test the connection:
   ```bash
   curl -X GET http://your-elasticsearch-server:9200/_cluster/health
   ```
3. **Firewall Settings**: Check if there's a firewall blocking the connection.
4. **Authentication**: If your Elasticsearch server requires authentication, update the `elasticsearchTestConfig` in `src/config/test.config.ts` to include credentials:
   ```typescript
   export const elasticsearchTestConfig = {
     node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
     auth: {
       username: process.env.ELASTICSEARCH_USERNAME || "elastic",
       password: process.env.ELASTICSEARCH_PASSWORD || "changeme",
     },
     // ... other settings
   };
   ```
5. **SSL/TLS**: If your Elasticsearch server uses HTTPS, make sure to update the configuration accordingly and set `rejectUnauthorized` to `false` if using a self-signed certificate.

### Checking Elasticsearch Connection

You can check if your application can connect to Elasticsearch using:

```bash
npm run check:elasticsearch
```

This will attempt to connect to the Elasticsearch server and report any issues.

## Debugging Tests

To debug tests, you can use the watch mode:

```bash
npm run test:watch
```

Or use the UI mode for a visual interface:

```bash
npm run test:ui
```

## Writing Tests

### Unit Tests

Unit tests should be placed in the `tests/unit` directory and should test individual components in isolation.

Example:

```typescript
import { describe, it, expect, vi } from "vitest";
import { MyService } from "../../src/services/my.service";

describe("MyService", () => {
  it("should do something", () => {
    // Arrange
    const service = new MyService();

    // Act
    const result = service.doSomething();

    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Integration Tests

Integration tests should be placed in the `tests/integration` directory and should test components working together.

Example:

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("API", () => {
  it("should return data from the API", async () => {
    const response = await request(app).get("/api/data");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("items");
  });
});
```
