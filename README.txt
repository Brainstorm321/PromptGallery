Patch contents:
- index.html: restores proper JS wiring + ids for sidebar controls
- prompts.js: shared data source (window.PROMPTS) for both gallery and detail pages
- app.js: renders cards + filtering/sorting/search, fixes Free/Premium 'both unchecked' bug
- style_patch.css: optional CSS additions if your existing style.css doesn't include these classes

How to apply:
1) Copy index.html, prompts.js, app.js into your site root (same folder as style.css).
2) OPTIONAL: append style_patch.css contents to the END of your existing style.css.
3) Run: python -m http.server 8000
4) Open: http://localhost:8000/index.html
