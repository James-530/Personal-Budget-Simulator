const expenseList = document.getElementById("expenseList");
const addExpenseButton = document.getElementById("addExpense");
const purchaseList = document.getElementById("purchaseList");
const addPurchaseButton = document.getElementById("addPurchase");
const budgetMonthInput = document.getElementById("budgetMonth");
const purchaseControls = document.getElementById("purchaseControls");
const purchaseNotice = document.getElementById("purchaseNotice");
const totalExpensesDisplay = document.getElementById("totalExpenses");
const incomeInput = document.getElementById("income");
const budgetStatusDisplay = document.querySelector(".budget-status");
const availableAmountDisplay = document.querySelector(".available-amount");
const purchaseCostDisplay = document.querySelector(".cost");
const chartMonthDisplay = document.getElementById("chartMonth");
const budgetPieChart = document.getElementById("budgetPieChart");
const chartExpensesDisplay = document.getElementById("chartExpenses");
const chartExpensesPercentDisplay = document.getElementById(
  "chartExpensesPercent",
);
const chartPurchasesDisplay = document.getElementById("chartPurchases");
const chartPurchasesPercentDisplay = document.getElementById(
  "chartPurchasesPercent",
);
const chartRemainingDisplay = document.getElementById("chartRemaining");
const chartRemainingPercentDisplay = document.getElementById(
  "chartRemainingPercent",
);
const purchaseChartLegend = document.getElementById("purchaseChartLegend");
const chartPercentageNote = document.getElementById("chartPercentageNote");
const chartOverBudget = document.getElementById("chartOverBudget");
let expenseCount = 0;
let purchaseCount = 0;
const STORAGE_KEY = "personal-budget-simulator";
const MONTH_STORAGE_PREFIX = `${STORAGE_KEY}:month:`;
const SELECTED_MONTH_KEY = `${STORAGE_KEY}:selected-month`;
let activeMonthKey;
let hiddenPurchases = [];

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function hasEntryContent(entry) {
  return entry.name !== "" || entry.amount !== "";
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonthKey(monthKey) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}

function isCurrentMonthSelected() {
  return activeMonthKey === getCurrentMonthKey();
}

function getMonthStorageKey(monthKey) {
  return `${MONTH_STORAGE_PREFIX}${monthKey}`;
}

function normalizeEntryList(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter(
      (entry) =>
        entry &&
        (typeof entry.name === "string" ||
          typeof entry.name === "number") &&
        (typeof entry.amount === "string" ||
          typeof entry.amount === "number"),
    )
    .map((entry) => ({
      name: String(entry.name),
      amount: String(entry.amount),
    }))
    .filter(hasEntryContent);
}

function normalizeBudgetData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Saved budget data has an invalid format.");
  }

  const purchases =
    data.purchases ??
    (typeof data.purchaseName === "string" &&
    typeof data.purchaseCost === "string"
      ? [{ name: data.purchaseName, amount: data.purchaseCost }]
      : []);

  return {
    income:
      typeof data.income === "string" || typeof data.income === "number"
        ? String(data.income)
        : "",
    expenses: normalizeEntryList(data.expenses),
    purchases: normalizeEntryList(purchases),
  };
}

function getBudgetData() {
  const expenses = [...expenseList.querySelectorAll(".expense-row")].map(
    (row) => ({
      name: row.querySelector(".expense-name").value,
      amount: row.querySelector(".expense-amount").value,
    }),
  ).filter(hasEntryContent);

  const purchases = isCurrentMonthSelected()
    ? [...purchaseList.querySelectorAll(".purchase-row")].map((row) => ({
        name: row.querySelector(".purchase-name").value,
        amount: row.querySelector(".purchase-amount").value,
      }))
    : hiddenPurchases;

  return {
    income: incomeInput.value,
    expenses,
    purchases: purchases.filter(hasEntryContent),
  };
}

function saveBudgetData() {
  if (!activeMonthKey) {
    return;
  }

  try {
    localStorage.setItem(
      getMonthStorageKey(activeMonthKey),
      JSON.stringify(getBudgetData()),
    );
  } catch (error) {
    console.error("Could not save budget data:", error);
  }
}

function readBudgetData(monthKey) {
  try {
    const monthlyData = localStorage.getItem(getMonthStorageKey(monthKey));
    if (monthlyData !== null) {
      return normalizeBudgetData(JSON.parse(monthlyData));
    }

    if (monthKey === getCurrentMonthKey()) {
      const legacyData = localStorage.getItem(STORAGE_KEY);
      if (legacyData !== null) {
        const migratedData = normalizeBudgetData(JSON.parse(legacyData));
        try {
          localStorage.setItem(
            getMonthStorageKey(monthKey),
            JSON.stringify(migratedData),
          );
        } catch (error) {
          console.error("Could not migrate the legacy budget data:", error);
        }
        return migratedData;
      }
    }

    return { income: "", expenses: [], purchases: [] };
  } catch (error) {
    console.error(`Could not load budget data for ${monthKey}:`, error);
    return { income: "", expenses: [], purchases: [] };
  }
}

function clearBudgetRows() {
  expenseList.replaceChildren();
  purchaseList.replaceChildren();
  expenseCount = 0;
  purchaseCount = 0;
}

function loadBudgetData(monthKey) {
  clearBudgetRows();
  const budgetData = readBudgetData(monthKey);
  incomeInput.value = formatMoneyValue(budgetData.income);
  hiddenPurchases = budgetData.purchases;

  budgetData.expenses.forEach((expense) => createExpenseRow(expense));
  const showPurchases = monthKey === getCurrentMonthKey();
  purchaseControls.hidden = !showPurchases;
  purchaseNotice.hidden = showPurchases;
  purchaseChartLegend.hidden = !showPurchases;
  if (showPurchases) {
    budgetData.purchases.forEach((purchase) => createPurchaseRow(purchase));
  }

  updateSimulation();
}

function restoreBudgetData() {
  const currentMonth = getCurrentMonthKey();
  let savedMonth = currentMonth;

  try {
    const storedMonth = localStorage.getItem(SELECTED_MONTH_KEY);
    if (storedMonth && isValidMonthKey(storedMonth)) {
      savedMonth = storedMonth;
    } else if (storedMonth) {
      console.error("Saved budget month is invalid:", storedMonth);
    }
  } catch (error) {
    console.error("Could not read the saved budget month:", error);
  }

  budgetMonthInput.value = savedMonth;
  activeMonthKey = savedMonth;
  loadBudgetData(activeMonthKey);
}

function cleanMoneyValue(value) {
  const cleaned = String(value).replace(/[^\d.]/g, "");
  const decimalPosition = cleaned.indexOf(".");
  if (decimalPosition === -1) {
    return cleaned.replace(/^0+(?=\d)/, "");
  }

  const whole = cleaned
    .slice(0, decimalPosition)
    .replace(/^0+(?=\d)/, "");
  const fraction = cleaned
    .slice(decimalPosition + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${whole || "0"}.${fraction}`;
}

function formatMoneyValue(value) {
  const cleaned = cleanMoneyValue(value);
  if (!cleaned) {
    return "";
  }

  const [whole, fraction] = cleaned.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? groupedWhole : `${groupedWhole}.${fraction}`;
}

function formatMoneyInput(input) {
  const selectionStart = input.selectionStart ?? input.value.length;
  const meaningfulCharactersBeforeCaret = cleanMoneyValue(
    input.value.slice(0, selectionStart),
  ).length;
  input.value = formatMoneyValue(input.value);

  let caretPosition = 0;
  let meaningfulCharacters = 0;
  while (
    caretPosition < input.value.length &&
    meaningfulCharacters < meaningfulCharactersBeforeCaret
  ) {
    if (/[\d.]/.test(input.value[caretPosition])) {
      meaningfulCharacters++;
    }
    caretPosition++;
  }

  input.setSelectionRange(caretPosition, caretPosition);
}

function attachMoneyInput(input) {
  input.addEventListener("input", () => {
    formatMoneyInput(input);
    updateAndSaveBudget();
  });
  input.addEventListener("blur", () => {
    input.value = formatMoneyValue(input.value);
  });
}

function getNonNegativeAmount(input) {
  const amount = Number(cleanMoneyValue(input.value));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getTotalExpenses() {
  return [...expenseList.querySelectorAll(".expense-amount")].reduce(
    (total, input) => total + getNonNegativeAmount(input),
    0,
  );
}

function getTotalPurchases() {
  return [...purchaseList.querySelectorAll(".purchase-amount")].reduce(
    (total, input) => total + getNonNegativeAmount(input),
    0,
  );
}

function updateTotalExpenses(totalExpenses) {
  totalExpensesDisplay.dataset.value = totalExpenses;
  totalExpensesDisplay.textContent = pesoFormatter.format(totalExpenses);
}

function updateSimulation() {
  const income = getNonNegativeAmount(incomeInput);
  const expenses = getTotalExpenses();
  const showPurchases = isCurrentMonthSelected();
  const purchaseCost = showPurchases ? getTotalPurchases() : 0;
  const totalUsed = expenses + purchaseCost;
  const remaining = Math.max(income - totalUsed, 0);
  const hasIncome = income > 0;
  const isOverBudget = totalUsed > income;
  const chartTotal = isOverBudget ? totalUsed : income;
  const expensesPercent =
    chartTotal > 0 ? (expenses / chartTotal) * 100 : 0;
  const purchasesPercent =
    chartTotal > 0 ? (purchaseCost / chartTotal) * 100 : 0;
  const remainingPercent =
    chartTotal > 0 ? (remaining / chartTotal) * 100 : 0;
  const expenseEnd = expensesPercent;
  const purchaseEnd = expenseEnd + purchasesPercent;

  updateTotalExpenses(expenses);
  availableAmountDisplay.textContent = pesoFormatter.format(income);
  purchaseCostDisplay.textContent = pesoFormatter.format(totalUsed);
  chartExpensesDisplay.textContent = pesoFormatter.format(expenses);
  chartExpensesPercentDisplay.textContent = `${expensesPercent.toFixed(1)}%`;
  chartPurchasesDisplay.textContent = pesoFormatter.format(purchaseCost);
  chartPurchasesPercentDisplay.textContent = `${purchasesPercent.toFixed(1)}%`;
  chartRemainingDisplay.textContent = pesoFormatter.format(remaining);
  chartRemainingPercentDisplay.textContent = `${remainingPercent.toFixed(1)}%`;
  chartMonthDisplay.textContent = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(
    new Date(
      Number(activeMonthKey.slice(0, 4)),
      Number(activeMonthKey.slice(5, 7)) - 1,
      1,
    ),
  );
  budgetPieChart.style.background =
    chartTotal > 0
      ? `conic-gradient(var(--chart-expenses) 0% ${expenseEnd}%, var(--chart-purchases) ${expenseEnd}% ${purchaseEnd}%, var(--chart-remaining) ${purchaseEnd}% 100%)`
      : "var(--secondary)";
  budgetPieChart.setAttribute(
    "aria-label",
    `${chartMonthDisplay.textContent}: expenses ${pesoFormatter.format(expenses)}; potential purchases ${pesoFormatter.format(purchaseCost)}; remaining budget ${pesoFormatter.format(remaining)}.`,
  );
  chartPercentageNote.textContent = isOverBudget
    ? "Percentages show each category's share of total spending because spending exceeds income."
    : hasIncome
      ? "Percentages are of monthly income."
      : "Enter income to show budget percentages.";
  chartOverBudget.hidden = !isOverBudget;
  chartOverBudget.textContent = isOverBudget
    ? `Over budget by ${pesoFormatter.format(totalUsed - income)}.`
    : "";

  budgetStatusDisplay.textContent = !hasIncome
    ? isOverBudget
      ? "Over budget"
      : "Add income"
    : isOverBudget
      ? "Over budget"
      : "Within budget";
  budgetStatusDisplay.classList.toggle("is-over-budget", isOverBudget);
}

function createEntryRow({ savedEntry, kind, list, rowClass, count }) {
  const row = document.createElement("div");
  row.className = rowClass;
  row.setAttribute("role", "listitem");

  const nameField = document.createElement("div");
  nameField.className = `expense-field ${kind}-name-field`;

  const nameId = `${kind}-name-${count()}`;
  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = nameId;
  nameLabel.textContent = kind === "expense" ? "Expense name" : "Purchase";

  const nameInput = document.createElement("input");
  nameInput.className = `${kind}-name`;
  nameInput.id = nameId;
  nameInput.type = "text";
  nameInput.maxLength = 60;
  nameInput.placeholder = kind === "expense" ? "e.g. Rent" : "e.g. New Laptop";
  nameInput.autocomplete = "off";
  if (savedEntry) {
    nameInput.value = savedEntry.name;
  }

  nameField.append(nameLabel, nameInput);

  const amountField = document.createElement("div");
  amountField.className = "expense-field expense-amount-field";

  const amountId = `${nameId}-amount`;
  const amountLabel = document.createElement("label");
  amountLabel.htmlFor = amountId;
  amountLabel.textContent =
    kind === "expense" ? "Amount (PHP)" : "Estimated Cost";

  const amountInput = document.createElement("input");
  amountInput.className = `${kind}-amount`;
  amountInput.id = amountId;
  amountInput.type = "text";
  amountInput.inputMode = "decimal";
  amountInput.autocomplete = "off";
  amountInput.placeholder = "0.00";
  if (savedEntry) {
    amountInput.value = formatMoneyValue(savedEntry.amount);
  }

  const pesoSign = document.createElement("span");
  pesoSign.textContent = "₱";
  pesoSign.setAttribute("aria-hidden", "true");

  const amountWrapper = document.createElement("div");
  amountWrapper.className = "money-input expense-money-input";
  amountWrapper.append(pesoSign, amountInput);
  amountField.append(amountLabel, amountWrapper);

  const removeButton = document.createElement("button");
  removeButton.className = "remove-expense";
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", `Remove ${kind}`);

  nameInput.addEventListener("input", () => {
    const name = nameInput.value.trim();
    removeButton.setAttribute(
      "aria-label",
      name ? `Remove ${name} ${kind}` : `Remove ${kind}`,
    );
    updateAndSaveBudget();
  });

  attachMoneyInput(amountInput);

  removeButton.addEventListener("click", () => {
    row.remove();
    updateAndSaveBudget();
    (kind === "expense" ? addExpenseButton : addPurchaseButton).focus();
  });

  row.append(nameField, amountField, removeButton);
  list.append(row);
  if (!savedEntry) {
    nameInput.focus();
  }
  updateSimulation();
}

function createExpenseRow(savedExpense = null) {
  createEntryRow({
    savedEntry: savedExpense,
    kind: "expense",
    list: expenseList,
    rowClass: "expense-row",
    count: () => expenseCount++,
  });
}

function createPurchaseRow(savedPurchase = null) {
  createEntryRow({
    savedEntry: savedPurchase,
    kind: "purchase",
    list: purchaseList,
    rowClass: "expense-row purchase-row",
    count: () => purchaseCount++,
  });
}

function updateAndSaveBudget() {
  updateSimulation();
  saveBudgetData();
}

addExpenseButton.addEventListener("click", () => {
  createExpenseRow();
  saveBudgetData();
});

addPurchaseButton.addEventListener("click", () => {
  createPurchaseRow();
  saveBudgetData();
});

budgetMonthInput.addEventListener("change", () => {
  const selectedMonth = budgetMonthInput.value;
  if (!isValidMonthKey(selectedMonth)) {
    budgetMonthInput.value = activeMonthKey;
    return;
  }

  if (selectedMonth === activeMonthKey) {
    return;
  }

  saveBudgetData();
  activeMonthKey = selectedMonth;
  try {
    localStorage.setItem(SELECTED_MONTH_KEY, activeMonthKey);
  } catch (error) {
    console.error("Could not save the selected budget month:", error);
  }
  loadBudgetData(activeMonthKey);
});

attachMoneyInput(incomeInput);

restoreBudgetData();
updateSimulation();
