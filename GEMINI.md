## Project Overview

This project, `gonsai2`, is an AI-optimized system designed for n8n workflow automation, leveraging a MongoDB database. It is built on Node.js and TypeScript, following Kent Beck's Augmented Coding Principles to facilitate effective collaboration between human developers and AI. The architecture is modular, with a clear separation of concerns between the backend application, feature modules, and infrastructure.

The core of the project is the AI agent orchestration, which manages and executes n8n workflows containing AI-powered nodes. The system is designed to be scalable and resilient, with a queue-based architecture for handling workflow executions and a strong emphasis on testing and monitoring.

-- Answers are always in Korean

## Building and Running

### Prerequisites

- Node.js (>=18.0.0)
- Docker
- n8n, MongoDB, and Redis services running in Docker containers.

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Environment Setup

1.  Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
2.  Fill in the required environment variables in the `.env` file, such as `N8N_BASE_URL`, `N8N_API_KEY`, and `MONGODB_URI`.

### Database Initialization

Initialize the MongoDB database with the required schemas and indexes:

```bash
npm run init:mongodb
```

### Running the Application

- **Development Mode:**

  ```bash
  npm run server:dev
  ```

  This will start the backend server with `nodemon`, which will automatically restart the server on file changes.

- **Production Mode:**
  ```bash
  npm run server
  ```

### Testing

The project has a comprehensive test suite, including unit, integration, and end-to-end tests.

- **Run all tests:**

  ```bash
  npm test
  ```

- **Run integration tests for specific features:**
  - `npm run test:connection`: Test the connection to the n8n API.
  - `npm run test:workflow`: Test the execution of an n8n workflow.
  - `npm run test:websocket`: Test the WebSocket connection.
  - `npm run test:agent`: Test the AI agent manager.
  - `npm run test:mongodb`: Test the connection to the MongoDB database.

## Development Conventions

### Coding Style

The project uses ESLint and Prettier to enforce a consistent coding style. Before committing any changes, make sure to run the linter and formatter:

- **Lint:**

  ```bash
  npm run lint
  ```

- **Format:**
  ```bash
  npm run format
  ```

### Branching Strategy

The project follows a GitFlow-like branching strategy:

- `main`: Production branch (protected).
- `develop`: Development integration branch.
- `feature/*`: For new feature development.
- `fix/*`: For bug fixes.
- `docs/*`: For documentation updates.

### Commit Convention

The project uses the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This helps to maintain a clear and descriptive commit history. Examples:

- `feat: add new AI agent`
- `fix: resolve issue with workflow execution`
- `docs: update README with new instructions`
- `refactor: improve performance of agent manager`
- `test: add unit tests for n8n client`
