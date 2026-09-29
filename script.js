(function () {
  "use strict";
  var KEY = "expense-tracker-transactions";
  var CATEGORIES = {
    expense: ["Food", "Transport", "Rent", "Bills", "Shopping", "Health", "Entertainment", "Other"],
    income: ["Salary", "Freelance", "Gift", "Investment", "Other"]
  };
  var $ = function (id) { return document.getElementById(id); };
  var transactions = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(transactions)); } catch (e) { alert("Could not save data to browser storage."); }
  }
  function money(n) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function currentType() { return document.querySelector("input[name=type]:checked").value; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function fillCategories() {
    var sel = $("category");
    sel.innerHTML = '<option value="">Select category</option>' +
      CATEGORIES[currentType()].map(function (c) { return '<option>' + c + '</option>'; }).join("");
  }
  function fillFilterCategories() {
    var all = Array.from(new Set(CATEGORIES.expense.concat(CATEGORIES.income)));
    var f = $("filterCategory"), v = f.value;
    f.innerHTML = '<option value="all">All</option>' + all.map(function (c) { return '<option>' + c + '</option>'; }).join("");
    f.value = v || "all";
  }

  function validate() {
    var ok = true, amt = parseFloat($("amount").value);
    var rules = [
      ["amount", !(amt > 0), "Enter an amount greater than 0."],
      ["category", !$("category").value, "Choose a category."],
      ["date", !$("date").value, "Pick a date."],
      ["description", !$("description").value.trim(), "Add a short description."]
    ];
    rules.forEach(function (r) {
      $(r[0]).classList.toggle("invalid", r[1]);
      $(r[0] + "Err").textContent = r[1] ? r[2] : "";
      if (r[1]) ok = false;
    });
    return ok;
  }

  function resetForm() {
    $("form").reset();
    $("editId").value = "";
    $("date").value = today();
    fillCategories();
    $("formTitle").textContent = "Add transaction";
    $("submitBtn").textContent = "Add transaction";
    $("cancelBtn").hidden = true;
    document.querySelectorAll(".invalid").forEach(function (e) { e.classList.remove("invalid"); });
    document.querySelectorAll(".err").forEach(function (e) { e.textContent = ""; });
  }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    var t = {
      id: $("editId").value || String(Date.now()),
      type: currentType(),
      amount: Math.round(parseFloat($("amount").value) * 100) / 100,
      category: $("category").value,
      date: $("date").value,
      description: $("description").value.trim()
    };
    var i = transactions.findIndex(function (x) { return x.id === t.id; });
    if (i > -1) transactions[i] = t; else transactions.push(t);
    save(); resetForm(); render();
  });

  document.querySelectorAll("input[name=type]").forEach(function (r) { r.addEventListener("change", fillCategories); });
  $("cancelBtn").addEventListener("click", resetForm);
  ["filterType", "filterCategory", "filterMonth"].forEach(function (id) { $(id).addEventListener("input", render); });

  $("list").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var id = btn.dataset.id, t = transactions.find(function (x) { return x.id === id; });
    if (!t) return;
    if (btn.dataset.act === "delete") {
      if (confirm("Delete \"" + t.description + "\"?")) {
        transactions = transactions.filter(function (x) { return x.id !== id; });
        save(); render();
      }
    } else {
      document.querySelector("input[name=type][value=" + t.type + "]").checked = true;
      fillCategories();
      $("editId").value = t.id;
      $("amount").value = t.amount;
      $("category").value = t.category;
      $("date").value = t.date;
      $("description").value = t.description;
      $("formTitle").textContent = "Edit transaction";
      $("submitBtn").textContent = "Save changes";
      $("cancelBtn").hidden = false;
      $("amount").focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  function render() {
    var income = 0, expense = 0;
    transactions.forEach(function (t) { if (t.type === "income") income += t.amount; else expense += t.amount; });
    $("totalIncome").textContent = money(income);
    $("totalExpense").textContent = money(expense);
    $("balance").textContent = money(income - expense);

    var ft = $("filterType").value, fc = $("filterCategory").value, fm = $("filterMonth").value;
    var shown = transactions.filter(function (t) {
      return (ft === "all" || t.type === ft) && (fc === "all" || t.category === fc) && (!fm || t.date.slice(0, 7) === fm);
    }).sort(function (a, b) { return b.date.localeCompare(a.date) || b.id.localeCompare(a.id); });

    $("empty").hidden = shown.length > 0;
    $("list").innerHTML = shown.map(function (t) {
      return '<li class="item ' + t.type + '">' +
        '<div><div class="desc">' + esc(t.description) + '</div>' +
        '<div class="meta">' + esc(t.category) + ' • ' + t.date + '</div></div>' +
        '<div class="amt">' + (t.type === "income" ? "+" : "-") + money(t.amount) + '</div>' +
        '<div class="row-actions">' +
        '<button class="btn small" data-act="edit" data-id="' + t.id + '">Edit</button>' +
        '<button class="btn small danger" data-act="delete" data-id="' + t.id + '">Delete</button></div></li>';
    }).join("");

    renderChart(fm);
  }

  function renderChart(month) {
    var totals = {}, sum = 0;
    transactions.forEach(function (t) {
      if (t.type !== "expense" || (month && t.date.slice(0, 7) !== month)) return;
      totals[t.category] = (totals[t.category] || 0) + t.amount; sum += t.amount;
    });
    var rows = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
    $("chartNote").textContent = rows.length
      ? (month ? "Expenses for " + month : "All-time expenses") + ": " + money(sum) + ". Use the Month filter to see a monthly summary."
      : "No expenses to show yet.";
    $("chart").innerHTML = rows.map(function (c) {
      var pct = sum ? (totals[c] / sum) * 100 : 0;
      return '<div class="bar-row"><span>' + esc(c) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div><b>' + money(totals[c]) + '</b></div>';
    }).join("");
  }

  fillFilterCategories();
  resetForm();
  render();
})();