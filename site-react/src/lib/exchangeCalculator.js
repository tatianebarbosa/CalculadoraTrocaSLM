import { JUROS_WARNING_TEXT, PEARSON_ORDER_DISCOUNT } from "../config/appConfig";
import { clampNumber, formatMoney, formatPearsonSelection, formatVoucherInput, roundCurrency } from "./formatters";

function getAdjustmentMeta(hasDiscount, hasJuros) {
  if (hasDiscount && hasJuros) {
    return { label: "Desconto e juros", emptyText: "Sem desconto e juros" };
  }

  if (hasJuros) {
    return { label: "Juros", emptyText: "Sem juros" };
  }

  return { label: "Desconto", emptyText: "Sem desconto" };
}

// Monta os textos resumidos usados nos cards laterais.
export function buildFocusRows({
  turma,
  hasMath,
  hasScience,
  voucherMode,
  voucherValue,
  voucherApplied,
  pearsonDiscount,
  hasJuros = false,
  useRealPaidAmount = false,
  showVoucherRow = true
}) {
  const effectiveVoucherApplied = useRealPaidAmount ? 0 : voucherApplied;
  const adjustmentMeta = getAdjustmentMeta(pearsonDiscount > 0 || effectiveVoucherApplied > 0, hasJuros);
  const adjustmentValue =
    useRealPaidAmount
      ? "Valor pago real informado"
      : [
          pearsonDiscount > 0 ? `Pearson ${formatMoney(pearsonDiscount)}` : null,
          effectiveVoucherApplied > 0 ? `Voucher ${formatMoney(effectiveVoucherApplied)}` : null,
          hasJuros ? "Com juros" : null
        ]
          .filter(Boolean)
          .join(" | ") || adjustmentMeta.emptyText;

  const rows = [
    ["Turma", turma],
    ["Pearson", formatPearsonSelection(hasMath, hasScience)]
  ];

  if (showVoucherRow) {
    rows.push([
      "Voucher informado",
      useRealPaidAmount ? "Desconsiderado pelo valor pago informado" : formatVoucherInput(voucherMode, voucherValue)
    ]);
  }

  rows.push([adjustmentMeta.label, adjustmentValue]);
  return rows;
}

function getTurmaData(catalog, turma) {
  return catalog.find((item) => item.turma === turma) ?? null;
}

function hasPearsonAvailable(base, field) {
  return clampNumber(base?.[field], 0) > 0;
}

export function getPearsonAvailability(catalog, turma) {
  const base = getTurmaData(catalog, turma);

  return {
    math: hasPearsonAvailable(base, "pearsonMath"),
    science: hasPearsonAvailable(base, "pearsonScience")
  };
}

function getVoucherAmount(mode, rawValue, slmBase) {
  const safeSlm = clampNumber(slmBase, 0);
  if (!safeSlm) {
    return 0;
  }

  if (mode === "percent") {
    const percent = clampNumber(rawValue, 0, 100);
    return roundCurrency((safeSlm * percent) / 100);
  }

  return roundCurrency(clampNumber(rawValue, 0, safeSlm));
}

// Regras centrais da troca de material.
function buildBreakdown(base, options) {
  if (!base) {
    return {
      slm: 0,
      workbook: 0,
      matematica: 0,
      pearsonMath: 0,
      pearsonScience: 0,
      pearsonDiscount: 0,
      totalObrigatorio: 0,
      totalComPearsons: 0,
      voucherApplied: 0,
      slmPaid: 0,
      paidMaterials: 0
    };
  }

  const hasPearsonMath = Boolean(options.pearsonMath) && hasPearsonAvailable(base, "pearsonMath");
  const hasPearsonScience = Boolean(options.pearsonScience) && hasPearsonAvailable(base, "pearsonScience");
  const pearsonMath = hasPearsonMath ? base.pearsonMath : 0;
  const pearsonScience = hasPearsonScience ? base.pearsonScience : 0;
  const pearsonDiscountItems = (hasPearsonMath ? 1 : 0) + (hasPearsonScience ? 1 : 0);
  const pearsonDiscount = pearsonDiscountItems * PEARSON_ORDER_DISCOUNT;
  const voucherApplied = options.ignoreVoucher ? 0 : getVoucherAmount(options.voucherMode, options.voucherValue, base.slm);
  const slmPaid = roundCurrency(Math.max(base.slm - voucherApplied, 0));
  const totalObrigatorio = base.slm + base.workbook + base.matematica;
  const totalComPearsons = totalObrigatorio + base.pearsonMath + base.pearsonScience;
  const paidMaterials = roundCurrency(
    Math.max(slmPaid + base.workbook + base.matematica + pearsonMath + pearsonScience - pearsonDiscount, 0)
  );

  return {
    slm: base.slm,
    workbook: base.workbook,
    matematica: base.matematica,
    pearsonMath,
    pearsonScience,
    pearsonDiscount,
    totalObrigatorio,
    totalComPearsons,
    voucherApplied,
    slmPaid,
    paidMaterials
  };
}

function hasPrincipalVoucherUsage(calc) {
  return calc.principal.voucherApplied > 0;
}

function shouldShowVoucherExchangeGuidance(calc) {
  return calc.canExchange && hasPrincipalVoucherUsage(calc);
}

function buildPrincipalVoucherAmount(calc) {
  return formatMoney(calc.principal.voucherApplied);
}

function buildOutcomeText(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra.";
  }

  if (calc.requiresCancellationForJuros) {
    return "A troca não pode seguir. Há juros vinculados ao pedido principal.";
  }

  if (!calc.canExchange) {
    return `A troca não pode seguir. Haveria saldo remanescente de ${formatMoney(calc.leftover)} na loja.`;
  }

  if (calc.difference > 0) {
    return `A troca pode seguir, com diferença de ${formatMoney(calc.difference)} a pagar.`;
  }

  return "A troca pode seguir, sem diferença a pagar.";
}

function joinMessageBlocks(blocks) {
  return blocks.filter(Boolean).join("\n\n");
}

function buildBulletList(lines) {
  return lines.map((line) => `- ${line}`).join("\n");
}

function buildMessageValueIntro(calc, mode = "exchange") {
  const principalAmount = formatMoney(calc.principalCredit);
  const novaAmount = formatMoney(calc.nova.paidMaterials);
  const novaVerb = mode === "exchange" ? "será" : "seria";

  return `O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra ${novaVerb} para a turma ${calc.form.novaTurma}, no valor de ${novaAmount}.`;
}

function buildExchangeDifferenceSentence(calc) {
  if (calc.difference > 0) {
    return `Após a análise, identificamos uma diferença de ${formatMoney(calc.difference)}, que deverá ser paga para concluir a nova compra.`;
  }

  return "Após a análise, não identificamos diferença a pagar para concluir a nova compra.";
}

function buildExchangeCreditReleaseParagraph() {
  return "Após a confirmação da troca, o crédito ficará disponível em até 24 horas no CPF utilizado na compra principal.";
}

function buildExchangeLexHoldParagraph(audience = "generic") {
  if (audience === "guardian") {
    return "Importante: antes de a troca ser efetivada e o crédito ser liberado, não pode ser feito nenhum ajuste na LEX em nenhum perfil da família. Nesse período, o(a) aluno(a) não deve ser rematriculado(a), transferido(a) nem ter a turma alterada.";
  }

  return "Importante: antes de a troca ser efetivada e o crédito ser liberado, a escola não deve realizar nenhum ajuste na LEX em nenhum perfil da família. Nesse período, o(a) aluno(a) não deve ser rematriculado(a), transferido(a) nem ter a turma alterada.";
}

function buildExchangeLexRiskParagraph() {
  return "Se qualquer ajuste for feito na LEX antes da efetivação da troca, o processo de liberação do crédito pode ser interrompido e a troca pode não ser concluída corretamente.";
}

function buildExchangeWaitParagraph(audience = "generic") {
  if (audience === "guardian") {
    return "Por isso, é necessário aguardar a efetivação da troca e a liberação do crédito antes de solicitar qualquer ajuste de turma na LEX.";
  }

  return "Por isso, a escola deve aguardar a efetivação da troca e a liberação do crédito antes de ajustar a matrícula na turma correta na LEX.";
}

function buildExchangeActionLines(calc, audience = "generic") {
  const purchaseLine =
    shouldShowVoucherExchangeGuidance(calc)
      ? calc.difference > 0
        ? `Realizar a nova compra do material correto, utilizando o novo voucher de valor fixo que será criado por nossa equipe. Após a aplicação do voucher, será necessário efetuar o pagamento complementar de ${formatMoney(calc.difference)}.`
        : "Realizar a nova compra do material correto, utilizando o novo voucher de valor fixo que será criado por nossa equipe."
      : calc.difference > 0
        ? `Realizar a nova compra do material correto, com pagamento complementar de ${formatMoney(calc.difference)}.`
        : "Realizar a nova compra do material correto, sem valor complementar a pagar.";

  if (audience === "guardian") {
    return [
      "Aguardar a escola ajustar a matrícula na turma correta na LEX, liberando novamente o material na Maple Bear Store.",
      "Acessar a loja com o mesmo CPF utilizado na compra principal.",
      purchaseLine
    ];
  }

  return [
    "Ajustar a matrícula do(a) aluno(a) na turma correta na LEX, para que o material seja liberado novamente na Maple Bear Store.",
    "Orientar o responsável a acessar a loja com o mesmo CPF utilizado na compra principal.",
    purchaseLine
  ];
}

function buildVoucherParagraph(calc) {
  if (!shouldShowVoucherExchangeGuidance(calc)) {
    return "";
  }

  const voucherAmount = buildPrincipalVoucherAmount(calc);

  return `Como houve uso de voucher no pedido principal, o código anterior pode reaparecer no Magento em até 24 horas, mas será cancelado e não deverá ser utilizado na nova compra. Em seu lugar, nossa equipe criará um novo voucher de valor fixo, no valor de ${voucherAmount}, correspondente ao desconto aplicado na compra inicial.`;
}

function buildCancellationReasonParagraph(calc, audience = "generic") {
  if (calc.requiresCancellationForJuros) {
    if (audience === "guardian") {
      return "Identificamos juros vinculados ao pedido principal. Nesses casos, não é possível seguir com a troca.";
    }

    return "Identificamos juros vinculados ao pedido principal. Quando há juros na compra, não é possível seguir com a troca.";
  }

  return `Como essa troca geraria saldo remanescente de ${formatMoney(calc.leftover)} na loja, não é possível concluí-la dessa forma, pois esse valor não pode ficar disponível para uso posterior.`;
}

function buildCancellationDeadlineParagraph(calc, audience = "generic") {
  if (calc.requiresCancellationForJuros) {
    if (audience === "guardian") {
      return "Após a solicitação de cancelamento e reembolso, será necessário aguardar 24 horas para a conclusão do processo. Até que o cancelamento seja efetivado, não pode ser feito nenhum ajuste na LEX em nenhum perfil da família, pois isso pode impedir a continuidade do cancelamento e do reembolso.";
    }

    return "Após a solicitação de cancelamento e reembolso, é necessário aguardar 24 horas para a conclusão do processo. Até que o cancelamento seja efetivado, a escola não deve realizar nenhum ajuste na LEX em nenhum perfil da família, pois qualquer alteração pode impedir a continuidade do cancelamento e do reembolso.";
  }

  if (audience === "guardian") {
    return "Durante o cancelamento e o prazo de 24 horas, não deve ser feito nenhum ajuste na LEX em nenhum perfil da família, pois isso pode impedir a continuidade do cancelamento. Fora isso, não será necessária nenhuma outra ação do responsável.";
  }

  return "Importante: até a conclusão do cancelamento e do prazo de 24 horas, a escola não deve realizar nenhum ajuste na LEX em nenhum perfil da família. Se houver qualquer alteração antes disso, o cancelamento pode não ser concluído corretamente.";
}

function buildCancellationActionLines(calc, audience = "generic") {
  const novaAmount = formatMoney(calc.nova.paidMaterials);

  if (calc.requiresCancellationForJuros) {
    if (audience === "guardian") {
      return [
        "Entrar em contato com a escola para ajustar a matrícula na turma correta.",
        "Acessar novamente a loja.",
        `Realizar uma nova compra do material correto, no valor de ${novaAmount}.`
      ];
    }

    return [
      "Ajustar a matrícula do(a) aluno(a) na turma correta na LEX.",
      "Orientar o responsável a acessar novamente a loja.",
      `Orientar a realização de uma nova compra do material correto, no valor de ${novaAmount}.`
    ];
  }

  if (audience === "guardian") {
    return [
      "Entrar em contato com a escola para que ela ajuste a matrícula do(a) aluno(a) na turma correta na LEX.",
      `Acessar novamente a loja para realizar uma nova compra do material correto, no valor de ${novaAmount}.`
    ];
  }

  return [
    "Ajustar a matrícula do(a) aluno(a) na turma correta na LEX, para que o material volte a ficar disponível na loja.",
    "Orientar o responsável a acessar novamente a loja.",
    `Orientar a realização de uma nova compra do material correto, no valor de ${novaAmount}.`
  ];
}

function buildCancellationActionIntro(calc, audience = "generic") {
  if (calc.requiresCancellationForJuros) {
    return audience === "guardian" ? "Depois desse prazo, será necessário:" : "Depois desse prazo, a escola deverá:";
  }

  return audience === "guardian"
    ? "Depois desse prazo, será necessário:"
    : "Após a conclusão do cancelamento e do prazo de 24 horas, a escola deverá:";
}

function buildCancellationClosingParagraph(calc, audience = "generic") {
  if (calc.requiresCancellationForJuros) {
    if (audience === "guardian") {
      return "Após o ajuste na LEX, o material será liberado novamente na loja e a nova compra poderá ser realizada normalmente.";
    }

    return "Após o ajuste na LEX, o material será liberado novamente na loja e a nova compra poderá ser feita pelo responsável financeiro ou pelo responsável acadêmico.";
  }

  if (audience === "guardian") {
    return "Após o ajuste da matrícula na LEX, o material será liberado novamente na loja e a nova compra poderá ser realizada normalmente.";
  }

  return "Após o ajuste da matrícula na LEX, o material será liberado novamente na loja e a nova compra poderá ser feita pelo responsável financeiro ou pelo responsável acadêmico.";
}

function buildQuickOutcome(calc) {
  return buildOutcomeText(calc);
}

export function buildJurosWarning(calc) {
  if (!calc.hasJuros) {
    return null;
  }

  return JUROS_WARNING_TEXT;
}

export function buildVoucherReactivationWarning(calc) {
  if (!shouldShowVoucherExchangeGuidance(calc)) {
    return null;
  }

  return `Houve uso de voucher no pedido principal. O código anterior pode reaparecer no Magento em até 24 horas, mas não deve ser reutilizado. A nova compra deve usar somente o novo voucher fixo de ${buildPrincipalVoucherAmount(calc)}.`;
}

export function buildFinancialAction(calc) {
  if (!calc.ready) {
    return "Complete a simulação";
  }

  if (calc.requiresCancellationForJuros || !calc.canExchange) {
    return "Cancelar pedido principal e seguir com o reembolso";
  }

  if (calc.difference > 0) {
    return `Pagar ${formatMoney(calc.difference)}`;
  }

  return "Troca no mesmo valor";
}

export function buildNextStep(calc) {
  if (!calc.ready) {
    return "Preencher os dados";
  }

  if (calc.requiresCancellationForJuros || !calc.canExchange) {
    return "Aguardar 24h e ajustar a matrícula no LEX";
  }

  return "Aguardar 24h e ajustar a matrícula na LEX";
}

function buildRuleUsed(calc) {
  if (!calc.ready) {
    return "Selecione o pedido principal e a nova compra para visualizar a regra aplicada.";
  }

  const hasPearsonRule = calc.principal.pearsonDiscount > 0 || calc.nova.pearsonDiscount > 0;
  const hasVoucherRule = calc.principal.voucherApplied > 0 || calc.nova.voucherApplied > 0;
  const ruleParts = ["Crédito da troca = valor pago no pedido principal."];

  if (calc.principalCreditIsManual) {
    ruleParts.push(`Neste caso, foi utilizado o valor informado de ${formatMoney(calc.principalCredit)}.`);
  }

  if (hasPearsonRule) {
    ruleParts.push(`Pearson aplica desconto fixo de ${formatMoney(PEARSON_ORDER_DISCOUNT)} por item selecionado.`);
  }

  if (hasVoucherRule) {
    ruleParts.push("O voucher abate somente o SLM base.");
  }

  if (shouldShowVoucherExchangeGuidance(calc)) {
    ruleParts.push("Se a troca seguir, o voucher anterior pode reaparecer no Magento, mas deverá ser cancelado e substituído por um voucher fixo.");
  }

  if (calc.hasJuros) {
    ruleParts.push("Com juros no pedido principal, a troca não deve seguir.");
  } else if (!calc.canExchange) {
    ruleParts.push("Se sobrar valor na loja, a troca não pode seguir.");
  } else if (calc.difference > 0) {
    ruleParts.push("Se faltar valor, a diferença pode ser paga na nova compra.");
  } else {
    ruleParts.push("Sem saldo remanescente na loja, a troca pode seguir.");
  }

  return ruleParts.join(" ");
}

function buildReason(calc) {
  if (!calc.ready) {
    return "Selecione a turma do pedido principal e a turma da nova compra para iniciar a análise.";
  }

  if (calc.requiresCancellationForJuros) {
    return "Há juros vinculados ao pedido principal. Por regra da operação, a troca não deve seguir.";
  }

  if (!calc.canExchange) {
    return `Haveria saldo remanescente de ${formatMoney(calc.leftover)} na loja.`;
  }

  if (calc.difference > 0) {
    return `A nova compra é maior que o crédito disponível em ${formatMoney(calc.difference)}.`;
  }

  return "O crédito do pedido principal cobre a nova compra sem gerar saldo remanescente.";
}

function buildSimpleSummary(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar o resumo.";
  }

  if (calc.requiresCancellationForJuros) {
    return "A troca não pode seguir porque há juros vinculados ao pedido principal. Nesses casos, é necessário cancelar o pedido, concluir o reembolso e aguardar mais 24 horas, sem fazer ajustes na LEX em nenhum perfil da família antes da efetivação do cancelamento.";
  }

  if (!calc.canExchange) {
    return `A troca não pode seguir porque haveria saldo remanescente de ${formatMoney(calc.leftover)} na loja. Será necessário cancelar o pedido principal e seguir com a nova compra somente depois do reembolso e do prazo de 24 horas, sem alterar a LEX em nenhum perfil da família antes da efetivação do cancelamento.`;
  }

  if (calc.difference > 0) {
    return `A troca pode seguir. Pedido principal: ${formatMoney(calc.principalCredit)}. Nova compra: ${formatMoney(calc.nova.paidMaterials)}. Diferença a pagar: ${formatMoney(calc.difference)}. Aguarde até 24 horas para a liberação do crédito, sem fazer ajustes na LEX em nenhum perfil da família antes da efetivação da troca.`;
  }

  return `A troca pode seguir. Pedido principal: ${formatMoney(calc.principalCredit)}. Nova compra: ${formatMoney(calc.nova.paidMaterials)}. Não há diferença a pagar. Aguarde até 24 horas para a liberação do crédito, sem fazer ajustes na LEX em nenhum perfil da família antes da efetivação da troca.`;
}

function buildSchoolMessage(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar a mensagem.";
  }

  if (calc.requiresCancellationForJuros) {
    return joinMessageBlocks([
      `A troca não poderá seguir neste caso. ${buildMessageValueIntro(calc, "cancellation")}`,
      buildCancellationReasonParagraph(calc, "school"),
      "Por esse motivo, será necessário cancelar o pedido principal e seguir com o respectivo reembolso.",
      buildCancellationDeadlineParagraph(calc, "school"),
      `${buildCancellationActionIntro(calc, "school")}\n${buildBulletList(buildCancellationActionLines(calc, "school"))}`,
      buildCancellationClosingParagraph(calc, "school")
    ]);
  }

  if (!calc.canExchange) {
    return joinMessageBlocks([
      `A troca não poderá seguir neste caso. ${buildMessageValueIntro(calc, "cancellation")}`,
      buildCancellationReasonParagraph(calc, "school"),
      "Por esse motivo, será necessário seguir com o cancelamento do pedido principal e com o respectivo reembolso.",
      buildCancellationDeadlineParagraph(calc, "school"),
      `${buildCancellationActionIntro(calc, "school")}\n${buildBulletList(buildCancellationActionLines(calc, "school"))}`,
      buildCancellationClosingParagraph(calc, "school")
    ]);
  }

  return joinMessageBlocks([
    `A troca pode seguir neste caso. ${buildMessageValueIntro(calc)} ${buildExchangeDifferenceSentence(calc)}`,
    buildExchangeCreditReleaseParagraph(),
    buildExchangeLexHoldParagraph("school"),
    buildExchangeLexRiskParagraph(),
    buildExchangeWaitParagraph("school"),
    `Depois das 24 horas, a escola deverá:\n${buildBulletList(buildExchangeActionLines(calc, "school"))}`,
    buildVoucherParagraph(calc)
  ]);
}

function buildGuardianMessage(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar a mensagem.";
  }

  if (calc.requiresCancellationForJuros) {
    return joinMessageBlocks([
      `A troca não poderá seguir neste caso. ${buildMessageValueIntro(calc, "cancellation")}`,
      buildCancellationReasonParagraph(calc, "guardian"),
      "Por esse motivo, será necessário cancelar o pedido e seguir com o respectivo reembolso.",
      buildCancellationDeadlineParagraph(calc, "guardian"),
      `${buildCancellationActionIntro(calc, "guardian")}\n${buildBulletList(buildCancellationActionLines(calc, "guardian"))}`,
      buildCancellationClosingParagraph(calc, "guardian")
    ]);
  }

  if (!calc.canExchange) {
    return joinMessageBlocks([
      `A troca não poderá seguir neste caso. ${buildMessageValueIntro(calc, "cancellation")}`,
      buildCancellationReasonParagraph(calc, "guardian"),
      "Por esse motivo, será necessário seguir com o cancelamento do pedido principal e com o respectivo reembolso.",
      buildCancellationDeadlineParagraph(calc, "guardian"),
      `${buildCancellationActionIntro(calc, "guardian")}\n${buildBulletList(buildCancellationActionLines(calc, "guardian"))}`,
      buildCancellationClosingParagraph(calc, "guardian")
    ]);
  }

  return joinMessageBlocks([
    `A troca pode seguir neste caso. ${buildMessageValueIntro(calc)} ${buildExchangeDifferenceSentence(calc)}`,
    buildExchangeCreditReleaseParagraph(),
    buildExchangeLexHoldParagraph("guardian"),
    buildExchangeLexRiskParagraph(),
    buildExchangeWaitParagraph("guardian"),
    `Depois das 24 horas, será necessário:\n${buildBulletList(buildExchangeActionLines(calc, "guardian"))}`,
    buildVoucherParagraph(calc)
  ]);
}

export function calculateExchange(form, catalog) {
  const principalBase = getTurmaData(catalog, form.principalTurma);
  const novaBase = getTurmaData(catalog, form.novaTurma);
  const ready = Boolean(principalBase && novaBase);
  const valorPagoRealNormalizado = roundCurrency(clampNumber(form.principalPaidAmount, 0));
  const valorPagoReal = valorPagoRealNormalizado > 0 ? valorPagoRealNormalizado : null;

  const principal = buildBreakdown(principalBase, {
    pearsonMath: form.principalPearsonMath,
    pearsonScience: form.principalPearsonScience,
    voucherMode: form.principalVoucherMode,
    voucherValue: form.principalVoucherValue,
    ignoreVoucher: valorPagoReal !== null
  });

  const nova = buildBreakdown(novaBase, {
    pearsonMath: form.novaPearsonMath,
    pearsonScience: form.novaPearsonScience,
    voucherMode: form.novaVoucherMode,
    voucherValue: form.novaVoucherValue
  });

  const valorCalculadoPedido = principal.paidMaterials;
  const credito = valorPagoReal ?? valorCalculadoPedido;
  const principalCreditMeta = {
    value: credito,
    isManual: valorPagoReal !== null
  };
  const hasJuros = Boolean(form.principalHasJuros ?? (clampNumber(form.jurosValor, 0) > 0));
  const jurosCredit = 0;
  const totalAvailable = roundCurrency(credito);
  const difference = roundCurrency(Math.max(nova.paidMaterials - totalAvailable, 0));
  const leftover = roundCurrency(Math.max(totalAvailable - nova.paidMaterials, 0));
  const leftoverJurosPart = 0;
  const requiresCancellationForJuros = ready && hasJuros;
  const canExchange = ready && leftover <= 0 && !requiresCancellationForJuros;

  const baseCalc = {
    ready,
    canExchange,
    requiresCancellationForJuros,
    principal,
    principalCredit: principalCreditMeta.value,
    principalCreditIsManual: principalCreditMeta.isManual,
    nova,
    hasJuros,
    jurosCredit,
    totalAvailable,
    difference,
    leftover,
    leftoverJurosPart,
    form
  };

  return {
    ...baseCalc,
    reason: buildReason(baseCalc),
    quickSummary: buildQuickOutcome(baseCalc),
    ruleUsed: buildRuleUsed(baseCalc),
    voucherReactivationWarning: buildVoucherReactivationWarning(baseCalc),
    simpleSummary: buildSimpleSummary(baseCalc),
    schoolMessage: buildSchoolMessage(baseCalc),
    guardianMessage: buildGuardianMessage(baseCalc)
  };
}
