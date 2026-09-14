pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const LEVELS = ["A1","A2","B1","B2","C1","TEST"];
const SECTIONS = { G: "Gramatyka", T: "Tematyka" };

let currentSection = "G";
let currentLesson = null;

const $ = id => document.getElementById(id);

/* ============================================================
   KARTY LEKCJI
============================================================ */
function renderCards(section, filter = "") {
  const content = $("content");
  content.innerHTML = "";

  for (let i = 1; i <= 16; i++) {
    const title = `${section}${i} — ${SECTIONS[section]} ${i}`;
    if (filter && !title.toLowerCase().includes(filter.toLowerCase())) continue;

    const desc = (LESSON_DESCRIPTIONS[`${section}${i}`]) || "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${title}</h3>
      <p class="desc">${desc}</p>
      <div class="levels"></div>`;

    const levelsDiv = card.querySelector(".levels");
    LEVELS.forEach(lvl => {
      const btn = document.createElement("button");
      btn.className = `level-btn ${lvl}`;
      btn.textContent = lvl;
      btn.onclick = () => openLesson(section, i, lvl);
      levelsDiv.appendChild(btn);
    });

    content.appendChild(card);
  }
}

/* ============================================================
   OTWIERANIE LEKCJI
============================================================ */
function openLesson(section, num, level) {
  const fileName = level === "TEST"
    ? `TEST${section}${num}.pdf`
    : `${section}${num}${level}.pdf`;

  currentLesson = { section, num, level, fileName };

  $("modalTitle").textContent =
    `${fileName.replace(".pdf","")} — ${SECTIONS[section]} ${num} (${level})`;
  $("pdfPages").innerHTML = "<p style='color:#64748b;padding:20px;text-align:center'>⏳ Ładowanie PDF...</p>";
  $("modal").classList.remove("hidden");

  loadDictionary(fileName);
  renderPDF(`pdf/${fileName}`);
}

/* ============================================================
   RENDEROWANIE PDF (jako obraz + klikalna warstwa tekstowa)
============================================================ */
async function renderPDF(url) {
  const container = $("pdfPages");
  container.innerHTML = "";

  try {
    const pdf = await pdfjsLib.getDocument(url).promise;
    const scale = window.devicePixelRatio > 1 ? 1.5 : 1.3;

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale });

      const wrap = document.createElement("div");
      wrap.className = "pdf-page-wrap";
      wrap.style.width = viewport.width + "px";
      wrap.style.height = viewport.height + "px";

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      wrap.appendChild(canvas);

      const textLayer = document.createElement("div");
      textLayer.className = "textLayer";
      textLayer.style.width = viewport.width + "px";
      textLayer.style.height = viewport.height + "px";
      wrap.appendChild(textLayer);

      container.appendChild(wrap);

      // Renderowanie strony jako obraz
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport
      }).promise;

      // Warstwa tekstowa – klikalne słowa
      const textContent = await page.getTextContent();
      textContent.items.forEach(item => {
        if (!item.str.trim()) return;

        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

        const span = document.createElement("span");
        span.textContent = item.str;
        span.style.left = tx[4] + "px";
        span.style.top = (tx[5] - item.height * scale) + "px";
        span.style.fontSize = (item.height * scale) + "px";
        span.style.fontFamily = "sans-serif";

        span.onclick = (e) => {
          e.stopPropagation();
          speak(item.str.trim(), "en-US");
        };

        textLayer.appendChild(span);
      });
    }
  } catch (e) {
    console.error("Błąd PDF:", e);
    container.innerHTML =
      `<p style='color:#ef4444;padding:20px;text-align:center;line-height:1.6'>
        ❌ Nie znaleziono pliku <b>${url}</b>.<br>
        Sprawdź, czy PDF jest w folderze <code>pdf/</code> i nazywa się poprawnie.
      </p>`;
  }
}

/* ============================================================
   WEB SPEECH API
============================================================ */
function getRate() {
  return parseFloat($("rate").value);
}

function speak(text, lang = "en-US") {
  if (!text) return;
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = getRate();

  const voices = speechSynthesis.getVoices();
  const chosen = voices.find(v => v.name === $("voiceSelect").value);
  if (chosen) u.voice = chosen;

  speechSynthesis.speak(u);
}

function speakAllText() {
  const spans = [...document.querySelectorAll(".textLayer span")];
  if (!spans.length) {
    alert("Najpierw poczekaj aż PDF się załaduje.");
    return;
  }
  const text = spans.map(s => s.textContent).join(" ");
  speak(text);
}

function speakSelection() {
  const sel = window.getSelection().toString().trim();
  if (sel) speak(sel, "en-US");
  else alert("Najpierw zaznacz fragment tekstu w PDF.");
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
  $("wordList").innerHTML = words.map((w, i) => `
    <li>
      <span><b>${w.en}</b> — <span class="pl">${w.pl}</span></span>
      <span class="btns">
        <button class="icon-btn"
          onclick="speak('${w.en.replace(/'/g, "\\'")}', 'en-US')"
          title="Wymowa angielska">🔊 EN</button>
        ${w.pl && w.pl !== "—"
          ? `<button class="icon-btn"
               onclick="speak('${w.pl.replace(/'/g, "\\'")}', 'pl-PL')"
               title="Wymowa polska">🔊 PL</button>`
          : ""}
        <button class="icon-btn del" onclick="removeWord(${i})" title="Usuń">✖</button>
      </span>
    </li>
  `).join("");
}

window.speak = speak;
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
  const voices = speechSynthesis.getVoices()
    .filter(v => v.lang.startsWith("en"))
    .sort((a, b) => a.name.localeCompare(b.name));

  $("voiceSelect").innerHTML = voices.map(v =>
    `<option value="${v.name}">${v.name} (${v.lang})</option>`
  ).join("");

  // Domyślnie preferuj głos US
  const us = voices.find(v => v.lang === "en-US");
  if (us) $("voiceSelect").value = us.name;
}

/* ============================================================
   START
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  // Zakładki
  document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentSection = tab.dataset.section;
      renderCards(currentSection, $("search").value);
    };
  });

  // Wyszukiwarka
  $("search").oninput = e => renderCards(currentSection, e.target.value);

  // Modal PDF
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

  // Głosy
  speechSynthesis.onvoiceschanged = populateVoices;
  setTimeout(populateVoices, 500);

  // Dodawanie słowa ręcznie
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

  // Dodawanie słowa z tłumaczeniem
  $("translateBtn").onclick = async () => {
    const en = $("wordInput").value.trim();
    if (!en || !currentLesson) return;

    try {
      const r = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(en)}&langpair=en|pl`
      );
      const d = await r.json();
      const pl = d.responseData.translatedText;

      const key = currentLesson.fileName;
      const dict = JSON.parse(localStorage.getItem("dict") || "{}");
      dict[key] = dict[key] || [];
      dict[key].push({ en, pl });
      saveDictionary(key, dict[key]);
      $("wordInput").value = "";
      renderWords(dict[key]);
    } catch (e) {
      alert("Nie udało się przetłumaczyć. Dodaj ręcznie przez ➕.");
    }
  };

  // Enter w polu słownika
  $("wordInput").addEventListener("keydown", e => {
    if (e.key === "Enter") $("translateBtn").click();
  });

  // Esc zamyka modal
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("modal").classList.contains("hidden")) {
      $("modal").classList.add("hidden");
      speechSynthesis.cancel();
    }
  });

  // Start
  renderCards("G");
});