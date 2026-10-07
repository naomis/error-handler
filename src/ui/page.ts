/**
 * Page HTML autonome (aucune dépendance, aucun build) servie par `createMonitorRouter`.
 * Règle : le contenu venant de l'API est toujours inséré avec `textContent`, jamais `innerHTML`.
 * Le JS client évite les backticks et `${}` car il vit dans un template littéral.
 */
const CSS = String.raw`
:root{
  --bg:#f5f6f8;--surface:#fff;--border:#e4e7ec;--text:#1d2433;--muted:#667085;--faint:#98a2b3;
  --error:#d92d20;--error-bg:#fef3f2;--warning:#b54708;--warning-bg:#fffaeb;--info:#175cd3;--info-bg:#eff8ff;
  --ok:#067647;--ok-bg:#ecfdf3;--accent:#3b5bdb;--code-bg:#101828;--code-text:#e4e7ec;--shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#0c111d;--surface:#161b26;--border:#2b3140;--text:#f0f2f5;--muted:#a3abbd;--faint:#6b7488;
  --error:#f97066;--error-bg:#3a1613;--warning:#fdb022;--warning-bg:#3a2a0c;--info:#84caff;--info-bg:#102a43;
  --ok:#47cd89;--ok-bg:#0f2d1f;--accent:#7a93ff;--code-bg:#0a0d14;--code-text:#d0d5dd;--shadow:none;
}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
h1,h2,h3{margin:0;line-height:1.25}
button,select,input{font:inherit;color:inherit}
.wrap{max-width:1160px;margin:0 auto;padding:20px 16px 48px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.top h1{font-size:20px}
.top p{margin:2px 0 0;color:var(--muted);font-size:13px}
.actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.switch{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;cursor:pointer}
.btn{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 12px;cursor:pointer;box-shadow:var(--shadow)}
.btn:hover{border-color:var(--faint)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.danger{color:var(--error)}
.btn:focus-visible,select:focus-visible,input:focus-visible,.row:focus-visible,.tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.banner{background:var(--warning-bg);border:1px solid var(--warning);border-radius:10px;padding:12px 14px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.banner input{flex:1;min-width:220px;border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:7px 10px}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow)}
.card .label{color:var(--muted);font-size:13px}
.card .value{font-size:28px;font-weight:650;margin-top:2px;font-variant-numeric:tabular-nums}
.card .sub{color:var(--faint);font-size:12px}
.card.error .value{color:var(--error)}.card.warning .value{color:var(--warning)}.card.ok .value{color:var(--ok)}
.grid2{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:12px;margin-bottom:16px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);min-width:0}
.panel-h{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:14px 16px 0}
.panel-h h2{font-size:14px}
.legend{display:flex;gap:12px;color:var(--muted);font-size:12px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
.dot.error{background:var(--error)}.dot.warning{background:var(--warning)}.dot.info{background:var(--info)}
.chart{display:flex;align-items:flex-end;gap:8px;height:150px;padding:14px 16px 12px}
.col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.stack{width:100%;max-width:44px;display:flex;flex-direction:column-reverse;flex:1;justify-content:flex-start;min-height:0}
.bar{width:100%;min-height:0}
.bar.error{background:var(--error)}.bar.warning{background:var(--warning)}.bar.info{background:var(--info)}
.bar:last-child{border-radius:4px 4px 0 0}
.col .d{color:var(--faint);font-size:11px;margin-top:6px;white-space:nowrap}
.col .t{color:var(--muted);font-size:11px;height:16px;font-variant-numeric:tabular-nums}
.top-list{padding:6px 8px 10px}
.top-item{display:flex;gap:10px;align-items:center;padding:8px;border-radius:8px;cursor:pointer;width:100%;background:none;border:0;text-align:left}
.top-item:hover{background:var(--bg)}
.top-item .m{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.top-item .n{color:var(--muted);font-variant-numeric:tabular-nums}
.empty{padding:28px 16px;text-align:center;color:var(--muted)}
.filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)}
.tabs{display:flex;background:var(--bg);border-radius:9px;padding:3px;gap:2px}
.tab{background:none;border:0;border-radius:7px;padding:5px 12px;cursor:pointer;color:var(--muted)}
.tab[aria-pressed=true]{background:var(--surface);color:var(--text);box-shadow:var(--shadow);font-weight:600}
.filters select,.filters input{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px}
.filters input[type=search]{flex:1;min-width:160px}
.row>*{min-width:0}
.row{display:grid;grid-template-columns:110px minmax(0,1fr) auto 130px 90px;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer}
.row:last-child{border-bottom:0}
.row:hover{background:var(--bg)}
.row .title{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .meta{color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .count{font-variant-numeric:tabular-nums;color:var(--muted);text-align:right;white-space:nowrap}
.row .when{color:var(--muted);font-size:13px}
.badge{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;white-space:nowrap}
.badge.error{background:var(--error-bg);color:var(--error)}.badge.warning{background:var(--warning-bg);color:var(--warning)}
.badge.info{background:var(--info-bg);color:var(--info)}.badge.open{background:var(--info-bg);color:var(--info)}
.badge.resolved{background:var(--ok-bg);color:var(--ok)}.badge.ignored{background:var(--bg);color:var(--muted)}
.pager{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;color:var(--muted);font-size:13px}
.pager div{display:flex;gap:8px}
.btn[disabled]{opacity:.5;cursor:default}
.scrim{position:fixed;inset:0;background:rgba(16,24,40,.45);z-index:10}
.sheet{position:fixed;top:0;right:0;bottom:0;width:min(760px,100%);background:var(--bg);z-index:11;overflow-y:auto;box-shadow:-8px 0 24px rgba(16,24,40,.2)}
.sheet-in{padding:18px 18px 40px}
.sh-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:6px}
.sh-badges{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.sheet h2{font-size:18px;word-break:break-word;margin:8px 0 4px}
.sub{color:var(--muted);font-size:13px}
.sh-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
.sec{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:12px;box-shadow:var(--shadow)}
.sec h3{font-size:13px;margin-bottom:2px}
.sec .hint{color:var(--muted);font-size:12px;margin-bottom:10px}
.kv{display:grid;grid-template-columns:150px 1fr;gap:6px 12px;margin:8px 0 0}
.kv dt{color:var(--muted)}.kv dd{margin:0;word-break:break-word}
.where{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;background:var(--error-bg);border-radius:8px;padding:10px 12px;margin-top:6px}
.where code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;word-break:break-all}
pre.code{margin:8px 0 0;background:var(--code-bg);color:var(--code-text);border-radius:8px;padding:12px;overflow:auto;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;max-height:360px}
pre.code .dim{opacity:.45}
pre.code .app{color:#fff;font-weight:600}
.copy-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.occ{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}
.occ select{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px;max-width:100%}
.note{color:var(--muted);font-size:12px;margin-top:6px}
.minw{min-width:0}
.offscreen{position:fixed;opacity:0;top:0;left:0}
@media (max-width:760px){
  .cards{grid-template-columns:repeat(2,minmax(0,1fr))}
  .grid2{grid-template-columns:minmax(0,1fr)}
  .row{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"lvl st" "ttl ttl" "whn cnt";gap:6px 10px}
  .r-lvl{grid-area:lvl}.r-status{grid-area:st;justify-self:end}.r-title{grid-area:ttl}.r-when{grid-area:whn}.r-count{grid-area:cnt}
  .filters select{max-width:100%}
  .kv{grid-template-columns:1fr}.kv dt{margin-top:6px}
}
`;

const BODY = String.raw`
<div class="wrap">
  <header class="top">
    <div><h1>Monitoring des erreurs</h1><p id="sub">Chargement...</p></div>
    <div class="actions">
      <label class="switch"><input type="checkbox" id="auto"> Actualisation auto (30 s)</label>
      <button class="btn" id="refresh" type="button">Actualiser</button>
    </div>
  </header>
  <div class="banner" id="banner" hidden>
    <span id="bannerMsg">Accès refusé. Collez un jeton d'accès (Bearer) pour continuer.</span>
    <input type="password" id="token" placeholder="Jeton d'accès" autocomplete="off" aria-label="Jeton d'accès">
    <button class="btn primary" id="saveToken" type="button">Valider</button>
  </div>
  <section class="cards" id="cards" aria-label="Résumé"></section>
  <div class="grid2">
    <section class="panel">
      <div class="panel-h"><h2 id="chartTitle">Activité</h2>
        <div class="legend"><span><i class="dot error"></i>Erreurs</span><span><i class="dot warning"></i>Avertissements</span></div></div>
      <div class="chart" id="chart"></div>
    </section>
    <section class="panel">
      <div class="panel-h"><h2>Les plus fréquents</h2></div>
      <div class="top-list" id="top"></div>
    </section>
  </div>
  <section class="panel">
    <div class="filters">
      <div class="tabs" id="tabs" role="group" aria-label="Statut"></div>
      <select id="fLevel" aria-label="Niveau">
        <option value="">Tous les niveaux</option><option value="error">Erreurs</option><option value="warning">Avertissements</option>
      </select>
      <select id="fApp" aria-label="Application"></select>
      <select id="fEnv" aria-label="Environnement"></select>
      <input type="search" id="fQ" placeholder="Rechercher un message..." aria-label="Recherche">
    </div>
    <div id="list"></div>
    <div class="pager" id="pager"></div>
  </section>
</div>
<div id="drawer" hidden>
  <div class="scrim" id="scrim"></div>
  <div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Détail"></div>
</div>
`;

const SCRIPT = String.raw`
(function () {
  'use strict';
  var base = location.pathname.replace(/\/(ui)?\/?$/, '') + '/';
  var S = { status: 'open', level: '', app: '', env: '', q: '', offset: 0, limit: 25, timer: null, current: null };
  var STATUSES = [['open', 'Ouverts'], ['resolved', 'Résolus'], ['ignored', 'Ignorés'], ['', 'Tous']];
  var LEVEL_LABEL = { error: 'Erreur', warning: 'Avertissement', info: 'Info' };
  var STATUS_LABEL = { open: 'Ouvert', resolved: 'Résolu', ignored: 'Ignoré' };

  function $(id) { return document.getElementById(id); }
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function qs(o) {
    return Object.keys(o).filter(function (k) { return o[k] !== '' && o[k] !== undefined; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&');
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' }); } catch (e) { return String(iso); }
  }
  function rel(iso) {
    var s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 45) return "à l'instant";
    if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    return 'il y a ' + Math.round(s / 86400) + ' j';
  }
  function badge(kind, label) { return h('span', { class: 'badge ' + kind, text: label }); }
  function levelBadge(l) { return badge(l, LEVEL_LABEL[l] || l); }
  function statusBadge(s) { return badge(s, STATUS_LABEL[s] || s); }

  /* ---------- API ---------- */
  function token() { try { return sessionStorage.getItem('mon_token'); } catch (e) { return null; } }
  function api(path, opts) {
    opts = opts || {};
    var headers = { Accept: 'application/json' };
    var t = token();
    if (t) headers.Authorization = 'Bearer ' + t;
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(base + path, { method: opts.method || 'GET', headers: headers, body: opts.body, credentials: 'same-origin' })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) {
          $('banner').hidden = false;
          $('bannerMsg').textContent = t ? "Jeton refusé ou expiré. Collez un nouveau jeton d'accès (Bearer)." : "Accès refusé. Collez un jeton d'accès (Bearer) pour continuer.";
          throw new Error('auth');
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        $('banner').hidden = true;
        return r.json();
      });
  }
  function fail(target, e) {
    if (e && e.message === 'auth') return;
    clear(target).appendChild(h('div', { class: 'empty', text: "Impossible de charger les données (" + (e && e.message) + ")." }));
  }

  /* ---------- Résumé ---------- */
  function card(cls, label, value, sub) {
    return h('div', { class: 'card ' + cls }, [h('div', { class: 'label', text: label }), h('div', { class: 'value', text: String(value) }), h('div', { class: 'sub', text: sub })]);
  }
  function fillSelect(sel, values, allLabel, current) {
    clear(sel);
    sel.appendChild(h('option', { value: '', text: allLabel }));
    values.forEach(function (v) { sel.appendChild(h('option', { value: v, text: v })); });
    sel.value = values.indexOf(current) >= 0 ? current : '';
  }
  function renderStats(s) {
    var cards = clear($('cards'));
    cards.appendChild(card(s.groups.openError ? 'error' : 'ok', 'Erreurs ouvertes', s.groups.openError, 'à traiter'));
    cards.appendChild(card(s.groups.openWarning ? 'warning' : '', 'Avertissements ouverts', s.groups.openWarning, 'à surveiller'));
    cards.appendChild(card('', 'Occurrences', s.occurrences.total, 'sur ' + s.days + ' jours'));
    cards.appendChild(card('ok', 'Résolus', s.groups.resolved, s.groups.ignored + ' ignoré(s)'));
    $('sub').textContent = s.apps.length ? s.apps.join(', ') + (s.environments.length ? ' · ' + s.environments.join(', ') : '') : 'Aucune donnée pour le moment';
    $('chartTitle').textContent = 'Activité des ' + s.days + ' derniers jours';

    var max = 1;
    s.daily.forEach(function (d) { max = Math.max(max, d.error + d.warning + d.info); });
    var chart = clear($('chart'));
    s.daily.forEach(function (d) {
      var total = d.error + d.warning + d.info;
      var stack = h('div', { class: 'stack', title: d.day + ' : ' + d.error + ' erreur(s), ' + d.warning + ' avertissement(s)' });
      ['error', 'warning', 'info'].forEach(function (lvl) {
        if (!d[lvl]) return;
        var bar = h('div', { class: 'bar ' + lvl });
        bar.style.height = (d[lvl] / max) * 100 + '%';
        stack.appendChild(bar);
      });
      var label = d.day.slice(8, 10) + '/' + d.day.slice(5, 7);
      chart.appendChild(h('div', { class: 'col' }, [h('span', { class: 't', text: total ? String(total) : '' }), stack, h('span', { class: 'd', text: label })]));
    });

    var top = clear($('top'));
    if (!s.top.length) top.appendChild(h('div', { class: 'empty', text: 'Rien à signaler sur la période.' }));
    s.top.forEach(function (g) {
      top.appendChild(h('button', { class: 'top-item', type: 'button', onclick: function () { openGroup(g.id); } }, [
        levelBadge(g.level), h('span', { class: 'm', text: g.message, title: g.message }), h('span', { class: 'n', text: g.count + '×' })
      ]));
    });
    fillSelect($('fApp'), s.apps, 'Toutes les applications', S.app);
    fillSelect($('fEnv'), s.environments, 'Tous les environnements', S.env);
  }
  function loadStats() { return api('stats?days=7').then(renderStats).catch(function (e) { fail($('top'), e); }); }

  /* ---------- Liste ---------- */
  function renderTabs() {
    var tabs = clear($('tabs'));
    STATUSES.forEach(function (s) {
      tabs.appendChild(h('button', { class: 'tab', type: 'button', 'aria-pressed': String(S.status === s[0]), text: s[1],
        onclick: function () { S.status = s[0]; S.offset = 0; renderTabs(); loadList(); } }));
    });
  }
  function renderList(res) {
    var list = clear($('list'));
    if (!res.items.length) {
      list.appendChild(h('div', { class: 'empty', text: S.q || S.level || S.app || S.env || S.status ? 'Aucun résultat avec ces filtres.' : 'Aucune erreur enregistrée.' }));
    }
    res.items.forEach(function (g) {
      var row = h('div', { class: 'row', role: 'button', tabindex: '0', onclick: function () { openGroup(g.id); },
        onkeydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openGroup(g.id); } } }, [
        h('div', { class: 'r-lvl' }, [levelBadge(g.level)]),
        h('div', { class: 'minw r-title' }, [h('div', { class: 'title', text: g.message, title: g.message }),
          h('div', { class: 'meta', text: [g.type, g.app, g.environment].filter(Boolean).join(' · ') })]),
        h('div', { class: 'count r-count', text: g.count + ' fois', title: 'Première fois : ' + fmtDate(g.firstSeen) }),
        h('div', { class: 'when r-when', text: rel(g.lastSeen), title: fmtDate(g.lastSeen) }),
        h('div', { class: 'r-status' }, [statusBadge(g.status)])
      ]);
      list.appendChild(row);
    });
    var from = res.total ? S.offset + 1 : 0, to = Math.min(S.offset + S.limit, res.total);
    var pager = clear($('pager'));
    pager.appendChild(h('span', { text: from + '–' + to + ' sur ' + res.total }));
    pager.appendChild(h('div', {}, [
      h('button', { class: 'btn', type: 'button', text: 'Précédent', disabled: S.offset === 0 ? 'disabled' : null, onclick: function () { S.offset = Math.max(0, S.offset - S.limit); loadList(); } }),
      h('button', { class: 'btn', type: 'button', text: 'Suivant', disabled: to >= res.total ? 'disabled' : null, onclick: function () { S.offset += S.limit; loadList(); } })
    ]));
  }
  function loadList() {
    return api('groups?' + qs({ status: S.status, level: S.level, app: S.app, environment: S.env, q: S.q, limit: S.limit, offset: S.offset }))
      .then(renderList).catch(function (e) { fail($('list'), e); });
  }

  /* ---------- Détail ---------- */
  var HTTP_HINT = { 400: 'Requête invalide', 401: 'Non authentifié', 403: 'Accès refusé', 404: 'Ressource introuvable', 409: 'Conflit', 422: 'Données refusées' };
  function httpHint(code) {
    if (!code) return '';
    if (HTTP_HINT[code]) return HTTP_HINT[code];
    return code >= 500 ? 'Erreur côté serveur' : code >= 400 ? 'Erreur côté client' : '';
  }
  function isNoise(line) { return line.indexOf('node_modules') >= 0 || line.indexOf('node:') >= 0; }
  function origin(stack) {
    if (!stack) return null;
    var lines = stack.split('\n').slice(1);
    for (var i = 0; i < lines.length; i++) {
      if (isNoise(lines[i])) continue;
      var m = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):\d+\)?\s*$/.exec(lines[i]);
      if (m) return { fn: m[1] || '(anonyme)', where: m[2].split(/[\\/]/).slice(-2).join('/') + ':' + m[3] };
    }
    return null;
  }
  function renderStack(stack) {
    var pre = h('pre', { class: 'code' });
    stack.split('\n').forEach(function (line, i) {
      var cls = i === 0 ? 'app' : isNoise(line) ? 'dim' : 'app';
      pre.appendChild(h('div', { class: cls, text: line }));
    });
    return pre;
  }
  function kv(pairs) {
    var dl = h('dl', { class: 'kv' });
    pairs.forEach(function (p) {
      if (p[1] === undefined || p[1] === null || p[1] === '') return;
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: String(p[1]) }));
    });
    return dl;
  }
  function sec(title, hint, body, extra) {
    return h('section', { class: 'sec' }, [h('div', { class: 'copy-row' }, [h('h3', { text: title }), extra]), hint ? h('div', { class: 'hint', text: hint }) : null, body]);
  }
  function json(v) { return JSON.stringify(v, null, 2); }
  function hasKeys(o) { return o && typeof o === 'object' && Object.keys(o).length > 0; }
  function copy(text, btn) {
    function done() { var old = btn.textContent; btn.textContent = 'Copié'; setTimeout(function () { btn.textContent = old; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
    function fallback() {
      var ta = h('textarea', { class: 'offscreen' }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* ignoré */ } document.body.removeChild(ta);
    }
  }

  function renderEvent(group, ev) {
    var p = ev.payload || {}, req = p.request, user = p.user, rt = p.runtime, out = [];
    var o = origin(ev.stack);
    if (o) out.push(sec('Où est-ce arrivé ?', "Première ligne de code de l'application dans la pile d'appels.",
      h('div', { class: 'where' }, [h('strong', { text: o.fn }), h('code', { text: o.where })])));
    if (req) {
      var code = req.statusCode;
      out.push(sec('Que faisait l\'utilisateur ?', 'La requête reçue par le serveur au moment du problème.', kv([
        ['Requête', req.method + ' ' + req.url], ['Route', req.route],
        ['Résultat', code ? code + (httpHint(code) ? ' · ' + httpHint(code) : '') : ''],
        ['Durée', req.durationMs !== undefined ? req.durationMs + ' ms' : ''], ['Identifiant', req.requestId],
        ['Utilisateur', user && (user.mail || user.oid)], ['IP', req.ip], ['Navigateur', req.userAgent]
      ])));
      ['params', 'query', 'body'].forEach(function (k) {
        if (hasKeys(req[k])) out.push(sec({ params: 'Paramètres de l\'URL', query: 'Paramètres de recherche', body: 'Données envoyées' }[k],
          'Les valeurs sensibles (mots de passe, jetons) sont masquées.', h('pre', { class: 'code', text: json(req[k]) })));
      });
      if (req.curl) {
        var cbtn = h('button', { class: 'btn', type: 'button', text: 'Copier' });
        cbtn.addEventListener('click', function () { copy(req.curl, cbtn); });
        out.push(sec('Reproduire le problème', 'Commande cURL. Remplacez les valeurs [REDACTED] (ex. jeton) avant de l\'exécuter.', h('pre', { class: 'code', text: req.curl }), cbtn));
      }
    } else if (user && (user.mail || user.oid)) {
      out.push(sec('Contexte', '', kv([['Utilisateur', user.mail || user.oid]])));
    }
    if (ev.stack) out.push(sec('Pile d\'appels', 'Les lignes en gras sont le code de l\'application ; les lignes estompées viennent des bibliothèques.', renderStack(ev.stack)));
    if (hasKeys(p.extra)) out.push(sec('Informations supplémentaires', 'Ajoutées par le code au moment de la capture.', h('pre', { class: 'code', text: json(p.extra) })));
    if (rt) out.push(sec('Serveur', '', kv([
      ['Version', ev.version], ['Node', rt.node], ['Machine', rt.hostname], ['Système', rt.platform],
      ['Démarré depuis', rt.uptimeSec !== undefined ? Math.round(rt.uptimeSec / 60) + ' min' : ''],
      ['Mémoire', rt.memory ? rt.memory.rssMb + ' Mo (heap ' + rt.memory.heapUsedMb + ' Mo)' : '']
    ])));
    return out;
  }

  function setStatus(id, status) {
    return api('groups/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ status: status }) })
      .then(function () { return Promise.all([openGroup(id, true), loadList(), loadStats()]); })
      .catch(function (e) { if (e.message !== 'auth') alert('Impossible de changer le statut.'); });
  }

  function renderSheet(data) {
    var g = data.group, events = data.events;
    var sheet = clear($('sheet'));
    var holder = h('div');
    function showEvent(i) {
      clear(holder);
      if (!events.length) { holder.appendChild(h('div', { class: 'empty', text: 'Aucune occurrence conservée (purgée).' })); return; }
      renderEvent(g, events[i]).forEach(function (n) { holder.appendChild(n); });
    }
    var actions = h('div', { class: 'sh-actions' });
    if (g.status !== 'resolved') actions.appendChild(h('button', { class: 'btn primary', type: 'button', text: 'Marquer comme résolu', onclick: function () { setStatus(g.id, 'resolved'); } }));
    if (g.status !== 'ignored') actions.appendChild(h('button', { class: 'btn', type: 'button', text: 'Ignorer', onclick: function () { setStatus(g.id, 'ignored'); } }));
    if (g.status !== 'open') actions.appendChild(h('button', { class: 'btn', type: 'button', text: 'Rouvrir', onclick: function () { setStatus(g.id, 'open'); } }));

    var select = h('select', { 'aria-label': 'Occurrence', onchange: function () { showEvent(Number(select.value)); } });
    events.forEach(function (ev, i) { select.appendChild(h('option', { value: String(i), text: fmtDate(ev.timestamp) + (i === 0 ? ' (la plus récente)' : '') })); });

    sheet.appendChild(h('div', { class: 'sheet-in' }, [
      h('div', { class: 'sh-top' }, [
        h('div', { class: 'sh-badges' }, [levelBadge(g.level), statusBadge(g.status), badge('ignored', g.type)]),
        h('button', { class: 'btn', type: 'button', text: 'Fermer', onclick: closeSheet })
      ]),
      h('h2', { text: g.message }),
      h('div', { class: 'sub', text: g.count + (g.count > 1 ? ' occurrences' : ' occurrence') + ' · première fois ' + rel(g.firstSeen) + ' · dernière fois ' + rel(g.lastSeen) }),
      actions,
      h('div', { class: 'occ' }, [h('label', { text: 'Occurrence affichée :' }), select, h('span', { class: 'note', text: events.length < g.count ? events.length + ' sur ' + g.count + ' conservées affichables' : '' })]),
      holder,
      sec('Résumé du groupe', 'Les erreurs identiques sont regroupées automatiquement.', kv([
        ['Application', g.app], ['Environnement', g.environment], ['Première fois', fmtDate(g.firstSeen)], ['Dernière fois', fmtDate(g.lastSeen)],
        ['Type', g.type], ['Nom de l\'erreur', g.errorName], ['Empreinte', g.fingerprint]
      ]))
    ]));
    showEvent(0);
  }

  function openGroup(id, silent) {
    return api('groups/' + encodeURIComponent(id) + '?events=50').then(function (data) {
      S.current = id;
      renderSheet(data);
      $('drawer').hidden = false;
      if (!silent) $('sheet').scrollTop = 0;
      try { history.replaceState(null, '', '#g=' + id); } catch (e) { /* ignoré */ }
    }).catch(function (e) { if (e.message !== 'auth') alert('Groupe introuvable.'); });
  }
  function closeSheet() {
    $('drawer').hidden = true; S.current = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignoré */ }
  }

  /* ---------- Init ---------- */
  function refresh() { return Promise.all([loadStats(), loadList()]); }
  var debounce;
  $('fQ').addEventListener('input', function () { clearTimeout(debounce); debounce = setTimeout(function () { S.q = $('fQ').value.trim(); S.offset = 0; loadList(); }, 300); });
  $('fLevel').addEventListener('change', function () { S.level = $('fLevel').value; S.offset = 0; loadList(); });
  $('fApp').addEventListener('change', function () { S.app = $('fApp').value; S.offset = 0; loadList(); });
  $('fEnv').addEventListener('change', function () { S.env = $('fEnv').value; S.offset = 0; loadList(); });
  $('refresh').addEventListener('click', function () { refresh(); if (S.current) openGroup(S.current, true); });
  $('scrim').addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('drawer').hidden) closeSheet(); });
  $('auto').addEventListener('change', function () {
    clearInterval(S.timer);
    if ($('auto').checked) S.timer = setInterval(function () { refresh(); }, 30000);
  });
  $('saveToken').addEventListener('click', function () {
    var v = $('token').value.trim();
    try { if (v) sessionStorage.setItem('mon_token', v); else sessionStorage.removeItem('mon_token'); } catch (e) { /* ignoré */ }
    $('token').value = ''; refresh();
  });
  renderTabs();
  refresh().then(function () {
    var m = /^#g=(\d+)$/.exec(location.hash);
    if (m) openGroup(m[1]);
  });
})();
`;

export function renderUiHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Monitoring des erreurs</title>
<style nonce="${nonce}">${CSS}</style>
</head>
<body>${BODY}<script nonce="${nonce}">${SCRIPT}</script></body>
</html>`;
}
