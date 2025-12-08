# Sniffer - API Monitoring Dashboard

Sniffer is a real-time API traffic monitoring dashboard that provides insights into your proxy server traffic. It allows you to inspect packets, view statistics, and replay requests.

## Features

- Real-time monitoring of API requests
- Detailed packet inspection (headers, body, etc.)
- AI-powered analysis of requests
- Request replay functionality
- Statistics dashboard with real-time updates
- Light and dark mode support

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/ASAYMAN69/sniffer.git
cd sniffer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root of the project and add the following environment variables:

```
# The host of the target server to proxy requests to
TARGET_HOST=localhost

# The port of the target server
TARGET_PORT=3000

# Your Gemini API key for AI-powered analysis
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the application

```bash
npm start
```

The application will be available at `http://localhost:8080`.
