from fastapi import FastAPI

app = FastAPI(title="Task Tracker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
