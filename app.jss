const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const resultsGrid = document.getElementById("resultsGrid");
const statusEl = document.getElementById("status");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const tabAll = document.getElementById("tabAll");
const tabSaved = document.getElementById("tabSaved");
const savedCountEl = document.getElementById("savedCount");
const compareBtn = document.getElementById("compareBtn");
const compareCountEl = document.getElementById("compareCount");

let currentPapers = [];
let savedPapers = JSON.parse(localStorage.getItem("saved_papers") || "[]");
let selectedForCompare = [];
let viewMode = "search";

apiKeyInput.value = localStorage.getItem("gemini_api_key") || "";
apiKeyInput.addEventListener("change", () => localStorage.setItem("gemini_api_key", apiKeyInput.value.trim()));
updateSavedCount();

function updateSavedCount() {
  savedCountEl.textContent = savedPapers.length;
}

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return "No abstract available for this paper.";
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    positions.forEach(pos => { words[pos] = word; });
  }
  return words.join(" ").slice(0, 340) + "...";
}

async function searchPapers() {
  viewMode = "search";
  tabAll.classList.add("active");
  tabSaved.classList.remove("active");
  const query = searchInput.value.trim() || "artificial intelligence";
  statusEl.textContent = "Fetching live papers from OpenAlex...";
  resultsGrid.innerHTML = "";

  try {
    const res = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=9`);
    const data = await res.json();
    currentPapers = data.results.map(p => ({
      id: p.id,
      title: p.title || "Untitled Paper",
      year: p.publication_year || "N/A",
      authors: p.authorships.slice(0, 2).map(a => a.author.display_name).join(", ") || "Unknown Author",
      citations: p.cited_by_count || 0,
      pdfUrl: p.open_access?.oa_url || p.doi || "#",
      abstract: reconstructAbstract(p.abstract_inverted_index)
    }));
    statusEl.textContent = `Showing ${currentPapers.length} papers for "${query}"`;
    renderPapers(currentPapers);
  } catch (err) {
    statusEl.textContent = "Error fetching papers. Please check your internet connection.";
  }
}

function renderPapers(papers) {
  resultsGrid.innerHTML = "";
  if (papers.length === 0) {
    resultsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#94a3b8;">No papers to show here yet.</p>`;
    return;
  }

  papers.forEach(paper => {
    const isSaved = savedPapers.some(p => p.id === paper.id);
    const isChecked = selectedForCompare.some(p => p.id === paper.id);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div class="card-top">
          <span>${paper.year} • ${paper.citations} citations</span>
          <label class="compare-label">
            <input type="checkbox" class="compare-cb" ${isChecked ? "checked" : ""} /> Compare
          </label>
        </div>
        <h3>${paper.title}</h3>
        <div class="meta">${paper.authors}</div>
        <p class="abstract">${paper.abstract}</p>
      </div>
      <div class="card-actions">
        <a href="${paper.pdfUrl}" target="_blank" class="pdf-btn">Read PDF</a>
        <button class="save-btn">${isSaved ? "Saved ✓" : "Save"}</button>
        <button class="ai-btn">AI Summary</button>
      </div>
    `;

    card.querySelector(".compare-cb").addEventListener("change", (e) => toggleCompare(paper, e.target));
    card.querySelector(".save-btn").addEventListener("click", () => toggleSave(paper));
    card.querySelector(".ai-btn").addEventListener("click", () => analyzePaper(paper));
    resultsGrid.appendChild(card);
  });
}

function toggleSave(paper) {
  const index = savedPapers.findIndex(p => p.id === paper.id);
  if (index > -1) savedPapers.splice(index, 1);
  else savedPapers.push(paper);
  localStorage.setItem("saved_papers", JSON.stringify(savedPapers));
  updateSavedCount();
  renderPapers(viewMode === "search" ? currentPapers : savedPapers);
}

function toggleCompare(paper, checkbox) {
  if (checkbox.checked) {
    if (selectedForCompare.length >= 3) {
      checkbox.checked = false;
      alert("You can compare up to 3 papers at a time.");
      return;
    }
    selectedForCompare.push(paper);
  } else {
    selectedForCompare = selectedForCompare.filter(p => p.id !== paper.id);
  }
  compareCountEl.textContent = selectedForCompare.length;
  compareBtn.classList.toggle("hidden", selectedForCompare.length < 2);
}

async function callGemini(promptText) {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) return null;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate AI response.";
}

async function analyzePaper(paper) {
  modalTitle.textContent = paper.title;
  modal.classList.remove("hidden");

  if (!apiKeyInput.value.trim()) {
    modalBody.innerHTML = `<p><strong>Abstract:</strong> ${paper.abstract}</p><p style="color:#c4b5fd;"><em>Add a free Google AI Studio Gemini API key in the top bar to generate an ELI5 summary, key innovation, and limitations!</em></p>`;
    return;
  }

  modalBody.innerHTML = "<p>Generating beginner-friendly AI breakdown...</p>";
  try {
    const reply = await callGemini(`Explain this research paper simply for an engineering student using 3 bold headings: Plain-English Summary, Key Innovation, and Limitations.\n\nTitle: ${paper.title}\nAbstract: ${paper.abstract}`);
    modalBody.innerHTML = reply.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  } catch (e) {
    modalBody.innerHTML = "<p>Error connecting to Gemini API. Please check your API key.</p>";
  }
}

compareBtn.addEventListener("click", async () => {
  modalTitle.textContent = "Side-by-Side Paper Comparison";
  modal.classList.remove("hidden");

  if (!apiKeyInput.value.trim()) {
    let rows = selectedForCompare.map(p => `<tr><td><strong>${p.title}</strong></td><td>${p.year}</td><td>${p.citations}</td><td>${p.abstract.slice(0, 120)}...</td></tr>`).join("");
    modalBody.innerHTML = `<p style="color:#c4b5fd;"><em>Tip: Add a Gemini API key in the top bar for a deep AI methodology comparison!</em></p><table><tr><th>Paper</th><th>Year</th><th>Citations</th><th>Focus</th></tr>${rows}</table>`;
    return;
  }

  modalBody.innerHTML = "<p>Comparing selected papers with Gemini AI...</p>";
  const summaryInput = selectedForCompare.map((p, i) => `Paper ${i + 1}: ${p.title} (${p.year}) - ${p.abstract}`).join("\n\n");
  try {
    const reply = await callGemini(`Compare these research papers in clean HTML table format (return ONLY raw HTML <table>...</table> with columns: Paper, Core Approach, Key Strength, Limitation):\n\n${summaryInput}`);
    modalBody.innerHTML = reply.replace(/```html|```/g, "");
  } catch (e) {
    modalBody.innerHTML = "<p>Failed to generate comparison.</p>";
  }
});

tabAll.addEventListener("click", () => {
  viewMode = "search";
  tabAll.classList.add("active");
  tabSaved.classList.remove("active");
  statusEl.textContent = `Showing ${currentPapers.length} search results`;
  renderPapers(currentPapers);
});

tabSaved.addEventListener("click", () => {
  viewMode = "saved";
  tabSaved.classList.add("active");
  tabAll.classList.remove("active");
  statusEl.textContent = `Showing ${savedPapers.length} saved papers`;
  renderPapers(savedPapers);
});

document.getElementById("closeModal").addEventListener("click", () => modal.classList.add("hidden"));
searchBtn.addEventListener("click", searchPapers);
searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") searchPapers(); });
searchPapers();
