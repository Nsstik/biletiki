var KEY = 'bilety-v1';
var store = load();
var app = document.getElementById('app');
var view = { subject: null, ticket: null, flipped: false, history: [] };
var busy = false;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { alert('Прогресс не сохраняется: браузер запретил память сайта.'); } }
function id(s, t) { return s + '-' + t.n; }
function rec(s, t) { var k = id(s, t); return store[k] || (store[k] = { passed: false, run: null }); }
function el(html) { app.innerHTML = html; }
function on(sel, fn) { var e = app.querySelector(sel); if (e) e.onclick = fn; }
function tickets(s) { return DATA[s].tickets.filter(function (t) { return t.cards.length; }); }
function unlocked(s, i) { return i === 0 || rec(s, tickets(s)[i - 1]).passed; }
var MISSING = { tv: [25, 26, 27, 28, 29], ml: [1, 15, 20, 21, 22, 23, 24, 25, 26, 31, 32] };

function home() {
  view.subject = view.ticket = null;
  el('<h1>Карточки по билетам</h1><div class="list">' + Object.keys(DATA).map(function (s) {
    var list = tickets(s), done = list.filter(function (t) { return rec(s, t).passed; }).length;
    return '<button class="item" data-s="' + s + '"><span><strong>' + DATA[s].name + '</strong><small>Пройдено ' + done + ' из ' + list.length + '</small></span>›</button>';
  }).join('') + '</div>');
  app.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { subject(b.dataset.s); }; });
}

function subject(s) {
  view.subject = s; view.ticket = null;
  var list = tickets(s);
  var rows = list.map(function (t, i) {
    var r = rec(s, t), open = unlocked(s, i);
    var state = r.passed ? '✅ пройден' : !open ? '🔒 сначала предыдущий' : r.run ? 'начат' : 'открыт';
    return { n: t.n, html: '<button class="item" data-i="' + i + '"' + (open ? '' : ' disabled') + '><b>' + t.n + '</b><span>' + t.title + '<small>' + t.cards.length + ' карточек · ' + state + '</small></span></button>' };
  }).concat(MISSING[s].map(function (n) { return { n: n, html: '<div class="item none" style="padding:10px 16px;border-radius:14px"><b>' + n + '</b><span>нет в конспекте</span></div>' }; }));
  rows.sort(function (a, b) { return a.n - b.n; });
  el('<div class="top"><button id="back">‹ Назад</button><h2>' + DATA[s].name + '</h2></div><div class="list" style="margin-top:12px">' + rows.map(function (r) { return r.html; }).join('') + '</div>');
  on('#back', home);
  app.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { open(list[+b.dataset.i]); }; });
}

function open(t) {
  var r = rec(view.subject, t);
  if (!r.run || r.run.n !== t.cards.length) r.run = startRun(t.cards.length);
  view.ticket = t; view.flipped = false; view.history = []; save(); show();
}

function title(run) {
  return run.phase === 'first' ? 'Первый круг' : run.phase === 'retry' ? 'Работа над левыми' : 'Заключительный круг';
}

function show() {
  var s = view.subject, t = view.ticket, r = rec(s, t), run = r.run;
  if (run.result) return summary();
  var c = t.cards[run.queue[0]];
  var count, pct;
  if (run.phase === 'retry') {
    var left = run.queue.length, all = run.wrong.length;
    count = 'осталось ' + left + ' из ' + all; pct = (all - left) / all;
  } else {
    var pos = run.n - run.queue.length;
    count = (pos + 1) + ' из ' + run.n; pct = pos / run.n;
  }
  el('<div class="top"><button id="back">‹</button><div class="t">Билет ' + t.n + ' · ' + title(run) + ' · ' + count + '</div></div>' +
    '<div class="bar"><i style="width:' + Math.round(pct * 100) + '%"></i></div>' +
    '<div class="stage"><div class="card' + (view.flipped ? '' : ' front') + '" id="card"><div class="q">' + c.q + '</div>' +
    (view.flipped ? '<div class="ans">' + c.a + '</div>' : '<div class="hint">Ответь вслух, потом нажми на карточку</div>') +
    '<div class="badge r">ЗНАЮ</div><div class="badge l">ПУТАЮ</div></div></div>' +
    '<div class="actions"><button class="undo" id="undo" aria-label="Отменить"' + (view.history.length ? '' : ' disabled') + '>↶</button>' +
    (view.flipped ? '<button class="no" id="no">← Напуталась</button><button class="yes" id="yes">Знаю →</button>' : '<button class="primary" id="flip">Показать ответ</button>') + '</div>');
  app.querySelectorAll('.ans table').forEach(function (tb) { var w = document.createElement('div'); w.className = 'sx'; tb.parentNode.insertBefore(w, tb); w.appendChild(tb); });
  on('#back', function () { subject(s); });
  on('#flip', flip);
  on('#yes', function () { fly(true); });
  on('#no', function () { fly(false); });
  on('#undo', undo);
  drag(document.getElementById('card'));
}

function flip() { if (!view.flipped) { view.flipped = true; show(); } }
function undo() {
  if (busy || !view.history.length) return;
  rec(view.subject, view.ticket).run = view.history.pop(); view.flipped = true; save(); show();
}
function commit(ok) {
  var r = rec(view.subject, view.ticket);
  view.history.push(r.run);
  r.run = answer(r.run, ok);
  if (r.run.result && r.run.result.passed) r.passed = true;
  view.flipped = false; save(); show();
}
function fly(ok) {
  if (busy) return; busy = true;
  var card = document.getElementById('card');
  card.style.transition = 'transform .22s, opacity .22s';
  card.style.transform = 'translateX(' + (ok ? 120 : -120) + '%) rotate(' + (ok ? 14 : -14) + 'deg)';
  card.style.opacity = '0';
  setTimeout(function () { busy = false; if (view.ticket) commit(ok); }, 220);
}

function scrollsSideways(node, stop) {
  for (; node && node !== stop; node = node.parentElement)
    if (node.scrollWidth > node.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return true;
  return false;
}
function drag(card) {
  var x0, y0, dx = 0, active = false, side = false;
  card.onpointerdown = function (e) { if (busy) return; active = true; x0 = e.clientX; y0 = e.clientY; dx = 0; side = false; };
  card.onpointermove = function (e) {
    if (!active || !view.flipped) return;
    var mx = e.clientX - x0, my = e.clientY - y0;
    if (!side) {
      if (Math.abs(mx) < 12 || Math.abs(mx) < Math.abs(my) * 1.3 || scrollsSideways(e.target, card)) return;
      side = true; card.setPointerCapture(e.pointerId);
    }
    dx = mx;
    card.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 25 + 'deg)';
    card.querySelector('.badge.r').style.opacity = Math.max(0, Math.min(1, dx / 90));
    card.querySelector('.badge.l').style.opacity = Math.max(0, Math.min(1, -dx / 90));
  };
  card.onpointerup = function (e) {
    if (!active) return; active = false;
    if (!view.flipped) { if (Math.abs(e.clientX - x0) < 10 && Math.abs(e.clientY - y0) < 10) flip(); return; }
    if (side && Math.abs(dx) > 90) return fly(dx > 0);
    reset();
  };
  card.onpointercancel = function () { active = false; reset(); };
  function reset() { card.style.transform = ''; card.querySelectorAll('.badge').forEach(function (b) { b.style.opacity = 0; }); }
}

function summary() {
  var s = view.subject, t = view.ticket, r = rec(s, t), run = r.run, res = run.result;
  var list = tickets(s), i = list.indexOf(t), next = list[i + 1];
  var body;
  if (res.passed) {
    body = '<div class="big">' + Math.round(res.right / run.n * 100) + '%</div><h2>Билет ' + t.n + ' пройден 🎉</h2><p>' + res.right + ' из ' + run.n + ' карточек.</p>' +
      (next ? '<button class="primary" id="go">Открыть билет ' + next.n + '</button>' : '<p><b>Это был последний билет. Ты молодец!</b></p>') + '<button id="again">Пройти этот билет ещё раз</button>';
  } else if (res.next === 'retry') {
    body = '<div class="big">' + Math.round(res.right / run.n * 100) + '%</div><h2>' + (res.failed ? 'До 90% пока не хватило' : 'Первый круг пройден') + '</h2><p>Нужно повторить карточек: ' + run.wrong.length + '. Они будут возвращаться, пока все не уйдут вправо.</p>' +
      (res.failed ? '<p>В заключительном круге нужно ' + need(run.n) + ' из ' + run.n + '.</p>' : '') + '<button class="primary" id="go">Повторить левые</button>';
  } else {
    body = '<h2>Все левые отработаны 💪</h2><p>Теперь заключительный круг по всем карточкам. Нужно ' + need(run.n) + ' из ' + run.n + ' вправо.</p><button class="primary" id="go">Начать заключительный круг</button>';
  }
  el('<div class="top"><button id="back">‹ К билетам</button><div class="t">Билет ' + t.n + '</div></div><div class="done">' + body + (view.history.length && !res.passed ? '<button id="undo">↶ Отменить последний свайп</button>' : '') + '</div>');
  on('#back', function () { if (res.passed) { r.run = null; save(); } subject(s); });
  on('#undo', undo);
  on('#again', function () { r.run = null; open(t); });
  on('#go', function () {
    if (res.passed) { r.run = null; save(); open(next); }
    else { r.run = nextPhase(run); view.history = []; view.flipped = false; save(); show(); }
  });
}

document.addEventListener('keydown', function (e) {
  if (!view.ticket || !document.getElementById('card')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  else if (view.flipped && e.key === 'ArrowRight') fly(true);
  else if (view.flipped && e.key === 'ArrowLeft') fly(false);
});
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js');
home();
