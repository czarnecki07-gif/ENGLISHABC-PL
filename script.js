pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const LEVELS = ["A1","A2","B1","B2","C1","TEST"];
const SECTIONS = { G: "Gramatyka", T: "Tematyka" };

let currentSection = "G";
let currentLesson = null;
let currentPdfText = "";
let voicesEn = [];
let voicesPl = [];

const $ = id => document.getElementById(id);

/* ============================================================
   KARTY LEKCJI
============================================================ */
function renderCards(section, filter = "") {
  const content = $("content");
  content.innerHTML = "";
  for (let i = 1; i <= 16; i++) {
    const klucz = `${section}${i}`;
    const d = (KONFIG.dzialy && KONFIG.dzialy[klucz]) || { nazwa: klucz, opis: "" };
    const tytul = `${klucz} — ${d.nazwa}`;
    if (filter && !tytul.toLowerCase().includes(filter.toLowerCase())) continue;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>${tytul}</h3><p class="desc">${d.opis}</p><div class="levels"></div>`;
    const levelsDiv = card.querySelector(".levels");

    LEVELS.forEach(lvl => {
      const ukryte = (KONFIG.ukryte || []).includes(
        lvl === "TEST" ? `TEST${section}${i}` : `${section}${i}${lvl}`
      );
      const btn = document.createElement("button");
      btn.className = `level-btn ${lvl}${ukryte ? " hidden-lesson" : ""}`;
      btn.textContent = lvl;
      if (ukryte) btn.disabled = true;
      else btn.onclick = () => openLesson(section, i, lvl);
      levelsDiv.appendChild(btn);
    });
    content.appendChild(card);
  }
}

function openLesson(section, num, level) {
  const fileName = level === "TEST" ? `TEST${section}${num}.pdf` : `${section}${num}${level}.pdf`;
  currentLesson = { section, num, level, fileName };
  currentPdfText = "";
  const d = KONFIG.dzialy[`${section}${num}`] || {};
  $("modalTitle").textContent = `${section}${num} (${level}) — ${d.nazwa || ""}`;
  $("pdfPages").innerHTML = "";
  $("textContent").innerHTML = "<p class='hint'>⏳ Ładowanie tekstu...</p>";
  $("modal").classList.remove("hidden");
  loadDictionary(fileName);
  renderPDF(`pdf/${fileName}`);
}

function renderPDF(url) {
  const container = $("pdfPages");
  container.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.src = url + "#toolbar=0&navpanes=0&view=FitH&statusbar=0";
  iframe.style.cssText = "width:100%;height:100%;border:none;border-radius:8px;background:#fff;display:block;";
  container.appendChild(iframe);

  pdfjsLib.getDocument(url).promise
    .then(pdf => Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then(p => p.getTextContent()).then(c => c.items.map(x => x.str).join(" "))
      )
    ))
    .then(pages => {
      currentPdfText = pages.join("\n\n").replace(/\s+/g, " ").trim();
      renderInteractiveText(pages);
    })
    .catch(e => {
      $("textContent").innerHTML = `<p style="color:#ef4444">❌ Nie udało się wczytać PDF: ${e.message}</p>`;
    });
}

/* ============================================================
   INTERAKTYWNY TEKST – klik = odsłuch, prawy klik = słownik
============================================================ */
function renderInteractiveText(pagesText) {
  const panel = $("textContent");
  panel.innerHTML = "";

  pagesText.forEach(pageText => {
    if (!pageText.trim()) return;
    const p = document.createElement("p");
    pageText.split(/(\s+)/).forEach(tok => {
      if (/^\s+$/.test(tok)) { p.appendChild(document.createTextNode(" ")); return; }
      const clean = tok.replace(/[^\w'’-]/g, "");
      if (!clean) { p.appendChild(document.createTextNode(tok)); return; }

      const span = document.createElement("span");
      span.className = "word";
      span.textContent = tok;
      span.dataset.word = clean;

      // LEWY KLIK – odsłuch
      span.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll(".word.speaking").forEach(el => el.classList.remove("speaking"));
        span.classList.add("speaking");
        speakWord(clean);
        setTimeout(() => span.classList.remove("speaking"), 1200);
      };

      // PRAWY KLIK – słownik
      span.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showWordPopup(clean, e.clientX, e.clientY);
      };

      p.appendChild(span);
    });
    panel.appendChild(p);
  });

  if (!panel.children.length) panel.innerHTML = "<p class='hint'>PDF nie ma warstwy tekstowej.</p>";
}

/* ============================================================
   POPUP SŁOWNIKA
============================================================ */
async function showWordPopup(word, x, y) {
  const popup = $("wordPopup");
  popup.innerHTML = `
    <div class="wp-word">${word}</div>
    <div class="wp-translation"><span class="wp-loading">⏳ Tłumaczę...</span></div>
    <div class="wp-buttons">
      <button data-action="en">🔊 EN</button>
      <button data-action="pl">🔊 PL</button>
      <button data-action="save" class="wp-save">💾 Zapisz</button>
    </div>
  `;
  popup.style.left = Math.min(x, window.innerWidth - 280) + "px";
  popup.style.top = Math.min(y + 10, window.innerHeight - 150) + "px";
  popup.classList.remove("hidden");

  // Tłumaczenie – próbujemy Lingva, potem MyMemory
  const translation = await translateWord(word);
  const transEl = popup.querySelector(".wp-translation");

  if (translation) {
    transEl.innerHTML = `<b>${translation}</b>`;
    popup.dataset.translation = translation;
  } else {
    transEl.innerHTML = `<span style="color:#ef4444">Nie znaleziono tłumaczenia</span>`;
    popup.dataset.translation = "";
  }

  // Akcje przycisków
  popup.querySelector('[data-action="en"]').onclick = () => speakEnglish(word);
  popup.querySelector('[data-action="pl"]').onclick = () => {
    if (popup.dataset.translation) speakPolish(popup.dataset.translation);
  };
  popup.querySelector('[data-action="save"]').onclick = () => {
    const pl = popup.dataset.translation;
    if (!pl) { alert("Brak tłumaczenia do zapisania"); return; }
    addWordToDict(word, pl);
    popup.classList.add("hidden");
  };
}

document.addEventListener("click", e => {
  const popup = $("wordPopup");
  if (popup && !popup.classList.contains("hidden") && !popup.contains(e.target)) {
    popup.classList.add("hidden");
  }
});

/* ============================================================
   TŁUMACZENIE – 2 API z fallbackiem
============================================================ */
async function translateWord(word) {
  // 1. Lingva Translate (Google backend, darmowe)
  try {
    const r = await fetch(`https://lingva.ml/api/v1/en/pl/${encodeURIComponent(word)}`);
    if (r.ok) {
      const d = await r.json();
      if (d.translation && d.translation.toLowerCase() !== word.toLowerCase()) {
        return d.translation;
      }
    }
  } catch (e) {}

  // 2. MyMemory fallback
  try {
    const r = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|pl`
    );
    const d = await r.json();
    const t = d.responseData?.translatedText;
    if (t && t.toLowerCase() !== word.toLowerCase()) return t;
  } catch (e) {}

  return null;
}

/* ============================================================
   LEKTOR – osobne głosy EN / PL + auto-detekcja języka
============================================================ */
function getRate() { return parseFloat($("rate").value); }

function isBadVoice(v) {
  const n = (v.name || "").toLowerCase();
  return n.includes("child") || n.includes("kid") || n.includes("junior");
}

function pickVoice(langPrefix, preferredName) {
  const all = speechSynthesis.getVoices();
  if (preferredName) {
    const m = all.find(v => v.name === preferredName);
    if (m) return m;
  }
  const exact = all.find(v => v.lang.toLowerCase() === langPrefix.toLowerCase() && !isBadVoice(v));
  if (exact) return exact;
  const prefix = langPrefix.split("-")[0].toLowerCase();
  return all.filter(v => v.lang.toLowerCase().startsWith(prefix) && !isBadVoice(v))[0] || null;
}

/** Wykrywa język fragmentu: 'pl' albo 'en' */
function detectLang(text) {
  // 1. Polskie znaki diakrytyczne = pewny sygnał
  if (/[ąćęłńóśźż]/i.test(text)) return "pl";

  // 2. Częste polskie słowa
  const plWords = /\b(się|jest|są|nie|tak|ale|czy|lub|oraz|przez|dla|jako|był|była|było|będzie|mamy|macie|mają|tego|tym|jego|jej|ich|oraz|także|jednak|więc)\b/i;
  if (plWords.test(text)) return "pl";

  // 3. Częste angielskie słowa
  const enWords = /\b(the|is|are|was|were|will|would|can|could|have|has|had|this|that|with|from|they|their|you|your|i|we|he|she)\b/i;
  if (enWords.test(text)) return "en";

  // Domyślnie angielski (kurs jest angielski)
  return "en";
}

function makeUtterance(text, langKey) {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = getRate();
  const voice = langKey === "pl"
    ? pickVoice("pl-PL", $("voicePl").value)
    : (pickVoice("en-US", $("voiceEn").value) || pickVoice("en-GB", $("voiceEn").value));
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = langKey === "pl" ? "pl-PL" : "en-US";
  }
  return u;
}

/** Czyta pojedyncze słowo – dobiera język po znakach */
function speakWord(text) {
  speechSynthesis.cancel();
  if (!text) return;
  const lang = detectLang(text);
  speechSynthesis.speak(makeUtterance(text, lang));
}

/** Czyta mieszany tekst – dzieli na zdania i każde czyta właściwym głosem */
function speakMixedText(text) {
  speechSynthesis.cancel();
  if (!text) return;

  // Podziel na zdania (zachowując kropki itd.)
  const sentences = text.split(/(?<=[.!?;:])\s+/).filter(s => s.trim());

  if (!sentences.length) return;

  sentences.forEach(sentence => {
    const lang = detectLang(sentence);
    speechSynthesis.speak(makeUtterance(sentence, lang));
  });
}

function speakEnglish(t) { speakWord(t); }
function speakPolish(t)  { speakMixedText(t); } // dla bezpieczeństwa
window.speakEnglish = speakEnglish;
window.speakPolish = speakPolish;

/* ============================================================
   PRZYCISKI CZYTANIA
============================================================ */
function speakAllText() {
  if (!currentPdfText) { alert("Poczekaj chwilę – jeszcze wczytuję tekst."); return; }
  speakMixedText(currentPdfText);
}

function speakSelection() {
  const sel = window.getSelection().toString().trim();
  if (!sel) {
    alert("Zaznacz fragment w panelu „📝 Interaktywny tekst lekcji” i kliknij jeszcze raz.");
    return;
  }
  speakMixedText(sel);
}

/* ============================================================
   SŁOWNIK
============================================================ */
function loadDictionary(key) {
  const dict = JSON.parse(localStorage.getItem("dict") || "{}");
  renderWords(dict[key] || []);
}

function saveDictionary(key, arr) {
  const dict = JSON.parse(localStorage.getItem("dict") || "{}");
  dict[key] = arr;
  localStorage.setItem("dict", JSON.stringify(dict));
}

function addWordToDict(en, pl) {
  if (!currentLesson) return;
  const key = currentLesson.fileName;
  const dict = JSON.parse(localStorage.getItem("dict") || "{}");
  dict[key] = dict[key] || [];
  // sprawdź czy już jest
  if (dict[key].some(w => w.en.toLowerCase() === en.toLowerCase())) {
    alert("To słowo już jest w słowniku.");
    return;
  }
  dict[key].push({ en, pl });
  saveDictionary(key, dict[key]);
  renderWords(dict[key]);
}

function renderWords(words) {
  $("wordList").innerHTML = words.map((w, i) => {
    const en = w.en.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const pl = (w.pl || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `<li>
      <span><b>${w.en}</b> — <span class="pl">${w.pl}</span></span>
      <span class="btns">
        <button class="icon-btn" onclick="speakEnglish('${en}')">🔊 EN</button>
        ${w.pl && w.pl !== "—" ? `<button class="icon-btn pl" onclick="speakPolish('${pl}')">🔊 PL</button>` : ""}
        <button class="icon-btn del" onclick="removeWord(${i})">✖</button>
      </span>
    </li>`;
  }).join("");
}

window.removeWord = function(i) {
  const key = currentLesson.fileName;
  const dict = JSON.parse(localStorage.getItem("dict") || "{}");
  const arr = dict[key] || [];
  arr.splice(i, 1);
  saveDictionary(key, arr);
  renderWords(arr);
};

/* ============================================================
   GŁOSY
============================================================ */
function populateVoices() {
  const all = speechSynthesis.getVoices();

  voicesEn = all
    .filter(v => v.lang.toLowerCase().startsWith("en") && !isBadVoice(v))
    .sort((a, b) => {
      const prio = l => l === "en-us" ? 0 : l === "en-gb" ? 1 : 2;
      const diff = prio(a.lang.toLowerCase()) - prio(b.lang.toLowerCase());
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

  voicesPl = all
    .filter(v => v.lang.toLowerCase().startsWith("pl") && !isBadVoice(v))
    .sort((a, b) => a.name.localeCompare(b.name));

  const enSel = $("voiceEn");
  const plSel = $("voicePl");
  const prevEn = enSel.value;
  const prevPl = plSel.value;

  enSel.innerHTML = voicesEn.length
    ? voicesEn.map(v => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join("")
    : `<option value="">(brak głosu EN)</option>`;

  plSel.innerHTML = voicesPl.length
    ? voicesPl.map(v => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join("")
    : `<option value="">❌ brak głosu PL</option>`;

  if (prevEn && voicesEn.find(v => v.name === prevEn)) enSel.value = prevEn;
  if (prevPl && voicesPl.find(v => v.name === prevPl)) plSel.value = prevPl;
}

/* ============================================================
   START
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  if (typeof KONFIG === "undefined") {
    alert("❌ Brak pliku config.js");
    return;
  }
  $("pageTitle").textContent = "🇬🇧 " + (KONFIG.tytul || "Angielski dla Polaków");
  $("pageSubtitle").textContent = KONFIG.podtytul || "";
  document.title = KONFIG.tytul || "Angielski";

  document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentSection = tab.dataset.section;
      renderCards(currentSection, $("search").value);
    };
  });

  $("search").oninput = e => renderCards(currentSection, e.target.value);
  $("readAllBtn").onclick = speakAllText;
  $("readSelectionBtn").onclick = speakSelection;
  $("pausePdf").onclick = () => speechSynthesis.paused
    ? speechSynthesis.resume()
    : speechSynthesis.pause();
  $("stopPdf").onclick = () => speechSynthesis.cancel();
  $("stopBtn").onclick = () => speechSynthesis.cancel();
  $("closeModal").onclick = () => {
    $("modal").classList.add("hidden");
    speechSynthesis.cancel();
  };
  $("expandBtn").onclick = () =>
    document.querySelector(".modal-content").classList.toggle("expanded");

  speechSynthesis.onvoiceschanged = populateVoices;
  populateVoices();
  setTimeout(populateVoices, 200);
  setTimeout(populateVoices, 800);
  setTimeout(populateVoices, 2000);

  $("addWord").onclick = () => {
    const en = $("wordInput").value.trim();
    if (!en || !currentLesson) return;
    addWordToDict(en, "—");
    $("wordInput").value = "";
  };

  $("translateBtn").onclick = async () => {
    const en = $("wordInput").value.trim();
    if (!en || !currentLesson) return;
    const pl = await translateWord(en);
    addWordToDict(en, pl || "—");
    $("wordInput").value = "";
  };

  $("wordInput").addEventListener("keydown", e => {
    if (e.key === "Enter") $("translateBtn").click();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!$("modal").classList.contains("hidden")) {
        $("modal").classList.add("hidden");
        speechSynthesis.cancel();
      }
      const popup = $("wordPopup");
      if (popup) popup.classList.add("hidden");
    }
  });

  renderCards("G");
});