# Regex Pattern Matching Web App
A web application using Django and React that allows users to upload CSV or Excel files, identify patterns in text columns using natural language input, and replace the matched patterns.

Demo Link: https://1drv.ms/v/c/11f170ba41364a36/ER0MlyQUIUFPu2RglPMkwVEB1PWr8lnnpOHY-6AJrzN1VA?e=rUdz92

Sequence diagram: <br>
---
<img width="681" height="276" alt="regex_web_app_design drawio (1)" src="https://github.com/user-attachments/assets/8ffb2f57-9dec-43d7-8f5e-89fd7fa212a5" />


# Design Overview

## Frontend
- Framework: **React**
- Components:
  - **Upload Component**: upload CSV/Excel files
  - **Prompt Input Component**: accept natural language prompts from the user
  - **Preview Component** *(tentative)*: display proposed regex before applying
  - **Data Grid**: show original vs processed data (before/after view if time permits)
- Actions *(tentative)*:
  - Apply transformation
  - Export processed dataset (CSV/Excel)
- Uses **`useEffect` hook** and `fetch` API calls to communicate with the Django backend

---

## Backend
- Framework: **Django**
- Exposes endpoints:
  - `/upload`
  - `/getResult`
- Components:
  1. **API App**: data processing (Pandas transformations)
  2. **Core/Server App**: orchestration (routing requests and running the server)

---

## Data Transformation
- Use `series.str.replace(pattern, replacement, regex=True)`
- Convert CSV/Excel to a Pandas DataFrame
- Vectorized regex replace
- Fetch target column, regex pattern, and replacement text from the LLM
- **Scope:** column operations only

---

## LLM
- Generate a sample dataframe (n = 10)
- Inputs: column list, user prompt, dataframe sample
- Endpoints:
  - `/getTargetColumn`
  - `/getRegex`
- Django makes these calls to the LLM
- Use an OpenAI API key (provided via environment variables)

---

## Containerized Setup

1. Copy `regex_transformer_django/.env.example` to `regex_transformer_django/.env` and provide real values, for example:
   ```env
   DJANGO_SECRET_KEY=change-me
   OPENAI_API_KEY=sk-your-key
   DJANGO_DEBUG=1
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```
2. Install Docker Desktop for your operating system and verify `docker --version` runs without errors.
3. From the project root (`regex_pattern_matching_web_app`) run:
   ```bash
   docker compose up --build
   ```
4. When both containers are ready, open `http://localhost:3000` for the React UI. The Django API is available at `http://localhost:8000` and will use the secrets from `.env`.
5. To stop the stack, press `Ctrl+C` or run `docker compose down` in another terminal from the same directory.

---

## Running Without Docker

### Requirements
- Python 3.11+
- Node.js 20+ and npm
- (Optional) Git

### Backend - Django API (`regex_transformer_django`)

1. Create and activate a virtual environment.
   - macOS/Linux:
     ```bash
     cd regex_transformer_django
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - Windows (PowerShell):
     ```powershell
     cd regex_transformer_django
     py -3 -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file (or copy `.env.example`) and fill in the same keys used in the container setup.
4. Apply migrations and start the development server:
   ```bash
   python manage.py migrate
   python manage.py runserver 0.0.0.0:8000
   ```

### Frontend - React UI (`regex-transformer-react`)

1. In a new terminal, install dependencies:
   ```bash
   cd regex-transformer-react
   npm ci
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. The React app will open at `http://localhost:3000` and expects the Django backend to be running on `http://localhost:8000`.

---

### Notes
- Protect your OpenAI API key by keeping `.env` files out of source control (already handled by `.gitignore`).
- When developing locally, you can point API calls at a different backend by updating `src/config.js`.

