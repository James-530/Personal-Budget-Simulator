document.querySelectorAll(".expense-row").forEach((row) => {
  row.addEventListener("click", () => {
    row.querySelector("input").focus();
  });
});
