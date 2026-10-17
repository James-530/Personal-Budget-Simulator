const expenseList = document.getElementById("expenseList");
const addExpenseButton = document.getElementById("addExpense");
const purchaseList = document.getElementById("purchaseList");
const addPurchaseButton = document.getElementById("addPurchase");
const totalExpensesDisplay = document.getElementById("totalExpenses");
const incomeInput = document.getElementById("income");
const remainingAmountDisplay = document.querySelector(".remaining-amount");
const budgetStatusDisplay = document.querySelector(".budget-status");
const budgetPercentageDisplay = document.querySelector(".budget-percentage");
const budgetBar = document.querySelector(".budget-bar");
const budgetExpensesSegment = document.querySelector(
  ".budget-expenses-segment",
);
const budgetPurchaseSegment = document.querySelector(
  ".budget-purchase-segment",
);
const budgetLeftDisplay = document.querySelector(".budget-left");
const availableAmountDisplay = document.querySelector(".available-amount");
const purchaseCostDisplay = document.querySelector(".cost");
const resultMessageDisplay = document.querySelector(".message-text");
let expenseCount = 0;
let purchaseCount = 0;
const STORAGE_KEY = "personal-budget-simulator";

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function hasEntryContent(entry) {
  return entry.name !== "" || entry.amount !== "";
}

function getBudgetData() {
  const expenses = [...expenseList.querySelectorAll(".expense-row")].map(
    (row) => ({
      name: row.querySelector(".expense-name").value,
      amount: row.querySelector(".expense-amount").value,
    }),
  ).filter(hasEntryContent);

  const purchases = [...purchaseList.querySelectorAll(".purchase-row")]
    .map((row) => ({
      name: row.querySelector(".purchase-name").value,
      amount: row.querySelector(".purchase-amount").value,
    }))
    .filter(hasEntryContent);

  return {
    income: incomeInput.value,
    expenses,
    purchases,
  };
}

function saveBudgetData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getBudgetData()));
  } catch (error) {
    console.error("Could not save budget data:", error);
  }
}

function restoreBudgetData() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return;
    }

    const budgetData = JSON.parse(savedData);
    if (!budgetData || typeof budgetData !== "object") {
      throw new Error("Saved budget data has an invalid format.");
    }

    const savedExpenses = budgetData.expenses;
    const savedPurchases =
      budgetData.purchases ??
      (typeof budgetData.purchaseName === "string" &&
      typeof budgetData.purchaseCost === "string"
        ? [{ name: budgetData.purchaseName, amount: budgetData.purchaseCost }]
        : []);
    if (
      typeof budgetData.income !== "string" ||
      !Array.isArray(savedExpenses) ||
      !savedExpenses.every(
        (expense) =>
          expense &&
          typeof expense.name === "string" &&
          typeof expense.amount === "string",
      ) ||
      !Array.isArray(savedPurchases) ||
      !savedPurchases.every(
        (purchase) =>
          purchase &&
          typeof purchase.name === "string" &&
          typeof purchase.amount === "string",
      )
    ) {
      throw new Error("Saved budget data has an invalid format.");
    }

    incomeInput.value = formatMoneyValue(budgetData.income);
    savedExpenses.filter(hasEntryContent).forEach((expense) => {
      createExpenseRow(expense);
    });
    savedPurchases.filter(hasEntryContent).forEach((purchase) => {
      createPurchaseRow(purchase);
    });
  } catch (error) {
    console.error("Could not restore budget data:", error);
  }
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

function updateBudgetBar(income, expenses, purchaseCost, budgetUsed) {
  const expensePercentage =
    income > 0 ? Math.min((expenses / income) * 100, 100) : 0;
  const purchasePercentage =
    income > 0
      ? Math.min((purchaseCost / income) * 100, 100 - expensePercentage)
      : 0;
  const percentageValue = Math.min(Math.max(budgetUsed, 0), 100);

  budgetExpensesSegment.style.width = `${expensePercentage}%`;
  budgetPurchaseSegment.style.width = `${purchasePercentage}%`;
  budgetBar.setAttribute("aria-valuenow", percentageValue.toFixed(1));

  const budgetDescription =
    income > 0
      ? `${budgetUsed.toFixed(1)}% of monthly income used`
      : "Enter monthly income to calculate budget used";
  budgetBar.setAttribute("aria-valuetext", budgetDescription);
}

function updateSimulation() {
  const income = getNonNegativeAmount(incomeInput);
  const expenses = getTotalExpenses();
  const purchaseCost = getTotalPurchases();
  const purchases = [...purchaseList.querySelectorAll(".purchase-row")];
  const availableNow = income - expenses;
  const remainingAfterPurchase = availableNow - purchaseCost;
  const totalUsed = expenses + purchaseCost;
  const budgetUsed = income > 0 ? (totalUsed / income) * 100 : 0;
  const budgetRemaining = income > 0 ? 100 - budgetUsed : 0;
  const hasIncome = income > 0;
  const isOverBudget = totalUsed > income;

  updateTotalExpenses(expenses);
  remainingAmountDisplay.textContent = pesoFormatter.format(
    remainingAfterPurchase,
  );
  availableAmountDisplay.textContent = pesoFormatter.format(availableNow);
  purchaseCostDisplay.textContent = pesoFormatter.format(purchaseCost);
  budgetPercentageDisplay.textContent = hasIncome ? budgetUsed.toFixed(1) : "0";
  budgetLeftDisplay.textContent = hasIncome
    ? `${Math.max(budgetRemaining, 0).toFixed(1)}% left`
    : "—";

  budgetStatusDisplay.textContent = !hasIncome
    ? "Add income"
    : isOverBudget
      ? "Over budget"
      : "Within budget";
  budgetStatusDisplay.classList.toggle("is-over-budget", isOverBudget);
  updateBudgetBar(income, expenses, purchaseCost, budgetUsed);

  if (!hasIncome) {
    resultMessageDisplay.textContent =
      "Enter your monthly income to see how these purchases affect your budget.";
  } else if (isOverBudget) {
    resultMessageDisplay.textContent = `Monthly expenses and these purchases would put you ${pesoFormatter.format(
      Math.abs(remainingAfterPurchase),
    )} over your monthly income.`;
  } else if (purchaseCost > 0) {
    const purchaseNames = purchases
      .map((row) => row.querySelector(".purchase-name").value.trim())
      .filter(Boolean);
    const purchaseDescription =
      purchases.length === 1 && purchaseNames.length === 1
        ? purchaseNames[0]
        : "These purchases";
    resultMessageDisplay.textContent = `${purchaseDescription} would leave you ${pesoFormatter.format(
      remainingAfterPurchase,
    )} for the rest of the month.`;
  } else {
    resultMessageDisplay.textContent = `You have ${pesoFormatter.format(
      availableNow,
    )} remaining after monthly expenses.`;
  }
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

attachMoneyInput(incomeInput);

restoreBudgetData();
updateSimulation();
