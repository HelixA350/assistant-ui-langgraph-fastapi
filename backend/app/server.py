import os
import mimetypes
from pathlib import Path
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from .langgraph.agent import assistant_ui_graph
from .add_langgraph_route import add_langgraph_route

load_dotenv()

DOCUMENTS_VOLUME = os.getenv("DOCUMENTS_VOLUME", "/data/documents")

mimetypes.init()
mimetypes.add_type("application/pdf", ".pdf")
mimetypes.add_type(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"
)
mimetypes.add_type(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"
)

app = FastAPI(title="ITR-GPT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/documents/{path:path}")
async def serve_document(path: str):
    safe_path = Path(DOCUMENTS_VOLUME) / path
    safe_path = safe_path.resolve()

    volume_path = Path(DOCUMENTS_VOLUME).resolve()
    if not str(safe_path).startswith(str(volume_path)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not safe_path.exists() or not safe_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    media_type, _ = mimetypes.guess_type(str(safe_path))
    if media_type is None:
        media_type = "application/octet-stream"

    return FileResponse(str(safe_path), media_type=media_type)


add_langgraph_route(app, assistant_ui_graph, "/api/chat")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
