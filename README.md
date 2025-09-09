# Regex Pattern matching web app
A web application using Django and React that allows users to upload CSV or Excel files, identify patterns in text columns using natural language input, and replace the matched patterns.

Sequence diagram: </br>
---
<img width="681" height="276" alt="regex_web_app_design drawio (1)" src="https://github.com/user-attachments/assets/8ffb2f57-9dec-43d7-8f5e-89fd7fa212a5" />


# Design Overview:

## Frontend
- Framework: **React**
- Components:
  - **Upload Component** : upload CSV/Excel files
  - **Prompt Input Component** : accept natural language prompts from the user
  - **Preview Component** *(tentative)* : display proposed regex before applying
  - **Data Grid** : show original vs processed data (before/after view if time permits)
- Actions *(tentative)*:
  - Apply transformation
  - Export processed dataset (CSV/Excel)
- Uses **`useEffect` hook** and `fetch` API calls to communicate with Django backend

---

## Backend
- Framework: **Django**
- Exposes endpoints:
  - `/upload`
  - `/getResult`
- Components:
  1. **API App** : for data processing (Pandas transformations)
  2. **Core/Server App** : for orchestration:
     - Running the server
     - Routing requests to the API app

---

## Data Transformation
- Use `series.str.replace(pattern, replacement, regex=True)`
- Convert CSV/Excel to Pandas DataFrame
- Vectorized regex replace
- Fetch target column, regex pattern, and replacement text from LLM
- **Scope:** only column operations

---

## LLM
- Generate a sample dataframe (n=10)
- Inputs: column list, user prompt, dataframe sample
- Endpoints:
  - `/getTargetColumn`
  - `/getRegex`
- Django makes these calls to the LLM
- Use OpenAI API key (via environment variables)

---


