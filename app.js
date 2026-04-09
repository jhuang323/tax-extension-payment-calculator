/* ============================================
   JH Group CPA — 2025 Extension Payment Calculator
   Pure client-side, reactive calculations
   ============================================ */

(function () {
  "use strict";

  // ---- DOM References ----
  const els = {
    filingStatus: document.getElementById("filingStatus"),
    priorAGI: document.getElementById("priorAGI"),
    priorTax: document.getElementById("priorTax"),
    caResident: document.getElementById("caResident"),
    priorCATax: document.getElementById("priorCATax"),
    caFieldsPrior: document.getElementById("caFieldsPrior"),
    estIncome: document.getElementById("estIncome"),
    estTax: document.getElementById("estTax"),
    estCATax: document.getElementById("estCATax"),
    fedWithholding: document.getElementById("fedWithholding"),
    fedEstPayments: document.getElementById("fedEstPayments"),
    caWithholding: document.getElementById("caWithholding"),
    caEstPayments: document.getElementById("caEstPayments"),

    // CA field containers
    caFieldsEstimates: document.getElementById("caFieldsEstimates"),
    caFieldsPayments: document.getElementById("caFieldsPayments"),
    caResults: document.getElementById("caResults"),
    caSummaryRow: document.getElementById("caSummaryRow"),
    caPayLink: document.getElementById("caPayLink"),

    // Federal results
    fedTaxDue: document.getElementById("fedTaxDue"),
    fedSafeHarbor: document.getElementById("fedSafeHarbor"),
    fedSafeHarborDesc: document.getElementById("fedSafeHarborDesc"),
    fedExtPayment: document.getElementById("fedExtPayment"),
    fedUnderpayment: document.getElementById("fedUnderpayment"),
    fedInterest: document.getElementById("fedInterest"),
    fedPenalty: document.getElementById("fedPenalty"),

    // CA results
    caTaxDue: document.getElementById("caTaxDue"),
    caSafeHarbor: document.getElementById("caSafeHarbor"),
    caSafeHarborDesc: document.getElementById("caSafeHarborDesc"),
    caExtPayment: document.getElementById("caExtPayment"),
    caPenalty: document.getElementById("caPenalty"),
    caLatePenalty: document.getElementById("caLatePenalty"),

    // Summary
    totalPayment: document.getElementById("totalPayment"),
    summaryFed: document.getElementById("summaryFed"),
    summaryCa: document.getElementById("summaryCa"),

    // Scenarios
    scenarioConservative: document.getElementById("scenarioConservative"),
    scenarioConservativeDesc: document.getElementById("scenarioConservativeDesc"),
    scenarioStandard: document.getElementById("scenarioStandard"),
    scenarioAggressive: document.getElementById("scenarioAggressive"),

    // Buttons
    resetBtn: document.getElementById("resetBtn"),
    printBtn: document.getElementById("printBtn"),
  };

  // ---- Utility Functions ----

  function parseNum(str) {
    if (!str) return 0;
    var cleaned = str.replace(/[^0-9.-]/g, "");
    var val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }

  function formatCurrency(num) {
    if (num < 0) {
      return "-$" + Math.abs(Math.round(num)).toLocaleString("en-US");
    }
    return "$" + Math.round(num).toLocaleString("en-US");
  }

  function formatInputValue(str) {
    var cleaned = str.replace(/[^0-9]/g, "");
    if (!cleaned) return "";
    return parseInt(cleaned, 10).toLocaleString("en-US");
  }

  // Debounce helper
  var debounceTimer = null;
  function debounce(fn, delay) {
    return function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fn, delay);
    };
  }

  // Animated value update
  function animateValue(element, newText) {
    var current = element.textContent;
    if (current === newText) return;
    element.classList.add("value-updating");
    element.textContent = newText;
    setTimeout(function () {
      element.classList.remove("value-updating");
    }, 200);
  }

  // ---- Input Formatting ----

  function setupCurrencyInput(input) {
    input.addEventListener("input", function () {
      var pos = input.selectionStart;
      var oldLen = input.value.length;
      var raw = input.value.replace(/[^0-9]/g, "");
      input.value = formatInputValue(raw);
      var newLen = input.value.length;
      var newPos = pos + (newLen - oldLen);
      if (newPos < 0) newPos = 0;
      input.setSelectionRange(newPos, newPos);
    });

    input.addEventListener("keydown", function (e) {
      var allowed = [
        "Backspace",
        "Delete",
        "ArrowLeft",
        "ArrowRight",
        "Tab",
        "Home",
        "End",
      ];
      if (allowed.indexOf(e.key) !== -1) return;
      if (e.ctrlKey || e.metaKey) return;
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    });
  }

  // Apply currency input formatting to all numeric inputs
  var numericInputs = document.querySelectorAll('input[inputmode="numeric"]');
  numericInputs.forEach(function (inp) {
    setupCurrencyInput(inp);
  });

  // ---- CA Toggle ----

  function toggleCA() {
    var isCA = els.caResident.checked;
    var caContainers = [
      els.caFieldsPrior,
      els.caFieldsEstimates,
      els.caFieldsPayments,
    ];

    caContainers.forEach(function (el) {
      if (isCA) {
        el.removeAttribute("hidden");
      } else {
        el.setAttribute("hidden", "");
      }
    });

    if (isCA) {
      els.caResults.removeAttribute("hidden");
      els.caSummaryRow.removeAttribute("hidden");
      els.caPayLink.removeAttribute("hidden");
    } else {
      els.caResults.setAttribute("hidden", "");
      els.caSummaryRow.setAttribute("hidden", "");
      els.caPayLink.setAttribute("hidden", "");
    }

    recalculate();
  }

  els.caResident.addEventListener("change", toggleCA);

  // ---- Core Calculation ----

  function getValues() {
    return {
      filingStatus: els.filingStatus.value,
      priorAGI: parseNum(els.priorAGI.value),
      priorTax: parseNum(els.priorTax.value),
      isCA: els.caResident.checked,
      priorCATax: parseNum(els.priorCATax.value),
      estIncome: parseNum(els.estIncome.value),
      estTax: parseNum(els.estTax.value),
      estCATax: parseNum(els.estCATax.value),
      fedWithholding: parseNum(els.fedWithholding.value),
      fedEstPayments: parseNum(els.fedEstPayments.value),
      caWithholding: parseNum(els.caWithholding.value),
      caEstPayments: parseNum(els.caEstPayments.value),
    };
  }

  function isMFS(status) {
    return status === "mfs";
  }

  function calcFederal(v) {
    var totalFedPayments = v.fedWithholding + v.fedEstPayments;
    var taxDue = Math.max(0, v.estTax - totalFedPayments);

    // Safe harbor thresholds
    var agiThreshold = isMFS(v.filingStatus) ? 75000 : 150000;
    var priorYearPct = v.priorAGI > agiThreshold ? 1.1 : 1.0;
    var priorYearSH = v.priorTax * priorYearPct;
    var currentYearSH = v.estTax * 0.9;

    // Recommended safe harbor = lesser of the two
    var safeHarbor = Math.min(priorYearSH, currentYearSH);
    if (v.priorTax === 0 && v.estTax === 0) {
      safeHarbor = 0;
    }

    var safeHarborDesc;
    if (safeHarbor === currentYearSH && v.estTax > 0) {
      safeHarborDesc = "90% of current year estimate";
    } else if (priorYearPct === 1.1) {
      safeHarborDesc = "110% of prior year tax (AGI > $" + agiThreshold.toLocaleString("en-US") + ")";
    } else {
      safeHarborDesc = "100% of prior year tax";
    }

    // Extension payment needed
    var extPayment = Math.max(0, safeHarbor - totalFedPayments);

    // Underpayment if $0 paid
    var underpayment = Math.max(0, v.estTax - totalFedPayments);

    // Interest calculation: 7% annual, compounded daily, ~183 days (Apr 15 - Oct 15)
    var dailyRate = 0.07 / 365;
    var days = 183;
    var interest = 0;
    if (underpayment > 0) {
      interest = underpayment * (Math.pow(1 + dailyRate, days) - 1);
    }

    // Late payment penalty: 0.5% per month, up to 5 months
    var months = 5; // extension period Apr-Sep (approximately 5 months)
    var penalty = 0;
    if (underpayment > 0) {
      penalty = underpayment * 0.005 * months;
    }

    // Scenarios
    var conservativePct = v.priorAGI > agiThreshold ? 1.1 : 1.0;
    var conservativeAmt = Math.max(0, v.priorTax * conservativePct - totalFedPayments);
    var standardAmt = extPayment;
    var aggressiveAmt = Math.max(0, v.estTax * 0.9 - totalFedPayments);

    var conservativeDesc;
    if (conservativePct === 1.1) {
      conservativeDesc = "110% of prior year tax";
    } else {
      conservativeDesc = "100% of prior year tax";
    }

    return {
      taxDue: taxDue,
      safeHarbor: safeHarbor,
      safeHarborDesc: safeHarborDesc,
      extPayment: extPayment,
      underpayment: underpayment,
      interest: interest,
      penalty: penalty,
      conservativeAmt: conservativeAmt,
      conservativeDesc: conservativeDesc,
      standardAmt: standardAmt,
      aggressiveAmt: aggressiveAmt,
    };
  }

  function calcCalifornia(v) {
    if (!v.isCA) {
      return {
        taxDue: 0,
        safeHarbor: 0,
        safeHarborDesc: "",
        extPayment: 0,
        penalty: 0,
        latePenalty: 0,
      };
    }

    var totalCAPayments = v.caWithholding + v.caEstPayments;
    var taxDue = Math.max(0, v.estCATax - totalCAPayments);

    // CA safe harbor thresholds
    var mfsThreshold = 500000;
    var highThreshold = 1000000;
    var midThreshold = isMFS(v.filingStatus) ? 75000 : 150000;
    var caAGI = v.priorAGI; // using same AGI for simplicity

    var safeHarbor;
    var safeHarborDesc;

    var adjustedHighThreshold = isMFS(v.filingStatus) ? mfsThreshold : highThreshold;

    if (caAGI >= adjustedHighThreshold) {
      // Millionaires: MUST use 90% current year
      safeHarbor = v.estCATax * 0.9;
      safeHarborDesc = "90% of current year (CA AGI \u2265 $" + adjustedHighThreshold.toLocaleString("en-US") + ")";
    } else if (caAGI > midThreshold) {
      // High income: 110% prior year or 90% current, lesser
      var priorYearSH = v.priorCATax * 1.1;
      var currentYearSH = v.estCATax * 0.9;
      safeHarbor = Math.min(priorYearSH, currentYearSH);
      if (safeHarbor === currentYearSH && v.estCATax > 0) {
        safeHarborDesc = "90% of current year CA estimate";
      } else {
        safeHarborDesc = "110% of prior year CA tax";
      }
    } else {
      // Standard: 100% prior year or 90% current, lesser
      var priorYearSH100 = v.priorCATax;
      var currentYearSH90 = v.estCATax * 0.9;
      safeHarbor = Math.min(priorYearSH100, currentYearSH90);
      if (safeHarbor === currentYearSH90 && v.estCATax > 0) {
        safeHarborDesc = "90% of current year CA estimate";
      } else {
        safeHarborDesc = "100% of prior year CA tax";
      }
    }

    if (v.priorCATax === 0 && v.estCATax === 0) {
      safeHarbor = 0;
    }

    var extPayment = Math.max(0, safeHarbor - totalCAPayments);

    // CA underpayment penalty
    // 8% from 4/15/25 to 6/30/25 (76 days), then 7% from 7/1/25 to 4/15/26 (289 days)
    var underpayment = Math.max(0, v.estCATax - totalCAPayments);
    var period1Days = 76;
    var period2Days = 289;
    var penalty = 0;
    if (underpayment > 0) {
      penalty =
        underpayment * (0.08 / 365) * period1Days +
        underpayment * (0.07 / 365) * period2Days;
    }

    // CA late payment penalty: 5% one-time + 0.5% per month (assume 6 months extension)
    var latePenalty = 0;
    if (underpayment > 0) {
      latePenalty = underpayment * 0.05 + underpayment * 0.005 * 6;
    }

    return {
      taxDue: taxDue,
      safeHarbor: safeHarbor,
      safeHarborDesc: safeHarborDesc,
      extPayment: extPayment,
      penalty: penalty,
      latePenalty: latePenalty,
    };
  }

  function recalculate() {
    var v = getValues();
    var fed = calcFederal(v);
    var ca = calcCalifornia(v);

    // Update Federal Results
    animateValue(els.fedTaxDue, formatCurrency(fed.taxDue));
    animateValue(els.fedSafeHarbor, formatCurrency(fed.safeHarbor));
    els.fedSafeHarborDesc.textContent = fed.safeHarborDesc;
    animateValue(els.fedExtPayment, formatCurrency(fed.extPayment));
    animateValue(els.fedUnderpayment, formatCurrency(fed.underpayment));
    animateValue(els.fedInterest, formatCurrency(fed.interest));
    animateValue(els.fedPenalty, formatCurrency(fed.penalty));

    // Update CA Results
    if (v.isCA) {
      animateValue(els.caTaxDue, formatCurrency(ca.taxDue));
      animateValue(els.caSafeHarbor, formatCurrency(ca.safeHarbor));
      els.caSafeHarborDesc.textContent = ca.safeHarborDesc;
      animateValue(els.caExtPayment, formatCurrency(ca.extPayment));
      animateValue(els.caPenalty, formatCurrency(ca.penalty));
      animateValue(els.caLatePenalty, formatCurrency(ca.latePenalty));
    }

    // Update Summary
    var totalFedPayment = fed.extPayment;
    var totalCAPayment = v.isCA ? ca.extPayment : 0;
    var total = totalFedPayment + totalCAPayment;

    animateValue(els.totalPayment, formatCurrency(total));
    animateValue(els.summaryFed, formatCurrency(totalFedPayment));
    if (v.isCA) {
      animateValue(els.summaryCa, formatCurrency(totalCAPayment));
    }

    // Update Scenarios (Federal only for simplicity, but add CA too)
    var totalConservative = fed.conservativeAmt + (v.isCA ? ca.extPayment : 0);
    var totalStandard = fed.standardAmt + (v.isCA ? ca.extPayment : 0);
    var totalAggressive = fed.aggressiveAmt + (v.isCA ? Math.max(0, v.estCATax * 0.9 - v.caWithholding - v.caEstPayments) : 0);

    animateValue(els.scenarioConservative, formatCurrency(totalConservative));
    els.scenarioConservativeDesc.textContent = fed.conservativeDesc;
    animateValue(els.scenarioStandard, formatCurrency(totalStandard));
    animateValue(els.scenarioAggressive, formatCurrency(totalAggressive));
  }

  // ---- Event Listeners ----

  var debouncedRecalc = debounce(recalculate, 150);

  // Listen on all inputs
  var allInputs = document.querySelectorAll("input, select");
  allInputs.forEach(function (input) {
    if (input.type === "checkbox") {
      // Toggle handled separately
      return;
    }
    input.addEventListener("input", debouncedRecalc);
    input.addEventListener("change", debouncedRecalc);
  });

  els.filingStatus.addEventListener("change", recalculate);

  // ---- Reset ----

  els.resetBtn.addEventListener("click", function () {
    var allNumericInputs = document.querySelectorAll('input[inputmode="numeric"]');
    allNumericInputs.forEach(function (inp) {
      inp.value = "";
    });
    els.filingStatus.value = "mfj";
    els.caResident.checked = false;
    toggleCA();
    recalculate();
  });

  // ---- Print ----

  els.printBtn.addEventListener("click", function () {
    var v = getValues();
    var fed = calcFederal(v);
    var ca = calcCalifornia(v);

    var printDate = document.getElementById("printDate");
    printDate.textContent = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    var statusMap = {
      single: "Single",
      mfj: "Married Filing Jointly",
      mfs: "Married Filing Separately",
      hoh: "Head of Household",
      qss: "Qualifying Surviving Spouse",
    };

    var html = "";
    html += "<table style='width:100%;border-collapse:collapse;margin-bottom:1.5rem'>";
    html += "<tr><td style='padding:4px 8px;font-weight:600'>Filing Status:</td><td style='padding:4px 8px'>" + statusMap[v.filingStatus] + "</td></tr>";
    html += "<tr><td style='padding:4px 8px;font-weight:600'>2024 AGI:</td><td style='padding:4px 8px'>" + formatCurrency(v.priorAGI) + "</td></tr>";
    html += "<tr><td style='padding:4px 8px;font-weight:600'>2024 Tax:</td><td style='padding:4px 8px'>" + formatCurrency(v.priorTax) + "</td></tr>";
    html += "</table>";

    html += "<h2 style='font-size:1.125rem;margin:1rem 0 0.5rem;border-bottom:1px solid #ccc;padding-bottom:4px'>Federal Extension Payment</h2>";
    html += "<table style='width:100%;border-collapse:collapse;margin-bottom:1rem'>";
    html += "<tr><td style='padding:4px 8px'>Estimated 2025 Tax:</td><td style='padding:4px 8px;text-align:right'>" + formatCurrency(v.estTax) + "</td></tr>";
    html += "<tr><td style='padding:4px 8px'>Total Federal Payments:</td><td style='padding:4px 8px;text-align:right'>" + formatCurrency(v.fedWithholding + v.fedEstPayments) + "</td></tr>";
    html += "<tr><td style='padding:4px 8px'>Estimated Tax Due:</td><td style='padding:4px 8px;text-align:right'>" + formatCurrency(fed.taxDue) + "</td></tr>";
    html += "<tr><td style='padding:4px 8px'>Safe Harbor Amount:</td><td style='padding:4px 8px;text-align:right'>" + formatCurrency(fed.safeHarbor) + "</td></tr>";
    html += "<tr style='font-weight:700;border-top:2px solid #000'><td style='padding:6px 8px'>Recommended Extension Payment:</td><td style='padding:6px 8px;text-align:right'>" + formatCurrency(fed.extPayment) + "</td></tr>";
    html += "</table>";

    if (v.isCA) {
      html += "<h2 style='font-size:1.125rem;margin:1rem 0 0.5rem;border-bottom:1px solid #ccc;padding-bottom:4px'>California Extension Payment</h2>";
      html += "<table style='width:100%;border-collapse:collapse;margin-bottom:1rem'>";
      html += "<tr><td style='padding:4px 8px'>Estimated 2025 CA Tax:</td><td style='padding:4px 8px;text-align:right'>" + formatCurrency(v.estCATax) + "</td></tr>";
      html += "<tr><td style='padding:4px 8px'>Total CA Payments:</td><td style='padding:4px 8px;text-align:right'>" + formatCurrency(v.caWithholding + v.caEstPayments) + "</td></tr>";
      html += "<tr><td style='padding:4px 8px'>CA Safe Harbor:</td><td style='padding:4px 8px;text-align:right'>" + formatCurrency(ca.safeHarbor) + "</td></tr>";
      html += "<tr style='font-weight:700;border-top:2px solid #000'><td style='padding:6px 8px'>Recommended CA Extension Payment:</td><td style='padding:6px 8px;text-align:right'>" + formatCurrency(ca.extPayment) + "</td></tr>";
      html += "</table>";
    }

    html += "<h2 style='font-size:1.25rem;margin:1.5rem 0 0.5rem;text-align:center;border-top:2px solid #000;padding-top:1rem'>Total Recommended Payment: " + formatCurrency(fed.extPayment + (v.isCA ? ca.extPayment : 0)) + "</h2>";
    html += "<p style='text-align:center;font-size:0.875rem;color:#555'>Due: April 15, 2026</p>";

    document.getElementById("printContent").innerHTML = html;
    window.print();
  });

  // ---- Initial calculation ----
  recalculate();

  // ============================================
  // Quick Estimator — Federal & CA Tax Helpers
  // ============================================

  // 2025 Federal Tax Brackets
  var fedBrackets = {
    single: [
      { limit: 11925, rate: 0.10 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
    mfj: [
      { limit: 23850, rate: 0.10 },
      { limit: 96950, rate: 0.12 },
      { limit: 206700, rate: 0.22 },
      { limit: 394600, rate: 0.24 },
      { limit: 501050, rate: 0.32 },
      { limit: 751600, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
    mfs: [
      { limit: 11925, rate: 0.10 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 375800, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
    hoh: [
      { limit: 17000, rate: 0.10 },
      { limit: 64850, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250500, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
    qss: [
      { limit: 23850, rate: 0.10 },
      { limit: 96950, rate: 0.12 },
      { limit: 206700, rate: 0.22 },
      { limit: 394600, rate: 0.24 },
      { limit: 501050, rate: 0.32 },
      { limit: 751600, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  };

  // 2025 CA Tax Brackets (MFJ shown; single is half the limits)
  var caBracketsSingle = [
    { limit: 10756, rate: 0.01 },
    { limit: 25499, rate: 0.02 },
    { limit: 40245, rate: 0.04 },
    { limit: 55866, rate: 0.06 },
    { limit: 70606, rate: 0.08 },
    { limit: 360659, rate: 0.093 },
    { limit: 432787, rate: 0.103 },
    { limit: 721314, rate: 0.113 },
    { limit: 1000000, rate: 0.123 },
    { limit: Infinity, rate: 0.133 },
  ];

  var caBracketsMFJ = [
    { limit: 21512, rate: 0.01 },
    { limit: 50998, rate: 0.02 },
    { limit: 80490, rate: 0.04 },
    { limit: 111732, rate: 0.06 },
    { limit: 141212, rate: 0.08 },
    { limit: 721318, rate: 0.093 },
    { limit: 865574, rate: 0.103 },
    { limit: 1442628, rate: 0.113 },
    { limit: 2000000, rate: 0.123 },
    { limit: Infinity, rate: 0.133 },
  ];

  function calcBracketTax(taxableIncome, brackets) {
    var tax = 0;
    var prev = 0;
    for (var i = 0; i < brackets.length; i++) {
      var bracket = brackets[i];
      if (taxableIncome <= prev) break;
      var amt = Math.min(taxableIncome, bracket.limit) - prev;
      tax += amt * bracket.rate;
      prev = bracket.limit;
    }
    return tax;
  }

  function calcSETax(seIncome) {
    if (seIncome <= 0) return 0;
    var seBase = seIncome * 0.9235; // 92.35% of SE income
    var ssCap = 176100; // 2025 SS wage base
    var ssTax = Math.min(seBase, ssCap) * 0.124; // 12.4% Social Security
    var medTax = seBase * 0.029; // 2.9% Medicare
    var addMed = Math.max(0, seBase - 200000) * 0.009; // 0.9% additional Medicare
    return (ssTax + medTax + addMed) * 0.5 + ssTax + medTax + addMed;
    // Note: simplified — returns total SE tax (employer + employee equivalent)
  }

  function calcNIIT(agi, filingStatus) {
    var threshold = (filingStatus === "mfj" || filingStatus === "qss") ? 250000 : 200000;
    if (filingStatus === "mfs") threshold = 125000;
    var excess = Math.max(0, agi - threshold);
    return excess * 0.038;
  }

  // Helper panel toggle logic
  function setupHelperToggle(toggleId, panelId) {
    var toggle = document.getElementById(toggleId);
    var panel = document.getElementById(panelId);
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) {
        panel.setAttribute("hidden", "");
        toggle.setAttribute("aria-expanded", "false");
      } else {
        panel.removeAttribute("hidden");
        toggle.setAttribute("aria-expanded", "true");
      }
    });
  }

  setupHelperToggle("fedHelperToggle", "fedHelper");
  setupHelperToggle("caHelperToggle", "caHelper");

  // Setup currency inputs for helper fields
  var helperInputs = document.querySelectorAll(".helper-field input[inputmode='numeric']");
  helperInputs.forEach(function (inp) {
    setupCurrencyInput(inp);
  });

  // Federal helper calculation
  function calcFedHelper() {
    var status = els.filingStatus.value;
    var agi = parseNum(document.getElementById("helpIncome").value);
    var deductions = parseNum(document.getElementById("helpDeductions").value);
    var seIncome = parseNum(document.getElementById("helpSEIncome").value);
    var credits = parseNum(document.getElementById("helpCredits").value);

    // Default deductions if not entered
    if (deductions === 0) {
      if (status === "mfj" || status === "qss") deductions = 30000;
      else if (status === "hoh") deductions = 22500;
      else deductions = 15000;
    }

    var taxableIncome = Math.max(0, agi - deductions);
    var brackets = fedBrackets[status] || fedBrackets.single;
    var incomeTax = calcBracketTax(taxableIncome, brackets);

    // SE tax (simplified)
    var seTax = 0;
    if (seIncome > 0) {
      var seBase = seIncome * 0.9235;
      var ssCap = 176100;
      var ssTax = Math.min(seBase, ssCap) * 0.124;
      var medTax = seBase * 0.029;
      seTax = ssTax + medTax;
    }

    // NIIT
    var niit = calcNIIT(agi, status);

    var totalTax = Math.max(0, incomeTax + seTax + niit - credits);

    var resultEl = document.getElementById("helpFedResult");
    animateValue(resultEl, formatCurrency(totalTax));
    return totalTax;
  }

  // CA helper calculation
  function calcCAHelper() {
    var status = els.filingStatus.value;
    var caTaxableIncome = parseNum(document.getElementById("helpCAIncome").value);
    var brackets = (status === "mfj" || status === "qss") ? caBracketsMFJ : caBracketsSingle;
    var caTax = calcBracketTax(caTaxableIncome, brackets);

    // Mental Health Services Tax: +1% on income over $1M
    var mhstThreshold = (status === "mfj" || status === "qss") ? 2000000 : 1000000;
    if (status === "mfs") mhstThreshold = 1000000;
    var mhst = Math.max(0, caTaxableIncome - mhstThreshold) * 0.01;
    caTax += mhst;

    var resultEl = document.getElementById("helpCAResult");
    animateValue(resultEl, formatCurrency(caTax));
    return caTax;
  }

  // Listen on helper inputs
  var fedHelperInputs = document.querySelectorAll("#fedHelper input");
  fedHelperInputs.forEach(function (inp) {
    inp.addEventListener("input", debounce(calcFedHelper, 150));
  });

  var caHelperInputs = document.querySelectorAll("#caHelper input");
  caHelperInputs.forEach(function (inp) {
    inp.addEventListener("input", debounce(calcCAHelper, 150));
  });

  // Also recalc helpers when filing status changes
  els.filingStatus.addEventListener("change", function () {
    calcFedHelper();
    calcCAHelper();
  });

  // Apply buttons
  var fedApplyBtn = document.getElementById("helpFedApply");
  if (fedApplyBtn) {
    fedApplyBtn.addEventListener("click", function () {
      var result = calcFedHelper();
      var rounded = Math.round(result);
      els.estTax.value = rounded > 0 ? rounded.toLocaleString("en-US") : "";
      recalculate();
      // Flash the field
      els.estTax.style.background = "rgba(212, 168, 67, 0.15)";
      setTimeout(function () {
        els.estTax.style.background = "";
      }, 800);
    });
  }

  var caApplyBtn = document.getElementById("helpCAApply");
  if (caApplyBtn) {
    caApplyBtn.addEventListener("click", function () {
      var result = calcCAHelper();
      var rounded = Math.round(result);
      els.estCATax.value = rounded > 0 ? rounded.toLocaleString("en-US") : "";
      recalculate();
      // Flash the field
      els.estCATax.style.background = "rgba(212, 168, 67, 0.15)";
      setTimeout(function () {
        els.estCATax.style.background = "";
      }, 800);
    });
  }
})();
