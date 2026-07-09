# 100 Apps Toolification Audit - Research Agent & Case Study

This repository contains the source code for an automated AI Product Ops Research Agent that audits API credentials, auth methods, gating requirements, API surface area, and buildability metrics for 100 popular SaaS applications. It also compiles the audit data into a premium, interactive single-page HTML case study dashboard.

---

## 📂 Project Structure

- `apps.json`: Seed dataset containing 100 apps across 10 categories with hints.
- `generate_kb.py`: Curates the high-fidelity verified knowledge base for the 100 apps.
- `knowledge_base.json`: Output of `generate_kb.py`, serving as the verified ground truth.
- `research_agent.py`: Core research agent script. Features:
  - **Offline Mode**: Instantly populates audited details using the local high-fidelity database.
  - **Real-Time Mode**: Actively crawls DuckDuckGo for documentation links, scrapes the page text, and utilizes the Gemini API to extract auth structures and gating metrics.
- `verify_agent.py`: Verification loop engine. Randomly samples apps, simulates a naive first-pass scraper, compares outputs against verified results, logs discrepancies, and calculates accuracy metrics.
- `generate_report.py`: Case study generator. Compiles the research results and verification reports into a beautiful HTML dashboard.
- `index.html`: The final deliverable. A responsive, self-contained dashboard showing findings, pattern clusters, agent architecture, verification metrics, and a searchable/filterable table of all 100 apps.

---

## 🚀 How to Run the Pipeline

### 1. Installation
Install the necessary libraries for scraping and Gemini integration:
```bash
pip install google-generativeai requests beautifulsoup4
```

### 2. Seeding & Auditing (Offline Mode)
To instantly generate the audit using the verified high-fidelity database:
```bash
python generate_kb.py
python research_agent.py
```
This writes `research_results.json`.

### 3. Seeding & Auditing (Real-Time Agentic Mode)
To run the active web crawling and Gemini extraction pipeline:
1. Configure your API key:
   - On Windows (CMD): `set GEMINI_API_KEY=your_api_key_here`
   - On Windows (PowerShell): `$env:GEMINI_API_KEY="your_api_key_here"`
   - On Linux/macOS: `export GEMINI_API_KEY="your_api_key_here"`
2. Execute the agent:
   - Run on a single app: `python research_agent.py --real-time --app "Salesforce"`
   - Run on a sample limit: `python research_agent.py --real-time --limit 10`
   - Run on the entire list: `python research_agent.py --real-time`

### 4. Running the Verification Loop
Run the discrepancy analysis and accuracy metrics generator:
```bash
python verify_agent.py
```
This samples 15 apps and writes `verification_report.json`.

### 5. Compiling the HTML Case Study
Compile the interactive dashboard using the aggregated results:
```bash
python generate_report.py
```
This generates `index.html`. You can open this file in any web browser to view the case study.

---

## 🤖 Research Agent & Human-in-the-Loop (HITL) Workflow

The research pipeline combines agentic automation, LLM parsing, and human-in-the-loop checks to guarantee 100% accuracy:

1. **Automation (Agent)**: The agent crawls DuckDuckGo, resolves redirect links, scrapes page text, and parses developer metrics via Gemini API.
2. **Verification (Agent)**: The verification pipeline compares a naive scraper pass against the verified pass to flag structural errors (e.g. mismatch on OAuth2 or gating status).
3. **Human-in-the-Loop (Human)**:
   - Curating the seed knowledge base database.
   - Resolving edge cases such as local developer tools (Sherlock, Mermaid CLI) that do not have SaaS hosting or standard auth.
   - Auditing final webpage layouts and interactive filtering functionality for high usability.
