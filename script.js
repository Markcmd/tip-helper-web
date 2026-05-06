const defaultPeople = [
  { name: "Lin", hours: 8 },
  { name: "Kelli", hours: 0 },
  { name: "Mark", hours: 6.25 },
  { name: "Ercos", hours: 4.5 },
];

const state = loadState();
const el = (id) => document.getElementById(id);

function loadState() {
  const saved = localStorage.getItem("tip-helper-state");
  if (!saved) {
    return { tipTotal: 286, bossPercent: 10, kitchenPercent: 10, people: defaultPeople };
  }
  try {
    return JSON.parse(saved);
  } catch {
    return { tipTotal: 286, bossPercent: 10, kitchenPercent: 10, people: defaultPeople };
  }
}

function saveState() {
  localStorage.setItem("tip-helper-state", JSON.stringify(state));
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function roundDown(value) {
  return Math.floor(Number(value || 0));
}

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function renderPeople() {
  el("peopleRows").innerHTML = "";

  state.people.forEach((person, index) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <input aria-label="Name" value="${person.name}" />
      <input aria-label="Hours" type="number" min="0" step="0.01" value="${person.hours}" />
      <button class="delete" aria-label="Delete">×</button>
    `;

    const [nameInput, hourInput] = row.querySelectorAll("input");
    nameInput.addEventListener("input", () => {
      state.people[index].name = nameInput.value;
      update();
    });
    hourInput.addEventListener("input", () => {
      state.people[index].hours = numberValue(hourInput.value);
      update();
    });
    row.querySelector("button").addEventListener("click", () => {
      state.people.splice(index, 1);
      renderPeople();
      update();
    });

    el("peopleRows").appendChild(row);
  });
}

function calculate() {
  const tipTotal = numberValue(state.tipTotal);
  const bossTip = roundDown(tipTotal * numberValue(state.bossPercent) / 100);
  const kitchenTip = roundDown(tipTotal * numberValue(state.kitchenPercent) / 100);
  const subtotal = tipTotal - bossTip - kitchenTip;
  const totalHours = state.people.reduce((sum, p) => sum + numberValue(p.hours), 0);
  const tipPerHour = totalHours > 0 ? subtotal / totalHours : 0;
  const payouts = state.people.map((p) => ({
    name: p.name || "Unnamed",
    tip: roundDown(numberValue(p.hours) * tipPerHour),
  }));
  const sumPayout = payouts.reduce((sum, p) => sum + p.tip, 0);
  const remaining = subtotal - sumPayout;

  return { bossTip, kitchenTip, subtotal, totalHours, tipPerHour, payouts, sumPayout, remaining };
}

function renderResults(result) {
  el("bossTip").textContent = money(result.bossTip);
  el("kitchenTip").textContent = money(result.kitchenTip);
  el("subtotal").textContent = money(result.subtotal);
  el("totalHours").textContent = result.totalHours.toLocaleString(undefined, { maximumFractionDigits: 2 });
  el("tipPerHour").textContent = money(result.tipPerHour);
  el("sumPayout").textContent = money(result.sumPayout);
  el("remaining").textContent = money(result.remaining);

  el("payoutRows").innerHTML = "";
  result.payouts.forEach((p) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${p.name}</span><strong>${money(p.tip)}</strong>`;
    el("payoutRows").appendChild(row);
  });
}

function update() {
  state.tipTotal = numberValue(el("tipTotal").value);
  state.bossPercent = numberValue(el("bossPercent").value);
  state.kitchenPercent = numberValue(el("kitchenPercent").value);
  saveState();
  renderResults(calculate());
}

el("tipTotal").value = state.tipTotal;
el("bossPercent").value = state.bossPercent;
el("kitchenPercent").value = state.kitchenPercent;

["tipTotal", "bossPercent", "kitchenPercent"].forEach((id) => {
  el(id).addEventListener("input", update);
});

el("addPersonBtn").addEventListener("click", () => {
  state.people.push({ name: "New", hours: 0 });
  renderPeople();
  update();
});

el("resetBtn").addEventListener("click", () => {
  localStorage.removeItem("tip-helper-state");
  window.location.reload();
});

renderPeople();
update();
