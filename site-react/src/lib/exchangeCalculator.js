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

function formatFocusPearsonSummary({ hasMath, hasScience, pearsonMathValue = 0, pearsonScienceValue = 0 }) {
  const parts = [];

  if (pearsonMathValue > 0) {
    parts.push(`Math ${formatMoney(pearsonMathValue)}`);
  }

  if (pearsonScienceValue > 0) {
    parts.push(`Science ${formatMoney(pearsonScienceValue)}`);
  }

  return parts.length ? parts.join(" | ") : formatPearsonSelection(hasMath, hasScience);
}

// Monta os textos resumidos usados nos cards laterais.
export function buildFocusRows({
  turma,
  hasMath,
  hasScience,
  pearsonMathValue = 0,
  pearsonScienceValue = 0,
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
    [
      "Pearson",
      formatFocusPearsonSummary({
        hasMath,
        hasScience,
        pearsonMathValue,
        pearsonScienceValue
      })
    ]
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
    return "Durante o cancelamento e o prazo de 24 horas, não deve ser feito nenhum ajuste na LEX em nenhum perfil da família, pois isso pode impedir a continuidade do cancelamento. Fora isso, não será necessária nenhuma outra ação.";
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

function buildAddedPearsonLabel({ currentMath, currentScience, nextMath, nextScience }) {
  const added = [];

  if (nextMath && !currentMath) {
    added.push("Pearson Math");
  }

  if (nextScience && !currentScience) {
    added.push("Pearson Science");
  }

  return added.join(" + ");
}

function buildPearsonSolutionSuggestion({ ready, canExchange, requiresCancellationForJuros, totalAvailable, novaBase, form }) {
  if (!ready || canExchange || requiresCancellationForJuros || !novaBase) {
    return null;
  }

  const currentMath = Boolean(form.novaPearsonMath);
  const currentScience = Boolean(form.novaPearsonScience);
  const canAddMath = hasPearsonAvailable(novaBase, "pearsonMath") && !currentMath;
  const canAddScience = hasPearsonAvailable(novaBase, "pearsonScience") && !currentScience;

  if (!canAddMath && !canAddScience) {
    return null;
  }

  const candidates = [];
  const seen = new Set();

  function pushCandidate(nextMath, nextScience) {
    const key = `${nextMath}-${nextScience}`;

    if (seen.has(key) || (nextMath === currentMath && nextScience === currentScience)) {
      return;
    }

    seen.add(key);

    const breakdown = buildBreakdown(novaBase, {
      pearsonMath: nextMath,
      pearsonScience: nextScience,
      voucherMode: form.novaVoucherMode,
      voucherValue: form.novaVoucherValue
    });
    const difference = roundCurrency(Math.max(breakdown.paidMaterials - totalAvailable, 0));
    const leftover = roundCurrency(Math.max(totalAvailable - breakdown.paidMaterials, 0));

    if (leftover > 0) {
      return;
    }

    const addedItemsLabel = buildAddedPearsonLabel({ currentMath, currentScience, nextMath, nextScience });
    const addedMath = nextMath && !currentMath;
    const addedScience = nextScience && !currentScience;
    const addedCount = (addedMath ? 1 : 0) + (addedScience ? 1 : 0);

    candidates.push({
      addedItemsLabel,
      addedMath,
      addedScience,
      addedCount,
      nextMath,
      nextScience,
      difference,
      paidMaterials: breakdown.paidMaterials
    });
  }

  if (canAddMath) {
    pushCandidate(true, currentScience);
  }

  if (canAddScience) {
    pushCandidate(currentMath, true);
  }

  if (canAddMath && canAddScience) {
    pushCandidate(true, true);
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => a.difference - b.difference || a.addedCount - b.addedCount || a.paidMaterials - b.paidMaterials);
  return candidates[0];
}

function buildAcceptedSolutionRequirement({ novaBase, form, totalAvailable }) {
  if (!novaBase) {
    return null;
  }

  const requiredMath =
    Boolean(form.acceptedSolutionPearsonMath) && Boolean(form.novaPearsonMath) && hasPearsonAvailable(novaBase, "pearsonMath");
  const requiredScience =
    Boolean(form.acceptedSolutionPearsonScience) &&
    Boolean(form.novaPearsonScience) &&
    hasPearsonAvailable(novaBase, "pearsonScience");

  if (!requiredMath && !requiredScience) {
    return null;
  }

  const itemsLabel = buildAddedPearsonLabel({
    currentMath: false,
    currentScience: false,
    nextMath: requiredMath,
    nextScience: requiredScience
  });
  const originalBreakdown = buildBreakdown(novaBase, {
    pearsonMath: requiredMath ? false : form.novaPearsonMath,
    pearsonScience: requiredScience ? false : form.novaPearsonScience,
    voucherMode: form.novaVoucherMode,
    voucherValue: form.novaVoucherValue
  });
  const originalLeftover = roundCurrency(Math.max(totalAvailable - originalBreakdown.paidMaterials, 0));

  return {
    requiredMath,
    requiredScience,
    itemsLabel,
    originalLeftover,
    note: `A troca só pode seguir se a nova compra incluir obrigatoriamente ${itemsLabel}, mesmo que esse item apareça como opcional na loja.`
  };
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

function buildExchangeMessageOpening(calc) {
  const valueIntro = buildMessageValueIntro(calc);
  const differenceSentence = buildExchangeDifferenceSentence(calc);

  if (calc.acceptedSolutionRequirement) {
    return `Se a condiÃ§Ã£o operacional for aceita, a troca pode seguir neste caso. As condiÃ§Ãµes financeiras serÃ£o as seguintes: ${valueIntro} ${differenceSentence}`;
  }

  return `A troca pode seguir neste caso. ${valueIntro} ${differenceSentence}`;
}

function buildExchangeMessageOpeningResolved(calc) {
  const valueIntro = buildMessageValueIntro(calc);
  const differenceSentence = buildExchangeDifferenceSentence(calc);

  if (calc.acceptedSolutionRequirement) {
    return `Se a condi\u00e7\u00e3o operacional for aceita, a troca pode seguir neste caso. As condi\u00e7\u00f5es financeiras ser\u00e3o as seguintes: ${valueIntro} ${differenceSentence}`;
  }

  return `A troca pode seguir neste caso. ${valueIntro} ${differenceSentence}`;
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
    buildExchangeMessageOpeningResolved(calc),
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
    buildExchangeMessageOpeningResolved(calc),
    buildExchangeCreditReleaseParagraph(),
    buildExchangeLexHoldParagraph("guardian"),
    buildExchangeLexRiskParagraph(),
    buildExchangeWaitParagraph("guardian"),
    `Depois das 24 horas, será necessário:\n${buildBulletList(buildExchangeActionLines(calc, "guardian"))}`,
    buildVoucherParagraph(calc)
  ]);
}

function needsGuardianSchoolContactMessage(calc) {
  if (!calc.ready) {
    return false;
  }

  const guardianActionLines = calc.canExchange
    ? buildExchangeActionLines(calc, "guardian")
    : buildCancellationActionLines(calc, "guardian");

  return guardianActionLines.some((line) => line.toLowerCase().includes("escola"));
}

function buildGuardianSchoolContactLeadParagraph(calc) {
  return `Olá! Entrei em contato com o time SAF para tratar a troca de material. A compra foi realizada para a turma ${calc.form.principalTurma}, mas a turma correta do(a) aluno(a) é ${calc.form.novaTurma}.`;
}

function buildGuardianSchoolContactDeadlineParagraph(calc) {
  if (calc.requiresCancellationForJuros || !calc.canExchange) {
    return "Fui orientado(a) a aguardar a conclusão do cancelamento e o prazo de 24 horas. Depois disso, a escola precisa ajustar a matrícula do(a) aluno(a) na LEX para liberar novamente o crédito e o material correto para a nova compra.";
  }

  return "Fui orientado(a) a aguardar a conclusão da troca e o prazo de 24 horas. Depois disso, a escola precisa ajustar a matrícula do(a) aluno(a) na LEX para liberar novamente o crédito e o material correto para a nova compra.";
}

function buildGuardianSchoolContactLeadResolved(calc) {
  if (calc.acceptedSolutionRequirement) {
    const financialSentence =
      calc.difference > 0
        ? ` Nesse cen\u00e1rio, haver\u00e1 diferen\u00e7a de ${formatMoney(calc.difference)} a pagar na nova compra.`
        : " Nesse cen\u00e1rio, n\u00e3o haver\u00e1 diferen\u00e7a a pagar na nova compra.";

    return `Ol\u00e1! Entrei em contato com o time SAF para tratar a troca de material. A compra foi realizada para a turma ${calc.form.principalTurma}, mas a turma correta do(a) aluno(a) \u00e9 ${calc.form.novaTurma}. Para que a troca siga sem cancelamento e reembolso, a nova compra dever\u00e1 incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apare\u00e7a como opcional na loja.${financialSentence}`;
  }

  return `Ol\u00e1! Entrei em contato com o time SAF para tratar a troca de material. A compra foi realizada para a turma ${calc.form.principalTurma}, mas a turma correta do(a) aluno(a) \u00e9 ${calc.form.novaTurma}.`;
}

function buildGuardianSchoolContactMessage(calc) {
  if (!needsGuardianSchoolContactMessage(calc)) {
    return "";
  }

  return joinMessageBlocks([
    "Orientamos a enviar a seguinte mensagem à escola:",
    buildGuardianSchoolContactLeadResolved(calc),
    buildGuardianSchoolContactDeadlineParagraph(calc),
    `A escola deve:\n${buildBulletList([
      "acessar a LEX",
      "abrir a aba Cursos",
      `localizar a turma ${calc.form.novaTurma}`,
      "realizar a nova matrícula do(a) aluno(a) nessa turma"
    ])}`,
    "Após esse ajuste, o crédito e o material correto ficarão liberados na loja para a nova compra."
  ]);
}

function buildAcceptedSolutionSummary(calc) {
  if (!calc.acceptedSolutionRequirement) {
    return "";
  }

  if (calc.difference > 0) {
    return `A troca pode seguir, mas somente se a nova compra incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apareça como opcional na loja. Nesse cenário, haverá diferença de ${formatMoney(calc.difference)} a pagar.`;
  }

  return `A troca pode seguir, mas somente se a nova compra incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apareça como opcional na loja.`;
}

function buildAcceptedSolutionNotice(calc) {
  if (!calc.acceptedSolutionRequirement) {
    return "";
  }

  return `Importante: só devemos seguir com a troca se a nova compra incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apareça como opcional na loja.`;
}

function buildAcceptedSolutionNarrativeSummary(calc) {
  if (!calc.acceptedSolutionRequirement) {
    return "";
  }

  const initialIssue = `Na configuração original, a troca não poderia seguir porque haveria saldo remanescente de ${formatMoney(calc.acceptedSolutionRequirement.originalLeftover)} na loja.`;
  const solutionLead = `Para evitar seguir com cancelamento e reembolso, existe uma solução operacional: a nova compra deve incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apareça como opcional na loja.`;

  if (calc.difference > 0) {
    return `${initialIssue} ${solutionLead} Nesse cenário, a troca pode seguir com diferença de ${formatMoney(calc.difference)} a pagar.`;
  }

  return `${initialIssue} ${solutionLead} Nesse cenário, a troca pode seguir sem diferença a pagar.`;
}

function buildAcceptedSolutionContextIntro(calc) {
  if (!calc.acceptedSolutionRequirement) {
    return "";
  }

  return `Na configuração original, a troca não poderia seguir porque haveria saldo remanescente de ${formatMoney(calc.acceptedSolutionRequirement.originalLeftover)} na loja. Para evitar seguir com cancelamento e reembolso, a solução é realizar a nova compra com inclusão obrigatória de ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apareça como opcional na loja.`;
}

function buildAcceptedSolutionContextLead(calc) {
  if (!calc.acceptedSolutionRequirement) {
    return "";
  }

  return `Na configuraÃ§Ã£o original, a troca nÃ£o poderia seguir porque haveria saldo remanescente de ${formatMoney(calc.acceptedSolutionRequirement.originalLeftover)} na loja. Para evitar seguir com cancelamento e reembolso, existe uma soluÃ§Ã£o operacional: realizar a nova compra com inclusÃ£o obrigatÃ³ria de ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apareÃ§a como opcional na loja. Se essa condiÃ§Ã£o for aceita, as orientaÃ§Ãµes abaixo passam a valer para seguir com a troca.`;
}

function buildAcceptedSolutionContextLeadResolved(calc) {
  if (!calc.acceptedSolutionRequirement) {
    return "";
  }

  return `Na configura\u00e7\u00e3o original, a troca n\u00e3o poderia seguir porque haveria saldo remanescente de ${formatMoney(calc.acceptedSolutionRequirement.originalLeftover)} na loja. Para evitar seguir com cancelamento e reembolso, existe uma solu\u00e7\u00e3o operacional: realizar a nova compra com inclus\u00e3o obrigat\u00f3ria de ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apare\u00e7a como opcional na loja. Se essa condi\u00e7\u00e3o for aceita, as orienta\u00e7\u00f5es abaixo passam a valer para seguir com a troca.`;
}

function applyAcceptedSolutionMessaging(calc, outputs) {
  if (!calc.acceptedSolutionRequirement) {
    return outputs;
  }

  const acceptedSummary = buildAcceptedSolutionNarrativeSummary(calc);
  const acceptedNotice = buildAcceptedSolutionContextLeadResolved(calc);

  return {
    ...outputs,
    reason: `A troca só foi viabilizada com a inclusão obrigatória de ${calc.acceptedSolutionRequirement.itemsLabel} na nova compra.`,
    quickSummary: acceptedSummary,
    ruleUsed: `${outputs.ruleUsed} Nesta simulação, a troca só pode seguir se a nova compra incluir obrigatoriamente ${calc.acceptedSolutionRequirement.itemsLabel}, mesmo que esse item apareça como opcional na loja.`,
    simpleSummary: acceptedSummary,
    schoolMessage: `${acceptedNotice}\n\n${outputs.schoolMessage}`,
    guardianMessage: `${acceptedNotice}\n\n${outputs.guardianMessage}`,
    guardianSchoolContactMessage: outputs.guardianSchoolContactMessage
  };
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
  const solutionSuggestion = buildPearsonSolutionSuggestion({
    ready,
    canExchange,
    requiresCancellationForJuros,
    totalAvailable,
    novaBase,
    form
  });
  const acceptedSolutionRequirement = buildAcceptedSolutionRequirement({
    novaBase,
    form,
    totalAvailable
  });
  const calcWithSuggestion = {
    ...baseCalc,
    solutionSuggestion,
    acceptedSolutionRequirement
  };
  const finalOutputs = applyAcceptedSolutionMessaging(calcWithSuggestion, {
    reason: buildReason(calcWithSuggestion),
    quickSummary: buildQuickOutcome(calcWithSuggestion),
    ruleUsed: buildRuleUsed(calcWithSuggestion),
    voucherReactivationWarning: buildVoucherReactivationWarning(calcWithSuggestion),
    simpleSummary: buildSimpleSummary(calcWithSuggestion),
    schoolMessage: buildSchoolMessage(calcWithSuggestion),
    guardianMessage: buildGuardianMessage(calcWithSuggestion),
    guardianSchoolContactMessage: buildGuardianSchoolContactMessage(calcWithSuggestion)
  });

  return {
    ...calcWithSuggestion,
    ...finalOutputs
  };
}
