/* ================= ACTIONS ================= */
const A = {};
A.go = d => go(d.n, { id: d.id, item: d.item, t: d.t });
A.back = () => back();
A.tab = d => tab(d.n);
A.closeSheet = () => closeSheet();
A.pickRole = d => { S.role = d.v; render(); };
A.login = () => { S.user = ROLES[S.role].user; S.sup = {}; tab({ admin: 'aHome', supervisor: 'sHome', client: 'cHome' }[S.role]); toast(`Logged in as ${me().name}`, 'ok'); };
A.logout = () => { S.role = me().role; S.user = null; S.stack = [{ n: 'login' }]; render(true); };
A.switchTo = d => { S.role = d.v; S.user = ROLES[d.v].user; S.sup = {}; closeSheet(); tab({ admin: 'aHome', supervisor: 'sHome', client: 'cHome' }[d.v]); toast(`Switched to ${ROLES[d.v].title}`, 'ok'); };
A.projTab = d => setP({ t: d.v });
A.reviewTab = d => setP({ t: d.v });
A.projFilter = d => setP({ f: d.v });
A.verFilter = d => setP({ f: d.v });
A.billFilter = d => setP({ f: d.v });
A.histFilter = d => setP({ f: d.v });
A.billMore = d => setP({ more: d.v });
A.supProj = d => { S.sup.pid = d.v; setP({ pid: d.v }); };
A.cProj = d => setP({ pid: d.v });
A.resetAsk = () => sheet(`<h3>Reset demo data?</h3><p class="sm muted">All changes you made in this prototype will be cleared.</p><div class="row gap10 mt12"><button class="btn ghost grow" data-a="closeSheet">Cancel</button><button class="btn red grow" data-a="resetDo">Reset</button></div>`);
A.resetDo = () => { closeSheet(); resetDemo(); };
A.guide = () => sheet(guideHTML(true));

/* clients & projects */
A.addClient = () => sheet(`<h3>Add client</h3><div class="form"><div class="fld"><label for="acN">Client name</label><input id="acN" placeholder="e.g. Shapoorji Pallonji"></div><div class="fld"><label for="acC">City</label><input id="acC" placeholder="e.g. Hyderabad"></div><p class="err" id="acE" hidden>Enter the client name.</p><button class="btn amber full" data-a="addClientDo">${ic('check')} Add client</button></div>`);
A.addClientDo = () => { const n = $('#acN').value.trim(); if (!n) { $('#acE').hidden = false; return; } const cols = ['#2E7D32', '#AD1457', '#00838F', '#5D4037', '#283593']; const c = { id: uid('c'), name: n, full: n, ini: initials(n), color: cols[DB.clients.length % cols.length], city: $('#acC').value.trim() || '—' }; DB.clients.push(c); closeSheet(); go('aClient', { id: c.id }); toast('Client added', 'ok'); };
A.newProjectPick = () => go('aProjectNew', {});
A.pickCycle = (d, el) => { document.querySelectorAll('#npCycle .pill').forEach(p => p.classList.toggle('on', p === el)); $('#npCycleCustom').hidden = d.v !== 'custom'; $('#npCycle').dataset.v = d.v; };
A.createProject = () => {
  const name = $('#npName').value.trim(), cyv = $('#npCycle').dataset.v || '20';
  const cycle = cyv === 'custom' ? parseInt($('#npCycleCustom').value) : parseInt(cyv);
  const err = !name ? 'Enter the project name.' : !(cycle > 0) ? 'Enter the number of days for the billing cycle.' : '';
  if (err) { const e = $('#npErr'); e.textContent = err; e.hidden = false; return; }
  const p = { id: uid('p'), clientId: $('#npClient').value, name, sub: $('#npSub').value.trim() || 'Main', address: $('#npAddr').value.trim() || '—', start: $('#npStart').value || TODAY, cycle, retention: parseFloat($('#npRet').value) || 0, tds: parseFloat($('#npTds').value) || 0, supervisorId: $('#npSup').value || null, clientUserId: $('#npCu').value || null };
  DB.projects.push(p); S.stack.pop(); go('aUpload', { id: p.id }); toast('Project created — now upload the work order', 'ok');
};
A.assignSup = d => { const p = P(d.id); sheet(`<h3>Site supervisor</h3><p class="sm muted mb8">${esc(pname(p))}</p><div class="list">${DB.users.filter(u => u.role === 'supervisor').map(u => `<button class="card cl ${p.supervisorId === u.id ? 'sel' : ''}" data-a="assignSupDo" data-id="${p.id}" data-v="${u.id}">${ava(initials(u.name), '#3A4B73', 'sm')}<span class="grow"><b>${esc(u.name)}</b><span class="sm muted blk">${DB.projects.filter(x => x.supervisorId === u.id).length} projects</span></span>${p.supervisorId === u.id ? ic('check', 'i16 green') : ''}</button>`).join('')}</div>`); };
A.assignSupDo = d => { P(d.id).supervisorId = d.v; closeSheet(); render(); toast(`${U(d.v).name} assigned`, 'ok'); };
A.addUser = () => sheet(`<h3>Add user</h3><div class="form"><div class="fld"><label for="auN">Name</label><input id="auN"></div><div class="fld"><label for="auP">Mobile number</label><input id="auP" inputmode="tel"></div><div class="fld"><label for="auR">Role</label><select id="auR"><option value="supervisor">Site supervisor</option><option value="client">Client</option><option value="admin">Admin</option></select></div><div class="fld"><label for="auC">Client (for client login)</label><select id="auC">${DB.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><p class="err" id="auE" hidden>Enter name and mobile number.</p><button class="btn amber full" data-a="addUserDo">${ic('user-plus')} Add user</button><p class="sm muted c">They get an SMS with a login link.</p></div>`);
A.addUserDo = () => { const n = $('#auN').value.trim(), ph = $('#auP').value.trim(), r = $('#auR').value; if (!n || !ph) { $('#auE').hidden = false; return; } const c = C($('#auC').value); DB.users.push({ id: uid('u'), name: n, phone: ph, role: r, ...(r === 'client' ? { clientId: c.id, org: c.name } : {}) }); closeSheet(); render(); toast('User added', 'ok'); };

/* upload */
A.startUpload = () => sheet(`<h3>Upload work order</h3><p class="sm muted mb8">Choose the project this work order belongs to.</p><div class="list sheet-list">${DB.projects.map(p => { const has = DB.wos.some(w => w.projectId === p.id); return `<button class="card cl" data-a="uploadFor" data-id="${p.id}">${ava(C(p.clientId).ini, C(p.clientId).color, 'sm')}<span class="grow"><b>${esc(pname(p))}</b><span class="sm muted blk">${esc(C(p.clientId).name)}</span></span>${has ? '' : chip('No WO', 'amber')}</button>`; }).join('')}</div>`);
A.uploadFor = d => { closeSheet(); go('aUpload', { id: d.id }); };
A.useSample = d => startExtract(d.id, { name: 'woayaticonstructiongst.pdf', size: '334 KB' });
A.clearDraft = () => { S.draft = null; render(); };
A.editItem = d => { const it = S.draft.data.items.find(i => i.sr == d.sr); sheet(`<h3>Item ${it.sr}</h3><p class="sm muted mb8">${esc(it.desc)}</p><div class="form"><div class="row gap10"><div class="fld grow"><label for="eiQ">Quantity (${it.unit})</label><input id="eiQ" inputmode="decimal" value="${it.qty}"></div><div class="fld grow"><label for="eiR">Rate (₹)</label><input id="eiR" inputmode="decimal" value="${it.rate}"></div></div><button class="btn amber full" data-a="editItemDo" data-sr="${it.sr}">${ic('check')} Save item</button></div>`); };
A.editItemDo = d => { const it = S.draft.data.items.find(i => i.sr == d.sr); it.qty = parseFloat($('#eiQ').value) || 0; it.rate = parseFloat($('#eiR').value) || 0; it.amount = Math.round(it.qty * it.rate); closeSheet(); render(); };
A.saveWO = d => {
  const p = P(d.id), x = S.draft.data, w = { id: uid('w'), projectId: p.id, ...x.header, file: S.draft.file.name, uploadedOn: TODAY, uploadedBy: S.user, terms: x.terms, total: x.items.reduce((a, i) => a + i.amount, 0) };
  DB.wos.push(w); x.items.forEach(it => DB.items.push({ ...it, id: uid('i'), woId: w.id, projectId: p.id, earnedOn: null }));
  if (x.retention) p.retention = x.retention;
  S.draft = null; S.stack = [S.stack[0]]; go('aSaved', { id: p.id });
};
A.notifySup = d => { const p = P(d.id); toast(p.supervisorId ? `${U(p.supervisorId).name} notified by SMS` : 'Assign a supervisor first', p.supervisorId ? 'ok' : 'err'); };
A.openProjectWO = d => { S.stack = [{ n: 'aHome', p: {} }]; go('aProject', { id: d.id, t: 'wo' }); };
A.earnBonus = d => { const it = I(d.id); sheet(`<h3>Mark bonus as earned?</h3><p class="sm">${esc(it.group)} · ${esc(it.name)}</p><p class="sm muted">${qn(it.qty, it.unit)} × ₹${q2(it.rate)} = <b>${money(it.amount)}</b> will be added to the bill of the current cycle.</p><div class="row gap10 mt12"><button class="btn ghost grow" data-a="closeSheet">Cancel</button><button class="btn amber grow" data-a="earnBonusDo" data-id="${it.id}">Mark earned</button></div>`); };
A.earnBonusDo = d => { I(d.id).earnedOn = TODAY; closeSheet(); render(); toast('Bonus added to this cycle', 'ok'); };

/* verification */
A.verifyEntry = d => { const e = DB.entries.find(x => x.id === d.id); e.status = 'Verified'; e.verifiedBy = S.user; e.verifiedOn = TODAY; render(); toast(`Verified · ${qn(e.qty, I(e.itemId).unit)} added to the bill`, 'ok'); };
A.verifyAll = d => { const es = DB.entries.filter(e => e.status === 'Pending' && (!d.id || d.id === 'all' || e.projectId === d.id)); es.forEach(e => { e.status = 'Verified'; e.verifiedBy = S.user; e.verifiedOn = TODAY; }); render(); toast(`${es.length} entries verified`, 'ok'); };
A.rejectEntry = d => sheet(`<h3>Reject entry</h3><p class="sm muted mb8">The supervisor will be asked to correct it.</p><div class="pills mb8">${['Quantity looks too high', 'Photos missing', 'Wrong item selected'].map(r => `<button class="pill" data-a="rejReason" data-v="${r}">${r}</button>`).join('')}</div><div class="fld"><label for="rjR">Reason</label><textarea id="rjR" rows="2"></textarea></div><button class="btn red full" data-a="rejectDo" data-id="${d.id}">${ic('x')} Reject entry</button>`);
A.rejReason = d => { $('#rjR').value = d.v; };
A.rejectDo = d => { const e = DB.entries.find(x => x.id === d.id); e.status = 'Rejected'; e.reason = $('#rjR').value.trim() || 'Please re-check the quantity'; closeSheet(); render(); toast('Entry sent back to supervisor'); };

/* bills */
A.genBill = d => { const p = P(d.id), cy = cycleInfo(p), pend = DB.entries.filter(e => e.projectId === p.id && e.status === 'Pending' && e.date >= cy.from && e.date <= cy.to).length;
  if (pend) sheet(`<h3>${pend} ${pend > 1 ? 'entries are' : 'entry is'} not verified</h3><p class="sm muted">Only verified quantities go into the bill. Verify them first to include them.</p><div class="row gap10 mt12"><button class="btn ghost grow" data-a="genBillDo" data-id="${p.id}">Generate anyway</button><button class="btn amber grow" data-a="verifyFirst" data-id="${p.id}">Verify first</button></div>`);
  else A.genBillDo(d); };
A.verifyFirst = d => { closeSheet(); go('aProject', { id: d.id, t: 'log' }); };
A.genBillDo = d => { closeSheet(); const p = P(d.id), cy = cycleInfo(p); const b = makeBill(DB, p, cy.k, TODAY); if (!b.lines.length) { toast('No verified work in this cycle yet', 'err'); return; } DB.bills.push(b); go('bill', { id: b.id }); toast(`${b.no} generated`, 'ok'); };
A.approveBill = d => { const b = B(d.id), c = C(P(b.projectId).clientId); sheet(`<h3>Approve ${esc(b.no)}?</h3><p class="sm muted">Net payable <b>${money(b.net)}</b>. It will be sent to <b>${esc(c.name)}</b> for review.</p><div class="row gap10 mt12"><button class="btn ghost grow" data-a="closeSheet">Cancel</button><button class="btn amber grow" data-a="approveDo" data-id="${b.id}">${ic('send')} Approve &amp; send</button></div>`); };
A.approveDo = d => { const b = B(d.id); b.status = 'Sent to client'; b.approvedOn = TODAY; b.sentOn = TODAY; closeSheet(); render(); toast('Approved and sent to client', 'ok'); };
A.acceptBill = d => sheet(`<h3>Accept ${esc(B(d.id).no)}?</h3><p class="sm muted">You confirm the quantities and the net amount of <b>${money(B(d.id).net)}</b>.</p><div class="row gap10 mt12"><button class="btn ghost grow" data-a="closeSheet">Cancel</button><button class="btn green grow" data-a="acceptDo" data-id="${d.id}">${ic('check')} Accept</button></div>`);
A.acceptDo = d => { const b = B(d.id); b.status = 'Accepted'; b.acceptedOn = TODAY; closeSheet(); render(); toast('Bill accepted', 'ok'); };
A.raiseQuery = d => sheet(`<h3>Raise a query</h3><p class="sm muted mb8">The admin will reply and resend the bill.</p><div class="fld"><label for="rqT">Your query</label><textarea id="rqT" rows="3" placeholder="e.g. 1F quantity on 20 Oct looks high — please share measurement sheet"></textarea></div><p class="err" id="rqE" hidden>Write your query.</p><button class="btn amber full" data-a="raiseDo" data-id="${d.id}">${ic('send')} Send query</button>`);
A.raiseDo = d => { const t = $('#rqT').value.trim(); if (!t) { $('#rqE').hidden = false; return; } const b = B(d.id); b.status = 'Query raised'; b.query = { text: t, on: TODAY }; closeSheet(); render(); toast('Query sent to admin', 'ok'); };
A.resolveQuery = d => sheet(`<h3>Reply to query</h3><p class="sm muted mb8">“${esc(B(d.id).query.text)}”</p><div class="fld"><label for="rsT">Reply</label><textarea id="rsT" rows="3">Measurement sheet and site photos attached. Quantity confirmed on site.</textarea></div><button class="btn amber full" data-a="resolveDo" data-id="${d.id}">${ic('send')} Reply &amp; resend</button>`);
A.resolveDo = d => { const b = B(d.id); b.query.reply = $('#rsT').value.trim(); b.status = 'Sent to client'; b.sentOn = TODAY; closeSheet(); render(); toast('Reply sent, bill resent', 'ok'); };
A.sharePdf = () => toast('Share sheet opens here — WhatsApp, email, Drive');

/* supervisor entry */
A.qtyStep = d => { const q = $('#suQty'); const step = I(S.sup.form.id).unit === 'MT' || I(S.sup.form.id).unit === 'nos' ? 1 : 50; q.value = Math.max(0, (parseFloat(q.value.replace(/,/g, '')) || 0) + step * d.v); q.dispatchEvent(new Event('input')); };
A.qtyAdd = d => { const q = $('#suQty'); q.value = +d.v ? (parseFloat(q.value.replace(/,/g, '')) || 0) + +d.v : ''; q.dispatchEvent(new Event('input')); };
A.rmPhoto = d => { S.sup.form.photos.splice(+d.v, 1); render(); };
A.submitEntry = d => {
  const st = S.sup.form, it = I(d.id), v = parseFloat(String(st.qty).replace(/,/g, '')) || 0; if (!v) return;
  if (!st.photos.length) { st.photos.push('ph' + (1 + Math.floor(Math.random() * 3))); }
  let e = DB.entries.find(e => e.itemId === d.id && e.by === S.user && (e.date === TODAY || e.status === 'Rejected') && e.status !== 'Verified');
  if (e) Object.assign(e, { qty: v, labour: +st.labour || null, remarks: st.remarks, photos: st.photos, status: 'Pending', reason: null });
  else DB.entries.push({ id: uid('e'), itemId: d.id, projectId: it.projectId, date: TODAY, qty: v, by: S.user, labour: +st.labour || null, remarks: st.remarks, photos: st.photos, status: 'Pending' });
  S.sup.form = null; tab('sHome'); toast(`Sent · ${qn(v, it.unit)} waiting for admin verification`, 'ok');
};

/* guide */
function guideHTML(inSheet) {
  const st = [
    ['hard-hat', 'supervisor', 'Supervisor: update today’s quantity', 'Login as Site Supervisor → “Update today’s quantity” on 1F labour → enter 1,500 → Submit.'],
    ['shield-check', 'admin', 'Admin: verify and generate the bill', 'Login as Admin → Verify tab → Verify all → Home → “Bill cycle ends today” → Generate RA bill → Approve & send.'],
    ['building-2', 'client', 'Client: check and accept the bill', 'Login as Client → open the new RA bill → tap an item to see day-by-day work → Accept or raise a query.'],
    ['file-up', 'admin', 'Admin: upload a new work order', 'Projects → Brigade Citadel 2 · Tower B → Upload work order PDF → use the sample → review → Save.'],
  ];
  return `<${inSheet ? 'h3' : 'h2'}>Try the full flow</${inSheet ? 'h3' : 'h2'}><p class="sm muted">Everything you do here is shared across the three roles. Data is sample data.</p>
   <ol class="gd">${st.map(([i, r, t, d]) => `<li><span class="gd-i">${ic(i)}</span><div><b>${t}</b><p>${d}</p><button class="link sm" data-a="switchTo" data-v="${r}">Login as ${ROLES[r].title} ${ic('arrow-right', 'i12')}</button></div></li>`).join('')}</ol>
   <button class="link sm" data-a="resetAsk">${ic('rotate-ccw', 'i12')} Reset demo data</button>`;
}

/* ---------- boot ---------- */
document.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a || !a.dataset.a) return; const fn = A[a.dataset.a]; if (fn) { e.preventDefault(); fn(a.dataset, a, e); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
if (!load()) DB = seed();
S.stack = S.user ? [{ n: { admin: 'aHome', supervisor: 'sHome', client: 'cHome' }[me().role], p: {} }] : [{ n: 'login', p: {} }];
if (S.user) S.role = me().role;
$('#guidePanel').innerHTML = guideHTML(false);
render(true);
armBack();
