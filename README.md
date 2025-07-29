# Azure Functions Backend for Unity Game

A serverless backend using Azure Functions and Table Storage, integrated with PlayFab authentication. Designed for Unity game clients.

## 📦 Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local#v2)
- [Docker](https://www.docker.com/) (for Azurite emulator)
- [PlayFab Account](https://developer.playfab.com/)

## 🛠️ Setup

### 1. Clone and Install
```bash
git clone https://github.com/sindhusingh/samplegameapiwithfunctionandtablestorageazure.git
cd samplegameapiwithfunctionandtablestorageazure
npm install
```

### 2. Configure Environment - Create local.settings.json:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

### 3. Start Azurite (Table Storage Emulator)

```bash
docker run -p 10002:10002 mcr.microsoft.com/azure-storage/azurite
```

### 4. 🚀 Running Locally

```bash
npm start
```

Runs:
1. TypeScript compiler (build)
2. Functions host (func start)

### 5. 🌐 API Endpoints
#### Create Player

```bash 
curl -X POST http://localhost:7071/api/createPlayer \
  -H "Content-Type: application/json" \
  -H "x-session-ticket: test_session_ticket_123" \
  -d '{
    "playFabId": "player_XX",
    "name": "Sindhu",
    "level": 5,
    "email": "sindhu@example.com"
  }'
```

### 6. Get Player

```bash
curl -X GET "http://localhost:7071/api/players/player_123456" \ 
  -H "x-session-ticket: test_session_ticket_123" \
  -H "Accept: application/json"
```



curl -X POST http://localhost:7071/api/players \
  -H "Content-Type: application/json" \
  -H "x-session-ticket: test_session_ticket_123" \
  -d '{"playFabId":"player1","name":"Sindhu First"}'



### 7. Update Player

```bash
curl -X PATCH http://localhost:7071/api/players/player_123456 \
  -H "Content-Type: application/json" \
  -H "x-session-ticket: test_session_ticket_123" \
  -d '{"level": 6, "name": "Sindhu Updated"}'
```

### 8. 🏗️ Project Structure

```text
/src
├── functions/
│   ├── createPlayer/       # POST /api/createPlayer
│   ├── getPlayer/          # GET /api/players/{id}
│   └── updatePlayer/       # PATCH /api/players/{id}
├── shared/
│   └── tableClient.ts      # Azure Table Storage helper
/dist                       # Auto-generated JS files
```

### 9. 🔧 Key Configurations

```text
1. Table Storage: Uses playFabId as both PartitionKey and RowKey
2. PlayFab Integration: Validates x-session-ticket header
3. Local Dev: Azurite emulator on port 10002
```

### 10. 🚀 Deployment

```bash 
az login
func azure functionapp publish your-function-app-name
```