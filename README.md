# Sniffer - API Monitoring Dashboard

Sniffer is a real-time API traffic monitoring dashboard that provides insights into your proxy server traffic. It allows you to inspect packets, view statistics, and replay requests.

## Features

- Real-time monitoring of API requests
- Detailed packet inspection (headers, body, etc.)
- AI-powered analysis of requests: Gain insights into security, performance, and general behavior of individual requests with actionable recommendations.

## Usage

### Inspecting Requests

1.  **View Requests**: As traffic flows through the proxy, requests will appear in the "Recent Requests" table.
2.  **Select a Request**: Click on any row in the "Recent Requests" table to view its detailed headers, body, and metadata in the "Details" panel on the right.

### AI Packet Analysis

1.  **Select a Request**: Ensure you have selected a request from the "Recent Requests" table to view its details.
2.  **Initiate AI Analysis**: In the "Details" panel header, click the <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle;"><path d="M12 0L14.5 8.5L24 12L14.5 15.5L12 24L9.5 15.5L0 12L9.5 8.5L12 0Z" fill="currentColor"/></svg> button (AI Analyze).
3.  **View Results**: A modal will appear, displaying a loading animation followed by detailed analysis across four categories:
    *   **Security**: Identifies potential vulnerabilities or suspicious patterns.
    *   **Performance**: Highlights latency issues, large payloads, or inefficient caching.
    *   **Insights**: Provides general observations about the request's behavior.
    *   **Recommendations**: Offers actionable steps to improve security or performance.

### Replaying Requests

1.  **Select a Request**: Choose a request from the table.
2.  **Open Replay Modal**: In the "Details" panel header, click the <i class="fas fa-redo" style="display: inline-block; vertical-align: middle;"></i> button (Replay).
3.  **Modify and Send**: The replay modal will pre-fill with the selected request's details. You can modify the method, URL, headers, or body. Click "Replay" to send the modified request. The replayed request will appear in the "Recent Requests" table, marked with a distinctive style.

### Clearing Requests

1.  **Clear All**: To remove all displayed requests, click the "Clear All" button in the header. A confirmation dialog will appear.

### Viewing Statistics

1.  **Open Statistics Modal**: Click the "Statistics" button in the header.
2.  **Analyze Traffic**: The modal displays various charts and metrics, including total requests, top methods, success rates, and response time distribution.
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
