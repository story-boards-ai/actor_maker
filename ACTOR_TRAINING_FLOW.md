# Actor Training Flow Diagram

## Complete Training Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Select Actor                                                 │
│     ┌──────────────────────────────────────┐                    │
│     │  Actor Selector Modal                │                    │
│     │  - Grid view with poster frames      │                    │
│     │  - Search & filter                   │                    │
│     │  - Shows training data count         │                    │
│     └──────────────────────────────────────┘                    │
│                      ↓                                           │
│  2. Configure Parameters                                         │
│     ┌──────────────────────────────────────┐                    │
│     │  Parameters Form                     │                    │
│     │  - Learning rate: 0.0004             │                    │
│     │  - Max steps: 2000                   │                    │
│     │  - Network dim: 8                    │                    │
│     │  - Auto-adjust available             │                    │
│     └──────────────────────────────────────┘                    │
│                      ↓                                           │
│  3. Start Ngrok                                                  │
│     ┌──────────────────────────────────────┐                    │
│     │  Ngrok Panel                         │                    │
│     │  - Start/Stop tunnel                 │                    │
│     │  - Shows public URL                  │                    │
│     └──────────────────────────────────────┘                    │
│                      ↓                                           │
│  4. Start Training                                               │
│     ┌──────────────────────────────────────┐                    │
│     │  Training Request                    │                    │
│     │  - Validates training data           │                    │
│     │  - Builds workflow                   │                    │
│     │  - Sends to RunPod                   │                    │
│     └──────────────────────────────────────┘                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND API                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /api/training/start                                        │
│     ┌──────────────────────────────────────┐                    │
│     │  1. Validate training data           │                    │
│     │  2. Build ComfyUI workflow           │                    │
│     │  3. Prepare training config          │                    │
│     │  4. Send to RunPod serverless        │                    │
│     └──────────────────────────────────────┘                    │
│                      ↓                                           │
│  Training Request Structure:                                     │
│  {                                                               │
│    input: {                                                      │
│      workflow: <ComfyUI workflow JSON>,                         │
│      training_data: {                                            │
│        s3_urls: [                                                │
│          "s3://bucket/actors/0000/training_data/img1.png",      │
│          "s3://bucket/actors/0000/training_data/img2.png",      │
│          ...                                                     │
│        ]                                                         │
│      },                                                          │
│      training_config: {                                          │
│        mode: "custom-actors",                                    │
│        user_id: "actor_maker_user",                             │
│        model_name: "actor_0000_V1",                             │
│        learning_rate: 0.0004,                                    │
│        max_train_steps: 2000                                     │
│      }                                                           │
│    },                                                            │
│    webhook: "https://abc123.ngrok.io/api/training-webhook"     │
│  }                                                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                     RUNPOD SERVERLESS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Job Queued (IN_QUEUE)                                        │
│     - Job ID assigned                                            │
│     - Waiting for GPU                                            │
│                      ↓                                           │
│  2. Job Started (IN_PROGRESS)                                    │
│     ┌──────────────────────────────────────┐                    │
│     │  a. Download training data from S3   │                    │
│     │  b. Initialize ComfyUI workflow      │                    │
│     │  c. Start LoRA training              │                    │
│     │  d. Monitor progress                 │                    │
│     └──────────────────────────────────────┘                    │
│                      ↓                                           │
│  3. Training Complete (COMPLETED)                                │
│     ┌──────────────────────────────────────┐                    │
│     │  a. Upload LoRA model to S3          │                    │
│     │  b. Generate model metadata          │                    │
│     │  c. Send webhook notification        │                    │
│     └──────────────────────────────────────┘                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                     WEBHOOK CALLBACK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /api/training-webhook                                      │
│     ┌──────────────────────────────────────┐                    │
│     │  Webhook Payload:                    │                    │
│     │  {                                    │                    │
│     │    id: "job-123-abc",                │                    │
│     │    status: "COMPLETED",              │                    │
│     │    output: {                         │                    │
│     │      loraUrl: "s3://...",           │                    │
│     │      model_info: {...}              │                    │
│     │    }                                 │                    │
│     │  }                                   │                    │
│     └──────────────────────────────────────┘                    │
│                      ↓                                           │
│  Process Webhook:                                                │
│     1. Parse webhook data                                        │
│     2. Update training version status                            │
│     3. Save LoRA URL                                             │
│     4. Update local state                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                     STATUS MONITORING                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Manual Status Check (Optional)                                  │
│     POST /api/training/status                                    │
│     { jobId: "job-123-abc" }                                    │
│                      ↓                                           │
│  Query RunPod API:                                               │
│     GET https://api.runpod.ai/v2/{endpoint}/status/{jobId}     │
│                      ↓                                           │
│  Return Status:                                                  │
│     - IN_QUEUE / IN_PROGRESS / COMPLETED / FAILED               │
│     - Progress percentage                                        │
│     - LoRA URL (if completed)                                    │
│     - Error message (if failed)                                  │
│                                                                   │
│  Automatic Polling:                                              │
│     - Every 30 seconds while training                            │
│     - Stops when completed/failed                                │
│     - Updates console logs                                       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                     VERSION MANAGEMENT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Training Versions Storage:                                      │
│     data/actor_training_versions/0000.json                      │
│     {                                                            │
│       versions: [                                                │
│         {                                                        │
│           id: "job-123-abc",                                    │
│           name: "V1",                                           │
│           status: "completed",                                   │
│           loraUrl: "s3://...",                                  │
│           parameters: {...},                                     │
│           timestamp: "2025-01-15T10:30:00Z",                   │
│           imageCount: 15,                                        │
│           isGood: false                                          │
│         }                                                        │
│       ]                                                          │
│     }                                                            │
│                      ↓                                           │
│  Mark as Good:                                                   │
│     POST /api/actors/0000/mark-good                             │
│     { versionId: "job-123-abc" }                                │
│                      ↓                                           │
│  Update actors.json:                                             │
│     {                                                            │
│       id: 0,                                                     │
│       name: "0000_european_16_male",                            │
│       validated_lora_model: {                                    │
│         version_id: "job-123-abc",                              │
│         version_name: "V1",                                      │
│         lora_url: "s3://...",                                   │
│         marked_at: "2025-01-15T11:00:00Z"                      │
│       }                                                          │
│     }                                                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

1. **User selects actor** → Loads training data info
2. **User configures parameters** → Auto-adjust or manual
3. **User starts ngrok** → Creates public webhook URL
4. **User starts training** → Sends request to backend
5. **Backend validates** → Checks training data availability
6. **Backend sends to RunPod** → With S3 URLs and webhook
7. **RunPod processes** → Downloads, trains, uploads
8. **Webhook notifies** → Updates status and LoRA URL
9. **User marks as good** → Updates actor registry
10. **Model ready** → Can be used for generation

## Key Components

### Frontend
- **ActorTrainingTab** - Main UI
- **ActorSelectorModal** - Actor selection
- **ParametersForm** - Training configuration
- **ConsolePanel** - Real-time logs
- **VersionsPanel** - Training history

### Backend
- **training-api.ts** - API routes
- **webhook handler** - Process completions
- **status checker** - Poll RunPod

### External
- **RunPod Serverless** - Training execution
- **S3** - Training data storage
- **Ngrok** - Webhook tunneling

## State Management

```
useTrainingState
├── parameters (TrainingParameters)
├── description (string)
├── versions (TrainingVersion[])
├── selectedVersionId (string | null)
├── consoleLogs (ConsoleLog[])
├── currentTraining (CurrentTraining | null)
├── loading (boolean)
└── activeTab ("console" | "versions")

useTrainingOperations
├── validateAndStartTraining()
├── startTraining()
├── checkTrainingStatus()
├── abortTraining()
└── clearLogs()

useDataLoading
├── loadVersions()
└── checkNgrokStatus()
```

## Error Handling

```
Validation Errors
├── No actor selected
├── No training data
├── Training data not synced
└── Ngrok not running

Training Errors
├── RunPod API error
├── Invalid parameters
├── Network timeout
└── GPU capacity exhausted

Status Check Errors
├── Job not found (too old)
├── Job not ready (too new)
├── Network error
└── Invalid job ID

Webhook Errors
├── Parse error
├── Invalid payload
└── Processing error
```
