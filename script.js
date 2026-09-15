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
      if (ukryte) { btn.disabled = true; }
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
      span.onclick = () => {
        document.querySelectorAll(".word.speaking").forEach(el => el.classList.remove("speaking"));
        span.classList.add("speaking");
        speakEnglish(clean);
        setTimeout(() => span.classList.remove("speaking"), 1500);
      };
      p.appendChild(span);
    });
    panel.appendChild(p);
  });
  if (!panel.children.length) panel.innerHTML = "<p class='hint'>PDF nie ma warstwy tekstowej.</p>";
}

/* ============================================================
   LEKTOR – POPRAWIONY (przypisuje voice za każdym razem)
============================================================ */
function getRate() { return parseFloat($("rate").value); }

// Filtruje głosy "dziecięce" i słabe
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
  // szukaj dokładnego lang (np. pl-PL)
  const exact = all.find(v => v.lang.toLowerCase() === langPrefix.toLowerCase() && !isBadVoice(v));
  if (exact) return exact;
  // szukaj prefiksu (np. pl)
  const prefix = langPrefix.split("-")[0].toLowerCase();
  const matched = all.filter(v => v.lang.toLowerCase().startsWith(prefix) && !isBadVoice(v));
  return matched[0] || null;
}

function speakText(text, langKey) {
  if (!text) return;
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = getRate();

  let voice = null;
  if (langKey === "en") {
    voice = pickVoice("en-US", $("voiceEn").value)
         || pickVoice("en-GB", $("voiceEn").value);
    u.lang = voice?.lang || "en-US";
  } else if (langKey === "pl") {
    voice = pickVoice("pl-PL", $("voicePl").value);
    u.lang = voice?.lang || "pl-PL";
  }

  // === NAJWAŻNIEJSZE: przypisz voice za każdym razem ===
  if (voice) {
    u.voice = voice;
  } else if (langKey === "pl") {
    alert("Brak głosu polskiego w systemie. Windows: Ustawienia → Czas i język → Mowa → Dodaj głosy → Polski.");
    return;
  }

  speechSynthesis.speak(u);
}

function speakEnglish(t) { speakText(t, "en"); }
function speakPolish(t)  { speakText(t, "pl"); }
window.speakEnglish = speakEnglish;
window.speakPolish = speakPolish;

function speakAllText() {
  if (!currentPdfText) { alert("Poczekaj chwilę – jeszcze wczytuję tekst."); return; }
  speakEnglish(currentPdfText);
}

function speakSelection() {
  const sel = window.getSelection().toString().trim();
  if (!sel) {
    alert("Zaznacz fragment w panelu „📝 Interaktywny tekst lekcji” i kliknij jeszcze raz.");
    return;
  }
  const isPolish = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(sel);
  isPolish ? speakPolish(sel) : speakEnglish(sel);
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
   GŁOSY – POPRAWIONE (filtruje dziecięce, sortuje sensownie)
============================================================ */
function populateVoices() {
  const all = speechSynthesis.getVoices();

  voicesEn = all
    .filter(v => v.lang.toLowerCase().startsWith("en") && !isBadVoice(v))
    .sort((a, b) => {
      // Priorytet: US > GB > inne
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

  // Zachowaj poprzedni wybór jeśli nadal istnieje
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

  // Ładuj głosy (Edge/Chrome czasem potrzebują kilku prób)
  speechSynthesis.onvoiceschanged = populateVoices;
  populateVoices();
  setTimeout(populateVoices, 200);
  setTimeout(populateVoices, 800);
  setTimeout(populateVoices, 2000);

  $("addWord").onclick = () => {
    const en = $("wordInput").value.trim();
    if (!en || !currentLesson) return;
    const key = currentLesson.fileName;
    const dict = JSON.parse(localStorage.getItem("dict") || "{}");
    dict[key] = dict[key] || [];
    dict[key].push({ en, pl: "—" });
    saveDictionary(key, dict[key]);
    $("wordInput").value = "";
    renderWords(dict[key]);
  };

  $("translateBtn").onclick = async () => {
    const en = $("wordInput").value.trim();
    if (!en || !currentLesson) return;
    try {
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(en)}&langpair=en|pl`);
      const d = await r.json();
      const pl = d.responseData.translatedText;
      const key = currentLesson.fileName;
      const dict = JSON.parse(localStorage.getItem("dict") || "{}");
      dict[key] = dict[key] || [];
      dict[key].push({ en, pl });
      saveDictionary(key, dict[key]);
      $("wordInput").value = "";
      renderWords(dict[key]);
    } catch (e) { alert("Błąd tłumaczenia."); }
  };

  $("wordInput").addEventListener("keydown", e => {
    if (e.key === "Enter") $("translateBtn").click();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("modal").classList.contains("hidden")) {
      $("modal").classList.add("hidden");
      speechSynthesis.cancel();
    }
  });

  renderCards("G");
});
