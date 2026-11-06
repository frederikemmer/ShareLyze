from pathlib import Path
import json,base64,re
out=Path(__file__).resolve().parent
root=out.parents[2]
previous=(out.parent/'statistics-concepts/01-insights.html').read_text()
base=previous[previous.index('<style>')+7:previous.index('</style>')]
# Keep the original ShareLyze foundation, then scope new concepts with their own rules.
base=base.split('/* Scoped concept overrides. */')[0]
base=re.sub(r'\b\d+(?:\.\d+)?(?:dvh|svh|lvh|vh)\b','0px',base)
icons=json.loads((out.parent/'statistics-concepts/icons.json').read_text())
logo=base64.b64encode((root/'frontend/public/logo-dark-transparent.svg').read_bytes()).decode()
css=(out/'private.css').read_text()
js=(out/'private.js').read_text()
for c,name in enumerate(['ruhig','tagebuch','album']):
 for view in ['overview','detail']:
  script=js.replace('__ICONS__',json.dumps(icons)).replace('__CONCEPT__',str(c)).replace('__VIEW__',json.dumps(view))
  nav=''.join(f'<span class="{"active" if n=="ChartNoAxesCombined" else ""}" title="{label}">{icons[n]}</span>' for n,label in [('FolderOpen','Freigaben'),('Link','Kurzlinks'),('ChartNoAxesCombined','Statistiken'),('Settings','Einstellungen')])
  doc=f'<!doctype html><html lang="de" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ShareLyze · {name} · {view}</title><style>{base}\n{css}</style></head><body><div class="private-wrap"><header class="private-header"><div class="private-brand"><img src="data:image/svg+xml;base64,{logo}" alt="">ShareLyze</div><nav class="private-appnav" aria-label="App-Navigation als Designvorschau">{nav}</nav><button data-theme aria-label="Hell-/Dunkelmodus wechseln">{icons["Sun"]}</button></header><main id="app"></main></div><script>{script}</script></body></html>'
  (out/f'{c+1:02d}-{name}-{view}.html').write_text(doc)
print('Created 6 standalone private statistics concepts.')
