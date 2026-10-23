/* ================= SCREENS ================= */
const ROLES = {
  admin: { icon: 'shield-check', title: 'Admin', text: 'Full access — clients, projects, work order PDFs, verification and bills', user: 'u1' },
  supervisor: { icon: 'hard-hat', title: 'Site Supervisor', text: 'Updates the quantity of work done on site every day', user: 'u2' },
  client: { icon: 'building-2', title: 'Client', text: 'Sees RA bills and how every quantity in them was done', user: 'u3' },
};
const SCREENS = {};

/* ---------- LOGIN ---------- */
SCREENS.login = () => {
  const r = S.role, u = U(ROLES[r].user);
  return {
    hdr: false, noTabs: true, appCls: 'dark', cls: 'login',
    body: `<div class="lg">
      <div class="lg-brand"><div class="logo">${ic('hard-hat', 'i28')}</div><div><b>SiteTrack</b><span>Work orders · Daily progress · RA bills</span></div></div>
      <h1 class="lg-h">Sign in</h1>
      <div class="lbl lt">I am a</div>
      <div class="roles">${Object.entries(ROLES).map(([k, v]) => `<button class="role ${k === r ? 'on' : ''}" data-a="pickRole" data-v="${k}" aria-pressed="${k === r}"><span class="ri">${ic(v.icon)}</span><span class="rt"><b>${v.title}</b><span>${v.text}</span></span><span class="rc">${ic('check', 'i14')}</span></button>`).join('')}</div>
      <label class="lbl lt" for="lgPhone">Mobile number</label>
      <div class="lg-in">${ic('smartphone', 'i16')}<span>+91</span><input id="lgPhone" value="${esc(u.phone)}" inputmode="tel"></div>
      <label class="lbl lt" for="lgPass">Password</label>
      <div class="lg-in">${ic('lock', 'i16')}<input id="lgPass" type="password" value="demo1234"></div>
      <button class="btn amber big full" data-a="login">Login as ${ROLES[r].title} ${ic('arrow-right')}</button>
      <button class="lg-g" data-a="guide">${ic('map')} How to try this prototype</button>
    </div>`
  };
};

/* ---------- ADMIN ---------- */
SCREENS.aHome = () => {
  const u = me(); const pend = DB.entries.filter(e => e.status === 'Pending').length;
  const toApprove = DB.bills.filter(b => b.status === 'Awaiting approval').length;
  const active = DB.projects.filter(p => DB.wos.some(w => w.projectId === p.id)).length;
  const att = notifications();
  return {
    tone: 'navy', eyebrow: 'Good evening', title: u.name, sub: 'Admin · ' + dlong(TODAY),
    hextra: `<div class="kpis">
      <button data-a="tab" data-n="aProjects"><span>Clients</span><b>${DB.clients.length}</b></button>
      <button data-a="tab" data-n="aProjects"><span>Active projects</span><b>${active}</b></button>
      <button data-a="tab" data-n="aVerify"><span>To verify</span><b class="${pend ? 'am' : ''}">${pend}</b></button>
      <button data-a="tab" data-n="aBills"><span>To approve</span><b class="${toApprove ? 'am' : ''}">${toApprove}</b></button></div>`,
    body: `
      <div class="qa">
        <button data-a="startUpload">${ic('file-up')}<span>Upload work order</span></button>
        <button data-a="newProjectPick">${ic('folder-plus')}<span>New project</span></button>
        <button data-a="addClient">${ic('user-plus')}<span>Add client</span></button>
        <button data-a="go" data-n="aUsers">${ic('users')}<span>Users</span></button>
      </div>
      ${sectionHead('Needs your attention')}
      <div class="list">${att.length ? att.slice(0, 5).map(([i, t, n, id, tone]) => `<button class="card att" data-a="go" data-n="${n}" data-id="${id}"><span class="att-i ${tone}">${ic(i)}</span><span class="grow">${esc(t)}</span>${ic('chevron-right', 'i16 muted')}</button>`).join('') : empty('party-popper', 'All caught up', 'Nothing needs your attention right now.')}</div>
      ${sectionHead('Clients', `<button class="link" data-a="addClient">${ic('plus', 'i14')} Add</button>`)}
      <div class="list">${DB.clients.map(c => { const ps = DB.projects.filter(p => p.clientId === c.id); const v = ps.reduce((a, p) => a + projValue(DB, p.id), 0); const due = DB.bills.filter(b => ps.some(p => p.id === b.projectId) && b.status === 'Awaiting approval').length;
        return `<button class="card cl" data-a="go" data-n="aClient" data-id="${c.id}">${ava(c.ini, c.color)}<span class="grow"><b>${esc(c.name)}</b><span class="sm muted">${ps.length} projects · ${v ? money(v) : 'no work orders'}</span></span>${due ? chip(due + ' bill due', 'amber') : ''}${ic('chevron-right', 'i16 muted')}</button>`; }).join('')}</div>`
  };
};

SCREENS.aClient = ({ id }) => {
  const c = C(id), ps = DB.projects.filter(p => p.clientId === id);
  const v = ps.reduce((a, p) => a + projValue(DB, p.id), 0), d = ps.reduce((a, p) => a + projDone(DB, p.id), 0);
  const billed = DB.bills.filter(b => ps.some(p => p.id === b.projectId)).reduce((a, b) => a + b.net, 0);
  return {
    title: c.name, sub: c.full + ' · ' + c.city,
    body: `<div class="card stats3"><div><span class="lbl">Work order value</span><b>${money(v)}</b></div><div><span class="lbl">Work done</span><b>${money(d)}</b></div><div><span class="lbl">Billed (net)</span><b>${money(billed)}</b></div></div>
      ${sectionHead(`Projects (${ps.length})`)}
      <div class="list">${ps.map(p => projectCard(p)).join('') || empty('building', 'No projects yet', 'Create the first project for this client.')}</div>`,
    footer: `<button class="btn amber full" data-a="go" data-n="aProjectNew" data-id="${id}">${ic('plus')} New project for ${esc(c.name)}</button>`
  };
};

SCREENS.aProjects = ({ q = '', f = 'all' }) => {
  const match = p => (pname(p) + C(p.clientId).name).toLowerCase().includes(q.toLowerCase());
  const filt = p => f === 'all' || (f === 'nowo' ? !DB.wos.some(w => w.projectId === p.id) : DB.wos.some(w => w.projectId === p.id));
  const groups = DB.clients.map(c => [c, DB.projects.filter(p => p.clientId === c.id && match(p) && filt(p))]).filter(g => g[1].length);
  return {
    title: 'Projects', sub: `${DB.projects.length} projects across ${DB.clients.length} clients`,
    hextra: `<div class="search">${ic('search', 'i16')}<input id="pq" placeholder="Search project or client" value="${esc(q)}" aria-label="Search projects"></div>`,
    body: `${seg([['all', 'All'], ['active', 'Active'], ['nowo', 'No work order', DB.projects.filter(p => !DB.wos.some(w => w.projectId === p.id)).length]], f, 'projFilter')}
      ${groups.map(([c, ps]) => `<div class="grp"><div class="grp-h">${ava(c.ini, c.color, 'xs')}<b>${esc(c.name)}</b></div><div class="list">${ps.map(p => projectCard(p)).join('')}</div></div>`).join('') || empty('search-x', 'No projects found', 'Try a different search.')}`,
    footer: `<button class="btn amber full" data-a="newProjectPick">${ic('plus')} New project</button>`,
    after: () => { const i = $('#pq'); i.oninput = () => { S.stack[0].p.q = i.value; const pos = i.selectionStart; render(); const j = $('#pq'); j.focus(); j.setSelectionRange(pos, pos); }; }
  };
};

SCREENS.aProjectNew = ({ id }) => {
  const sups = DB.users.filter(u => u.role === 'supervisor'), cus = DB.users.filter(u => u.role === 'client');
  return {
    title: 'New project', sub: 'Step 1 of 2 · then upload the work order',
    body: `<form id="npf" class="form" novalidate>
      <div class="fld"><label for="npClient">Client</label><select id="npClient">${DB.clients.map(c => `<option value="${c.id}" ${c.id === id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="fld"><label for="npName">Project name</label><input id="npName" placeholder="e.g. Brigade Citadel 2" required></div>
      <div class="fld"><label for="npSub">Sub project / Tower / Package</label><input id="npSub" placeholder="e.g. Tower C"></div>
      <div class="fld"><label for="npAddr">Site address</label><input id="npAddr" placeholder="Village, mandal, district"></div>
      <div class="fld"><label for="npStart">Start date</label><input id="npStart" type="date" value="${TODAY}"></div>
      <div class="fld"><label>Billing cycle</label><div class="pills" id="npCycle">${[15, 20, 30].map(d => `<button type="button" class="pill ${d === 20 ? 'on' : ''}" data-a="pickCycle" data-v="${d}">${d} days</button>`).join('')}<button type="button" class="pill" data-a="pickCycle" data-v="custom">Custom</button></div>
        <input id="npCycleCustom" type="number" min="1" max="120" placeholder="Number of days" hidden><p class="hint">${ic('info', 'i12')} An RA bill is created automatically at the end of every cycle.</p></div>
      <div class="row gap10"><div class="fld grow"><label for="npRet">Retention %</label><input id="npRet" type="number" value="5" step="0.5"></div><div class="fld grow"><label for="npTds">TDS %</label><input id="npTds" type="number" value="0" step="0.5"></div></div>
      <div class="fld"><label for="npSup">Site supervisor</label><select id="npSup"><option value="">Assign later</option>${sups.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select></div>
      <div class="fld"><label for="npCu">Client login (can view bills)</label><select id="npCu"><option value="">None</option>${cus.map(u => `<option value="${u.id}">${esc(u.name)} — ${esc(u.org)}</option>`).join('')}</select></div>
      <p class="err" id="npErr" hidden></p></form>`,
    footer: `<button class="btn amber full" data-a="createProject">${ic('check')} Create project &amp; continue</button>`
  };
};

SCREENS.aProject = ({ id, t = 'overview' }) => {
  const p = P(id), c = C(p.clientId), wos = DB.wos.filter(w => w.projectId === id), items = projItems(DB, id);
  const val = projValue(DB, id), done = projDone(DB, id);
  const pendN = DB.entries.filter(e => e.projectId === id && e.status === 'Pending').length;
  let body = '';
  if (t === 'overview') {
    body = !wos.length ? `<div class="card hero-empty">${ic('file-up', 'i32')}<b>Upload the work order PDF</b><p>The app reads every line item — quantity, unit, rate — and saves it. The supervisor can start daily updates right after.</p><button class="btn amber full" data-a="go" data-n="aUpload" data-id="${id}">${ic('upload')} Upload work order PDF</button></div>` :
      `${cycleCard(p, { admin: true })}
       <div class="card"><div class="row between"><div><span class="lbl">Executed value (verified)</span><b class="big">${money(done)}</b></div><div class="ta-r"><span class="lbl">of WO value</span><b>${money(val)}</b></div></div>${bar(pct(done, val))}<div class="sm muted mt6">${pct(done, val).toFixed(1)}% complete</div></div>`;
    body += `${sectionHead('Team')}
      <div class="card list0">
        <div class="li">${ava(initials(U(p.supervisorId)?.name || '?'), '#3A4B73', 'sm')}<span class="grow"><b>${esc(U(p.supervisorId)?.name || 'Not assigned')}</b><span class="sm muted">Site supervisor</span></span><button class="link" data-a="assignSup" data-id="${id}">${p.supervisorId ? 'Change' : 'Assign'}</button></div>
        <div class="li">${ava(c.ini, c.color, 'sm')}<span class="grow"><b>${esc(U(p.clientUserId)?.name || 'No client login')}</b><span class="sm muted">Client · ${esc(c.name)}</span></span></div></div>
      ${sectionHead('Project details')}
      <div class="card">${kv('Client', esc(c.full))}${kv('Site', esc(p.address))}${kv('Start date', dlong(p.start))}${kv('Billing cycle', `Every ${p.cycle} days`)}${kv('Retention', p.retention + '%')}${kv('TDS', p.tds + '%')}</div>`;
  }
  if (t === 'wo') {
    if (!wos.length) body = empty('file-x', 'No work order yet', 'Upload the PDF to create the item list.', `<button class="btn amber" data-a="go" data-n="aUpload" data-id="${id}">${ic('upload')} Upload PDF</button>`);
    else body = wos.map(w => `<div class="card wo">
        <div class="row gap10"><div class="pdf">${ic('file-text')}<span>PDF</span></div><div class="grow"><b class="wrapall">${esc(w.no)}</b><div class="sm muted">${esc(w.file)} · uploaded ${dlong(w.uploadedOn)}</div></div></div>
        <div class="wo-g">${kv('Type', esc(w.type))}${kv('Contractor', esc(w.contractor))}${kv('WO date', dlong(w.date))}${kv('Value', money(w.total))}</div></div>`).join('') +
      groupItems(items).map(([g, its]) => `<div class="grp"><div class="grp-h"><b>${esc(g)}</b><span class="sm muted">${its.length} items</span></div><div class="card list0">${its.map(i => itemRow(i, true)).join('')}</div></div>`).join('') +
      `<button class="btn ghost full mt12" data-a="go" data-n="aUpload" data-id="${id}">${ic('upload')} Upload another work order</button>`;
  }
  if (t === 'log') {
    const es = DB.entries.filter(e => e.projectId === id).sort((a, b) => b.date.localeCompare(a.date) || (a.status === 'Pending' ? -1 : 1)).slice(0, 40);
    body = (pendN ? `<button class="btn green full mb12" data-a="verifyAll" data-id="${id}">${ic('check-check')} Verify all ${pendN} pending</button>` : '') + (es.map(e => entryCard(e, { actions: true })).join('') || empty('clipboard', 'No daily entries yet', 'The supervisor’s updates appear here.'));
  }
  if (t === 'bills') {
    const bs = DB.bills.filter(b => b.projectId === id).sort((a, b) => b.to.localeCompare(a.to));
    body = (wos.length ? cycleCard(p, { admin: true }) : '') + sectionHead('RA bills') + `<div class="list">${bs.map(b => billCard(b)).join('') || empty('receipt', 'No bills yet', 'The first bill is created at the end of cycle 1.')}</div>`;
  }
  return {
    title: pname(p), sub: c.name + ' · ' + p.address,
    hextra: seg([['overview', 'Overview'], ['wo', 'Work order'], ['log', 'Daily log', pendN], ['bills', 'Bills']], t, 'projTab'),
    body
  };
};
function groupItems(items) { const m = new Map(); items.slice().sort((a, b) => a.sr - b.sr).forEach(i => { if (!m.has(i.group)) m.set(i.group, []); m.get(i.group).push(i); }); return [...m]; }
function itemRow(i, admin) {
  const d = itemDone(DB, i), pc = pct(d, i.qty);
  return `<div class="li it"><div class="grow"><div class="row between"><b class="sm2">${i.sr}. ${esc(i.name)}</b><span class="sm b">${money(i.amount)}</span></div>
    <div class="sm muted">${qn(i.qty, i.unit)} @ ₹${q2(i.rate)}</div>
    ${i.kind === 'bonus' ? (i.earnedOn ? `<div class="sm green mt4">${ic('badge-check', 'i12')} Earned on ${dlong(i.earnedOn)}</div>` : admin ? `<button class="link sm mt4" data-a="earnBonus" data-id="${i.id}">${ic('award', 'i12')} Mark bonus as earned</button>` : `<div class="sm muted mt4">Bonus — paid when milestone is met</div>`) :
      `<div class="row between sm mt4"><span class="muted">Done ${qn(d, '')}</span><b>${pc.toFixed(0)}%</b></div>${bar(pc, pc >= 100 ? '' : 'amber')}`}</div></div>`;
}

/* upload + extraction */
SCREENS.aUpload = ({ id }) => {
  const p = P(id), d = S.draft && S.draft.projectId === id ? S.draft : null;
  const steps = ['Reading PDF pages', 'Finding work order header', 'Extracting line items', 'Matching totals with PDF'];
  return {
    title: 'Upload work order', sub: pname(p),
    hextra: stepper(1),
    body: `${!d ? `<label class="drop" for="woFile">${ic('file-up', 'i32')}<b>Choose work order PDF</b><span>From phone storage, WhatsApp or email</span><input id="woFile" type="file" accept="application/pdf,.pdf"></label>
      <div class="or"><span>or</span></div>
      <button class="card samp" data-a="useSample" data-id="${id}"><div class="pdf">${ic('file-text')}<span>PDF</span></div><span class="grow"><b>Use sample: Ayati work order</b><span class="sm muted">woayaticonstructiongst.pdf · 2 pages</span></span>${ic('chevron-right', 'i16 muted')}</button>
      <div class="card tip">${ic('lightbulb', 'i16')}<span>Works with any client format. The app reads the header, every line item and the totals, then shows them to you for a quick check before saving.</span></div>` :
      `<div class="card samp"><div class="pdf">${ic('file-text')}<span>PDF</span></div><span class="grow"><b class="wrapall">${esc(d.file.name)}</b><span class="sm muted">${d.file.size}</span></span>${d.done ? chip('Read', 'green', 'check') : ''}<button class="hbtn plain" data-a="clearDraft" aria-label="Remove file">${ic('x')}</button></div>
      <div class="card"><b class="mb8 blk">${d.done ? 'Done — ready for your review' : 'Reading the document…'}</b><div class="steps">${steps.map((s, i) => `<div class="st ${i < d.prog ? 'ok' : i === d.prog ? 'run' : ''}"><span class="sd">${i < d.prog ? ic('check', 'i14') : i === d.prog ? '<i class="spin"></i>' : i + 1}</span><span>${s}${i < d.prog && i === 2 ? ` — <b>${d.data.items.length} items</b>` : ''}${i < d.prog && i === 3 ? ` — <b>${money(d.data.pdfTotal)}</b>` : ''}</span></div>`).join('')}</div>${bar(d.prog / steps.length * 100, 'amber')}</div>
      ${d.done ? `<div class="card stats3"><div><span class="lbl">Items</span><b>${d.data.items.length}</b></div><div><span class="lbl">Groups</span><b>${groupItems(d.data.items).length}</b></div><div><span class="lbl">Total</span><b>${money(d.data.pdfTotal)}</b></div></div>` : ''}
      <p class="proto-note">${ic('flask-conical', 'i12')} Prototype: any PDF you pick is read as the sample Ayati work order.</p>`}`,
    footer: d && d.done ? `<button class="btn amber full" data-a="go" data-n="aReview" data-id="${id}">Review extracted data ${ic('arrow-right')}</button>` : '',
    after: () => { const f = $('#woFile'); if (f) f.onchange = () => { const x = f.files[0]; if (x) startExtract(id, { name: x.name, size: (x.size / 1024).toFixed(0) + ' KB' }); }; }
  };
};
function stepper(n) { return `<div class="stepper">${['Upload', 'Review', 'Save'].map((s, i) => `<div class="${i + 1 < n ? 'ok' : i + 1 === n ? 'on' : ''}"><span>${i + 1 < n ? '✓' : i + 1}</span>${s}</div>`).join('<i></i>')}</div>`; }
function startExtract(pid, file) {
  const p = P(pid);
  S.draft = { projectId: pid, file, prog: 0, done: false, data: sampleExtraction() };
  render();
  const tick = () => { if (!S.draft || S.draft.projectId !== pid) return; S.draft.prog++; if (S.draft.prog >= 4) S.draft.done = true; if (S.stack.at(-1).n === 'aUpload') render(); if (!S.draft.done) setTimeout(tick, 650); };
  setTimeout(tick, 650);
}

SCREENS.aReview = ({ id, t = 'header' }) => {
  const p = P(id), d = S.draft; if (!d) return SCREENS.aUpload({ id });
  const h = d.data.header, total = d.data.items.reduce((a, i) => a + i.amount, 0), diff = total - d.data.pdfTotal;
  const mism = h.sub.replace(/[\s-]/g, '').toLowerCase() !== p.sub.replace(/[\s-]/g, '').toLowerCase();
  const f = (k, l, full) => `<div class="fld ${full ? 'full' : ''}"><label for="h_${k}">${l}</label><input id="h_${k}" data-a="" data-h="${k}" value="${esc(h[k])}"></div>`;
  return {
    title: 'Review work order', sub: 'Check what was read from the PDF',
    hextra: stepper(2) + seg([['header', 'Header details'], ['items', `Line items (${d.data.items.length})`]], t, 'reviewTab'),
    body: t === 'header' ? `
      ${mism ? `<div class="card warn">${ic('alert-triangle', 'i16')}<span>PDF says sub project <b>“${esc(h.sub)}”</b>, but this project is <b>${esc(p.sub)}</b>. Check that you picked the right PDF.</span></div>` : `<div class="card okc">${ic('badge-check', 'i16')}<span>Project and sub project match <b>${esc(pname(p))}</b>.</span></div>`}
      <div class="card form g2">${f('no', 'Work order no', 1)}${f('date', 'WO date')}${f('type', 'WO type')}${f('project', 'Project')}${f('sub', 'Sub project')}${f('contractor', 'Contractor')}${f('mobile', 'Contractor mobile')}${f('taxCat', 'Tax category')}${f('pos', 'Place of supply')}</div>
      ${sectionHead('Terms found in the PDF')}
      <div class="card terms">${d.data.terms.map(x => `<div>${ic('check', 'i14')}<span>${esc(x)}</span></div>`).join('')}</div>
      <div class="card navyc"><div><span class="lbl">Work order value</span><b class="big">${money(d.data.pdfTotal)}</b></div><div class="ta-r sm">${d.data.items.length} items<br>${groupItems(d.data.items).length} groups</div></div>` :
      `<p class="sm muted mb8">Tap any item to correct quantity or rate.</p>
      ${groupItems(d.data.items).map(([g, its]) => `<div class="grp"><div class="grp-h"><b>${esc(g)}</b><span class="sm muted">${money(its.reduce((a, i) => a + i.amount, 0))}</span></div><div class="card list0">${its.map(i => `<button class="li rv" data-a="editItem" data-sr="${i.sr}"><span class="srn">${i.sr}</span><span class="grow"><b class="sm2">${esc(i.name)}</b><span class="sm muted blk">${qn(i.qty, i.unit)} × ₹${q2(i.rate)}</span></span><b class="sm">${money(i.amount)}</b>${ic('pencil', 'i14 muted')}</button>`).join('')}</div></div>`).join('')}
      <div class="card">${kv('Total of items', money(total))}${kv('Grand total in PDF', money(d.data.pdfTotal))}${kv('GST (CGST/SGST/IGST)', '₹0')}
        <div class="mt8">${diff === 0 ? chip('Totals match the PDF', 'green', 'check') : chip(`Differs from PDF by ${money(Math.abs(diff))}`, 'amber', 'alert-triangle')}</div></div>`,
    footer: t === 'header' ? `<button class="btn amber full" data-a="reviewTab" data-v="items">Next: check line items ${ic('arrow-right')}</button>` : `<button class="btn amber full" data-a="saveWO" data-id="${id}">${ic('database')} Save work order</button>`,
    after: () => document.querySelectorAll('[data-h]').forEach(inp => inp.oninput = () => { d.data.header[inp.dataset.h] = inp.value; })
  };
};

SCREENS.aSaved = ({ id }) => {
  const p = P(id), w = DB.wos.filter(w => w.projectId === id).at(-1), n = DB.items.filter(i => i.woId === w.id).length;
  return {
    title: 'Work order saved', hextra: stepper(4), right: '', noTabs: true,
    body: `<div class="done">${ic('check-circle-2', 'i48')}<h2>Saved to database</h2><p>${n} line items from <b>${esc(w.no)}</b> are now live for <b>${esc(U(p.supervisorId)?.name || 'the site supervisor')}</b>.</p></div>
      <div class="card">${kv('Project', esc(pname(p)))}${kv('Work order value', money(w.total))}${kv('Billing cycle', `Every ${p.cycle} days from ${dlong(p.start)}`)}${kv('Retention', p.retention + '%')}</div>
      ${!p.supervisorId ? `<div class="card warn">${ic('user-x', 'i16')}<span>No supervisor yet. Assign one so daily updates can start.</span><button class="link" data-a="assignSup" data-id="${id}">Assign</button></div>` : ''}`,
    footer: `<div class="row gap10"><button class="btn ghost grow" data-a="notifySup" data-id="${id}">${ic('send')} Notify supervisor</button><button class="btn amber grow" data-a="openProjectWO" data-id="${id}">Open work order</button></div>`
  };
};

SCREENS.aVerify = ({ f = 'all' }) => {
  const pend = DB.entries.filter(e => e.status === 'Pending' && (f === 'all' || e.projectId === f)).sort((a, b) => a.date.localeCompare(b.date));
  const projs = [...new Set(DB.entries.filter(e => e.status === 'Pending').map(e => e.projectId))];
  return {
    title: 'Verify daily entries', sub: 'Only verified quantities go into RA bills',
    hextra: projs.length > 1 ? `<div class="hscroll">${[['all', 'All projects'], ...projs.map(id => [id, pname(P(id))])].map(([v, l]) => `<button class="pill dark ${v === f ? 'on' : ''}" data-a="verFilter" data-v="${v}">${esc(l)}</button>`).join('')}</div>` : '',
    body: pend.length ? pend.map(e => entryCard(e, { actions: true, showProject: true })).join('') : empty('check-circle-2', 'Nothing to verify', 'New supervisor entries will show up here.'),
    footer: pend.length > 1 ? `<button class="btn green full" data-a="verifyAll" data-id="${f}">${ic('check-check')} Verify all ${pend.length}</button>` : ''
  };
};

SCREENS.aBills = ({ f = 'all' }) => {
  const all = DB.bills.slice().sort((a, b) => (a.status === 'Awaiting approval' ? -1 : 0) - (b.status === 'Awaiting approval' ? -1 : 0) || b.to.localeCompare(a.to));
  const list = all.filter(b => f === 'all' || b.status === f);
  const ending = DB.projects.filter(p => DB.items.some(i => i.projectId === p.id) && !cycleInfo(p).notStarted && !DB.bills.some(b => b.projectId === p.id && b.k === cycleInfo(p).k)).sort((a, b) => cycleInfo(a).daysLeft - cycleInfo(b).daysLeft).slice(0, 3);
  return {
    title: 'RA bills', sub: `${DB.bills.length} bills · ${money(DB.bills.reduce((a, b) => a + b.net, 0))} net`,
    hextra: `<div class="hscroll">${[['all', 'All'], ['Awaiting approval', 'To approve'], ['Sent to client', 'Sent'], ['Query raised', 'Queries'], ['Accepted', 'Accepted']].map(([v, l]) => { const n = v === 'all' ? 0 : DB.bills.filter(b => b.status === v).length; return `<button class="pill dark ${v === f ? 'on' : ''}" data-a="billFilter" data-v="${v}">${l}${n && v !== 'Accepted' && v !== 'Sent to client' ? ` <b class="badge sm">${n}</b>` : ''}</button>`; }).join('')}</div>`,
    body: `${f === 'all' ? sectionHead('Next bills (auto)') + `<div class="list">${ending.map(p => { const cy = cycleInfo(p); return `<button class="card nb" data-a="go" data-n="aProject" data-id="${p.id}" data-t="bills"><span class="nb-d ${cy.endsToday ? 'hl' : ''}"><b>${cy.endsToday ? 'Today' : cy.daysLeft}</b>${cy.endsToday ? '' : '<span>days</span>'}</span><span class="grow"><b>${esc(pname(p))}</b><span class="sm muted blk">Cycle ${cy.k + 1} · ${money(projDone(DB, p.id, TODAY, cy.from))} verified so far</span></span>${ic('chevron-right', 'i16 muted')}</button>`; }).join('')}</div>` + sectionHead('All bills') : ''}
      <div class="list">${list.map(b => billCard(b)).join('') || empty('receipt', 'No bills here', 'Bills in this status appear here.')}</div>`
  };
};

SCREENS.aUsers = () => ({
  title: 'Users & roles', sub: 'Who can use the app',
  body: [['admin', 'Admins', 'Full access'], ['supervisor', 'Site supervisors', 'Daily quantity updates only'], ['client', 'Client logins', 'View bills and progress only']].map(([r, t, d]) => `${sectionHead(t, `<span class="sm muted">${d}</span>`)}<div class="card list0">${DB.users.filter(u => u.role === r).map(u => { const ps = DB.projects.filter(p => r === 'supervisor' ? p.supervisorId === u.id : r === 'client' ? p.clientUserId === u.id : false); return `<div class="li">${ava(initials(u.name), r === 'admin' ? '#14213D' : r === 'supervisor' ? '#3A4B73' : C(u.clientId)?.color || '#0F8B8D', 'sm')}<span class="grow"><b>${esc(u.name)}</b><span class="sm muted blk">+91 ${esc(u.phone)}${u.org ? ' · ' + esc(u.org) : ''}${r !== 'admin' ? ` · ${ps.length} project${ps.length === 1 ? '' : 's'}` : ''}</span></span>${chip(ROLES[r].title, r === 'admin' ? 'blue' : r === 'supervisor' ? 'amber' : 'green')}</div>`; }).join('')}</div>`).join(''),
  footer: `<button class="btn amber full" data-a="addUser">${ic('user-plus')} Add user</button>`
});

/* ---------- BILL (shared by admin & client) ---------- */
SCREENS.bill = ({ id, more }) => {
  const b = B(id), p = P(b.projectId), c = C(p.clientId), role = me().role, w = DB.wos.find(w => w.projectId === p.id);
  const banner = {
    'Awaiting approval': role === 'admin' ? ['amber', 'sparkles', `Created automatically on ${dlong(b.generatedOn)} at the end of cycle ${b.k + 1}. Review and approve to send it to ${c.name}.`] : null,
    'Sent to client': role === 'client' ? ['blue', 'inbox', 'Please review this bill. Tap any item to see how the quantity was done, day by day.'] : ['blue', 'send', `Sent to ${c.name} on ${dlong(b.sentOn)}. Waiting for acceptance.`],
    'Query raised': ['red', 'message-circle-warning', `Query from ${c.name}: “${b.query?.text || ''}”`],
    'Accepted': ['green', 'badge-check', `Accepted by ${c.name} on ${dlong(b.acceptedOn)}.`],
  }[b.status];
  const timeline = [['Generated automatically', b.generatedOn, true], ['Approved by admin', b.approvedOn, !!b.approvedOn], ['Sent to client', b.sentOn, !!b.sentOn], [b.status === 'Query raised' ? 'Query raised by client' : 'Accepted by client', b.query?.on && b.status === 'Query raised' ? b.query.on : b.acceptedOn, b.status === 'Accepted' || b.status === 'Query raised']];
  let actions = '';
  if (role === 'admin' && b.status === 'Awaiting approval') actions = `<button class="btn amber full" data-a="approveBill" data-id="${id}">${ic('send')} Approve &amp; send to client</button>`;
  if (role === 'admin' && b.status === 'Query raised') actions = `<button class="btn amber full" data-a="resolveQuery" data-id="${id}">${ic('message-square-reply')} Reply &amp; resend</button>`;
  if (role === 'client' && b.status === 'Sent to client') actions = `<div class="row gap10"><button class="btn ghost grow" data-a="raiseQuery" data-id="${id}">${ic('message-circle-question')} Raise query</button><button class="btn green grow" data-a="acceptBill" data-id="${id}">${ic('check')} Accept bill</button></div>`;
  return {
    title: b.no, sub: pname(p) + ' · ' + dfmt(b.from) + ' – ' + dlong(b.to),
    right: `<button class="hbtn" data-a="go" data-n="billPdf" data-id="${id}" aria-label="View as PDF">${ic('file-text')}</button>`,
    body: `${banner ? `<div class="card ban ${banner[0]}">${ic(banner[1], 'i16')}<span>${esc(banner[2])}</span></div>` : ''}
      <div class="card navyc net"><div><span class="lbl">Net payable</span><b class="big">${money(b.net)}</b><span class="sm op7">Gross ${money(b.gross)} · ${b.lines.length} items</span></div>${chip(b.status, billTone(b.status))}</div>
      ${sectionHead('Work done in this bill', `<button class="link sm" data-a="billMore" data-v="${more ? '' : 1}">${more ? 'Hide' : 'Show'} qty details</button>`)}
      <div class="card list0">${b.lines.map(l => `<button class="li bl" data-a="go" data-n="itemHistory" data-id="${id}" data-item="${l.itemId}">
        <div class="grow"><div class="row between"><b class="sm2">${esc(shortG(l.group))}${esc(l.name)}</b><b class="sm">${money(l.amount)}</b></div>
        <div class="sm muted">${qn(l.thisQ, l.unit)} × ₹${q2(l.rate)}${l.kind === 'bonus' ? ' · milestone bonus' : ''}</div>
        ${more ? `<div class="qd"><div><span>Previous</span><b>${qn(l.prev, '')}</b></div><div><span>This bill</span><b>${qn(l.thisQ, '')}</b></div><div><span>Cumulative</span><b>${qn(l.cum, '')}</b></div><div><span>WO qty</span><b>${qn(l.woQty, '')}</b></div></div>` : ''}
        <div class="sm link2">${ic('line-chart', 'i12')} See how this was done</div></div>${ic('chevron-right', 'i16 muted')}</button>`).join('')}</div>
      ${sectionHead('Bill summary')}
      <div class="card">${kv('Gross value of work', money(b.gross))}${kv(`Less: retention ${p.retention}%`, '− ' + money(b.retention), 'red')}${kv(`Less: TDS ${p.tds}%${w?.taxCat ? ' (' + esc(w.taxCat) + ')' : ''}`, (b.tds ? '− ' : '') + money(b.tds), b.tds ? 'red' : '')}${kv('GST', money(b.gst))}${kv('Net payable', money(b.net), 'tot')}</div>
      <div class="card">${kv('Work order value', money(b.woValue))}${kv('Billed before this bill', money(b.prevGross))}${kv('This bill (gross)', money(b.gross))}${kv('Balance work order value', money(b.woValue - b.prevGross - b.gross), 'b')}${bar(pct(b.prevGross + b.gross, b.woValue))}</div>
      ${sectionHead('Status')}
      <div class="card tl">${timeline.map(([t, d, ok]) => `<div class="tli ${ok ? 'ok' : ''}"><span class="tld">${ok ? ic('check', 'i12') : ''}</span><span class="grow">${t}</span><span class="sm muted">${ok && d ? dlong(d) : '—'}</span></div>`).join('')}</div>
      ${b.query?.reply ? `<div class="card ban blue">${ic('message-square-reply', 'i16')}<span>Admin reply: “${esc(b.query.reply)}”</span></div>` : ''}
      <button class="btn ghost full mt12" data-a="go" data-n="billPdf" data-id="${id}">${ic('file-text')} View bill as PDF</button>`,
    footer: actions
  };
};

SCREENS.itemHistory = ({ id, item }) => {
  const b = B(id), l = b.lines.find(x => x.itemId === item), it = I(item), p = P(b.projectId);
  const es = DB.entries.filter(e => e.itemId === item && e.date >= b.from && e.date <= b.to && e.status === 'Verified').sort((x, y) => y.date.localeCompare(x.date));
  const pts = seriesFor([item], b.from, b.to, false);
  const workDays = pts.filter(x => x.q > 0).length;
  return {
    title: 'How this was done', sub: `${it.group !== 'Main works' ? it.group + ' · ' : ''}${it.name}`,
    body: `<div class="card"><div class="sm muted mb4">${esc(it.desc)}</div><div class="qd big4"><div><span>WO quantity</span><b>${qn(it.qty, it.unit)}</b></div><div><span>Before this bill</span><b>${qn(l.prev, it.unit)}</b></div><div><span>This bill</span><b class="green">${qn(l.thisQ, it.unit)}</b></div><div><span>Balance</span><b>${qn(it.qty - l.cum, it.unit)}</b></div></div>${bar(pct(l.cum, it.qty))}<div class="sm muted mt6">${pct(l.cum, it.qty).toFixed(1)}% of this item done · rate ₹${q2(it.rate)}/${it.unit}</div></div>
      ${it.kind === 'bonus' ? `<div class="card ban green">${ic('award', 'i16')}<span>Milestone bonus. Earned on ${dlong(it.earnedOn)} when the ${esc(it.group.toLowerCase())} milestone was met, so the full quantity is billed once.</span></div>` :
      `${sectionHead('Daily quantity', `<span class="sm muted">${workDays} working days</span>`)}<div class="card">${dailyChart(pts, it.unit, { cum: true })}<div class="legend"><span><i class="lg-b"></i>Daily qty</span><span><i class="lg-l"></i>Running total</span></div></div>
      ${sectionHead('Site entries')}${es.map(e => entryCard(e)).join('')}`}`,
  };
};

SCREENS.billPdf = ({ id }) => {
  const b = B(id), p = P(b.projectId), c = C(p.clientId), w = DB.wos.find(w => w.projectId === p.id);
  return {
    title: 'Bill PDF', sub: b.no + ' · ' + pname(p), right: `<button class="hbtn" data-a="sharePdf" aria-label="Share">${ic('share-2')}</button>`,
    cls: 'grey',
    body: `<div class="paper"><div class="pp-h"><div><b>RUNNING ACCOUNT BILL</b><span>${esc(b.no)}</span></div><div class="ta-r"><b>Sabir Khan</b><span>Contractor · Hyderabad</span></div></div>
      <table class="pp-m"><tr><td>Client</td><td>${esc(c.full)}</td></tr><tr><td>Project</td><td>${esc(pname(p))}</td></tr><tr><td>Work order</td><td>${esc(w?.no || '')}</td></tr><tr><td>Bill period</td><td>${dlong(b.from)} to ${dlong(b.to)}</td></tr></table>
      <table class="pp-t"><thead><tr><th>Sr</th><th>Item</th><th>Prev</th><th>This</th><th>Cum.</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${b.lines.map(l => `<tr><td>${l.sr}</td><td>${esc(shortG(l.group))}${esc(l.name)}</td><td>${q2(l.prev)}</td><td>${q2(l.thisQ)}</td><td>${q2(l.cum)}</td><td>${q2(l.rate)}</td><td>${inr0.format(l.amount)}</td></tr>`).join('')}</tbody></table>
      <table class="pp-s"><tr><td>Gross amount</td><td>${inr2.format(b.gross)}</td></tr><tr><td>Less retention ${p.retention}%</td><td>${inr2.format(b.retention)}</td></tr><tr><td>Less TDS ${p.tds}%</td><td>${inr2.format(b.tds)}</td></tr><tr><td>GST</td><td>0.00</td></tr><tr class="t"><td>Net payable</td><td>${inr2.format(b.net)}</td></tr></table>
      <div class="pp-sig"><div>Prepared by<br><b>SiteTrack (auto)</b></div><div>Approved by<br><b>${b.approvedOn ? esc(U('u1').name) : '—'}</b></div><div>Accepted by<br><b>${b.acceptedOn ? esc(c.name) : '—'}</b></div></div></div>
      <p class="proto-note c">${ic('download', 'i12')} In the app this downloads as a PDF and can be shared on WhatsApp or email.</p>`
  };
};

/* ---------- SUPERVISOR ---------- */
SCREENS.sHome = ({ pid }) => {
  const ps = supProjects(); if (!ps.length) return { title: 'Today', body: empty('hard-hat', 'No projects assigned', 'Ask the admin to assign you a project.') };
  const p = P(pid || S.sup.pid || ps[0].id); S.sup.pid = p.id;
  const its = projItems(DB, p.id).filter(i => i.kind === 'work');
  const todayE = DB.entries.filter(e => e.projectId === p.id && e.date === TODAY);
  const rej = DB.entries.filter(e => e.by === S.user && e.status === 'Rejected');
  const active = its.filter(i => itemDone(DB, i, TODAY, false) < i.qty && (itemDone(DB, i, TODAY, false) > 0 || todayE.some(e => e.itemId === i.id)));
  const upcoming = its.filter(i => itemDone(DB, i, TODAY, false) === 0 && !active.includes(i));
  const done = its.filter(i => itemDone(DB, i, TODAY, false) >= i.qty);
  const row = i => { const d = itemDone(DB, i, TODAY, false), te = todayE.find(e => e.itemId === i.id);
    return `<div class="card sit"><div class="row between"><b>${esc(shortG(i.group))}${esc(i.name)}</b></div>
      <div class="row between sm mt4"><span class="muted">${qn(d, '')} / ${qn(i.qty, i.unit)}</span><b>${pct(d, i.qty).toFixed(0)}%</b></div>${bar(pct(d, i.qty), 'amber')}
      ${te ? `<div class="row between mt10"><span class="sm">${ic('check-circle-2', 'i14 green')} Today: <b>${qn(te.qty, i.unit)}</b></span>${chip(te.status, entryTone(te.status))}</div>${te.status === 'Pending' ? `<button class="btn ghost sm full mt8" data-a="go" data-n="sUpdate" data-id="${i.id}">${ic('pencil')} Edit today’s entry</button>` : ''}` : `<button class="btn amber sm full mt10" data-a="go" data-n="sUpdate" data-id="${i.id}">${ic('plus')} Update today’s quantity</button>`}</div>`; };
  return {
    tone: 'navy', eyebrow: 'Site Supervisor', title: 'Hi, ' + me().name.split(' ')[0], sub: dlong(TODAY),
    hextra: (ps.length > 1 ? `<div class="hscroll">${ps.map(x => `<button class="pill dark ${x.id === p.id ? 'on' : ''}" data-a="supProj" data-v="${x.id}">${esc(pname(x))}</button>`).join('')}</div>` : '') + cycleCard(p, { dark: true, client: true }),
    body: `${rej.length ? `<button class="card ban red" data-a="go" data-n="sUpdate" data-id="${rej[0].itemId}">${ic('x-circle', 'i16')}<span><b>${rej.length} entry rejected.</b> ${esc(rej[0].reason || '')} Tap to correct.</span></button>` : ''}
      ${todayE.length ? `<div class="card ban green">${ic('check-circle-2', 'i16')}<span>${todayE.length} update${todayE.length > 1 ? 's' : ''} sent today. You can add more items below.</span></div>` : `<div class="card ban amber">${ic('clock', 'i16')}<span><b>Today’s update is pending.</b> Enter the quantity measured on site before 11:59 PM.</span></div>`}
      ${sectionHead('In progress')}${active.map(row).join('') || `<p class="sm muted">No items in progress.</p>`}
      ${upcoming.length ? sectionHead('Not started') + upcoming.map(row).join('') : ''}
      ${done.length ? sectionHead('Completed') + `<div class="card list0">${done.map(i => `<div class="li">${ic('check-circle-2', 'i18 green')}<span class="grow sm2"><b>${esc(i.group !== 'Main works' ? i.group + ' · ' : '')}${esc(i.name)}</b><span class="sm muted blk">${qn(i.qty, i.unit)} done</span></span></div>`).join('')}</div>` : ''}`
  };
};

SCREENS.sUpdate = ({ id }) => {
  const it = I(id), p = P(it.projectId);
  const ex = DB.entries.find(e => e.itemId === id && e.by === S.user && (e.date === TODAY || e.status === 'Rejected') && e.status !== 'Verified');
  const date = ex ? ex.date : TODAY;
  const before = DB.entries.filter(e => e.itemId === id && e.status !== 'Rejected' && e.id !== ex?.id).reduce((a, e) => a + e.qty, 0);
  const st = S.sup.form && S.sup.form.id === id ? S.sup.form : (S.sup.form = { id, qty: ex ? String(ex.qty) : '', labour: ex?.labour || '', remarks: ex?.remarks || '', photos: ex?.photos?.slice() || [] });
  const quick = it.unit === 'MT' || it.unit === 'nos' ? [1, 5, 10, 25] : [100, 250, 500, 1000];
  return {
    title: ex ? (ex.status === 'Rejected' ? 'Correct entry' : 'Edit today’s entry') : 'Update quantity', sub: `${dow(date)}, ${dlong(date)} · ${pname(p)}`, right: '', noTabs: true,
    body: `${ex?.status === 'Rejected' ? `<div class="card ban red">${ic('x-circle', 'i16')}<span>Rejected by admin: “${esc(ex.reason || 'Please re-check')}”. Correct and resubmit.</span></div>` : ''}
      <div class="card"><span class="lbl">Work item</span><b class="blk mt4">${esc(it.group !== 'Main works' ? it.group + ' · ' : '')}${esc(it.name)}</b><span class="sm muted">${esc(it.code)} · ₹${q2(it.rate)} per ${it.unit}</span></div>
      <div class="fld"><label for="suQty">Quantity measured today (${it.unit})</label>
        <div class="qty"><button class="qb" data-a="qtyStep" data-v="-1" aria-label="Decrease">${ic('minus')}</button><input id="suQty" inputmode="decimal" value="${esc(st.qty)}" placeholder="0.00"><button class="qb" data-a="qtyStep" data-v="1" aria-label="Increase">${ic('plus')}</button></div>
        <div class="pills mt8">${quick.map(v => `<button type="button" class="pill" data-a="qtyAdd" data-v="${v}">+${inr0.format(v)}</button>`).join('')}<button type="button" class="pill" data-a="qtyAdd" data-v="0">Clear</button></div></div>
      <div class="card" id="suCalc"></div>
      <div class="row gap10"><div class="fld grow"><label for="suLab">Labour on site</label><input id="suLab" inputmode="numeric" value="${esc(st.labour)}" placeholder="e.g. 42"></div><div class="fld grow"><label>Date</label><div class="ro">${ic('calendar', 'i16')} ${dfmt(date)}</div></div></div>
      <div class="fld"><label>Site photos <span class="muted">(geo-tagged)</span></label><div class="phs big">${st.photos.map((x, i) => `<div class="phw">${photo(x)}<button class="phx" data-a="rmPhoto" data-v="${i}" aria-label="Remove photo">${ic('x', 'i12')}</button></div>`).join('')}<label class="ph add" for="suPh">${ic('camera')}<span>Add</span><input id="suPh" type="file" accept="image/*" capture="environment" multiple hidden></label></div></div>
      <div class="fld"><label for="suRem">Remarks</label><textarea id="suRem" rows="2" placeholder="Area completed, issues, material shortage…">${esc(st.remarks)}</textarea></div>`,
    footer: `<button class="btn amber full" id="suSubmit" data-a="submitEntry" data-id="${id}">${ic('send')} ${ex ? 'Resubmit' : 'Submit'} today’s progress</button>`,
    after: () => {
      const q = $('#suQty'); const calc = () => {
        const v = parseFloat(String(q.value).replace(/,/g, '')) || 0; st.qty = q.value;
        const cum = before + v, bal = it.qty - cum, over = cum > it.qty + 1e-6;
        $('#suCalc').innerHTML = `${kv('Work order quantity', qn(it.qty, it.unit))}${kv('Done till now', qn(before, it.unit))}${kv('+ Today', `<span class="green">${qn(v, it.unit)}</span>`)}${kv('Cumulative', qn(cum, it.unit), 'tot')}${kv('Balance', over ? `<span class="red">${qn(bal, it.unit)}</span>` : qn(bal, it.unit))}${kv('Today’s value', money(v * it.rate))}${over ? `<p class="err">${ic('alert-triangle', 'i12')} More than the work order quantity. Max today: ${qn(it.qty - before, it.unit)}</p>` : ''}`;
        const sb = $('#suSubmit'); sb.disabled = !v || over; icons();
      };
      q.oninput = calc; calc();
      $('#suLab').oninput = e => st.labour = e.target.value; $('#suRem').oninput = e => st.remarks = e.target.value;
      $('#suPh').onchange = e => { [...e.target.files].slice(0, 6).forEach(f => { const r = new FileReader(); r.onload = () => { st.photos.push(r.result); render(); }; r.readAsDataURL(f); }); };
    }
  };
};

SCREENS.sHistory = ({ f = 'all' }) => {
  const es = DB.entries.filter(e => e.by === S.user && (f === 'all' || e.status === f)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
  const byDate = {}; es.forEach(e => (byDate[e.date] = byDate[e.date] || []).push(e));
  return {
    title: 'My updates', sub: `${DB.entries.filter(e => e.by === S.user).length} entries submitted`,
    hextra: `<div class="hscroll">${['all', 'Pending', 'Verified', 'Rejected'].map(v => `<button class="pill dark ${v === f ? 'on' : ''}" data-a="histFilter" data-v="${v}">${v === 'all' ? 'All' : v}</button>`).join('')}</div>`,
    body: Object.entries(byDate).map(([d, list]) => `<div class="grp"><div class="grp-h"><b>${dow(d)}, ${dlong(d)}</b>${d === TODAY ? chip('Today', 'blue') : ''}</div>${list.map(e => entryCard(e, { showProject: true })).join('')}</div>`).join('') || empty('history', 'No entries', 'Entries you submit appear here.')
  };
};

/* ---------- CLIENT ---------- */
SCREENS.cHome = () => {
  const c = C(me().clientId), ps = clientProjects(), nb = clientBills().filter(b => b.status === 'Sent to client');
  return {
    tone: 'navy', eyebrow: 'Client view', title: c.name, sub: 'Welcome, ' + me().name,
    body: `${nb.map(b => `<button class="card ban blue big" data-a="go" data-n="bill" data-id="${b.id}">${ic('receipt', 'i20')}<span class="grow"><b>${esc(b.no)} is ready for review</b><span class="sm blk">${esc(pname(P(b.projectId)))} · ${money(b.net)}</span></span>${ic('chevron-right', 'i16')}</button>`).join('')}
      ${sectionHead('Your projects')}<div class="list">${ps.map(p => projectCard(p, { to: 'cProject', client: true })).join('')}</div>
      ${sectionHead('Recent bills')}<div class="list">${clientBills().slice(0, 3).map(b => billCard(b)).join('') || empty('receipt', 'No bills yet', `The first bill arrives after it is approved.`)}</div>`
  };
};
SCREENS.cBills = () => ({ title: 'Bills', sub: C(me().clientId).name, body: `<div class="list">${clientBills().map(b => billCard(b)).join('') || empty('receipt', 'No bills yet', 'Approved RA bills appear here.')}</div>` });
SCREENS.cProgress = ({ pid }) => { const ps = clientProjects(); const p = P(pid || ps[0].id); return SCREENS.cProject({ id: p.id, tabMode: true, ps }); };
SCREENS.cProject = ({ id, tabMode, ps }) => {
  const p = P(id), items = projItems(DB, id), val = projValue(DB, id), done = projDone(DB, id);
  const work = items.filter(i => i.kind === 'work'); const cy = cycleInfo(p);
  const pts = cy.notStarted ? [] : seriesFor(work.map(i => i.id), addDays(TODAY, -13), TODAY, false);
  const groups = groupItems(items);
  return {
    title: tabMode ? 'Work progress' : pname(p), sub: tabMode ? 'Verified quantities only' : C(p.clientId).name,
    hextra: tabMode && ps.length > 1 ? `<div class="hscroll">${ps.map(x => `<button class="pill dark ${x.id === p.id ? 'on' : ''}" data-a="cProj" data-v="${x.id}">${esc(pname(x))}</button>`).join('')}</div>` : '',
    body: !items.length ? empty('file-clock', 'Work not started yet', 'Progress appears once the work order is set up and site work begins.') : `
      <div class="card ring"><div class="rg" style="--p:${pct(done, val).toFixed(1)}"><b>${pct(done, val).toFixed(0)}%</b><span>done</span></div><div class="grow">${kv('Work order value', money(val))}${kv('Work done (verified)', money(done))}${kv('Balance', money(val - done))}</div></div>
      ${cycleCard(p, { client: true })}
      ${sectionHead('Last 14 days')}<div class="card">${dailyChart(pts, work[0]?.unit || '', {})}<div class="sm muted">Daily verified quantity, all items</div></div>
      ${sectionHead(groups.length > 1 ? 'Floor-wise progress' : 'Item-wise progress')}
      <div class="card list0">${groups.map(([g, its]) => { const w = its.filter(i => i.kind === 'work'); const tq = w.reduce((a, i) => a + i.qty, 0), dq = w.reduce((a, i) => a + itemDone(DB, i), 0);
        return groups.length > 1 ? `<div class="li"><div class="grow"><div class="row between sm2"><b>${esc(g)}</b><span>${qn(dq, '')} / ${qn(tq, w[0]?.unit)}</span></div>${bar(pct(dq, tq), pct(dq, tq) >= 100 ? '' : 'amber')}</div></div>` : w.map(i => itemRow(i, false)).join(''); }).join('')}</div>
      ${sectionHead('Bills')}<div class="list">${clientBills().filter(b => b.projectId === id).map(b => billCard(b)).join('') || `<p class="sm muted">No bills yet. Next bill on ${dlong(cy.to)}.</p>`}</div>`
  };
};

/* ---------- SHARED ---------- */
SCREENS.notifs = () => { const ns = notifications(); return { title: 'Notifications', right: '', body: ns.length ? `<div class="list">${ns.map(([i, t, n, id, tone]) => `<button class="card att" data-a="go" data-n="${n}" data-id="${id}"><span class="att-i ${tone}">${ic(i)}</span><span class="grow">${esc(t)}</span>${ic('chevron-right', 'i16 muted')}</button>`).join('')}</div>` : empty('bell-off', 'No notifications', 'You’re all caught up.') }; };
SCREENS.profile = () => {
  const u = me(); const r = ROLES[u.role];
  return {
    title: 'Profile', right: '',
    body: `<div class="card prof">${ava(initials(u.name), u.role === 'client' ? C(u.clientId).color : '#14213D', 'lg')}<div><b>${esc(u.name)}</b><span class="sm muted blk">+91 ${esc(u.phone)}</span>${chip(r.title, 'blue', r.icon)}</div></div>
      <div class="card list0">
        ${u.role === 'admin' ? `<button class="li" data-a="go" data-n="aUsers">${ic('users')}<span class="grow">Users &amp; roles</span>${ic('chevron-right', 'i16 muted')}</button>` : ''}
        <button class="li" data-a="go" data-n="notifs">${ic('bell')}<span class="grow">Notifications</span>${ic('chevron-right', 'i16 muted')}</button>
        <button class="li" data-a="guide">${ic('map')}<span class="grow">How to try this prototype</span>${ic('chevron-right', 'i16 muted')}</button>
        <button class="li" data-a="resetAsk">${ic('rotate-ccw')}<span class="grow">Reset demo data</span>${ic('chevron-right', 'i16 muted')}</button></div>
      <button class="btn ghost full red mt12" data-a="logout">${ic('log-out')} Log out / switch role</button>
      <p class="proto-note c">SiteTrack prototype · v1.0</p>`
  };
};
