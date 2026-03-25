# Mental Health Signal Detector

An advanced machine learning system for detecting mental health signals in text using multiple state-of-the-art models. Supports **multiple languages** with automatic translation via Google Translate, and provides both an RESTful API and interactive Streamlit dashboard.

**Artefact School of Data - Group Project**

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Usage](#-usage)
  - [API](#api)
  - [Dashboard](#dashboard)
- [Models](#-models)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Docker Deployment](#-docker-deployment)
- [Contributing](#-contributing)

---

## 🎯 Features

### Core Capabilities
- **Multilingual Support**: Automatically detects language and translates non-English text to English before analysis
- **Multiple ML Models**: Choose from 4 different models for predictions:
  - **Logistic Regression** (LR): Fast, interpretable baseline
  - **XGBoost**: Balanced accuracy and speed
  - **DistilBERT**: Advanced NLP model (smaller than BERT)
  - **RoBERTa Base**: State-of-the-art transformer model
- **Language Detection**: Real-time detection of input language using `langdetect`
- **Translation Tracking**: Transparent metadata about which texts were translated
- **Local Model Support**: Use pre-trained models from local directories for DistilBERT and RoBERTa

### API Endpoints
- `GET /health` - Health check
- `POST /predict` - Mental health signal prediction
- `GET /diagnostics/roberta` - RoBERTa backend diagnostics (local files or pickle)
- `GET /diagnostics/distilbert` - DistilBERT backend diagnostics

### User Interface
- Interactive **Streamlit Dashboard** with real-time translation alerts
- Model selection radio buttons
- Probability visualization with confidence metrics
- Translation notice pop-ups

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- pip or Poetry
- 2GB+ RAM (for transformer models)

### Installation & Setup

```bash
# Clone repository
git clone <https://github.com/stanislav-grinchenko/mental-health-signal-detector/tree/aimenl>
cd mental-health-signal-detector

# Install dependencies
pip install -r requirements.txt

# Download NLTK data (one-time setup)
python -m nltk.downloader stopwords averaged_perceptron_tagger wordnet
```

### Run Locally

**Option 1: API Only**
```bash
uvicorn src.api.main:app --reload --port 8000
```

**Option 2: Dashboard Only**
```bash
streamlit run src/dashboard/app.py
```

**Option 3: Both Services (Docker)**
```bash
docker-compose -f docker/docker-compose.yml up --build
```

---

## 📦 Installation

### From requirements.txt

```bash
pip install -r requirements.txt
```

### From pyproject.toml (Poetry)

```bash
poetry install
```

### Key Dependencies

- **ML/NLP**: `scikit-learn`, `transformers`, `torch`, `xgboost`
- **API**: `fastapi`, `uvicorn`
- **Dashboard**: `streamlit`
- **Data**: `pandas`, `datasets`
- **Translation**: `langdetect`, `deep-translator`
- **Testing**: `pytest`

---

## 🛠️ Usage

### API

#### Health Check
```bash
curl http://localhost:8000/health
# {"status": "healthy"}
```

#### Make Predictions

```python
import requests

response = requests.post("http://localhost:8000/predict", json={
    "text": "Je me sens vraiment triste aujourd'hui",  # French text
    "model_type": "distilbert"
})

print(response.json())
```

**Response Example:**
```json
{
  "label": 1,
  "probability": 0.87,
  "source_language": "fr",
  "analysis_language": "en",
  "was_translated": true,
  "translated_text": "I feel really sad today"
}
```

**Model Types:**
- `"lr"` - Logistic Regression (default)
- `"xgboost"` - XGBoost
- `"distilbert"` - DistilBERT
- `"roberta"` - RoBERTa Base

#### Check RoBERTa Backend

```bash
curl http://localhost:8000/diagnostics/roberta?load_model=true
```

Response shows whether local files or pickle are being used, along with file status.

#### Check DistilBERT Backend

```bash
curl http://localhost:8000/diagnostics/distilbert?load_model=true
```

### Dashboard

Access at `http://localhost:8501` and:
1. Select a model from the sidebar
2. Enter text (any language)
3. Click "Analyze Text"
4. View prediction results
5. See translation notice if text was translated

---

## 🧠 Models

### Model Details

| Model | Backend | Latency | Accuracy | Notes |
|-------|---------|---------|----------|-------|
| Logistic Regression | TF-IDF + sklearn | ~10ms | ~85% | Fast baseline |
| XGBoost | TF-IDF + XGBoost | ~50ms | ~87% | Balanced |
| DistilBERT | Transformers (6 layers) | ~500ms | ~90% | Smaller BERT |
| RoBERTa | Transformers (12 layers) | ~800ms | ~92% | Advanced, slower |

### Model Loading Strategy

Both **DistilBERT** and **RoBERTa** use intelligent fallback:
1. Try to load from local `models/{model}_base_files/` directory (preferred)
2. If local files found: use native Hugging Face loading (fast, preserves architecture)
3. If local files unavailable: fall back to pickled model `models/{model}_model.pkl`
4. If neither available: raise error with helpful message

This ensures compatibility across environments while preferring the cleaner local format.

---

## 🏗️ Architecture

```
mental-health-signal-detector/
├── src/
│   ├── api/                    # FastAPI REST service
│   │   ├── main.py             # Endpoints
│   │   ├── services.py         # Core prediction logic + translation
│   │   └── schemas.py          # Request/response models
│   ├── dashboard/              # Streamlit UI
│   │   └── app.py              # Interactive interface
│   ├── training/               # Model training & inference
│   │   ├── train.py            # AR training pipeline
│   │   ├── train_xgboost.py    # XGBoost training
│   │   ├── predict.py          # Prediction functions
│   │   └── preprocess.py       # Text preprocessing
│   ├── data_cleaning/          # Data cleaning pipeline
│   ├── common/                 # Shared utilities
│   │   ├── config.py           # Configuration paths
│   │   └── logging.py          # Logging setup
│   └── __init__.py
├── models/                     # Pre-trained model artifacts
│   ├── depression_classifier.pkl
│   ├── distilbert_model.pkl
│   ├── distilbert_base_files/  # Local HuggingFace format (newer)
│   ├── mental_roberta_base.pkl
│   ├── mental_roberta_base_files/  # Local HuggingFace format (newer)
│   └── tfidf_vectorizer.pkl
├── data/
│   ├── raw/                    # Raw datasets
│   └── reddit_depression_dataset_cleaned_v1.csv
├── tests/                      # Comprehensive test suite
│   ├── api/
│   ├── dashboard/
│   ├── training/
│   └── data_cleaning/
├── docker/                     # Container configuration
│   ├── Dockerfile.api
│   ├── Dockerfile.dashboard
│   └── docker-compose.yml
├── notebooks/                  # Analysis & exploration notebooks
├── configs/                    # Configuration files
├── pyproject.toml              # Poetry configuration
├── requirements.txt            # Pinned dependencies
├── Makefile                    # Common tasks
└── README.md                   # This file
```

---

## 🧪 Testing

### Run All Tests
```bash
make test
```

### Run Specific Test Suite
```bash
make test-api
make test-training
make test-data-cleaning
make test-dashboard
```

### With pytest directly
```bash
pytest tests/ -q
pytest tests/api/test_translation.py -v  # Translation tests
pytest tests/training/test_predict.py -v # Model prediction tests
```

### Coverage
```bash
pytest tests/ --cov=src --cov-report=html
```

---

## 🐳 Docker Deployment

### Build Images
```bash
make docker-build-api
make docker-build-dashboard
```

### Run Locally with Docker Compose
```bash
make docker-run-local
```

This starts both services:
- API: `http://localhost:8000`
- Dashboard: `http://localhost:8501`

### Deploy to Google Cloud Run (requires setup)
```bash
make cloud-run-deploy
make cloud-run-deploy-dashboard
```

---

## 🌐 Multilingual Support

### How It Works

1. **Language Detection**: `langdetect` identifies the language of input text
2. **Translation**: If not English, `deep-translator` (Google Translate API) translates to English
3. **Analysis**: Model performs inference on English text
4. **Metadata**: Response includes translation details for UI notification

### Example: French Input

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Je vais très mal", "model_type": "roberta"}'
```

**Response:**
```json
{
  "label": 1,
  "probability": 0.92,
  "source_language": "fr",
  "analysis_language": "en",
  "was_translated": true,
  "translated_text": "I am doing very badly"
}
```

The dashboard will show a 🌍 notice: *"Language fr detected. The text was translated to English before prediction."*

---

## 📊 Data

### Source
- Reddit depression/mental health subreddits
- Balanced dataset with depressive and non-depressive posts

### Preprocessing
Text undergoes comprehensive cleaning:
- HTML entity decoding
- URL/mention/hashtag normalization
- Emoji to signal tokens
- Contraction expansion
- Lemmatization
- Stop word removal (preserving negations)

See `src/training/preprocess.py` for details.

---

## ⚙️ Configuration

Environment variables (create `.env` file):

```env
API_URL=http://localhost:8000
PORT=8000
LOG_LEVEL=INFO
```

Model paths are configured in `src/common/config.py`.

---

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and add tests
4. Run `make test` to validate
5. Commit with clear messages
6. Push and create a pull request

### Code Style
- Black formatting
- Type hints encouraged
- Docstrings for all functions
- 150 character line length

---

## 📄 License

Artefact School of Data Group Project

---

## 👥 Team

- Contributors from Artefact's Data Science program

---

## ⚠️ Disclaimer

This tool is for **informational purposes only** and should not be used as a medical diagnosis tool. If you or someone you know is struggling with mental health, please reach out to a qualified mental health professional.

**Resources:**
- National Suicide Prevention Lifeline: 1-800-273-8255 (US)
- Crisis Text Line: Text HOME to 741741 (US)
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

---

## 🚀 Roadmap

- [ ] Multi-model ensemble predictions
- [ ] Fine-tuning on domain-specific data
- [ ] Knowledge distillation for faster inference
- [ ] Explainability features (SHAP, attention visualization)
- [ ] Support for more languages with in-language models
- [ ] Privacy-first local translation option
