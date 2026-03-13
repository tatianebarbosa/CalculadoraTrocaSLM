import { DISPLAY_RULE_TEXT, JUROS_WARNING_TEXT, PEARSON_ORDER_DISCOUNT } from "../config/appConfig";
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
  jurosCredit = 0
}) {
  const adjustmentMeta = getAdjustmentMeta(pearsonDiscount > 0 || voucherApplied > 0, jurosCredit > 0);
  const adjustmentValue =
    [
      pearsonDiscount > 0 ? `Pearson ${formatMoney(pearsonDiscount)}` : null,
      voucherApplied > 0 ? `Voucher ${formatMoney(voucherApplied)}` : null,
      jurosCredit > 0 ? `Juros ${formatMoney(jurosCredit)}` : null
    ]
      .filter(Boolean)
      .join(" | ") || adjustmentMeta.emptyText;

  return [
    ["Turma", turma],
    ["Pearson", formatPearsonSelection(hasMath, hasScience)],
    ["Voucher informado", formatVoucherInput(voucherMode, voucherValue)],
    [adjustmentMeta.label, adjustmentValue]
  ];
}

function getTurmaData(catalog, turma) {
  return catalog.find((item) => item.turma === turma) ?? null;
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

  const pearsonMath = options.pearsonMath ? base.pearsonMath : 0;
  const pearsonScience = options.pearsonScience ? base.pearsonScience : 0;
  const pearsonDiscountItems = (options.pearsonMath ? 1 : 0) + (options.pearsonScience ? 1 : 0);
  const pearsonDiscount = pearsonDiscountItems * PEARSON_ORDER_DISCOUNT;
  const voucherApplied = getVoucherAmount(options.voucherMode, options.voucherValue, base.slm);
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

function buildQuickOutcome(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar o resumo.";
  }

  if (!calc.canExchange) {
    return `A troca não pode seguir, pois sobraria ${formatMoney(calc.leftover)} na loja.`;
  }

  if (calc.difference > 0) {
    return `A troca pode seguir com diferença a pagar de ${formatMoney(calc.difference)}.`;
  }

  return "A troca pode seguir. Os materiais ficam no mesmo valor.";
}

export function buildJurosWarning(calc) {
  if (calc.jurosCredit <= 0) {
    return null;
  }

  if (calc.leftoverJurosPart > 0) {
    return `Aviso: ${formatMoney(calc.leftoverJurosPart)} da sobra na loja viria dos juros reembolsados. Quando os juros geram sobra na loja, a troca não pode seguir.`;
  }

  return JUROS_WARNING_TEXT;
}

function hasVoucherReactivation(calc) {
  return !calc.canExchange && calc.principal.voucherApplied > 0;
}

export function buildVoucherReactivationWarning(calc) {
  if (!hasVoucherReactivation(calc)) {
    return null;
  }

  return "Aviso: houve uso de voucher no pedido principal. Apos o cancelamento, esse voucher volta para utilizacao em 24 horas e pode ser reutilizado na nova compra.";
}

function buildVoucherReactivationSentence(calc) {
  if (!hasVoucherReactivation(calc)) {
    return "";
  }

  return " Como houve uso de voucher no pedido principal, ele sera liberado novamente em 24 horas apos o cancelamento e podera ser reutilizado na nova compra.";
}

function appendVoucherReactivationSentence(text, calc) {
  return `${text}${buildVoucherReactivationSentence(calc)}`;
}

export function buildFinancialAction(calc) {
  if (!calc.ready) {
    return "Complete a simulação";
  }

  if (!calc.canExchange) {
    return "Cancelar pedido principal";
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

  if (!calc.canExchange) {
    return "Aguardar 24h e refazer matricula na LEX";
  }

  return "Aguardar 24h e ajustar o LEX";
}

function buildReason(calc) {
  if (!calc.ready) {
    return "Selecione a turma do pedido principal e a turma da nova compra para iniciar a análise.";
  }

  if (!calc.canExchange) {
    return `A troca não pode seguir, pois sobraria ${formatMoney(calc.leftover)} na loja. Esse valor não pode ficar disponível para uso em outras compras.`;
  }

  if (calc.difference > 0) {
    return `A troca pode seguir porque o crédito disponível é menor que a nova compra. O responsável precisará complementar ${formatMoney(calc.difference)}.`;
  }

  return "A troca pode seguir porque o valor do pedido principal cobre exatamente a nova compra, sem sobra na loja e sem diferença a pagar.";
}

function buildSimpleSummary(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar o resumo simples.";
  }

  if (!calc.canExchange) {
    return `A troca não pode seguir. Pedido principal: ${calc.form.principalTurma}. Nova compra: ${calc.form.novaTurma}. Como sobraria ${formatMoney(calc.leftover)} na loja, será necessário cancelar o pedido principal e refazer a matrícula correta no LEX após 24 horas.`;
  }

  if (calc.difference > 0) {
    return `Pode seguir com a troca. Pedido principal: ${calc.form.principalTurma}. Nova compra: ${calc.form.novaTurma}. O responsável deverá pagar a diferença de ${formatMoney(calc.difference)}. Após a confirmação, aguardar 24 horas e depois ajustar a matrícula no LEX para liberar o valor na loja.`;
  }

  return `A troca pode seguir. Pedido principal: ${calc.form.principalTurma}. Nova compra: ${calc.form.novaTurma}. Os materiais ficam no mesmo valor, sem diferença a pagar. Após a confirmação, aguardar 24 horas e depois ajustar a matrícula no LEX para liberar o valor na loja.`;
}

function buildSchoolMessage(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar a mensagem para a escola.";
  }

  const principalAmount = formatMoney(calc.principal.paidMaterials);
  const jurosSentence =
    calc.jurosCredit > 0
      ? ` Além disso, há ${formatMoney(calc.jurosCredit)} de juros disponíveis como crédito financeiro.`
      : "";

  if (!calc.canExchange) {
    return `Não será possível seguir com a troca do material. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após analisarmos o pedido principal, a nova compra e o valor efetivamente pago, verificamos que sobraria ${formatMoney(calc.leftover)} na loja. Como esse valor não pode ficar disponível para uso em outras compras, será necessário cancelar o pedido principal. Após o cancelamento, será necessário aguardar 24 horas. Depois desse prazo, a escola deverá realizar a matrícula do(a) aluno(a) na turma correta dentro do LEX e, somente após esse ajuste, o material correto ficará disponível na loja para uma nova compra integral.`;
  }

  if (calc.difference > 0) {
    return `Vamos seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra será para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após a análise da composição do pedido principal, da nova compra e do valor efetivamente pago, identificamos que é possível seguir com a troca neste cenário. Como o valor disponível na loja é menor que o valor da nova compra, será necessário que o responsável realize o pagamento da diferença de ${formatMoney(calc.difference)} para concluir a compra do material correto. Após a confirmação da troca, será necessário aguardar 24 horas e, depois desse prazo, a escola deverá realizar o ajuste da matrícula do(a) aluno(a) na turma correta dentro do LEX. Somente após esse ajuste o valor ficará disponível na loja para realização da nova compra. Antes desse prazo, não deve ser feita nenhuma alteração no LEX.`;
  }

  return `Vamos seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra será para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após analisarmos o pedido principal, a nova compra e o valor efetivamente pago, verificamos que os materiais ficam no mesmo valor. Não haverá diferença a pagar pelo responsável nem sobra disponível na loja. Após a confirmação da troca, será necessário aguardar 24 horas e, depois desse prazo, a escola deverá realizar o ajuste da matrícula do(a) aluno(a) na turma correta dentro do LEX. Somente após esse ajuste o material correto ficará disponível na loja para a nova compra. Antes desse prazo, não deve ser feita nenhuma alteração no LEX.`;
}

function buildGuardianMessage(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar a mensagem para o responsável.";
  }

  const principalAmount = formatMoney(calc.principal.paidMaterials);
  const jurosSentence =
    calc.jurosCredit > 0
      ? ` Além disso, há ${formatMoney(calc.jurosCredit)} de juros disponíveis como crédito financeiro.`
      : "";

  if (!calc.canExchange) {
    return `Não será possível seguir com a troca do material. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após analisarmos o pedido principal, a nova compra e o valor efetivamente pago, verificamos que sobraria ${formatMoney(calc.leftover)} na loja. Como esse valor não pode ficar disponível para uso em outras compras, será necessário cancelar o pedido principal. Após o cancelamento, será necessário aguardar 24 horas. Depois desse prazo, pedimos que entre em contato com a escola para que ela realize a matrícula correta dentro do LEX e, somente após esse ajuste, o material correto ficará disponível na loja para uma nova compra integral.`;
  }

  if (calc.difference > 0) {
    return `Vamos seguir com a troca do material neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra será para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após a análise da composição do pedido principal, da nova compra e do valor efetivamente pago, identificamos que é possível seguir com a troca neste cenário. Como o valor disponível na loja é menor que o valor da nova compra, será necessário realizar o pagamento da diferença de ${formatMoney(calc.difference)}. Após a confirmação da troca, será necessário aguardar 24 horas e, depois desse prazo, avisar a escola para que ela realize o ajuste da matrícula na turma correta dentro do LEX. Somente após esse ajuste o valor ficará disponível na loja para realização da nova compra. Antes de finalizar o pedido, orientamos que o abatimento seja conferido com atenção.`;
  }

  return `Vamos seguir com a troca do material neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra será para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}.${jurosSentence} Após analisarmos o pedido principal, a nova compra e o valor efetivamente pago, verificamos que os materiais ficam no mesmo valor. Não haverá diferença a pagar nem sobra disponível na loja. Após a confirmação da troca, será necessário aguardar 24 horas e, depois desse prazo, avisar a escola para que ela realize o ajuste da matrícula na turma correta dentro do LEX. Somente após esse ajuste o material correto ficará disponível na loja para a nova compra. Antes de finalizar o pedido, orientamos que o abatimento seja conferido com atenção.`;
}

export function calculateExchange(form, catalog) {
  const principalBase = getTurmaData(catalog, form.principalTurma);
  const novaBase = getTurmaData(catalog, form.novaTurma);
  const ready = Boolean(principalBase && novaBase);

  const principal = buildBreakdown(principalBase, {
    pearsonMath: form.principalPearsonMath,
    pearsonScience: form.principalPearsonScience,
    voucherMode: form.principalVoucherMode,
    voucherValue: form.principalVoucherValue
  });

  const nova = buildBreakdown(novaBase, {
    pearsonMath: form.novaPearsonMath,
    pearsonScience: form.novaPearsonScience,
    voucherMode: form.novaVoucherMode,
    voucherValue: form.novaVoucherValue
  });

  const jurosCredit = roundCurrency(clampNumber(form.jurosValor, 0));
  const totalAvailable = roundCurrency(principal.paidMaterials + jurosCredit);
  const difference = roundCurrency(Math.max(nova.paidMaterials - totalAvailable, 0));
  const leftover = roundCurrency(Math.max(totalAvailable - nova.paidMaterials, 0));
  const leftoverJurosPart = roundCurrency(Math.min(jurosCredit, leftover));
  const canExchange = ready && leftover <= 0;

  const baseCalc = {
    ready,
    canExchange,
    principal,
    nova,
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
    ruleUsed: DISPLAY_RULE_TEXT,
    voucherReactivationWarning: buildVoucherReactivationWarning(baseCalc),
    simpleSummary: appendVoucherReactivationSentence(buildSimpleSummary(baseCalc), baseCalc),
    schoolMessage: appendVoucherReactivationSentence(buildSchoolMessage(baseCalc), baseCalc),
    guardianMessage: appendVoucherReactivationSentence(buildGuardianMessage(baseCalc), baseCalc)
  };
}
