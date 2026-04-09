(function () {
  // Base local da versao estatica.
  const catalog = [
    { turma: "Early Toddler (Bear Care)", slm: 2999, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Toddler", slm: 2999, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Nursery", slm: 3222, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Junior Kindergarten", slm: 3828, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Senior Kindergarten", slm: 3828, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Year 1", slm: 4065, workbook: 147, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Year 2", slm: 4065, workbook: 126, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Year 3", slm: 4065, workbook: 81, matematica: 0, pearsonMath: 366, pearsonScience: 0 },
    { turma: "Year 4", slm: 4065, workbook: 66, matematica: 0, pearsonMath: 366, pearsonScience: 283 },
    { turma: "Year 5", slm: 4065, workbook: 66, matematica: 0, pearsonMath: 366, pearsonScience: 283 },
    { turma: "Year 6", slm: 4182, workbook: 66, matematica: 165, pearsonMath: 366, pearsonScience: 319 },
    { turma: "Year 7", slm: 4182, workbook: 66, matematica: 165, pearsonMath: 486, pearsonScience: 314 },
    { turma: "Year 8", slm: 4182, workbook: 66, matematica: 165, pearsonMath: 486, pearsonScience: 314 },
    { turma: "Year 9", slm: 4182, workbook: 66, matematica: 165, pearsonMath: 413, pearsonScience: 314 },
    { turma: "Year 10", slm: 4485, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Year 11", slm: 4485, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 },
    { turma: "Year 12", slm: 4485, workbook: 0, matematica: 0, pearsonMath: 0, pearsonScience: 0 }
  ];

  const money = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });

  const PEARSON_ORDER_DISCOUNT = 44;
  const COPY_FEEDBACK_MS = 1600;

  // Elementos de entrada do formulario.
  const formEls = {
    principalTurma: document.getElementById("principalTurma"),
    principalVoucher: document.getElementById("principalVoucher"),
    novaTurma: document.getElementById("novaTurma"),
    novaVoucher: document.getElementById("novaVoucher")
  };

  const toggles = {
    principalPearsonMath: "Nao",
    principalPearsonScience: "Nao",
    principalHasJuros: "Nao",
    novaPearsonMath: "Nao",
    novaPearsonScience: "Nao"
  };

  const ui = {
    principalDetailRows: document.getElementById("principalDetailRows"),
    novaDetailRows: document.getElementById("novaDetailRows"),
    financialRows: document.getElementById("financialRows"),
    simpleSummary: document.getElementById("simpleSummary"),
    schoolMessage: document.getElementById("schoolMessage"),
    guardianMessage: document.getElementById("guardianMessage"),
    cardValorPago: document.getElementById("cardValorPago"),
    cardNovoPedido: document.getElementById("cardNovoPedido"),
    cardSaldoDisponivel: document.getElementById("cardSaldoDisponivel"),
    cardDiferenca: document.getElementById("cardDiferenca"),
    statusBanner: document.getElementById("statusBanner"),
    voucherNotice: document.getElementById("voucherNotice"),
    novaTurmaPreview: document.getElementById("novaTurmaPreview"),
    novaValorPreview: document.getElementById("novaValorPreview"),
    copyEscolaButton: document.getElementById("copyEscolaButton"),
    copyResponsavelButton: document.getElementById("copyResponsavelButton"),
    logoUpload: document.getElementById("logoUpload"),
    logoSlot: document.getElementById("logoSlot")
  };

  // Helpers de formato e leitura do formulario.
  function formatMoney(value) {
    return money.format(Number.isFinite(value) ? value : 0);
  }

  function getTurmaData(turma) {
    return catalog.find((item) => item.turma === turma) || catalog[0];
  }

  function clampCurrency(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function getVoucherAmount(rawValue, slmBase) {
    return Math.min(clampCurrency(rawValue), slmBase);
  }

  function hasPearsonAvailable(base, field) {
    return Number(base?.[field]) > 0;
  }

  function getPearsonAvailabilityByTarget(targetName) {
    const turma =
      targetName.indexOf("principal") === 0 ? formEls.principalTurma.value : formEls.novaTurma.value;
    const base = getTurmaData(turma);

    return {
      math: hasPearsonAvailable(base, "pearsonMath"),
      science: hasPearsonAvailable(base, "pearsonScience")
    };
  }

  function canSelectPearson(targetName, value) {
    if (value !== "Sim") {
      return true;
    }

    const availability = getPearsonAvailabilityByTarget(targetName);

    if (targetName.endsWith("PearsonMath")) {
      return availability.math;
    }

    if (targetName.endsWith("PearsonScience")) {
      return availability.science;
    }

    return true;
  }

  function syncUnavailablePearsons() {
    Object.keys(toggles).forEach((targetName) => {
      if (toggles[targetName] === "Sim" && !canSelectPearson(targetName, "Sim")) {
        toggles[targetName] = "Nao";
      }
    });
  }

  function buildSegmented(targetName) {
    const wrapper = document.querySelector(`[data-target="${targetName}"]`);
    ["Sim", "Nao"].forEach((value) => {
      const button = document.createElement("button");
      const isDisabled = !canSelectPearson(targetName, value);
      button.type = "button";
      button.textContent = value === "Nao" ? "Não" : value;
      button.className = `${value === toggles[targetName] ? "is-active" : ""}${isDisabled ? " is-disabled" : ""}`.trim();
      button.disabled = isDisabled;
      if (isDisabled) {
        button.title = "Indisponível para esta turma";
      }
      button.addEventListener("click", () => {
        if (isDisabled) {
          return;
        }
        toggles[targetName] = value;
        buildAllSegmented();
        render();
      });
      wrapper.appendChild(button);
    });
  }

  function buildAllSegmented() {
    syncUnavailablePearsons();
    document.querySelectorAll(".segmented").forEach((node) => {
      node.innerHTML = "";
      buildSegmented(node.dataset.target);
    });
  }

  function fillTurmaSelect(select) {
    select.innerHTML = "";
    catalog.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.turma;
      option.textContent = item.turma;
      select.appendChild(option);
    });
  }

  function selectedState() {
    return {
      principalTurma: formEls.principalTurma.value,
      principalVoucher: clampCurrency(formEls.principalVoucher.value),
      principalPearsonMath: toggles.principalPearsonMath === "Sim",
      principalPearsonScience: toggles.principalPearsonScience === "Sim",
      principalHasJuros: toggles.principalHasJuros === "Sim",
      novaTurma: formEls.novaTurma.value,
      novaVoucher: clampCurrency(formEls.novaVoucher.value),
      novaPearsonMath: toggles.novaPearsonMath === "Sim",
      novaPearsonScience: toggles.novaPearsonScience === "Sim"
    };
  }

  // Regra de negocio da troca.
  function calculateBreakdown(base, options) {
    const hasPearsonMath = Boolean(options.pearsonMath) && hasPearsonAvailable(base, "pearsonMath");
    const hasPearsonScience = Boolean(options.pearsonScience) && hasPearsonAvailable(base, "pearsonScience");
    const pearsonMath = hasPearsonMath ? base.pearsonMath : 0;
    const pearsonScience = hasPearsonScience ? base.pearsonScience : 0;
    const pearsonDiscountItems = (hasPearsonMath ? 1 : 0) + (hasPearsonScience ? 1 : 0);
    const pearsonDiscount = pearsonDiscountItems * PEARSON_ORDER_DISCOUNT;
    const voucherApplied = getVoucherAmount(options.voucher, base.slm);
    const slmPaid = Math.max(base.slm - voucherApplied, 0);
    const considered = base.slm + base.workbook + base.matematica + pearsonMath + pearsonScience;
    const paidMaterials = Math.max(slmPaid + base.workbook + base.matematica + pearsonMath + pearsonScience - pearsonDiscount, 0);

    return {
      slm: base.slm,
      workbook: base.workbook,
      matematica: base.matematica,
      pearsonMath,
      pearsonScience,
      pearsonDiscount,
      voucherApplied,
      slmPaid,
      considered,
      paidMaterials
    };
  }

  function calculateState() {
    const state = selectedState();
    const principalBase = getTurmaData(state.principalTurma);
    const novaBase = getTurmaData(state.novaTurma);

    const principal = calculateBreakdown(principalBase, {
      pearsonMath: state.principalPearsonMath,
      pearsonScience: state.principalPearsonScience,
      voucher: state.principalVoucher
    });

    const nova = calculateBreakdown(novaBase, {
      pearsonMath: state.novaPearsonMath,
      pearsonScience: state.novaPearsonScience,
      voucher: state.novaVoucher
    });

    const hasJuros = state.principalHasJuros;
    const creditoTotal = principal.paidMaterials;
    const diferenca = Math.max(nova.paidMaterials - creditoTotal, 0);
    const saldo = Math.max(creditoTotal - nova.paidMaterials, 0);
    const podeTrocar = !hasJuros && saldo <= 0;

    return {
      state,
      principal,
      nova,
      hasJuros,
      creditoTotal,
      diferenca,
      saldo,
      podeTrocar
    };
  }

  // Blocos renderizados na tela.
  function principalRows(calc) {
    return [
      ["SLM base", calc.principal.slm],
      ["Voucher aplicado no SLM", -calc.principal.voucherApplied],
      ["SLM líquido", calc.principal.slmPaid],
      ["Workbook obrigatório", calc.principal.workbook],
      ["Matemática Aplicada", calc.principal.matematica],
      ["Pearson Math", calc.principal.pearsonMath],
      ["Pearson Science", calc.principal.pearsonScience],
      ["Desconto Pearson", -calc.principal.pearsonDiscount],
      ["Valor considerado no pedido principal", calc.principal.considered],
      ["Valor pago dos materiais", calc.principal.paidMaterials],
      ["Juros aplicados", calc.hasJuros ? "Sim" : "Não"],
      ["Crédito total disponível na loja", calc.creditoTotal]
    ];
  }

  function novaRows(calc) {
    return [
      ["SLM base", calc.nova.slm],
      ["Voucher aplicado no SLM", -calc.nova.voucherApplied],
      ["SLM líquido", calc.nova.slmPaid],
      ["Workbook obrigatório", calc.nova.workbook],
      ["Matemática Aplicada", calc.nova.matematica],
      ["Pearson Math", calc.nova.pearsonMath],
      ["Pearson Science", calc.nova.pearsonScience],
      ["Desconto Pearson", -calc.nova.pearsonDiscount],
      ["Valor considerado na nova compra", calc.nova.considered],
      ["Valor da nova compra", calc.nova.paidMaterials]
    ];
  }

  function financialRows(calc) {
    return [
      ["Juros aplicados", calc.hasJuros ? "Sim" : "Não"],
      ["Valor dos materiais que ficará disponível na loja", calc.principal.paidMaterials],
      ["Valor total que ficará disponível na loja", calc.creditoTotal],
      ["Valor da nova compra", calc.nova.paidMaterials],
      ["Diferença a pagar pelo responsável", calc.diferenca],
      ["Saldo que sobraria na loja", calc.saldo]
    ];
  }

  function buildJurosSentence(calc) {
    return calc.hasJuros
      ? " Há juros vinculados ao pedido principal e, por esse motivo, a troca não pode seguir."
      : "";
  }

  function hasVoucherReactivation(calc) {
    return !calc.podeTrocar && calc.principal.voucherApplied > 0;
  }

  function buildVoucherReactivationWarning(calc) {
    if (!hasVoucherReactivation(calc)) {
      return "";
    }

    return "Aviso: houve uso de voucher no pedido principal. Após o cancelamento, esse voucher pode reaparecer em até 24 horas, mas não deve ser reutilizado na nova compra.";
  }

  function buildVoucherReactivationSentence(calc) {
    if (!hasVoucherReactivation(calc)) {
      return "";
    }

    return " Como houve uso de voucher no pedido principal, ele pode reaparecer em até 24 horas após o cancelamento, mas não deve ser reutilizado na nova compra.";
  }

  function appendVoucherReactivationSentence(text, calc) {
    return `${text}${buildVoucherReactivationSentence(calc)}`;
  }

  function renderTableRows(target, rows) {
    target.innerHTML = rows
      .map(([label, value]) => {
        const renderedValue = typeof value === "number" ? formatMoney(value) : value;
        return `<tr><td>${label}</td><td>${renderedValue}</td></tr>`;
      })
      .join("");
  }

  // Mensagens prontas para copiar.
  function buildSimpleSummary(calc) {
    if (calc.hasJuros) {
      return `A troca não pode seguir. Pedido principal: ${calc.state.principalTurma}. Nova compra: ${calc.state.novaTurma}. Como há juros vinculados ao pedido principal, será necessário cancelar o pedido, concluir o reembolso e aguardar 24 horas antes de ajustar a LEX.`;
    }

    if (calc.podeTrocar) {
      const diffText =
        calc.diferenca > 0
          ? `O responsável deverá pagar a diferença de ${formatMoney(calc.diferenca)}.`
          : "Não haverá diferença a pagar.";
      return `A troca pode seguir. Pedido principal: ${calc.state.principalTurma}. Nova compra: ${calc.state.novaTurma}. ${diffText} Após a confirmação da troca, aguarde 24 horas e depois ajuste a matrícula na LEX para liberar o valor na loja.`;
    }

    return `A troca não pode seguir. Pedido principal: ${calc.state.principalTurma}. Nova compra: ${calc.state.novaTurma}. Como haveria saldo remanescente de ${formatMoney(calc.saldo)} na loja, será necessário cancelar o pedido principal e refazer a matrícula correta na LEX após 24 horas.`;
  }

  function buildSchoolMessage(calc) {
    const principalAmount = formatMoney(calc.principal.paidMaterials);
    const jurosSentence = buildJurosSentence(calc);

    if (calc.hasJuros) {
      return `A troca não poderá seguir neste caso. O pedido principal foi realizado para a turma ${calc.state.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.state.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Por esse motivo, será necessário cancelar o pedido principal, seguir com o reembolso e aguardar 24 horas. Depois desse prazo, a escola deverá ajustar a matrícula do(a) aluno(a) na turma correta na LEX e orientar uma nova compra do material correto.`;
    }

    if (calc.podeTrocar) {
      const paymentSentence =
        calc.diferenca > 0
          ? `Como o valor disponível na loja é menor que o valor da nova compra, será necessário que o responsável realize o pagamento da diferença de ${formatMoney(calc.diferenca)} para concluir a compra do material correto.`
          : "Como o valor disponível na loja é suficiente para a nova compra, não haverá diferença a pagar pelo responsável.";

      return `A troca pode seguir neste caso. O pedido principal foi realizado para a turma ${calc.state.principalTurma}, no valor de ${principalAmount}, e a nova compra será para a turma ${calc.state.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após a análise da composição do pedido principal, da nova compra e do valor efetivamente pago, identificamos que é possível seguir com a troca neste cenário. ${paymentSentence} Após a confirmação da troca, será necessário aguardar 24 horas e, depois desse prazo, a escola deverá realizar o ajuste da matrícula do(a) aluno(a) na turma correta na LEX. Somente após esse ajuste o valor ficará disponível na loja para a nova compra. Antes desse prazo, não deve ser feita nenhuma alteração na LEX. No momento da compra, orientem o responsável a verificar se o valor foi abatido corretamente antes de finalizar o pedido.`;
    }

    return `A troca não poderá seguir neste caso. O pedido principal foi realizado para a turma ${calc.state.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.state.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após a análise da composição do pedido principal, da nova compra e do valor efetivamente pago, identificamos que a nova operação geraria saldo remanescente na loja. Como haveria ${formatMoney(calc.saldo)} de saldo remanescente na loja, esse valor não pode ficar disponível para uso posterior. Por esse motivo, será necessário seguir com o cancelamento do pedido principal. Após esse cancelamento, será necessário aguardar 24 horas. Depois desse prazo, a escola deverá realizar a matrícula do(a) aluno(a) na turma correta na LEX e, somente após esse ajuste, o material correto ficará disponível na loja para uma nova compra. Neste caso, o responsável deverá realizar a compra integral do novo material, conforme o valor do novo pedido.`;
  }

  function buildGuardianMessage(calc) {
    const principalAmount = formatMoney(calc.principal.paidMaterials);
    const jurosSentence = buildJurosSentence(calc);

    if (calc.hasJuros) {
      return `A troca não poderá seguir neste caso. O pedido principal foi realizado para a turma ${calc.state.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.state.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Por esse motivo, será necessário cancelar o pedido, seguir com o reembolso e aguardar 24 horas. Depois desse prazo, entre em contato com a escola para que ela ajuste a matrícula na turma correta na LEX e, somente após esse ajuste, realize a nova compra do material correto.`;
    }

    if (calc.podeTrocar) {
      const paymentSentence =
        calc.diferenca > 0
          ? `Como o valor disponível na loja é menor que o valor da nova compra, será necessário realizar o pagamento da diferença de ${formatMoney(calc.diferenca)}.`
          : "Como o valor disponível na loja é suficiente para a nova compra, não haverá diferença a pagar.";

      return `A troca pode seguir neste caso. O pedido principal foi realizado para a turma ${calc.state.principalTurma}, no valor de ${principalAmount}, e a nova compra será para a turma ${calc.state.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após a análise da composição do pedido principal, da nova compra e do valor efetivamente pago, identificamos que é possível seguir com a troca neste cenário. ${paymentSentence} Após a confirmação da troca, será necessário aguardar 24 horas e, depois desse prazo, avisar a escola para que ela realize o ajuste da matrícula na turma correta na LEX. Somente após esse ajuste o valor ficará disponível na loja para a nova compra. Antes de finalizar o pedido, orientamos que seja verificado se o valor foi abatido corretamente.`;
    }

    return `A troca não poderá seguir neste caso. O pedido principal foi realizado para a turma ${calc.state.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.state.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após a análise da composição do pedido principal, da nova compra e do valor efetivamente pago, identificamos que a nova operação geraria saldo remanescente na loja. Como haveria ${formatMoney(calc.saldo)} de saldo remanescente na loja, esse valor não pode ficar disponível para uso posterior. Por esse motivo, será necessário seguir com o cancelamento do pedido principal. Após esse cancelamento, será necessário aguardar 24 horas. Depois desse prazo, pedimos que entre em contato com a escola para que ela realize a matrícula na turma correta na LEX e, somente após esse ajuste, o material correto ficará disponível na loja para uma nova compra. Neste caso, será necessário realizar a compra integral do novo material, conforme o valor do novo pedido.`;
  }

  function updateCards(calc) {
    ui.cardValorPago.textContent = formatMoney(calc.principal.paidMaterials);
    ui.cardNovoPedido.textContent = formatMoney(calc.nova.paidMaterials);
    ui.cardSaldoDisponivel.textContent = formatMoney(calc.creditoTotal);
    ui.cardDiferenca.textContent = formatMoney(calc.diferenca);
    ui.novaTurmaPreview.textContent = calc.state.novaTurma;
    ui.novaValorPreview.textContent = formatMoney(calc.nova.paidMaterials);
    ui.statusBanner.textContent = calc.podeTrocar ? "PODE TROCAR" : "NÃO PODE TROCAR";
    ui.statusBanner.classList.toggle("is-blocked", !calc.podeTrocar);
    ui.voucherNotice.textContent = buildVoucherReactivationWarning(calc);
    ui.voucherNotice.hidden = !ui.voucherNotice.textContent;
  }

  // Atualizacao visual e eventos.
  function render() {
    const calc = calculateState();
    renderTableRows(ui.principalDetailRows, principalRows(calc));
    renderTableRows(ui.novaDetailRows, novaRows(calc));
    renderTableRows(ui.financialRows, financialRows(calc));
    ui.simpleSummary.textContent = appendVoucherReactivationSentence(buildSimpleSummary(calc), calc);
    ui.schoolMessage.textContent = appendVoucherReactivationSentence(buildSchoolMessage(calc), calc);
    ui.guardianMessage.textContent = appendVoucherReactivationSentence(buildGuardianMessage(calc), calc);
    updateCards(calc);
  }

  function flashCopied(button) {
    const previous = button.textContent;
    button.classList.add("is-copied");
    button.textContent = "Texto copiado";
    setTimeout(() => {
      button.classList.remove("is-copied");
      button.textContent = previous;
    }, COPY_FEEDBACK_MS);
  }

  function bindInputs() {
    Object.values(formEls).forEach((input) => {
      const rerender = () => {
        buildAllSegmented();
        render();
      };

      input.addEventListener("input", rerender);
      input.addEventListener("change", rerender);
    });

    document.querySelectorAll("[data-scroll]").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById(button.dataset.scroll)?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });

    ui.copyEscolaButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(ui.schoolMessage.textContent);
      flashCopied(ui.copyEscolaButton);
    });

    ui.copyResponsavelButton.addEventListener("click", async () => {
      await navigator.clipboard.writeText(ui.guardianMessage.textContent);
      flashCopied(ui.copyResponsavelButton);
    });

    ui.logoUpload.addEventListener("change", () => {
      const [file] = ui.logoUpload.files || [];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        ui.logoSlot.style.backgroundImage = `linear-gradient(rgba(255, 250, 243, 0.12), rgba(255, 250, 243, 0.12)), url("${reader.result}")`;
        ui.logoSlot.classList.add("has-image");
      };
      reader.readAsDataURL(file);
    });
  }

  function init() {
    fillTurmaSelect(formEls.principalTurma);
    fillTurmaSelect(formEls.novaTurma);
    formEls.principalTurma.value = "Year 3";
    formEls.novaTurma.value = "Senior Kindergarten";

    buildAllSegmented();
    bindInputs();
    render();
  }

  init();
})();

