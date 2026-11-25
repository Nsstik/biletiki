// Правила прохождения билета. Не зависят от экрана, поэтому проверяются отдельно.
// Круг 1: все карточки. Левые повторяются, пока все не уйдут вправо.
// Затем заключительный круг по всем карточкам: нужно не меньше 90% вправо.
var PASS = 0.9;
function range(n) { return Array.from({ length: n }, function (_, i) { return i; }); }
function startRun(n) { return { n: n, phase: 'first', queue: range(n), wrong: [], right: 0, result: null }; }
function need(n) { return Math.ceil(n * PASS); }
function answer(run, ok) {
  var r = JSON.parse(JSON.stringify(run));
  if (r.result) return r;
  var card = r.queue.shift();
  if (r.phase === 'retry') {
    if (!ok) r.queue.push(card);
  } else if (ok) r.right++;
  else r.wrong.push(card);
  if (r.queue.length) return r;
  if (r.phase === 'first') {
    if (!r.wrong.length) r.result = { passed: true, right: r.right };
    else { r.result = { next: 'retry', right: r.right }; }
  } else if (r.phase === 'retry') {
    r.result = { next: 'final' };
  } else if (r.right >= need(r.n)) {
    r.result = { passed: true, right: r.right };
  } else r.result = { next: 'retry', right: r.right, failed: true };
  return r;
}
function nextPhase(run) {
  var phase = run.result.next;
  return { n: run.n, phase: phase, queue: phase === 'retry' ? run.wrong.slice() : range(run.n), wrong: phase === 'retry' ? run.wrong.slice() : [], right: 0, result: null };
}
