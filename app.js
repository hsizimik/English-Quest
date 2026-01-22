// 英語クエスト v2（低ストレス版）
// - localStorageに保存（端末ごと）
// - 30秒/2分/文法1口
// - 失敗しても「次また出る」だけ

const KEY = "englishQuest_v2";

const today = () => new Date().toISOString().slice(0, 10);
const load = () => JSON.parse(localStorage.getItem(KEY) || "null");
const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));

const DEFAULT = [
  ["robot","ロボット"],["sensor","センサー"],["motor","モーター"],["battery","バッテリー"],
  ["signal","信号"],["power","電源"],["voltage","電圧"],["current","電流"],
  ["circuit","回路"],["resistor","抵抗"],["capacitor","コンデンサ"],["transistor","トランジスタ"],
  ["logic","論理"],["gate","ゲート"],["memory","メモリ"],["program","プログラム"],
  ["control","制御する"],["measure","測定する"],["build","作る"],["design","設計する"]
];

function word(en, jp) {
  return { en, jp, box: 1, due: today(), right: 0, wrong: 0 };
}

function init() {
  let d = load();
  if (!d) {
    d = { words: [], doneDates: {}, streak: 0, lastDone: null, xp: 0, schoolMode: false };
    DEFAULT.slice(0, 10).forEach(([en, jp]) => d.words.push(word(en, jp)));
    save(d);
  }
  return d;
}

function dayDiff(a, b) {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

function nextDue(box) {
  const dt = new Date();
  const add = (n) => { dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); };
  if (box <= 1) return add(1);
  if (box === 2) return add(3);
  return add(7);
}

function grade(w, ok) {
  if (ok) { w.right++; w.box = Math.min(3, w.box + 1); }
  else { w.wrong++; w.box = 0; }
  w.due = nextDue(w.box);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function pick(words, n) {
  const t = today();
  const due = words.filter(w => (w.due || t) <= t);
  due.sort((a, b) => (a.box - b.box) || (b.wrong - a.wrong) || (a.right - b.right));
  if (due.length >= n) return due.slice(0, n);
  const rest = words.filter(w => !due.includes(w));
  shuffle(rest);
  return due.concat(rest.slice(0, n - due.length));
}

const $ = (id) => document.getElementById(id);
const main = () => $("main");
const toast = () => $("toast");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}

function showToast(msg) {
  const t = toast();
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => (t.style.display = "none"), 1400);
}

function render() {
  const d = init();
  $("streak").textContent = d.streak || 0;
  $("todayDone").textContent = d.doneDates[today()] ? "済" : "未";
  $("xp").textContent = d.xp || 0;
  $("count").textContent = d.words.length;
  $("schoolMode").checked = !!d.schoolMode;
}

function markDone(auto = true) {
  const d = init();
  const t = today();

  if (!d.doneDates[t]) {
    d.doneDates[t] = true;

    if (!d.lastDone) d.streak = 1;
    else {
      const diff = dayDiff(d.lastDone, t);
      if (diff === 1) d.streak += 1;
      else if (diff === 0) d.streak = d.streak;
      else d.streak = 1;
    }
    d.lastDone = t;
  }

  d.xp += auto ? 2 : 1;
  save(d);
  render();
  showToast("✅ 今日の勝ち（1歩でOK）");
}

function wordCard(w, idx, total, onOk, onNg) {
  main().innerHTML = `
    <span class="pill">🧩 単語 ${idx + 1}/${total}</span>
    <div class="en">${escapeHtml(w.en)}</div>
    <div class="jp">${escapeHtml(w.jp)}</div>
    <div class="row">
      <button class="ok" id="okBtn">わかった</button>
      <button class="ng" id="ngBtn">まだ</button>
    </div>
    <div class="hint">「まだ」でもOK。次にまた出るだけ。ダメージなし。</div>
  `;
  $("okBtn").onclick = onOk;
  $("ngBtn").onclick = onNg;
}

function sentenceCard(en, jp, onNext) {
  main().innerHTML = `
    <span class="pill">📄 超短文</span>
    <div class="en">${escapeHtml(en)}</div>
    <div class="jp">${escapeHtml(jp)}</div>
    <div class="row"><button class="primary" id="nextBtn">読めた（終了）</button></div>
    <div class="hint">完璧不要。「意味がちょっと分かった」で勝ち。</div>
  `;
  $("nextBtn").onclick = onNext;
}

const GRAM = [
  { t: "be動詞＝イコール", b: ["I am / He is / You are", "否定は not", "まず『〜です』を言えるだけで強い"], ex: "I am a student.", jp: "私は学生です。" },
  { t: "一般動詞＝動作", b: ["like/play/study など", "He likes（sが付く）", "否定：don't / doesn't"], ex: "He studies every day.", jp: "彼は毎日勉強します。" },
  { t: "疑問文：Do/Does", b: ["Do you ...? で質問", "Does のとき動詞は原形", "Yes/No で答える練習が最短"], ex: "Do you like robots?", jp: "ロボットが好きですか？" },
  { t: "過去：昨日の話", b: ["play→played", "be は was/were", "『昨日〜した』が言えたら勝ち"], ex: "I played yesterday.", jp: "私は昨日プレイしました。" },
];

function gramCard(i) {
  const g = GRAM[i % GRAM.length];
  main().innerHTML = `
    <span class="pill">🧠 文法1口</span>
    <div style="font-weight:900;font-size:18px;margin:8px 0 10px;">${escapeHtml(g.t)}</div>
    <div class="hint" style="font-size:14px;color:var(--text);line-height:1.7;">
      ${g.b.map(x => "• " + escapeHtml(x)).join("<br>")}
    </div>
    <div class="sep"></div>
    <div class="en">${escapeHtml(g.ex)}</div>
    <div class="jp">${escapeHtml(g.jp)}</div>
    <div class="row" style="margin-top:10px;"><button class="primary" id="nextGram">次の1口</button></div>
  `;
  $("nextGram").onclick = () => gramCard(i + 1);
}

function quick() {
  const d = init();
  const picks = pick(d.words, 1);
  const w = picks[0];

  wordCard(w, 0, 1,
    () => { grade(w, true); save(d); markDone(true); },
    () => { grade(w, false); save(d); markDone(true); }
  );
}

function easy() {
  const d = init();
  const picks = pick(d.words, 2);

  const pool = [
    ["I like robots.", "私はロボットが好きです。"],
    ["He builds a circuit.", "彼は回路を作ります。"],
    ["She uses a sensor.", "彼女はセンサーを使います。"],
    ["We study every day.", "私たちは毎日勉強します。"],
    ["This is my motor.", "これは私のモーターです。"]
  ];
  shuffle(pool);

  let step = 0;

  const next = () => {
    step++;
    if (step === 1) showWord(1);
    else if (step === 2) sentenceCard(pool[0][0], pool[0][1], () => markDone(true));
  };

  const showWord = (i) => {
    const w = picks[i];
    wordCard(w, i, 2,
      () => { grade(w, true); save(d); next(); },
      () => { grade(w, false); save(d); next(); }
    );
  };

  showWord(0);
}

function addWords() {
  const d = init();
  const txt = $("wordBox").value;

  const lines = txt.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  let added = 0;

  for (const line of lines) {
    const parts = line.split("=");
    if (parts.length < 2) continue;

    const en = parts[0].trim();
    const jp = parts.slice(1).join("=").trim();
    if (!en || !jp) continue;

    if (d.words.some(w => w.en.toLowerCase() === en.toLowerCase())) continue;

    d.words.push(word(en, jp));
    added++;
  }

  save(d);
  render();

  if (added > 0) {
    showToast(`📦 追加 ${added}語`);
    $("wordBox").value = "";
  } else {
    showToast("追加なし（形式：english = 日本語）");
  }
}

function loadSet() {
  const d = init();
  let added = 0;

  for (const [en, jp] of DEFAULT) {
    if (d.words.some(w => w.en.toLowerCase() === en.toLowerCase())) continue;
    d.words.push(word(en, jp));
    added++;
  }

  save(d);
  render();
  showToast(`⚙️ 工学セット +${added}語`);
}

function resetAll() {
  const d = init();
  if (d.schoolMode) {
    localStorage.removeItem(KEY);
    render();
    main().innerHTML = `<div class="hint">初期化した。まずはクイックから。</div>`;
    return;
  }
  if (confirm("全データを初期化します。OK？")) {
    localStorage.removeItem(KEY);
    render();
    main().innerHTML = `<div class="hint">初期化した。まずはクイックから。</div>`;
  }
}

// ---- wiring ----
window.addEventListener("DOMContentLoaded", () => {
  $("btnQuick").onclick = quick;
  $("btnEasy").onclick = easy;
  $("btnGram").onclick = () => gramCard(0);

  $("btnDone").onclick = () => markDone(false);
  $("btnAddXP").onclick = () => {
    const d = init();
    d.xp += 1;
    save(d);
    render();
    showToast("+1XP");
  };

  $("btnReset").onclick = resetAll;

  $("btnAddWords").onclick = addWords;
  $("btnLoadSet").onclick = loadSet;

  $("schoolMode").onchange = (e) => {
    const d = init();
    d.schoolMode = !!e.target.checked;
    save(d);
    render();
    showToast(d.schoolMode ? "学校モード ON" : "学校モード OFF");
  };

  render();
});
