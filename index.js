const expenseList = document.getElementById("expenseList");
const addExpenseButton = document.getElementById("addExpense");
const totalExpensesDisplay = document.getElementById("totalExpenses");
const incomeInput = document.getElementById("income");
const purchaseInput = document.getElementById("purchase");
const purchaseCostInput = document.getElementById("cost");
const simulateButton = document.querySelector(".simulate");
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

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

function getBudgetData() {
  const expenses = [...expenseList.querySelectorAll(".expense-row")].map(
    (row) => ({
      name: row.querySelector(".expense-name").value,
      amount: row.querySelector(".expense-amount").value,
    }),
  );

  return {
    income: incomeInput.value,
    expenses,
    purchaseName: purchaseInput.value,
    purchaseCost: purchaseCostInput.value,
  };
}

function getNonNegativeAmount(input) {
  const amount = Number(input.value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function preventNegativeAmount(input) {
  if (input.value !== "" && Number(input.value) < 0) {
    input.value = "0";
  }
}

function getTotalExpenses() {
  return [...expenseList.querySelectorAll(".expense-amount")].reduce(
    (total, input) => total + getNonNegativeAmount(input),
    0,
  );
}

function updateTotalExpenses(totalExpenses) {
  totalExpensesDisplay.dataset.value = totalExpenses;
  totalExpensesDisplay.textContent = pesoFormatter.format(totalExpenses);
}

function updateBudgetBar(income, expenses, purchaseCost, budgetUsed) {
  const expensePercentage = income > 0 ? (expenses / income) * 100 : 0;
  const purchasePercentage = income > 0 ? (purchaseCost / income) * 100 : 0;
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
  const purchaseCost = getNonNegativeAmount(purchaseCostInput);
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
      "Enter your monthly income to see how this purchase affects your budget.";
  } else if (isOverBudget) {
    resultMessageDisplay.textContent = `This purchase would put you ${pesoFormatter.format(
      Math.abs(remainingAfterPurchase),
    )} over your monthly income.`;
  } else if (purchaseCost > 0) {
    const purchaseName = purchaseInput.value.trim() || "This purchase";
    resultMessageDisplay.textContent = `${purchaseName} would leave you ${pesoFormatter.format(
      remainingAfterPurchase,
    )} for the rest of the month.`;
  } else {
    resultMessageDisplay.textContent = `You have ${pesoFormatter.format(
      availableNow,
    )} remaining after monthly expenses.`;
  }
}

function createExpenseRow() {
  const row = document.createElement("div");
  row.className = "expense-row";
  row.setAttribute("role", "listitem");

  const nameField = document.createElement("div");
  nameField.className = "expense-field expense-name-field";

  const nameId = `expense-name-${expenseCount++}`;
  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = nameId;
  nameLabel.textContent = "Expense name";

  const nameInput = document.createElement("input");
  nameInput.className = "expense-name";
  nameInput.id = nameId;
  nameInput.type = "text";
  nameInput.maxLength = 60;
  nameInput.placeholder = "e.g. Rent";
  nameInput.autocomplete = "off";

  nameField.append(nameLabel, nameInput);

  const amountField = document.createElement("div");
  amountField.className = "expense-field expense-amount-field";

  const amountId = `${nameId}-amount`;
  const amountLabel = document.createElement("label");
  amountLabel.htmlFor = amountId;
  amountLabel.textContent = "Amount (PHP)";

  const amountInput = document.createElement("input");
  amountInput.className = "expense-amount";
  amountInput.id = amountId;
  amountInput.type = "number";
  amountInput.min = "0";
  amountInput.step = "0.01";
  amountInput.inputMode = "decimal";
  amountInput.placeholder = "0.00";

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
  removeButton.setAttribute("aria-label", "Remove expense");

  nameInput.addEventListener("input", () => {
    const name = nameInput.value.trim();
    removeButton.setAttribute(
      "aria-label",
      name ? `Remove ${name} expense` : "Remove expense",
    );
    updateSimulation();
  });

  amountInput.addEventListener("input", () => {
    preventNegativeAmount(amountInput);
    updateSimulation();
  });

  removeButton.addEventListener("click", () => {
    row.remove();
    updateSimulation();
    addExpenseButton.focus();
  });

  row.append(nameField, amountField, removeButton);
  expenseList.append(row);
  nameInput.focus();
  updateSimulation();
}

addExpenseButton.addEventListener("click", createExpenseRow);

[incomeInput, purchaseCostInput].forEach((input) => {
  input.addEventListener("input", () => {
    preventNegativeAmount(input);
    updateSimulation();
  });
});

purchaseInput.addEventListener("input", updateSimulation);
simulateButton.addEventListener("click", updateSimulation);

updateSimulation();
