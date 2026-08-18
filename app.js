const documents = window.BRIDGEWALK_DOCUMENTS || [];
const list = document.querySelector("#document-list");
const search = document.querySelector("#document-search");
const count = document.querySelector("#document-count");
const noResults = document.querySelector("#no-results");
const filterButtons = [...document.querySelectorAll(".filter-button")];

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest("a[href]");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("mailto:")) return;

  const returnPoint = link.closest("section[id], footer[id]");
  if (returnPoint) window.history.replaceState(window.history.state, "", `#${returnPoint.id}`);
});

const categoryLabels = {
  meeting_agendas: "Meeting agenda",
  meeting_minutes: "Meeting minutes",
  budgets_and_audits: "Budget or audit",
  district_documents: "District document",
};

const categoryOrder = Object.keys(categoryLabels);

function getDocumentDateValue(entry) {
  const filename = entry.url.split("/").pop();
  const compactDate = filename.match(/_(\d{2})(\d{2})(\d{2})(?:_|-|\.)/);

  if (compactDate) {
    const [, month, day, shortYear] = compactDate;
    return Date.UTC(2000 + Number(shortYear), Number(month) - 1, Number(day));
  }

  const fiscalYear = filename.match(/FY(\d{2})/i);
  if (fiscalYear) return Date.UTC(2000 + Number(fiscalYear[1]), 11, 31);

  const calendarYear = filename.match(/(?:^|\D)(20\d{2})(?:\D|$)/);
  if (calendarYear) return Date.UTC(Number(calendarYear[1]), 11, 31);

  return Number.NEGATIVE_INFINITY;
}

function compareDocuments(a, b) {
  const categoryDifference = categoryOrder.indexOf(a.entry.category)
    - categoryOrder.indexOf(b.entry.category);
  if (categoryDifference !== 0) return categoryDifference;

  const dateDifference = getDocumentDateValue(b.entry) - getDocumentDateValue(a.entry);
  if (dateDifference !== 0) return dateDifference;

  return a.entry.title.localeCompare(b.entry.title);
}

let activeCategory = "all";
const documentRecords = documents.map((entry, index) => ({
  entry,
  index,
  searchableText: `${entry.title} ${entry.summary}`.toLowerCase(),
})).sort(compareDocuments);

function createDocumentCard(entry, index) {
  const item = window.document.createElement("article");
  item.className = "document-item";

  const icon = window.document.createElement("span");
  icon.className = "doc-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "PDF";

  const content = window.document.createElement("div");
  const category = window.document.createElement("span");
  category.className = "doc-category";
  category.textContent = categoryLabels[entry.category];
  const title = window.document.createElement("h3");
  title.textContent = entry.title;
  content.append(category, title);

  const actions = window.document.createElement("div");
  actions.className = "document-actions";
  const summaryId = `summary-${index}`;
  const summaryButton = window.document.createElement("button");
  summaryButton.className = "summary-button";
  summaryButton.type = "button";
  summaryButton.textContent = "Read summary";
  summaryButton.setAttribute("aria-expanded", "false");
  summaryButton.setAttribute("aria-controls", summaryId);
  const pdfLink = window.document.createElement("a");
  pdfLink.href = `bridgewalk_cdd_documents/${entry.url}`;
  pdfLink.target = "_blank";
  pdfLink.rel = "noopener";
  pdfLink.textContent = "Open PDF ↗";
  actions.append(summaryButton, pdfLink);

  const summary = window.document.createElement("p");
  summary.className = "doc-summary";
  summary.id = summaryId;
  summary.hidden = true;
  summary.textContent = entry.summary;
  summaryButton.addEventListener("click", () => {
    const willOpen = summary.hidden;
    summary.hidden = !willOpen;
    summaryButton.setAttribute("aria-expanded", String(willOpen));
    summaryButton.textContent = willOpen ? "Hide summary" : "Read summary";
  });

  item.append(icon, content, actions, summary);
  return item;
}

function renderDocuments() {
  const query = search.value.trim().toLowerCase();
  const visible = documentRecords.filter(({ entry, searchableText }) => {
    const inCategory = activeCategory === "all" || entry.category === activeCategory;
    return inCategory && searchableText.includes(query);
  });

  const fragment = window.document.createDocumentFragment();
  visible.forEach(({ entry, index }) => fragment.append(createDocumentCard(entry, index)));
  list.replaceChildren(fragment);
  count.textContent = `Showing ${visible.length} ${visible.length === 1 ? "document" : "documents"}`;
  noResults.hidden = visible.length !== 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    filterButtons.forEach((candidate) => {
      candidate.setAttribute("aria-pressed", String(candidate === button));
    });
    renderDocuments();
  });
});

filterButtons.forEach((button) => {
  const category = button.dataset.category;
  const total = category === "all"
    ? documents.length
    : documents.filter((entry) => entry.category === category).length;
  button.querySelector("span").textContent = total;
});

search.addEventListener("input", renderDocuments);
renderDocuments();
