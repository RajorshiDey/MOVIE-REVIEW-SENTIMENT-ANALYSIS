// Change this to your deployed Render URL when going live
const API_BASE_URL = "https://movie-review-sentiment-analysis-mbe4.onrender.com";

const SAMPLE_REVIEWS = {
  positive:
    "An absolute masterpiece! The direction was razor-sharp, the soundtrack elevated every scene, and the lead actor delivered the performance of a lifetime.",
  negative:
    "A complete waste of two hours. The plot made no sense, the dialogue felt robotic, and even the visual effects couldn't save this boring mess.",
};

const reviewInput = document.getElementById("review-input");
const wordCountEl = document.getElementById("word-count");
const analyzeBtn = document.getElementById("analyze-btn");
const btnText = analyzeBtn.querySelector(".btn-text");
const spinner = analyzeBtn.querySelector(".spinner");
const clearBtn = document.getElementById("clear-btn");
const errorMsg = document.getElementById("error-msg");

const resultCard = document.getElementById("result-card");
const sentimentBadge = document.getElementById("sentiment-badge");
const confidenceValue = document.getElementById("confidence-value");
const posProbText = document.getElementById("pos-prob-text");
const negProbText = document.getElementById("neg-prob-text");
const posBar = document.getElementById("pos-bar");
const negBar = document.getElementById("neg-bar");

const apiStatus = document.getElementById("api-status");
const apiStatusText = document.getElementById("api-status-text");

const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");

let history = JSON.parse(localStorage.getItem("cinesense_history") || "[]");

// Check FastAPI health on load
async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    apiStatus.className = "status-pill status-online";
    apiStatusText.textContent = data.model ? `Online · ${data.model}` : "API Online";
  } catch {
    apiStatus.className = "status-pill status-offline";
    apiStatusText.textContent = "API Offline";
  }
}

function updateWordCount() {
  const words = reviewInput.value.trim().split(/\s+/).filter(Boolean).length;
  wordCountEl.textContent = `${words} ${words === 1 ? "word" : "words"}`;
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  btnText.textContent = isLoading ? "Analyzing..." : "Analyze Sentiment";
  spinner.classList.toggle("hidden", !isLoading);
}

function renderResult(data) {
  const isPositive = data.sentiment.toLowerCase() === "positive";

  sentimentBadge.textContent = data.sentiment;
  sentimentBadge.className = `sentiment-badge ${isPositive ? "positive" : "negative"}`;
  confidenceValue.textContent = `${data.confidence.toFixed(2)}%`;

  posProbText.textContent = `${data.positive_prob.toFixed(2)}%`;
  negProbText.textContent = `${data.negative_prob.toFixed(2)}%`;

  resultCard.classList.remove("hidden");

  // Trigger bar transition on next frame
  requestAnimationFrame(() => {
    posBar.style.width = `${data.positive_prob}%`;
    negBar.style.width = `${data.negative_prob}%`;
  });
}

function renderHistory() {
  if (history.length === 0) {
    historySection.classList.add("hidden");
    return;
  }

  historySection.classList.remove("hidden");
  historyList.innerHTML = "";

  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const textSpan = document.createElement("span");
    textSpan.className = "history-text";
    textSpan.textContent = item.review;

    const tagSpan = document.createElement("span");
    const isPos = item.sentiment.toLowerCase() === "positive";
    tagSpan.className = `history-tag ${isPos ? "positive" : "negative"}`;
    tagSpan.textContent = `${item.sentiment} (${item.confidence.toFixed(1)}%)`;

    li.append(textSpan, tagSpan);
    historyList.appendChild(li);
  });
}

async function analyzeReview() {
  hideError();
  const review = reviewInput.value.trim();

  if (!review) {
    showError("Please enter a movie review before analyzing.");
    reviewInput.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to analyze sentiment.");
    }

    renderResult(data);

    history.unshift({
      review,
      sentiment: data.sentiment,
      confidence: data.confidence,
    });
    history = history.slice(0, 6);
    localStorage.setItem("cinesense_history", JSON.stringify(history));
    renderHistory();
  } catch (err) {
    showError(
      err.message === "Failed to fetch"
        ? "Could not reach the API. Make sure your FastAPI server is running."
        : err.message
    );
  } finally {
    setLoading(false);
  }
}

// Event Listeners
reviewInput.addEventListener("input", updateWordCount);

reviewInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    analyzeReview();
  }
});

analyzeBtn.addEventListener("click", analyzeReview);

clearBtn.addEventListener("click", () => {
  reviewInput.value = "";
  updateWordCount();
  hideError();
  resultCard.classList.add("hidden");
  posBar.style.width = "0%";
  negBar.style.width = "0%";
  reviewInput.focus();
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const type = chip.dataset.sample;
    reviewInput.value = SAMPLE_REVIEWS[type];
    updateWordCount();
    hideError();
  });
});

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  localStorage.removeItem("cinesense_history");
  renderHistory();
});

// Initialize
checkApiHealth();
renderHistory();