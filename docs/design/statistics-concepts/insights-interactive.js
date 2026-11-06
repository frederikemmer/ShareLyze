/* Standalone interaction prototype; no requests or production data. */
(() => {
  const dayStart = Date.UTC(2026, 9, 10);
  const labelDate = t => new Date(t).toLocaleDateString('de-DE', {day:'2-digit',month:'short',timeZone:'UTC'});
  const labelTime = t => new Date(t).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'UTC'});
  const nf = v => v.toLocaleString('de-DE');
  let chartSerial=0;
  // Integer buckets add up exactly to the selected total.
  function buckets(total, count, seed=1) {
    const weights=Array.from({length:count},(_,i)=>12+((i*17+seed*13)%29)+i*.8);
    const sum=weights.reduce((a,b)=>a+b,0);
    const values=weights.map(w=>Math.floor(total*w/sum));
    for(let i=0,left=total-values.reduce((a,b)=>a+b,0);i<left;i++)values[i%count]++;
    return values;
  }
  function draw(container, values, labels, options={}) {
    const uid=++chartSerial;
    const previous=values.map(v=>Math.round(v/1.248));
    const ceiling=Math.max(4,Math.ceil(Math.max(...values,...previous)/4)*4);
    const x=i=>42+i*610/Math.max(1,values.length-1), y=v=>180-v/ceiling*150;
    const points=values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
    const showPrevious=options.previous!==false;
    container.className='explore-chart';
    container.innerHTML=`<svg viewBox="0 0 680 220" preserveAspectRatio="none" role="img" aria-label="${options.title||'Seitenaufrufe'}; genaue Werte über den Regler darunter"><defs><linearGradient id="fill-${uid}" x2="0" y2="1"><stop stop-color="var(--primary)" stop-opacity=".2"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>${[0,1,2,3,4].map(i=>`<line x1="42" x2="652" y1="${y(ceiling*i/4)}" y2="${y(ceiling*i/4)}" stroke="var(--border)" stroke-dasharray="3 5"/><text x="2" y="${y(ceiling*i/4)+4}">${nf(ceiling*i/4)}</text>`).join('')}<polygon points="42,180 ${points} 652,180" fill="url(#fill-${uid})"/>${showPrevious?`<polyline points="${previous.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="var(--chart-2)" stroke-width="1.6" stroke-dasharray="5 6"/>`:''}<polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round"/>${[0,Math.floor((values.length-1)/2),values.length-1].map((i,j)=>`<text x="${x(i)}" y="210" text-anchor="${['start','middle','end'][j]}">${labels[i]}</text>`).join('')}<line data-crosshair y1="25" y2="180" stroke="var(--primary)" stroke-dasharray="3 4"/><circle data-point r="5" class="selected-marker"/></svg><div class="chart-readout"><span class="readout-date"></span><b></b><small>${options.title||'Seitenaufrufe'}</small>${showPrevious?'<small data-prior></small>':''}</div><input type="range" min="0" max="${values.length-1}" value="${values.length-1}" aria-label="Zeitpunkt im Diagramm auswählen"><div class="chart-instruction"><span>Tippen oder ziehen · mit der Maus abfahren</span><span>Auch mit ← / →</span></div>${options.drill?'<button class="plain" data-open-day style="margin-top:8px">Diesen Tag im Detail ansehen →</button>':''}`;
    const slider=container.querySelector('input');
    function select(i){i=Math.max(0,Math.min(values.length-1,Math.round(i)));slider.value=i;container.dataset.index=i;container.querySelector('.readout-date').textContent=labels[i];container.querySelector('.chart-readout b').textContent=nf(values[i]);const p=container.querySelector('[data-prior]');if(p)p.textContent=`Vorperiode: ${nf(previous[i])}`;slider.setAttribute('aria-valuetext',`${labels[i]}: ${values[i]} ${options.title||'Aufrufe'}`);container.querySelector('[data-crosshair]').setAttribute('x1',x(i));container.querySelector('[data-crosshair]').setAttribute('x2',x(i));container.querySelector('[data-point]').setAttribute('cx',x(i));container.querySelector('[data-point]').setAttribute('cy',y(values[i]));}
    slider.addEventListener('input',()=>select(+slider.value));
    const svg=container.querySelector('svg');
    function pointer(e){const r=svg.getBoundingClientRect();select(((e.clientX-r.left)/r.width*680-42)/610*(values.length-1));}
    svg.addEventListener('pointerdown',e=>{svg.setPointerCapture(e.pointerId);pointer(e)});
    svg.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||svg.hasPointerCapture(e.pointerId))pointer(e)});
    container.querySelector('[data-open-day]')?.addEventListener('click',()=>options.drill(+slider.value));
    select(options.index??values.length-1);
  }
  const mainChart=document.querySelector('[data-chart]');
  function decorateOverview(){
    const total=Math.round(({views:12844,downloads:4564,redirects:3682}[metric])*factor());
    const start=days===7?21:0;
    draw(mainChart,buckets(total,days,2),Array.from({length:days},(_,i)=>labelDate(dayStart+(start+i)*86400000)),{title:names[metric]});
  }
  const originalUpdate=update;
  update=function(){originalUpdate();decorateOverview()};
  decorateOverview();
  const explore=document.createElement('div');explore.className='share-explorer';
  explore.innerHTML=`<label for="share-explore">Statistik öffnen</label><select id="share-explore"><option value="">Freigabe oder Kurzlink auswählen …</option>${records.map((r,i)=>`<option value="${i}">${r[0]} · ${r[1]}</option>`).join('')}</select><span class="dim">Eigener Verlauf · Tagesansicht · Live-Demo</span>`;
  document.querySelector('.kpis').before(explore);
  const dialog=document.createElement('dialog');dialog.className='stats-dialog';dialog.setAttribute('aria-labelledby','share-stat-title');
  dialog.innerHTML=`<div class="detail-top"><div><span class="overline">Statistik / Einzelner Link</span><h2 id="share-stat-title"></h2><select class="detail-link-select" aria-label="Andere Freigabe oder Kurzlink">${records.map((r,i)=>`<option value="${i}">${r[0]} · ${r[1]}</option>`).join('')}</select></div><button data-dismiss aria-label="Freigabestatistik schließen">${I.X}</button></div><div class="detail-controls"><div class="segmented" aria-label="Detailzeitraum"><button data-span="28">28 Tage</button><button data-span="7">7 Tage</button><button data-span="day">Tag</button><button data-span="live">${I.Activity} Live</button></div><div class="detail-date-step" hidden><button data-step="-1" aria-label="Vorheriger Tag">←</button><label>Tag <input type="date" aria-label="Tag auswählen" value="2026-11-06" min="2026-10-10" max="2026-11-06"></label><button data-step="1" aria-label="Nächster Tag">→</button></div><div class="live-state" hidden><i class="live-dot"></i><span>Simulation · alle 3 s</span><button data-pause>Pause</button></div></div><div class="kpis" data-share-kpis></div><div class="detail-chart-card"><div class="panelhead"><div><h3 data-detail-heading></h3><p data-detail-period></p></div><div class="metric-pills" data-share-metrics></div></div><div data-share-chart></div></div><div class="detail-bottom"><div><h3 data-feed-title></h3><div class="live-feed" data-share-feed></div></div><div class="detail-summary"><h3>Diese Freigabe im Fokus</h3><p data-scope-note></p><p>Alle Daten sind simuliert. Serverabschlüsse bestätigen keine Speicherung beim Empfänger; Starts können fortgesetzte Anfragen enthalten.</p><p data-live-time></p></div></div>`;
  document.body.append(dialog);
  let link=0,span='28',detailMetric='views',chosenDay='2026-11-06',paused=false,timer=null,seq=0;
  let live=[],feed=[];
  const totalsFor=(r)=>({views:r[3],downloads:r[4],finished:r[5],redirects:r[2]==='Kurzlink'?3682:0});
  const metricNames={...names,finished:'Serverabschlüsse'};
  function liveSeed(){seq=0;const now=Date.now();live=Array.from({length:30},(_,i)=>({t:now-(29-i)*3000,views:(i+link)%3,downloads:(i+link)%4===0?1:0,finished:(i+link)%5===0?1:0,redirects:(i+link)%3}));feed=[];}
  function currentSeries(m){
    if(span==='live')return live.map(v=>v[m]);
    const daily=buckets(totalsFor(records[link])[m],28,link+2);
    if(span==='day'){const idx=Math.round((Date.parse(chosenDay+'T00:00:00Z')-dayStart)/86400000);return buckets(daily[idx]||0,24,link+idx+1)}
    return span==='7'?daily.slice(-7):daily;
  }
  function renderDetail(){
    const focusedMetric=dialog.contains(document.activeElement)?document.activeElement.dataset.shareMetric:null;
    const r=records[link],isShort=r[2]==='Kurzlink',keys=isShort?['redirects']:['views','downloads','finished'];
    if(!keys.includes(detailMetric))detailMetric=keys[0];
    dialog.querySelector('h2').textContent=r[0];dialog.querySelector('.detail-link-select').value=link;
    dialog.querySelectorAll('[data-span]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.span===span)));
    dialog.querySelector('.detail-date-step').hidden=span!=='day';dialog.querySelector('.live-state').hidden=span!=='live';
    dialog.querySelector('input[type=date]').value=chosenDay;
    dialog.querySelector('[data-step="-1"]').disabled=chosenDay==='2026-10-10';dialog.querySelector('[data-step="1"]').disabled=chosenDay==='2026-11-06';
    dialog.querySelector('[data-share-kpis]').style.gridTemplateColumns=isShort?'1fr':'';
    dialog.querySelector('[data-share-kpis]').innerHTML=keys.map(k=>`<div class="kpi"><span class="label">${metricNames[k]}</span><strong>${nf(currentSeries(k).reduce((a,b)=>a+b,0))}</strong></div>`).join('');
    dialog.querySelector('[data-share-metrics]').innerHTML=keys.map(k=>`<button data-share-metric="${k}" aria-pressed="${detailMetric===k}">${metricNames[k]}</button>`).join('');
    dialog.querySelector('[data-detail-heading]').textContent=span==='live'?'Was gerade passiert':span==='day'?'Ein Tag im Detail':'Verlauf dieser Freigabe';
    dialog.querySelector('[data-detail-period]').textContent=span==='live'?'Rollendes 90-Sekunden-Fenster · 3-Sekunden-Intervalle · simuliert':span==='day'?labelDate(Date.parse(chosenDay+'T00:00:00Z'))+' 2026 · stündlich · UTC':`${span==='7'?'31.':'10.'} Okt. – 06. Nov. 2026 · täglich`;
    const labels=span==='live'?live.map(v=>labelTime(v.t)):span==='day'?Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`):Array.from({length:+span},(_,i)=>labelDate(dayStart+(i+(span==='7'?21:0))*86400000));
    const previousIndex=dialog.querySelector('[data-share-chart]').dataset.index;
    draw(dialog.querySelector('[data-share-chart]'),currentSeries(detailMetric),labels,{title:metricNames[detailMetric],previous:false,index:span==='live'?undefined:previousIndex,drill:['28','7'].includes(span)?i=>{chosenDay=new Date(dayStart+(i+(span==='7'?21:0))*86400000).toISOString().slice(0,10);span='day';renderDetail()}:null});
    dialog.querySelector('[data-feed-title]').textContent=span==='live'?'Ereignisse dieser Freigabe':'Auswertung des Zeitraums';
    dialog.querySelector('[data-share-feed]').innerHTML=span==='live'?(feed.length?feed.map(e=>`<div class="listrow"><span class="fileicon">${I.Activity}</span><div class="identity"><strong>${e.label}</strong><small>${r[1]} · simuliertes Ereignis</small></div><time>${labelTime(e.t)}</time></div>`).join(''):'<p class="dim">Simulation gestartet. Neue Ereignisse erscheinen hier …</p>'):`<p class="detail-summary">${nf(currentSeries(detailMetric).reduce((a,b)=>a+b,0))} ${metricNames[detailMetric]} in ${currentSeries(detailMetric).length} ${span==='day'?'Stunden':'Tagen'}. Wähle einen Punkt im Diagramm, um den genauen Wert zu lesen.${span==='day'?'':' Über „Diesen Tag im Detail ansehen“ wechselst du zu den Stundenwerten.'}</p>`;
    dialog.querySelector('[data-scope-note]').textContent=`${r[0]} (${r[1]}) · ${r[2]}. Alle Kennzahlen, Diagrammpunkte und Ereignisse in dieser Ansicht gehören nur zu diesem Link.`;
    dialog.querySelector('[data-live-time]').textContent=span==='live'?`${paused?'Pausiert':'Letzte Aktualisierung'}: ${labelTime(live.at(-1).t)} UTC · keine Verbindung zum Server.`:'';
    dialog.querySelector('[data-pause]').textContent=paused?'Fortsetzen':'Pause';
    if(focusedMetric)dialog.querySelector(`[data-share-metric="${focusedMetric}"]`)?.focus({preventScroll:true});
  }
  function tick(){if(!dialog.open||span!=='live'||paused||document.hidden)return;if(Date.now()-live.at(-1).t>6000)liveSeed();seq++;const t=Date.now(),isShort=records[link][2]==='Kurzlink';const k=isShort?'redirects':['views','downloads','finished'][(seq+link)%3];const event={t,views:0,downloads:0,finished:0,redirects:0};event[k]=1;live.push(event);live.shift();feed.unshift({t,label:metricNames[k]});feed=feed.slice(0,8);renderDetail()}
  function openShare(i){link=+i;span='28';detailMetric=records[link][2]==='Kurzlink'?'redirects':'views';paused=false;liveSeed();dialog.querySelector('[data-share-chart]').removeAttribute('data-index');renderDetail();dialog.showModal();clearInterval(timer);timer=setInterval(tick,3000)}
  document.querySelector('#share-explore').addEventListener('change',e=>{if(e.target.value!=='')openShare(e.target.value);e.target.value=''});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(b){e.preventDefault();e.stopImmediatePropagation();openShare(records.findIndex(r=>r[0]===b.dataset.detail))}},true);
  dialog.addEventListener('close',()=>{clearInterval(timer);timer=null});
  dialog.querySelector('[data-dismiss]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('.detail-link-select').addEventListener('change',e=>{link=+e.target.value;liveSeed();renderDetail()});
  dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.span){span=b.dataset.span;dialog.querySelector('[data-share-chart]').removeAttribute('data-index');if(span==='live'){paused=false;liveSeed()}renderDetail()}if(b.dataset.shareMetric){detailMetric=b.dataset.shareMetric;renderDetail()}if(b.hasAttribute('data-pause')){paused=!paused;if(!paused)liveSeed();renderDetail()}if(b.dataset.step){chosenDay=new Date(Date.parse(chosenDay+'T00:00:00Z')+Number(b.dataset.step)*86400000).toISOString().slice(0,10);renderDetail()}});
  dialog.querySelector('input[type=date]').addEventListener('change',e=>{if(!e.target.value||!e.target.validity.valid){e.target.value=chosenDay;return}chosenDay=e.target.value;renderDetail()});
})();
