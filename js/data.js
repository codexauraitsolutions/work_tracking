/* ================= DATA + LOGIC ================= */
const TODAY = '2026-10-22';
const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = n => '₹' + inr0.format(Math.round(n));
const q2 = n => inr2.format(n);
const qn = (n, u) => (u === 'sft' || u === 'cum' || u === 'sqm' || u === 'rm' ? q2(n) : inr2.format(n).replace(/\.00$/, '')) + (u ? ' ' + u : '');
const D = s => new Date(s + 'T00:00:00Z');
const addDays = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diffDays = (a, b) => Math.round((D(b) - D(a)) / 864e5);
const dfmt = (s, o = { day: '2-digit', month: 'short' }) => D(s).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
const dlong = s => dfmt(s, { day: '2-digit', month: 'short', year: 'numeric' });
const dow = s => dfmt(s, { weekday: 'short' });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Math.random().toString(36).slice(2, 8);
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* Sample work order — exactly as read from the Ayati PDF */
function sampleExtraction(sub) {
  const floors = [['GF', 'Ground Floor', 39041.03, 'AYTBC2301-Tower - A-All-CONW-Tower A-B1-1-0002', [1, 2, 3]], ['1F', 'First Floor', 23885.32, 'AYTBC2301-Tower - A--CONW-Tower A-1F-1-0003', [5, 6, 4]]];
  ['2F', '3F', '4F', '5F', '6F'].forEach((f, i) => floors.push([f, ['Second', 'Third', 'Fourth', 'Fifth', 'Sixth'][i] + ' Floor', 23885.32, `AYTBC2301-Tower - A--CONW-Tower A-${f}-1-000${i + 4}`, [7 + i * 3, 8 + i * 3, 9 + i * 3]]));
  const items = [];
  floors.forEach(([f, label, qty, code, srs]) => {
    items.push({ sr: srs[0], group: label, code, kind: 'work', name: 'Labour – Concrete, Steel & Shuttering', desc: `All Labour charges for Completion of Concrete, Steel, Shuttering Works for ${f} (Plan area shall be measured)`, unit: 'sft', qty, rate: 120 });
    items.push({ sr: srs[1], group: label, code, kind: 'bonus', name: 'Bonus – On-time mobilisation', desc: `Bonus Charges for On-Time Mobilization of Manpower for Completion of Concrete, Steel & Shuttering Works for ${f}`, unit: 'sft', qty, rate: 7.5 });
    items.push({ sr: srs[2], group: label, code, kind: 'bonus', name: 'Bonus – Completion within timeline', desc: `Bonus Charges for Successful Completion of Concrete, Steel & Shuttering Works within Agreed Timelines for ${f}`, unit: 'sft', qty, rate: 7.5 });
  });
  items.forEach(it => it.amount = Math.round(it.qty * it.rate));
  return {
    header: { no: 'ACELLP/AYTBC2301/WO/2026-2710/0001', date: '2026-10-03', type: 'Labour Only', company: 'Ayati Constructions and Estates LLP', project: 'Brigade Citadel 2', sub: sub || 'Tower - A', contractor: 'Sabir Khan', mobile: '7032646979', gstin: '36ABQFA9260R1ZG', taxCat: 'No TDS', pos: '36 - Telangana', address: 'Sy No 74/P, Ashok Marg, Sanathnagar, Fatehnagar Village, Balanagar Mandal' },
    terms: ['Rates are inclusive of all taxes, duties and site overheads, excluding GST', 'TDS deducted as per applicable rules', 'Retention: 5% of each RA bill, released as per contract terms', 'Quantities are provisional — paid on actual site measurement', 'Concrete laying, finishing, curing, chipping and housekeeping in contractor scope', 'All shuttering and reinforcement steel works in contractor scope'],
    retention: 5, pdfTotal: 24617648, pages: 2, items,
  };
}

const TEMPLATES = {
  port: [['PCC M15 below foundations', 'cum', 4200, 900, 2600], ['RCC M35 pile caps', 'cum', 9800, 700, 1900], ['Reinforcement steel Fe500D', 'MT', 68000, 120, 380], ['Formwork for deck slab', 'sqm', 650, 3000, 9000]],
  rail: [['Earthwork in embankment', 'cum', 320, 8000, 22000], ['RCC M30 piers', 'cum', 9200, 600, 1600], ['Reinforcement steel Fe500D', 'MT', 66000, 90, 260], ['Precast girder erection', 'nos', 185000, 24, 60]],
  road: [['Granular sub-base', 'cum', 1650, 5000, 14000], ['Wet mix macadam', 'cum', 2100, 4000, 11000], ['Dense bituminous macadam', 'cum', 8900, 1500, 4200], ['Kerb casting', 'rm', 620, 3000, 8000]],
  metro: [['Pile boring 1200 mm dia', 'rm', 7800, 1200, 3200], ['RCC M40 piers', 'cum', 10400, 500, 1400], ['Reinforcement steel Fe500D', 'MT', 71000, 110, 320], ['Pier cap shuttering', 'sqm', 820, 2500, 6000]],
};

function seed() {
  const users = [
    { id: 'u1', name: 'Kiran Rao', role: 'admin', phone: '98480 12345' },
    { id: 'u2', name: 'Ravi Kumar', role: 'supervisor', phone: '99630 22118' },
    { id: 'u4', name: 'Imran Shaik', role: 'supervisor', phone: '90001 44521' },
    { id: 'u5', name: 'Srinivas P', role: 'supervisor', phone: '93910 77802' },
    { id: 'u3', name: 'Vamsee', role: 'client', clientId: 'c3', phone: '70326 11223', org: 'Ayati Constructions' },
    { id: 'u6', name: 'MEIL Site Office', role: 'client', clientId: 'c1', phone: '94400 55120', org: 'MEIL' },
  ];
  const clients = [
    { id: 'c1', name: 'MEIL', full: 'Megha Engineering & Infrastructures Ltd', ini: 'ME', color: '#B3261E', city: 'Hyderabad' },
    { id: 'c2', name: 'L&T', full: 'Larsen & Toubro', ini: 'LT', color: '#1D4E9E', city: 'Chennai' },
    { id: 'c3', name: 'Ayati Constructions', full: 'Ayati Constructions and Estates LLP', ini: 'AY', color: '#0F8B8D', city: 'Kondapur, Hyderabad' },
    { id: 'c4', name: 'NCC Limited', full: 'NCC Limited', ini: 'NC', color: '#6A3FB5', city: 'Hyderabad' },
    { id: 'c5', name: 'Tata Projects', full: 'Tata Projects Ltd', ini: 'TP', color: '#C26A00', city: 'Secunderabad' },
  ];
  const projects = [
    { id: 'p1', clientId: 'c3', name: 'Brigade Citadel 2', sub: 'Tower A', address: 'Sanathnagar, Balanagar Mandal', start: '2026-10-03', cycle: 20, retention: 5, tds: 0, supervisorId: 'u2', clientUserId: 'u3' },
    { id: 'p2', clientId: 'c3', name: 'Brigade Citadel 2', sub: 'Tower B', address: 'Sanathnagar, Balanagar Mandal', start: '2026-10-20', cycle: 30, retention: 5, tds: 0, supervisorId: null, clientUserId: 'u3' },
    { id: 'p3', clientId: 'c1', name: 'Bandar Port', sub: 'Berth 1', address: 'Machilipatnam', start: '2026-09-14', cycle: 30, retention: 5, tds: 1, supervisorId: 'u2', clientUserId: 'u6', tpl: 'port', frac: [.62, .41, .38, .2] },
    { id: 'p4', clientId: 'c1', name: 'Bandar Port', sub: 'Breakwater', address: 'Machilipatnam', start: '2026-10-01', cycle: 30, retention: 5, tds: 1, supervisorId: 'u4', clientUserId: 'u6', tpl: 'port', frac: [.3, .18, .15, .05] },
    { id: 'p5', clientId: 'c1', name: 'Port Approach Road', sub: 'Km 0–6', address: 'Machilipatnam', start: '2026-09-21', cycle: 15, retention: 5, tds: 1, supervisorId: 'u4', clientUserId: 'u6', tpl: 'road', frac: [.55, .4, .2, .1] },
    { id: 'p6', clientId: 'c2', name: 'Railway ROB', sub: 'Package 2', address: 'Vijayawada', start: '2026-08-31', cycle: 20, retention: 5, tds: 1, supervisorId: 'u5', clientUserId: null, tpl: 'rail', frac: [.8, .5, .45, .2] },
    { id: 'p7', clientId: 'c2', name: 'Railway Station Building', sub: 'Phase 1', address: 'Guntur', start: '2026-10-05', cycle: 30, retention: 5, tds: 1, supervisorId: 'u5', clientUserId: null, tpl: 'rail', frac: [.25, .1, .08, 0] },
    { id: 'p8', clientId: 'c4', name: 'Highway Package 4', sub: 'NH-65', address: 'Suryapet', start: '2026-08-17', cycle: 30, retention: 5, tds: 1, supervisorId: 'u4', clientUserId: null, tpl: 'road', frac: [.85, .6, .35, .3] },
    { id: 'p9', clientId: 'c4', name: 'Service Road Works', sub: 'Stretch B', address: 'Suryapet', start: '2026-09-28', cycle: 20, retention: 5, tds: 1, supervisorId: 'u4', clientUserId: null, tpl: 'road', frac: [.4, .25, .1, .05] },
    { id: 'p10', clientId: 'c5', name: 'Metro Viaduct', sub: 'Piers P40–P72', address: 'Hyderabad', start: '2026-09-07', cycle: 30, retention: 5, tds: 1, supervisorId: 'u5', clientUserId: null, tpl: 'metro', frac: [.6, .35, .3, .2] },
    { id: 'p11', clientId: 'c5', name: 'River Bridge', sub: 'Span 1–8', address: 'Warangal', start: '2026-10-12', cycle: 20, retention: 5, tds: 1, supervisorId: 'u5', clientUserId: null, tpl: 'metro', frac: [.15, .05, .05, 0] },
  ];
  const DB = { users, clients, projects, wos: [], items: [], entries: [], bills: [], notes: [] };

  // --- Ayati Tower A: real work order ---
  const ex = sampleExtraction();
  const wo1 = { id: 'w1', projectId: 'p1', ...ex.header, file: 'woayaticonstructiongst.pdf', uploadedOn: '2026-10-03', uploadedBy: 'u1', terms: ex.terms, total: ex.pdfTotal };
  DB.wos.push(wo1);
  ex.items.forEach((it, i) => DB.items.push({ ...it, id: 'i1-' + it.sr, woId: 'w1', projectId: 'p1', earnedOn: null }));
  const it = sr => DB.items.find(x => x.id === 'i1-' + sr);
  it(2).earnedOn = '2026-10-05'; it(3).earnedOn = '2026-10-12';
  const rem = ['Column shuttering and steel binding', 'Slab concreting, east wing', 'Beam bottoms and side shuttering', 'Slab reinforcement fixing', 'Concrete pour with pump, curing started', 'Deshuttering and cleaning'];
  const gf = [3900, 3900, 3900, 3900, 3900, 3900, 3900, 3900, 3900, 3941.03];
  gf.forEach((q, i) => DB.entries.push({ id: uid('e'), itemId: 'i1-1', projectId: 'p1', date: addDays('2026-10-03', i), qty: q, by: 'u2', labour: 40 + (i % 5), remarks: rem[i % rem.length], photos: ['ph1', 'ph2'], status: 'Verified', verifiedBy: 'u1', verifiedOn: addDays('2026-10-03', i + 1) }));
  [['2026-10-13', 1600], ['2026-10-14', 1600], ['2026-10-15', 1600], ['2026-10-16', 1650], ['2026-10-17', 1700], ['2026-10-19', 1550], ['2026-10-20', 1600], ['2026-10-21', 1450]].forEach(([d, q], i) =>
    DB.entries.push({ id: uid('e'), itemId: 'i1-5', projectId: 'p1', date: d, qty: q, by: 'u2', labour: 38 + (i % 6), remarks: rem[(i + 2) % rem.length], photos: i % 2 ? ['ph3'] : ['ph1', 'ph3'], status: d === '2026-10-21' ? 'Pending' : 'Verified', verifiedBy: d === '2026-10-21' ? null : 'u1', verifiedOn: d === '2026-10-21' ? null : addDays(d, 1) }));

  // --- Generic projects ---
  projects.filter(p => p.tpl).forEach((p, pi) => {
    const r = rng(101 + pi * 7);
    const woId = 'w-' + p.id;
    const its = TEMPLATES[p.tpl].map((t, k) => {
      const qty = Math.round(t[3] + r() * (t[4] - t[3]));
      return { id: `i-${p.id}-${k}`, woId, projectId: p.id, sr: k + 1, group: 'Main works', code: `${p.id.toUpperCase()}-${String(k + 1).padStart(3, '0')}`, kind: 'work', name: t[0], desc: t[0], unit: t[1], qty, rate: t[2], amount: Math.round(qty * t[2]), earnedOn: null };
    });
    DB.items.push(...its);
    const c = clients.find(c => c.id === p.clientId);
    DB.wos.push({ id: woId, projectId: p.id, no: `${c.ini}/${p.id.toUpperCase()}/WO/2026/${String(10 + pi * 3).padStart(3, '0')}`, date: p.start, type: 'Labour & Material', company: c.full, project: p.name, sub: p.sub, contractor: 'Sabir Khan', taxCat: 'TDS 1%', pos: '36 - Telangana', file: `${p.name.replace(/\W+/g, '_')}_WO.pdf`, uploadedOn: p.start, uploadedBy: 'u1', terms: ['Retention 5% of each RA bill', 'TDS 1% as applicable', 'Quantities as per joint measurement'], total: its.reduce((a, b) => a + b.amount, 0) });
    const days = diffDays(p.start, TODAY);
    its.forEach((item, k) => {
      const target = item.qty * p.frac[k]; if (!target) return;
      const startOff = Math.floor(k * days * 0.15);
      const n = days - startOff; let done = 0;
      for (let d = startOff; d < days; d++) {
        const date = addDays(p.start, d); if (D(date).getUTCDay() === 0) continue;
        let q = target / n * 7 / 6 * (0.7 + r() * 0.6);
        q = item.unit === 'nos' || item.unit === 'MT' ? Math.max(0, Math.round(q)) : Math.round(q * 100) / 100;
        if (!q || done + q > target) continue; done += q;
        const recent = diffDays(date, TODAY) <= 1;
        DB.entries.push({ id: uid('e'), itemId: item.id, projectId: p.id, date, qty: q, by: p.supervisorId, labour: 20 + Math.floor(r() * 30), remarks: 'Work progressing as per plan', photos: ['ph' + (1 + Math.floor(r() * 3))], status: recent && pi % 3 === 0 ? 'Pending' : 'Verified', verifiedBy: recent && pi % 3 === 0 ? null : 'u1', verifiedOn: recent && pi % 3 === 0 ? null : addDays(date, 1) });
      }
    });
  });
  // past cycles → bills already done
  projects.forEach(p => {
    for (let k = 0; ; k++) {
      const c = cycleOf(p, k); if (c.to >= TODAY) break;
      if (!DB.items.some(i => i.projectId === p.id)) break;
      const b = makeBill(DB, p, k, c.to);
      b.status = 'Accepted'; b.approvedOn = addDays(c.to, 1); b.sentOn = addDays(c.to, 1); b.acceptedOn = addDays(c.to, 3);
      DB.bills.push(b);
    }
  });
  return DB;
}

/* ---------- billing cycles ---------- */
function cycleOf(p, k) { const from = addDays(p.start, k * p.cycle); return { k, from, to: addDays(from, p.cycle - 1) }; }
function cycleInfo(p, date = TODAY) {
  if (date < p.start) return { notStarted: true, from: p.start, to: addDays(p.start, p.cycle - 1), k: 0, day: 0 };
  const k = Math.floor(diffDays(p.start, date) / p.cycle); const c = cycleOf(p, k);
  return { ...c, day: diffDays(c.from, date) + 1, endsToday: c.to === date, daysLeft: diffDays(date, c.to) };
}

/* ---------- quantities ---------- */
function itemDone(DB, item, upto = '9999', verifiedOnly = true, from = '0000') {
  if (item.kind === 'bonus') return item.earnedOn && item.earnedOn <= upto && item.earnedOn >= from ? item.qty : 0;
  return DB.entries.filter(e => e.itemId === item.id && e.date <= upto && e.date >= from && (verifiedOnly ? e.status === 'Verified' : e.status !== 'Rejected')).reduce((a, e) => a + e.qty, 0);
}
function projItems(DB, pid) { return DB.items.filter(i => i.projectId === pid); }
function projValue(DB, pid) { return projItems(DB, pid).reduce((a, i) => a + i.amount, 0); }
function projDone(DB, pid, upto, from) { return projItems(DB, pid).reduce((a, i) => a + Math.round(itemDone(DB, i, upto, true, from) * i.rate), 0); }

function makeBill(DB, p, k, genOn) {
  const c = cycleOf(p, k);
  const prevBills = DB.bills.filter(b => b.projectId === p.id);
  const lines = projItems(DB, p.id).map(item => {
    const prev = itemDone(DB, item, addDays(c.from, -1));
    const thisQ = itemDone(DB, item, c.to, true, c.from);
    return { itemId: item.id, sr: item.sr, name: item.name, group: item.group, unit: item.unit, rate: item.rate, woQty: item.qty, prev, thisQ, cum: prev + thisQ, amount: Math.round(thisQ * item.rate), kind: item.kind };
  }).filter(l => l.thisQ > 0);
  const gross = lines.reduce((a, l) => a + l.amount, 0);
  const retention = Math.round(gross * p.retention / 100), tds = Math.round(gross * p.tds / 100);
  const prevGross = prevBills.reduce((a, b) => a + b.gross, 0);
  return { id: uid('b'), projectId: p.id, no: 'RA Bill ' + String(prevBills.length + 1).padStart(2, '0'), k, from: c.from, to: c.to, generatedOn: genOn, auto: true, lines, gross, retention, tds, gst: 0, net: gross - retention - tds, prevGross, woValue: projValue(DB, p.id), status: 'Awaiting approval', query: null };
}
