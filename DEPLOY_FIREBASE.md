# Deploy on Firebase (Hosting + Cloud Run)

The app is one container (FastAPI serves the built React app). Cloud Run runs it, Firebase Hosting puts a `*.web.app` address in front.

1. Create a Firebase project and upgrade it to the Blaze plan (Cloud Run needs billing).
2. `gcloud run deploy ai-business-operator --source . --region asia-south1 --allow-unauthenticated --no-cpu-throttling --cpu 1 --memory 1Gi --min-instances 0 --max-instances 1 --set-env-vars "NEBIUS_API_KEY=...,TAVILY_API_KEY=...,SECRET_KEY=..."`
3. `firebase deploy --only hosting`

Notes: `--no-cpu-throttling` keeps missions running in the background. `--max-instances 1` because the SQLite database lives inside the instance and is reset when the instance is replaced (the demo workspace re-seeds on login).
