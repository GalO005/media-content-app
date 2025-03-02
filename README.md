# Media Content App

A full-stack application for managing and displaying media content with search capabilities powered by Elasticsearch.

## Overview

The Media Content App is a web application that allows users to browse, search, and view media content from a collection. It features a React-based frontend for displaying media items in a responsive grid layout and a Node.js backend that interfaces with Elasticsearch for powerful search capabilities.

## Features

- **Media Grid**: Responsive display of media items in a card-based layout
- **Search Functionality**: Search media by keywords, photographers, and other metadata
- **Filtering**: Filter media by type (e.g., sports, stock images)
- **Pagination**: Browse through large collections with efficient pagination
- **Point-in-Time (PIT) Search**: Consistent search results even as the underlying data changes
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Frontend

- **React**: UI library for building the user interface
- **TypeScript**: Type-safe JavaScript
- **Shadcn/UI**: Component library for consistent design
- **Vite**: Fast build tool and development server

### Backend

- **Node.js**: JavaScript runtime for the server
- **Express**: Web framework for handling HTTP requests
- **TypeScript**: Type-safe JavaScript
- **Elasticsearch**: Search engine for storing and querying media data

### Testing

- **Vitest**: Testing framework for unit and integration tests
- **Supertest**: HTTP assertions for API testing

### DevOps

- **Docker**: Containerization for consistent development and deployment
- **Docker Compose**: Multi-container Docker applications

## Project Structure

```
media-content-app/
├── client/                 # Frontend React application
│   ├── public/             # Static assets
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── App.tsx         # Main application component
│   ├── Dockerfile.react    # Docker configuration for frontend
│   └── package.json        # Frontend dependencies
├── server/                 # Backend Node.js application
│   ├── src/                # Source code
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── index.ts        # Entry point
│   ├── tests/              # Test files
│   │   ├── unit/           # Unit tests
│   │   ├── integration/    # Integration tests
│   │   └── setup.ts        # Test setup
│   ├── Dockerfile.node     # Docker configuration for backend
│   └── package.json        # Backend dependencies
├── docker-compose.yaml     # Docker Compose configuration
└── README.md               # Project documentation
```

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (v8 or later)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- Access to an Elasticsearch server (v7.x or later)

## Getting Started

### Setting Up the Environment

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/media-content-app.git
   cd media-content-app
   ```

2. Set the Elasticsearch URL environment variable:

   ```bash
   export ELASTICSEARCH_URL=http://your-elasticsearch-server:9200
   ```

3. Start the application using Docker Compose:

   ```bash
   docker compose up -d
   ```

4. The application will be available at:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### Manual Setup (Without Docker)

#### Backend Setup

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. The API will be available at http://localhost:3000

#### Frontend Setup

1. Navigate to the client directory:

   ```bash
   cd client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. The frontend will be available at http://localhost:5173

## API Endpoints

The backend provides the following API endpoints:

### Media Endpoints

- `GET /api/v1/media/search`: Search for media items

  - Query parameters:
    - `keyword`: Search term
    - `type`: Media type (st, sp)
    - `page`: Page number
    - `limit`: Items per page
  - Headers:
    - `x-pit-id`: Point-in-time ID for consistent pagination
    - `x-search-after`: Search-after value for pagination

- `POST /api/v1/media/pit`: Create a new point-in-time (PIT) search

  - Response: PIT ID for use in subsequent search requests

- `DELETE /api/v1/media/pit/:id`: Delete a point-in-time search
  - Path parameter: PIT ID to delete

### Health Check

- `GET /api/v1/health`: Check the health of the API and Elasticsearch connection

## Testing

The application includes comprehensive tests for both the backend and frontend.

### Running Backend Tests

#### Unit Tests with Mocks

To run unit tests with mocked dependencies:

```bash
cd server
npm test
```

This will run all tests using mocked services, which is fast and doesn't require any external dependencies.

#### Integration Tests with External Services

To run tests with real external services:

```bash
cd server
export ELASTICSEARCH_URL=http://your-elasticsearch-server:9200
npm run test:integration
```

This will run the tests using the real external Elasticsearch service.

#### Integration Tests with Docker

If you're running the application in Docker, you can run tests inside the Docker container:

```bash
# First, start the Docker environment if not already running
export ELASTICSEARCH_URL=http://your-elasticsearch-server:9200
docker compose up -d

# Then run the tests inside the Docker container
npm run test:docker
```

### Running Frontend Tests

To run frontend tests:

```bash
cd client
npm test
```

## Deployment

### Docker Deployment

The application is containerized and can be deployed using Docker Compose:

```bash
# Set the Elasticsearch URL environment variable
export ELASTICSEARCH_URL=http://your-elasticsearch-server:9200

# Build and start the containers
docker compose up -d --build
```

### Manual Deployment

#### Backend

1. Build the TypeScript code:

   ```bash
   cd server
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

#### Frontend

1. Build the React application:

   ```bash
   cd client
   npm run build
   ```

2. Serve the built files using a static file server like Nginx or serve.

## Configuration

### Backend Configuration

The backend configuration is stored in the following files:

- `server/src/config/elasticsearch.config.ts`: Elasticsearch connection settings
- `server/src/config/test.config.ts`: Test-specific configuration

### Frontend Configuration

The frontend configuration is stored in the following files:

- `client/src/config.ts`: API URL and other frontend settings

## Assumptions and Design Decisions

### Elasticsearch

- The application assumes access to an external Elasticsearch server.
- The Elasticsearch index should have fields like `bildnummer`, `datum`, `suchtext`, `fotografen`, `hoehe`, `breite`, and `db`.
- Point-in-Time (PIT) search is used to ensure consistent pagination results.

### Media Data Structure

The application expects media items to have the following structure:

```typescript
interface MediaItem {
  bildnummer: string; // Image number
  datum: string; // Date in ISO format
  suchtext: string; // Description or caption
  fotografen: string; // Photographer
  hoehe: string; // Height
  breite: string; // Width
  db: string; // Database or source name (st, sp)
  description?: string; // Optional description
}
```

## Troubleshooting

### Elasticsearch Connection Issues

If you're having trouble connecting to your Elasticsearch server, check the following:

1. **Verify the URL**: Make sure the URL is correct and includes the protocol, host, and port.
2. **Check Network Access**: Ensure your machine can access the Elasticsearch server.
3. **Firewall Settings**: Check if there's a firewall blocking the connection.
4. **Authentication**: If your Elasticsearch server requires authentication, update the configuration.

### Docker Issues

If you encounter issues with Docker:

1. **Check Docker Logs**:

   ```bash
   docker compose logs
   ```

2. **Restart Containers**:

   ```bash
   docker compose down
   docker compose up -d
   ```

3. **Check Container Status**:
   ```bash
   docker compose ps
   ```
