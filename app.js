// LulusTIU — mesin aplikasi (latihan, diagnostik, progres)
// Berjalan PENUH tanpa Firebase (bank soal bawaan). Bila window.LulusAI.ready,
// tombol Hint/Pembahasan/Soal Baru memakai AI hybrid.
(function () {
  const $ = (id) => document.getElementById(id);
  const SUBTYPES = [
    { key: "semua", label: "Semua" },
    { key: "deret", label: "Deret" },
    { key: "aritmatika", label: "Aritmatika" },
    { key: "perbandingan", label: "Perbandingan" },
    { key: "bilangan", label: "Bilangan" },
  ];
  const SUB_LABEL = { deret: "Deret", aritmatika: "Aritmatika Cerita", perbandingan: "Perbandingan Kuantitatif", bilangan: "Bilangan" };
  const LETTERS = "ABCDE";

  let bank = (typeof QUESTION_BANK !== "undefined" ? QUESTION_BANK : []).slice();
  let filter = "semua";
  let queue = [];
  let current = null;
  let selected = -1;
  let checked = false;

  // ---------- progres (localStorage) ----------
  const PKEY = "lulustiu_progress_v1";
  let progress = { attempts: {}, diag: null };
  try { const raw = localStorage.getItem(PKEY); if (raw) progress = JSON.parse(raw); } catch (e) {}
  function saveProgress() { try { localStorage.setItem(PKEY, JSON.stringify(progress)); } catch (e) {} }
  function record(qid, ok) {
    const a = progress.attempts[qid] || { tries: 0, correct: 0 };
    a.tries++; if (ok) a.correct++;
    progress.attempts[qid] = a; saveProgress();
  }

  // ---------- util ----------
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function box(el, kind, src, text) { el.className = "box show " + kind; el.innerHTML = ""; const s = document.createElement("span"); s.className = "src"; s.textContent = src; el.appendChild(s); el.appendChild(document.createTextNode(text)); }
  function hideBox(el) { el.className = "box"; el.textContent = ""; }

  // ---------- latihan ----------
  function buildQueue() {
    const pool = filter === "semua" ? bank : bank.filter(q => q.subtype === filter);
    queue = shuffle(pool);
  }
  function renderChips() {
    const c = $("subtypeChips"); c.innerHTML = "";
    SUBTYPES.forEach(st => {
      const b = document.createElement("button");
      b.className = "chip" + (filter === st.key ? " active" : "");
      b.textContent = st.label;
      b.onclick = () => { filter = st.key; renderChips(); buildQueue(); nextQuestion(); };
      c.appendChild(b);
    });
  }
  function nextQuestion() {
    if (!queue.length) buildQueue();
    current = queue.pop();
    selected = -1; checked = false;
    $("qBadge").textContent = (SUB_LABEL[current.subtype] || current.subtype) + " • " + current.id;
    $("qText").textContent = current.q;
    const boxOpts = $("qOpts"); boxOpts.innerHTML = "";
    current.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.innerHTML = '<span class="ltr">' + LETTERS[i] + ".</span><span></span>";
      b.querySelector("span:last-child").textContent = opt;
      b.onclick = () => { if (checked) return; selected = i; [...boxOpts.children].forEach((el, j) => el.classList.toggle("sel", j === i)); };
      boxOpts.appendChild(b);
    });
    hideBox($("hintBox")); hideBox($("fbBox")); hideBox($("solBox"));
  }
  async function onHint() {
    const hb = $("hintBox");
    box(hb, "hint", "Hint — bank soal", current.hint || "Belum ada hint untuk soal ini.");
    if (window.LulusAI && window.LulusAI.ready) {
      box(hb, "hint", "Hint — AI (on-device diutamakan)", "Meminta hint ke AI…");
      const aiHint = await window.LulusAI.getHint(current);
      if (aiHint) box(hb, "hint", "Hint — AI hybrid", aiHint);
      else box(hb, "hint", "Hint — bank soal (AI tak terjangkau)", current.hint || "-");
    }
  }
  async function onSolution() {
    const sb = $("solBox");
    box(sb, "sol", "Pembahasan — bank soal", current.solution || "Belum ada pembahasan.");
    if (window.LulusAI && window.LulusAI.ready) {
      const aiSol = await window.LulusAI.getSolution(current);
      if (aiSol) box(sb, "sol", "Pembahasan — AI cloud", aiSol);
    }
  }
  function onCheck() {
    if (!current || selected < 0 || checked) { if (selected < 0) box($("fbBox"), "fb-bad", "Ups", "Pilih dulu salah satu jawaban, baru cek."); return; }
    checked = true;
    const ok = selected === current.answer;
    record(current.id, ok);
    [...$("qOpts").children].forEach((el, j) => {
      el.disabled = true;
      if (j === current.answer) el.classList.add("right");
      if (j === selected && !ok) el.classList.add("wrong");
    });
    box($("fbBox"), ok ? "fb-ok" : "fb-bad", ok ? "Benar! 🎉" : "Belum tepat",
      ok ? "Jawabanmu benar. Lanjut soal berikutnya, atau buka pembahasan buat menguatkan pola pikirnya."
         : "Jawaban benar: " + LETTERS[current.answer] + ". " + current.options[current.answer] + " — buka Pembahasan untuk cara cepatnya.");
  }
  async function onGenAI() {
    const btn = $("btnGenAI");
    if (!(window.LulusAI && window.LulusAI.ready)) {
      box($("fbBox"), "fb-bad", "AI belum tersambung", "Fitur soal baru butuh Firebase AI Logic. Sambungkan firebase-config.js dulu (lihat README) — latihan dari bank soal tetap jalan penuh.");
      return;
    }
    btn.disabled = true; btn.textContent = "✨ AI sedang membuat soal…";
    const subtype = filter === "semua" ? "deret" : filter;
    const fresh = await window.LulusAI.generateQuestions(subtype, 3);
    btn.disabled = false; btn.textContent = "✨ Minta Soal Baru dari AI (cloud)";
    if (fresh && fresh.length) {
      bank = bank.concat(fresh);
      queue = shuffle(fresh).concat(queue);
      box($("fbBox"), "fb-ok", "Soal baru masuk", fresh.length + " soal " + (SUB_LABEL[subtype] || subtype) + " buatan AI ditambahkan ke antrean latihanmu.");
    } else {
      box($("fbBox"), "fb-bad", "AI gagal membuat soal", "Coba lagi sebentar lagi — bank soal bawaan tetap tersedia.");
    }
  }

  // ---------- diagnostik ----------
  let diagQs = [], diagIdx = 0, diagSel = -1, diagScore = {};
  function startDiag() {
    const bySub = {};
    bank.forEach(q => { (bySub[q.subtype] = bySub[q.subtype] || []).push(q); });
    diagQs = [];
    [["deret", 3], ["aritmatika", 3], ["perbandingan", 2], ["bilangan", 2]].forEach(([sub, n]) => {
      diagQs = diagQs.concat(shuffle(bySub[sub] || []).slice(0, n));
    });
    diagQs = shuffle(diagQs);
    diagIdx = 0; diagScore = {};
    $("diagIntro").classList.add("hidden"); $("diagResult").classList.add("hidden"); $("diagRun").classList.remove("hidden");
    renderDiagQ();
  }
  function renderDiagQ() {
    const q = diagQs[diagIdx]; diagSel = -1;
    $("dBadge").textContent = "Soal " + (diagIdx + 1) + "/" + diagQs.length + " • " + (SUB_LABEL[q.subtype] || q.subtype);
    $("dText").textContent = q.q;
    const c = $("dOpts"); c.innerHTML = "";
    q.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.innerHTML = '<span class="ltr">' + LETTERS[i] + ".</span><span></span>";
      b.querySelector("span:last-child").textContent = opt;
      b.onclick = () => { diagSel = i; [...c.children].forEach((el, j) => el.classList.toggle("sel", j === i)); $("btnDiagNext").disabled = false; };
      c.appendChild(b);
    });
    $("btnDiagNext").disabled = true;
    $("btnDiagNext").textContent = diagIdx === diagQs.length - 1 ? "Selesai & Lihat Hasil" : "Lanjut";
  }
  function diagNext() {
    const q = diagQs[diagIdx];
    const s = diagScore[q.subtype] || { n: 0, ok: 0 };
    s.n++; if (diagSel === q.answer) s.ok++;
    diagScore[q.subtype] = s;
    record(q.id, diagSel === q.answer);
    diagIdx++;
    if (diagIdx < diagQs.length) renderDiagQ(); else finishDiag();
  }
  function finishDiag() {
    $("diagRun").classList.add("hidden");
    let weakest = null, weakestPct = 101, totalOk = 0, totalN = 0, rows = "";
    Object.keys(diagScore).forEach(sub => {
      const s = diagScore[sub], pct = Math.round(s.ok / s.n * 100);
      totalOk += s.ok; totalN += s.n;
      if (pct < weakestPct) { weakestPct = pct; weakest = sub; }
      rows += '<div class="stat"><span>' + (SUB_LABEL[sub] || sub) + '</span><b>' + s.ok + "/" + s.n + " (" + pct + "%)</b></div>";
    });
    progress.diag = { date: new Date().toISOString(), weakest, per: diagScore };
    saveProgress();
    const el = $("diagResult");
    el.classList.remove("hidden");
    el.innerHTML = '<div class="big" style="font-size:22px;">Hasil: ' + totalOk + "/" + totalN + " benar</div>" +
      '<div style="margin:10px 0;">' + rows + "</div>" +
      '<p class="muted">Subtipe terlemahmu: <span class="weak">' + (SUB_LABEL[weakest] || weakest) + "</span> (" + weakestPct + "%). " +
      "Fokuskan latihan berikutnya ke subtipe itu — buka tab Latihan dan pilih chip-nya. Pola ini meniru hasil tryout diagnostik besarmu: numerik adalah penentu lolos passing grade TIU.</p>" +
      '<div class="row"><button class="btn primary" onclick="document.getElementById(\'tabLatihan\').click()">Latihan Subtipe Terlemah</button></div>';
  }

  // ---------- progres ----------
  function renderProgress() {
    const subs = {};
    let totT = 0, totC = 0;
    bank.forEach(q => {
      const a = progress.attempts[q.id]; if (!a) return;
      const s = subs[q.subtype] || { t: 0, c: 0 };
      s.t += a.tries; s.c += a.correct; subs[q.subtype] = s;
      totT += a.tries; totC += a.correct;
    });
    $("pScore").textContent = totT ? Math.round(totC / totT * 100) + "%" : "0%";
    $("pSummary").textContent = totT ? ("Total " + totC + " benar dari " + totT + " percobaan menjawab.") : "Belum ada latihan tercatat.";
    let rows = "";
    Object.keys(SUB_LABEL).forEach(sub => {
      const s = subs[sub];
      rows += '<div class="stat"><span>' + SUB_LABEL[sub] + "</span><b>" + (s ? s.c + "/" + s.t + " (" + Math.round(s.c / s.t * 100) + "%)" : "belum latihan") + "</b></div>";
    });
    if (progress.diag) rows += '<div class="stat"><span>Diagnostik terakhir</span><b>' + new Date(progress.diag.date).toLocaleDateString("id-ID") + " — terlemah: " + (SUB_LABEL[progress.diag.weakest] || "-") + "</b></div>";
    $("pStats").innerHTML = rows;
  }

  // ---------- tab & init ----------
  function show(view) {
    ["Latihan", "Diag", "Progres"].forEach(v => {
      $("view" + v).classList.toggle("hidden", v !== view);
      $("tab" + v).classList.toggle("active", v === view);
    });
    if (view === "Progres") renderProgress();
  }
  $("tabLatihan").onclick = () => show("Latihan");
  $("tabDiag").onclick = () => show("Diag");
  $("tabProgres").onclick = () => show("Progres");
  $("btnHint").onclick = onHint;
  $("btnSol").onclick = onSolution;
  $("btnCheck").onclick = onCheck;
  $("btnNext").onclick = nextQuestion;
  $("btnGenAI").onclick = onGenAI;
  $("btnStartDiag").onclick = startDiag;
  $("btnDiagNext").onclick = diagNext;
  $("btnReset").onclick = () => { progress = { attempts: {}, diag: null }; saveProgress(); renderProgress(); };

  renderChips(); buildQueue(); nextQuestion();

  if (window.LulusAI) {
    window.LulusAI.init().then(ok => {
      const pill = $("aiPill");
      if (ok) { pill.textContent = "AI: hybrid aktif (on-device + cloud)"; pill.classList.add("ondevice"); }
    });
  }
})();
