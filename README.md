# SentimentLab - Sentiment Annotation Project

SentimentLab is a static, browser-based sentiment annotation workspace built for AI data annotation and LLM trainer portfolio projects. It supports CSV upload, live annotation, filtering, pagination, charts, local autosave, dark mode, and CSV export.

## Features

- Professional responsive dashboard
- CSV upload with PapaParse
- Editable sentiment labels
- Positive, Negative, Neutral, and Unlabelled tracking
- Search, label filters, and pagination
- Live Chart.js doughnut and bar charts
- Statistics page with completion and label balance
- Export annotated or raw CSV
- LocalStorage autosave
- Dark and light mode
- Simple admin/settings panel
- Optional annotator profile mock
- 500-row sample dataset
- Deploy-ready static files

## Project Files

- `index.html` - single-page application shell
- `style.css` - responsive UI and light/dark design system
- `script.js` - annotation, CSV, chart, storage, and export logic
- `raw_sentences.csv` - 500 unlabelled sample rows
- `annotated_sentences.csv` - 500 labelled sample rows
- `Annotation_Guidelines.md` - sentiment labeling rules

## Run Locally

Use a local server so the browser can load the default CSV file.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

VS Code Live Server also works.

## CSV Format

For raw upload:

```csv
id,text
1,The delivery arrived yesterday.
```

For annotated upload:

```csv
id,text,label
1,The service was excellent.,Positive
```

Accepted label values are `Positive`, `Negative`, and `Neutral`. Missing labels are shown as `Unlabelled`.

## Keyboard Shortcuts

- `1` - mark current sentence Positive
- `2` - mark current sentence Negative
- `3` - mark current sentence Neutral
- `ArrowLeft` - previous sentence
- `ArrowRight` - next sentence

## Deployment

This project is static and can be deployed on GitHub Pages, Netlify, Vercel, or any static hosting service. Keep all files in the same folder so `index.html` can load the CSV, CSS, and JavaScript assets.

## Portfolio Positioning

This project demonstrates practical AI data work:

- Dataset preparation
- Sentiment taxonomy design
- Annotation workflow UX
- Label quality statistics
- CSV import/export handling
- Browser-based state management
- Dashboard and reporting features
