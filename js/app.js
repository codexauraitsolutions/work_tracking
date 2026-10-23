/* ================= APP SHELL ================= */
let DB, S = { user: null, stack: [], draft: null, role: 'admin', sup: {} };
const KEY = 'sitetrack-proto-v2';
function save() { try { localStorage.setItem(KEY, JSON.stringify({ DB, user: S.user })); } catch (e) { } }
function load() { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.DB) { DB = v.DB; S.user = v.user; return true; } } catch (e) { } return false; }
function resetDemo() { DB = seed(); S.user = null; S.stack = [{ n: 'login' }]; S.draft = null; save(); render(); toast('Demo data reset', 'ok'); }

const $ = s => document.querySelector(s);
const ic = (n, c = '') => `<i data-lucide="${n}" class="ic ${c}"></i>`;
const U = id => DB.users.find(u => u.id === id);
const P = id => DB.projects.find(p => p.id === id);
const C = id => DB.clients.find(c => c.id === id);
const I = id => DB.items.find(i => i.id === id);
const B = id => DB.bills.find(b => b.id === id);
const me = () => U(S.user);
const FL = { 'Ground Floor': 'GF', 'First Floor': '1F', 'Second Floor': '2F', 'Third Floor': '3F', 'Fourth Floor': '4F', 'Fifth Floor': '5F', 'Sixth Floor': '6F' };
const shortG = g => g === 'Main works' ? '' : (FL[g] || g) + ' · ';
const pname = p => `${p.name} · ${p.sub}`;
const pct = (a, b) => b ? Math.min(100, a / b * 100) : 0;
const bar = (v, cls = '') => `<div class="bar ${cls}"><i style="width:${v.toFixed(1)}%"></i></div>`;
const chip = (t, k = 'grey', i = '') => `<span class="chip ${k}">${i ? ic(i, 'i12') : ''}${esc(t)}</span>`;
const billTone = s => ({ 'Awaiting approval': 'amber', 'Sent to client': 'blue', 'Accepted': 'green', 'Query raised': 'red' }[s] || 'grey');
const entryTone = s => ({ Pending: 'amber', Verified: 'green', Rejected: 'red' }[s]);
const ava = (t, color, cls = '') => `<div class="ava ${cls}" style="background:${color}">${esc(t)}</div>`;
const initials = n => n.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const photo = (p, cls = '') => p.startsWith('data:') ? `<div class="ph ${cls}" style="background-image:url(${p})"></div>` : `<div class="ph ${cls} ${p}"></div>`;

function go(n, p = {}) { S.stack.push({ n, p }); render(true); }
function replace(n, p = {}) { S.stack[S.stack.length - 1] = { n, p }; render(true); }
function back() { if (S.stack.length > 1) { S.stack.pop(); render(true); } }
function tab(n) { S.stack = [{ n, p: {} }]; render(true); }
/* Phone / browser Back button: closes a sheet, then goes back one screen, then to the role's home tab */
const HOME = { admin: 'aHome', supervisor: 'sHome', client: 'cHome' };
function armBack() { try { history.pushState({ st: 1 }, ''); } catch (e) { } }
window.addEventListener('popstate', () => {
  if ($('#overlay').classList.contains('on')) { closeSheet(); armBack(); return; }
  if (S.stack.length > 1) { S.stack.pop(); render(true); armBack(); return; }
  if (S.user && S.stack[0].n !== HOME[me().role]) { tab(HOME[me().role]); armBack(); }
});
function setP(patch) { Object.assign(S.stack[S.stack.length - 1].p, patch); render(); }

function toast(msg, kind = '') { const t = $('#toast'); t.innerHTML = `${ic(kind === 'ok' ? 'check-circle-2' : kind === 'err' ? 'alert-circle' : 'info')}<span>${esc(msg)}</span>`; t.className = 'toast show ' + kind; icons(); clearTimeout(t._t); t._t = setTimeout(() => t.className = 'toast', 2600); }
function sheet(html) { $('#overlay').innerHTML = `<div class="scrim" data-a="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`; $('#overlay').classList.add('on'); icons(); }
function closeSheet() { $('#overlay').classList.remove('on'); $('#overlay').innerHTML = ''; }
function icons() { if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 2 } }); }

const TABS = {
  admin: [['aHome', 'layout-dashboard', 'Home'], ['aProjects', 'building-2', 'Projects'], ['aVerify', 'clipboard-check', 'Verify'], ['aBills', 'receipt', 'Bills'], ['profile', 'user-round', 'Profile']],
  supervisor: [['sHome', 'hard-hat', 'Today'], ['sHistory', 'history', 'History'], ['profile', 'user-round', 'Profile']],
  client: [['cHome', 'home', 'Home'], ['cBills', 'receipt', 'Bills'], ['cProgress', 'bar-chart-3', 'Progress'], ['profile', 'user-round', 'Profile']],
};
function badgeFor(n) {
  if (n === 'aVerify') return DB.entries.filter(e => e.status === 'Pending').length;
  if (n === 'aBills') return DB.bills.filter(b => b.status === 'Awaiting approval' || b.status === 'Query raised').length;
  if (n === 'cBills') return clientBills().filter(b => b.status === 'Sent to client').length;
  return 0;
}
function tabbar() {
  const root = S.stack[0].n;
  return TABS[me().role].map(([n, i, l]) => { const b = badgeFor(n); return `<button class="tb ${root === n ? 'on' : ''}" data-a="tab" data-n="${n}">${ic(i)}<span>${l}</span>${b ? `<b class="badge">${b}</b>` : ''}</button>`; }).join('');
}
function header(r) {
  if (r.hdr === false) return '';
  const canBack = S.stack.length > 1;
  const notif = notifications().length;
  return `<header class="hdr ${r.tone || ''}">
    <div class="hrow">${canBack ? `<button class="hbtn" data-a="back" aria-label="Back">${ic('chevron-left')}</button>` : ''}
      <div class="htxt">${r.eyebrow ? `<div class="eyebrow">${esc(r.eyebrow)}</div>` : ''}<h1>${esc(r.title)}</h1>${r.sub ? `<div class="hsub">${esc(r.sub)}</div>` : ''}</div>
      ${r.right ?? `<button class="hbtn" data-a="go" data-n="notifs" aria-label="Notifications">${ic('bell')}${notif ? `<b class="dotb"></b>` : ''}</button>`}</div>
    ${r.hextra || ''}</header>`;
}
function render(scrollTop) {
  const cur = S.stack[S.stack.length - 1];
  const r = SCREENS[cur.n](cur.p || {});
  $('#hdr').innerHTML = header(r);
  const sc = $('#scroll'); sc.innerHTML = r.body; sc.className = 'scroll ' + (r.cls || '');
  $('#app').className = 'app ' + (r.appCls || '');
  const showTabs = S.user && !r.noTabs;
  $('#tabs').innerHTML = showTabs ? tabbar() : ''; $('#tabs').hidden = !showTabs;
  $('#footer').innerHTML = r.footer || ''; $('#footer').hidden = !r.footer;
  if (scrollTop) sc.scrollTop = 0;
  icons(); r.after && r.after(); save();
  document.querySelectorAll('[data-guide]').forEach(b => b.classList.toggle('on', S.user && me().role === b.dataset.guide));
}

/* ---------- shared pieces ---------- */
function sectionHead(t, right = '') { return `<div class="sh"><h2>${esc(t)}</h2>${right}</div>`; }
function empty(icon, title, text, cta = '') { return `<div class="empty">${ic(icon, 'i28')}<b>${esc(title)}</b><p>${esc(text)}</p>${cta}</div>`; }
function kv(k, v, cls = '') { return `<div class="kv ${cls}"><span>${esc(k)}</span><b>${v}</b></div>`; }
function seg(items, val, act) { return `<div class="seg" role="tablist">${items.map(([v, l, b]) => `<button role="tab" aria-selected="${v === val}" class="${v === val ? 'on' : ''}" data-a="${act}" data-v="${v}">${esc(l)}${b ? `<b class="badge sm">${b}</b>` : ''}</button>`).join('')}</div>`; }
function projectCard(p, opts = {}) {
  const val = projValue(DB, p.id), done = projDone(DB, p.id), cy = cycleInfo(p);
  const hasWO = DB.wos.some(w => w.projectId === p.id);
  const sup = U(p.supervisorId);
  return `<button class="card pc" data-a="go" data-n="${opts.to || 'aProject'}" data-id="${p.id}">
   <div class="row between"><div class="pc-t"><b>${esc(pname(p))}</b><span class="muted sm">${ic('map-pin', 'i12')} ${esc(p.address)}</span></div>${hasWO ? (cy.notStarted ? chip('Starts ' + dfmt(p.start), 'grey') : chip('Active', 'green')) : chip('No work order', 'amber', 'file-warning')}</div>
   <div class="pc-m"><div><span class="lbl">Bill cycle</span><b>Every ${p.cycle} days</b></div><div><span class="lbl">${opts.client ? 'Work done' : 'Supervisor'}</span><b>${opts.client ? money(done) : esc(sup ? sup.name : '—')}</b></div><div><span class="lbl">WO value</span><b>${hasWO ? money(val) : '—'}</b></div></div>
   ${hasWO ? `<div class="row between sm"><span class="muted">${cy.notStarted ? 'Not started' : `Cycle ${cy.k + 1} · day ${cy.day} of ${p.cycle}`}</span><b>${pct(done, val).toFixed(1)}%</b></div>${bar(pct(done, val))}` : ''}
  </button>`;
}
function entryCard(e, opts = {}) {
  const it = I(e.itemId), p = P(e.projectId), by = U(e.by);
  return `<div class="card ec">
    <div class="row between"><div><div class="sm muted">${opts.showProject ? esc(pname(p)) + ' · ' : ''}${dlong(e.date)}</div><b class="ec-t">${esc(shortG(it.group))}${esc(it.name)}</b></div>${chip(e.status, entryTone(e.status))}</div>
    <div class="ec-q"><div><span class="lbl">Quantity</span><b>${qn(e.qty, it.unit)}</b></div><div><span class="lbl">Value</span><b>${money(e.qty * it.rate)}</b></div><div><span class="lbl">Labour</span><b>${e.labour || '—'}</b></div></div>
    ${e.remarks ? `<p class="ec-r">${ic('message-square-text', 'i14')} ${esc(e.remarks)}</p>` : ''}
    ${e.photos?.length ? `<div class="phs">${e.photos.map(x => photo(x, 'sm')).join('')}</div>` : ''}
    <div class="sm muted ec-by">${ic('hard-hat', 'i12')} ${esc(by?.name || '')}${e.status === 'Verified' ? ` · verified by ${esc(U(e.verifiedBy)?.name || '')}` : ''}${e.status === 'Rejected' && e.reason ? ` · <span class="red">${esc(e.reason)}</span>` : ''}</div>
    ${opts.actions && e.status === 'Pending' ? `<div class="row gap8 ec-a"><button class="btn ghost sm" data-a="rejectEntry" data-id="${e.id}">${ic('x')} Reject</button><button class="btn green sm" data-a="verifyEntry" data-id="${e.id}">${ic('check')} Verify</button></div>` : ''}
  </div>`;
}
function billCard(b, to = 'bill') {
  const p = P(b.projectId);
  return `<button class="card bc" data-a="go" data-n="${to}" data-id="${b.id}"><div class="bc-i">${ic('receipt')}</div><div class="grow"><div class="row between"><b>${esc(b.no)}</b>${chip(b.status, billTone(b.status))}</div><div class="sm muted">${esc(pname(p))}</div><div class="row between bc-f"><span class="sm muted">${dfmt(b.from)} – ${dlong(b.to)}</span><b>${money(b.net)}</b></div></div></button>`;
}
function cycleCard(p, opts = {}) {
  const cy = cycleInfo(p);
  if (cy.notStarted) return `<div class="card cyc"><div class="row between"><b>Cycle 1</b>${chip('Starts ' + dfmt(p.start), 'grey')}</div><p class="sm muted">${dlong(cy.from)} – ${dlong(cy.to)} · bill every ${p.cycle} days</p></div>`;
  const val = projDone(DB, p.id, TODAY, cy.from);
  const pend = DB.entries.filter(e => e.projectId === p.id && e.status === 'Pending' && e.date >= cy.from).length;
  const billed = DB.bills.find(b => b.projectId === p.id && b.k === cy.k);
  return `<div class="card cyc ${opts.dark ? 'dark' : ''}">
    <div class="row between"><div><span class="lbl">Current bill cycle</span><b class="cyc-t">Cycle ${cy.k + 1} · ${dfmt(cy.from)} – ${dfmt(cy.to)}</b></div><div class="cyc-d"><b>${cy.day}</b><span>/${p.cycle} days</span></div></div>
    ${bar(cy.day / p.cycle * 100, 'amber')}
    <div class="row between cyc-v"><span>Verified work this cycle</span><b>${money(val)}</b></div>
    ${pend && !opts.client ? `<div class="sm cyc-n">${ic('clock', 'i12')} ${pend} ${pend > 1 ? 'entries' : 'entry'} waiting for verification</div>` : ''}
    ${billed ? `<div class="sm cyc-n">${ic('check-circle-2', 'i12')} ${esc(billed.no)} generated</div>` : cy.endsToday ? `<div class="sm cyc-n hl">${ic('sparkles', 'i12')} Cycle ends today — RA bill is created automatically at 11:59 PM</div>` : `<div class="sm cyc-n">${ic('calendar-clock', 'i12')} RA bill auto-generates on ${dlong(cy.to)} (${cy.daysLeft} days left)</div>`}
    ${opts.admin && !billed ? `<button class="btn ${opts.dark ? 'amber' : 'dark'} sm full" data-a="genBill" data-id="${p.id}">${ic('file-plus-2')} Generate RA bill now (demo)</button>` : ''}
  </div>`;
}
function notifications() {
  if (!S.user) return [];
  const u = me(), out = [];
  if (u.role === 'admin') {
    const pe = DB.entries.filter(e => e.status === 'Pending');
    if (pe.length) out.push(['clipboard-check', `${pe.length} daily entries waiting for verification`, 'aVerify', '', 'amber']);
    DB.bills.filter(b => b.status === 'Awaiting approval').forEach(b => out.push(['receipt', `${b.no} for ${pname(P(b.projectId))} is ready for approval`, 'bill', b.id, 'blue']));
    DB.bills.filter(b => b.status === 'Query raised').forEach(b => out.push(['message-circle-warning', `Client raised a query on ${b.no}`, 'bill', b.id, 'red']));
    DB.projects.filter(p => cycleInfo(p).endsToday && !DB.bills.some(b => b.projectId === p.id && b.k === cycleInfo(p).k) && DB.items.some(i => i.projectId === p.id)).forEach(p => out.push(['calendar-check', `Bill cycle for ${pname(p)} ends today`, 'aProject', p.id, 'amber']));
    DB.projects.filter(p => !DB.wos.some(w => w.projectId === p.id)).forEach(p => out.push(['file-up', `${pname(p)} has no work order yet`, 'aProject', p.id, 'grey']));
  } else if (u.role === 'supervisor') {
    supProjects().forEach(p => { if (!DB.entries.some(e => e.projectId === p.id && e.date === TODAY && e.by === u.id)) out.push(['pencil-line', `Today's update pending for ${pname(p)}`, 'sHome', '', 'amber']); });
    DB.entries.filter(e => e.by === u.id && e.status === 'Rejected').forEach(e => out.push(['x-circle', `Entry for ${dfmt(e.date)} was rejected — please correct`, 'sUpdate', e.itemId, 'red']));
  } else {
    clientBills().filter(b => b.status === 'Sent to client').forEach(b => out.push(['receipt', `${b.no} is ready for your review`, 'bill', b.id, 'blue']));
  }
  return out;
}
const supProjects = () => DB.projects.filter(p => p.supervisorId === S.user && DB.items.some(i => i.projectId === p.id));
const clientProjects = () => DB.projects.filter(p => p.clientId === me().clientId);
const clientBills = () => DB.bills.filter(b => P(b.projectId).clientId === me().clientId && b.status !== 'Awaiting approval').sort((a, b) => b.to.localeCompare(a.to));

/* ---------- charts ---------- */
function dailyChart(points, unit, opts = {}) {
  const W = 340, H = 150, padL = 6, padB = 22, padT = 18;
  const n = points.length || 1, max = Math.max(...points.map(p => p.q), 1);
  const bw = (W - padL * 2) / n;
  let cum = 0; const tot = points.reduce((a, p) => a + p.q, 0) || 1;
  const bars = points.map((p, i) => { const h = (p.q / max) * (H - padB - padT); const x = padL + i * bw + bw * .18; return `<rect x="${x.toFixed(1)}" y="${(H - padB - h).toFixed(1)}" width="${(bw * .64).toFixed(1)}" height="${Math.max(h, p.q ? 2 : 0).toFixed(1)}" rx="2.5" class="${p.pending ? 'cb-p' : 'cb'}"><title>${dfmt(p.d)}: ${qn(p.q, unit)}</title></rect>`; }).join('');
  const line = opts.cum ? points.map((p, i) => { cum += p.q; return `${i ? 'L' : 'M'}${(padL + i * bw + bw / 2).toFixed(1)},${(H - padB - (cum / tot) * (H - padB - padT)).toFixed(1)}`; }).join('') : '';
  const lab = (i, a) => points[i] ? `<text x="${(padL + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="${a}" class="ct">${dfmt(points[i].d)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Daily quantity chart"><line x1="0" x2="${W}" y1="${H - padB}" y2="${H - padB}" class="cax"/>${bars}${line ? `<path d="${line}" class="cl"/>` : ''}<text x="${W - 2}" y="11" text-anchor="end" class="ct">peak ${qn(max, unit)}</text>${lab(0, 'start')}${lab(points.length - 1, 'end')}</svg>`;
}
function seriesFor(itemIds, from, to, includePending) {
  const pts = []; for (let d = from; d <= to; d = addDays(d, 1)) {
    const es = DB.entries.filter(e => itemIds.includes(e.itemId) && e.date === d && (e.status === 'Verified' || (includePending && e.status === 'Pending')));
    pts.push({ d, q: es.reduce((a, e) => a + e.qty, 0), pending: es.some(e => e.status === 'Pending') });
  } return pts;
}
