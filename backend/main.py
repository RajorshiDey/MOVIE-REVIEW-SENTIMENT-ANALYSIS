import re
from pathlib import Path
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Movie Review Sentiment API")

# Allow requests from your local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load artifacts once at startup
BASE_DIR = Path(__file__).resolve().parent
vectorizer = joblib.load(BASE_DIR / "models" / "tfidf_vectorizer.joblib")
model = joblib.load(BASE_DIR / "models" / "sentiment_model.joblib")


def clean_text(text: str) -> str:
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    return re.sub(r"\s+", " ", text).lower().strip()


class ReviewRequest(BaseModel):
    review: str


class PredictionResponse(BaseModel):
    sentiment: str
    confidence: float
    positive_prob: float
    negative_prob: float


@app.get("/")
def health_check():
    return {"status": "ok", "model": "TF-IDF + Logistic Regression"}


@app.post("/predict", response_model=PredictionResponse)
def predict_sentiment(payload: ReviewRequest):
    text = payload.review.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Review text cannot be empty.")

    cleaned = clean_text(text)
    vec = vectorizer.transform([cleaned])
    probs = model.predict_proba(vec)[0]  # [neg_prob, pos_prob]
    pred = int(probs[1] >= 0.5)

    return PredictionResponse(
        sentiment="Positive" if pred == 1 else "Negative",
        confidence=round(float(probs[pred]) * 100, 2),
        positive_prob=round(float(probs[1]) * 100, 2),
        negative_prob=round(float(probs[0]) * 100, 2),
    )