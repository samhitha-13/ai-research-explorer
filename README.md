# ScholarLens — Academic Literature Discovery & AI Synthesis Workbench

**ScholarLens** is a full-stack academic research workbench built to help students and researchers discover open-access literature, track citation momentum, export LaTeX citations, and synthesize methodologies across multiple papers.

---

## Core Capabilities

- **Live Academic Search & Autocomplete:** Queries the **OpenAlex** scholarly index with Google Scholar–style live concept suggestions, research field filtering, and sorting by relevance, total citations, publication year, or **citation velocity** (citations per year).
- **Personal Research Library:** Like, bookmark, and organize papers locally with one-click **BibTeX** generation and bulk export to `.bib` (for Overleaf/LaTeX) or `.md` reading notes.
- **Structured AI Synthesis (Gemini API):**
  - **Paper Breakdown:** Extracts core hypotheses, empirical findings, and methodological limitations.
  - **Research Gap Finder:** Identifies unaddressed validity threats and concrete follow-up research directions.
  - **Interactive Paper Q&A:** Allows targeted follow-up questions grounded in a paper's abstract.
  - **Comparative Literature Matrix & Lit Review Drafts:** Generates side-by-side HTML comparison tables and IEEE/ACM-style related-work synthesis paragraphs across up to 3 selected papers.

---

## Tech Stack

- **Backend:** Python, FastAPI, Uvicorn, Requests, Google GenAI SDK (`gemini-3.8-flash`)
- **Frontend:** Semantic HTML5, Editorial CSS (`Newsreader`, `Inter`, `IBM Plex Mono`), Vanilla JavaScript
- **Data Source:** OpenAlex REST API

---

## Project Structure

```text
ai-research-explorer/
├── backend/
│   ├── main.py              # FastAPI endpoints for search, autocomplete, and Gemini synthesis
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Local environment variables (excluded via .gitignore)
├── frontend/
│   ├── index.html           # Researcher workbench UI
│   ├── style.css            # High-contrast academic editorial styling
│   └── app.js               # Typeahead search, library persistence, and API integration
└── .gitignore
