const SLOT_MINUTES = 15;
const MAX_SLOT = 95;
let activePicker = null;

function createEmptyShift() {
  return {
    startSlot: "",
    endSlot: "",
  };
}

const defaultPeople = [
  { name: "Lin", shifts: [createEmptyShift(), createEmptyShift()] },
  { name: "Kelli", shifts: [createEmptyShift(), createEmptyShift()] },
  { name: "Mark", shifts: [createEmptyShift(), createEmptyShift()] },
  { name: "Ercos", shifts: [createEmptyShift(), createEmptyShift()] },
  { name: "Aria", shifts: [createEmptyShift(), createEmptyShift()] },
];

const state = loadState();
const el = (id) => document.getElementById(id);

function slotToTime(slot) {
  const totalMinutes = Number(slot) * SLOT_MINUTES;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timePartsToSlot(hour, minute) {
  if (hour === "" || minute === "") return "";

  const h = Number(hour);
  const m = Number(minute);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";

  return String(Math.round((h * 60 + m) / SLOT_MINUTES));
}

function normalizeShift(shift) {
  if (shift?.startSlot !== undefined || shift?.endSlot !== undefined) {
    return {
      startSlot: shift.startSlot ?? "",
      endSlot: shift.endSlot ?? "",
    };
  }

  return {
    startSlot: timePartsToSlot(shift?.startHour, shift?.startMinute),
    endSlot: timePartsToSlot(shift?.endHour, shift?.endMinute),
  };
}

function normalizePerson(person) {
  const shifts = Array.isArray(person.shifts)
    ? person.shifts.slice(0, 2).map(normalizeShift)
    : [];

  while (shifts.length < 2) {
    shifts.push(createEmptyShift());
  }

  return {
    name: person.name || "",
    shifts,
  };
}

function loadState() {
  const saved = localStorage.getItem("tip-helper-state");

  if (!saved) {
    return {
      tipTotal: 0,
      bossPercent: 10,
      kitchenPercent: 10,
      people: defaultPeople,
    };
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      tipTotal: parsed.tipTotal || 0,
      bossPercent: parsed.bossPercent || 10,
      kitchenPercent: parsed.kitchenPercent || 10,
      people: Array.isArray(parsed.people)
        ? parsed.people.map(normalizePerson)
        : defaultPeople,
    };
  } catch {
    return {
      tipTotal: 0,
      bossPercent: 10,
      kitchenPercent: 10,
      people: defaultPeople,
    };
  }
}

function saveState() {
  localStorage.setItem("tip-helper-state", JSON.stringify(state));
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

function roundDown(value) {
  return Math.floor(Number(value || 0));
}

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isCompleteShift(shift) {
  return shift.startSlot !== "" && shift.endSlot !== "";
}

function shiftLabel(shift) {
  if (!isCompleteShift(shift)) {
    return "选择时间段";
  }

  return `${slotToTime(shift.startSlot)} - ${slotToTime(shift.endSlot)}`;
}

function shiftHours(shift) {
  if (!isCompleteShift(shift)) return 0;

  let diffSlots = Number(shift.endSlot) - Number(shift.startSlot);

  if (diffSlots < 0) {
    diffSlots += MAX_SLOT + 1;
  }

  return diffSlots * SLOT_MINUTES / 60;
}

function personHours(person) {
  return person.shifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
}


function updatePickerText() {
  const startSlot = Number(el("startSlider").value);
  const endSlot = Number(el("endSlider").value);

  el("selectedRangeText").textContent = `${slotToTime(startSlot)} - ${slotToTime(endSlot)}`;
}

function openTimePicker(personIndex, shiftIndex) {
  const shift = state.people[personIndex].shifts[shiftIndex];

  activePicker = { personIndex, shiftIndex };

  el("startSlider").value = shift.startSlot === "" ? 0 : shift.startSlot;
  el("endSlider").value = shift.endSlot === "" ? 0 : shift.endSlot;

  updatePickerText();
  el("timePickerOverlay").classList.remove("hidden");
}

function closeTimePicker() {
  activePicker = null;
  el("timePickerOverlay").classList.add("hidden");
}

function saveTimePicker() {
  if (!activePicker) return;

  const { personIndex, shiftIndex } = activePicker;

  state.people[personIndex].shifts[shiftIndex].startSlot = el("startSlider").value;
  state.people[personIndex].shifts[shiftIndex].endSlot = el("endSlider").value;

  closeTimePicker();
  renderPeople();
  update();
}

function createShiftButton(personIndex, shiftIndex) {
  const shift = state.people[personIndex].shifts[shiftIndex];
  const button = document.createElement("button");

  button.type = "button";
  button.className = `shiftButton${isCompleteShift(shift) ? "" : " empty"}`;
  button.textContent = shiftLabel(shift);

  button.addEventListener("click", () => {
    openTimePicker(personIndex, shiftIndex);
  });

  return button;
}

function renderPeople() {
  el("peopleRows").innerHTML = "";

  state.people.forEach((person, index) => {
    const row = document.createElement("div");
    row.className = "row personRow";

    const nameInput = document.createElement("input");
    nameInput.value = person.name;

    nameInput.addEventListener("input", () => {
      state.people[index].name = nameInput.value;
      update();
    });

    const shiftGroup = document.createElement("div");
    shiftGroup.className = "shiftGroup";
    shiftGroup.appendChild(createShiftButton(index, 0));
    shiftGroup.appendChild(createShiftButton(index, 1));

    const hours = document.createElement("strong");
    hours.className = "hourDisplay";
    hours.textContent = personHours(person).toFixed(2);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete";
    deleteButton.textContent = "×";

    deleteButton.addEventListener("click", () => {
      state.people.splice(index, 1);
      renderPeople();
      update();
    });

    row.appendChild(nameInput);
    row.appendChild(shiftGroup);
    row.appendChild(hours);
    row.appendChild(deleteButton);

    el("peopleRows").appendChild(row);
  });
}

function calculate() {
  const tipTotal = numberValue(state.tipTotal);
  const bossTip = roundDown(tipTotal * numberValue(state.bossPercent) / 100);
  const kitchenTip = roundDown(tipTotal * numberValue(state.kitchenPercent) / 100);
  const subtotal = tipTotal - bossTip - kitchenTip;
  const totalHours = state.people.reduce((sum, p) => sum + personHours(p), 0);
  const tipPerHour = totalHours > 0 ? subtotal / totalHours : 0;
  const payouts = state.people.map((p) => ({
    name: p.name || "Unnamed",
    tip: roundDown(personHours(p) * tipPerHour),
  }));
  const sumPayout = payouts.reduce((sum, p) => sum + p.tip, 0);
  const remaining = subtotal - sumPayout;

  return { bossTip, kitchenTip, subtotal, totalHours, tipPerHour, payouts, sumPayout, remaining };
}

function renderResults(result) {
  el("bossTip").textContent = money(result.bossTip);
  el("kitchenTip").textContent = money(result.kitchenTip);
  el("subtotal").textContent = money(result.subtotal);
  el("totalHours").textContent = result.totalHours.toFixed(2);
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
  state.people.push({ name: "New", shifts: [createEmptyShift(), createEmptyShift()] });
  renderPeople();
  update();
});

el("resetBtn").addEventListener("click", () => {
  localStorage.removeItem("tip-helper-state");
  window.location.reload();
});

el("startSlider").addEventListener("input", updatePickerText);
el("endSlider").addEventListener("input", updatePickerText);
el("closeTimePickerBtn").addEventListener("click", closeTimePicker);
el("saveTimePickerBtn").addEventListener("click", saveTimePicker);
el("timePickerOverlay").addEventListener("click", (event) => {
  if (event.target === el("timePickerOverlay")) {
    closeTimePicker();
  }
});

renderPeople();
update();
