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

  if (calc.requiresCancellationForJuros) {
    return "A troca nao pode seguir neste momento, pois ha juros no pedido principal. Nesse cenario, sera necessario cancelar o pedido principal e aguardar o respectivo reembolso antes de seguir com a troca.";
  }

  if (!calc.canExchange) {
    return "A troca nao pode seguir, pois sobraria credito na loja.";
  }

  if (calc.difference > 0) {
    return `Seguir com a troca, e a diferenca de ${formatMoney(calc.difference)} ficara disponivel para pagamento na loja.`;
  }

  return "Seguir com a troca, pois nao ha diferenca de valor entre os materiais.";
}

export function buildJurosWarning(calc) {
  if (calc.jurosCredit <= 0) {
    return null;
  }

  return JUROS_WARNING_TEXT;
}

function hasVoucherReactivation(calc) {
  return !calc.canExchange && !calc.requiresCancellationForJuros && calc.principal.voucherApplied > 0;
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

function hasPrincipalVoucherUsage(calc) {
  return calc.principal.voucherApplied > 0;
}

function buildVoucherMessageParagraph(calc) {
  if (!hasPrincipalVoucherUsage(calc)) {
    return "";
  }

  if (calc.requiresCancellationForJuros || !calc.canExchange) {
    return "\n\nCaso tenha havido voucher no pedido principal, esse valor ficara disponivel novamente em ate 24 horas e devera ser reaplicado na nova compra, considerando que o voucher cobre apenas o valor do SLM base, sem incidencia sobre materiais Pearson.";
  }

  return "\n\nFoi aplicado um voucher no pedido principal. Apos a troca, o voucher volta a sua disponibilidade em ate 24 horas, no mesmo CPF e com o mesmo codigo, para ser reaplicado na nova compra. O voucher e valido somente sobre o valor do SLM base, nao sendo aplicado aos materiais Pearson.";
}

function appendVoucherMessageParagraph(text, calc) {
  return `${text}${buildVoucherMessageParagraph(calc)}`;
}

export function buildFinancialAction(calc) {
  if (!calc.ready) {
    return "Complete a simulacao";
  }

  if (calc.requiresCancellationForJuros) {
    return "Cancelar pedido principal e realizar o reembolso";
  }

  if (!calc.canExchange) {
    return "Cancelar pedido principal e realizar o reembolso";
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

  if (calc.requiresCancellationForJuros) {
    return "Aguardar 24h e ajustar a matricula no LEX";
  }

  if (!calc.canExchange) {
    return "Aguardar 24h e refazer matricula na LEX";
  }

  return "Aguardar 24h e ajustar a matricula na LEX";
}

function buildRuleUsed(calc) {
  if (!calc.ready) {
    return "Selecione o pedido principal e a nova compra para ver a regra aplicada neste cenario.";
  }

  const hasPearsonRule = calc.principal.pearsonDiscount > 0 || calc.nova.pearsonDiscount > 0;
  const hasVoucherRule = calc.principal.voucherApplied > 0 || calc.nova.voucherApplied > 0;
  const ruleParts = [
    "A analise compara o pedido principal com a nova compra, considerando SLM, workbook, Matematica Aplicada e Pearson selecionados."
  ];

  if (hasPearsonRule && hasVoucherRule) {
    ruleParts.push(
      `Nos Pearsons selecionados, foi aplicado desconto de ${formatMoney(PEARSON_ORDER_DISCOUNT)} por Pearson, e foi aplicado um voucher, cujo desconto so e aplicado no valor base do SLM e nao se aplica em nenhum outro material Pearson.`
    );
  } else if (hasPearsonRule) {
    ruleParts.push(`Nos Pearsons selecionados, foi aplicado desconto de ${formatMoney(PEARSON_ORDER_DISCOUNT)} por Pearson.`);
  } else if (hasVoucherRule) {
    ruleParts.push("Foi aplicado um voucher, cujo desconto so e aplicado no valor base do SLM e nao se aplica em nenhum outro material Pearson.");
  }

  if (calc.jurosCredit > 0) {
    ruleParts.push(
      "Aviso: neste momento, quando houver juros no pedido principal, a troca nao pode seguir. Nesse cenario, sera necessario cancelar o pedido principal e aguardar o respectivo reembolso antes de seguir com a nova compra."
    );
  }

  return ruleParts.join(" ");
}

function buildReason(calc) {
  if (!calc.ready) {
    return "Selecione a turma do pedido principal e a turma da nova compra para iniciar a analise.";
  }

  if (calc.requiresCancellationForJuros) {
    return "A troca nao pode seguir neste momento, pois ha juros no pedido principal. Nesse cenario, o pedido principal precisa ser cancelado e seguir para reembolso antes da nova compra.";
  }

  if (!calc.canExchange) {
    return "A troca nao pode seguir, pois sobraria credito na loja. Esse valor nao pode ficar disponivel para uso em outras compras.";
  }

  if (calc.difference > 0) {
    return `A troca pode seguir porque o credito disponivel e menor que a nova compra. O responsavel precisara complementar ${formatMoney(calc.difference)}.`;
  }

  return "A troca pode seguir porque o valor do pedido principal cobre exatamente a nova compra, sem sobra na loja e sem diferenca a pagar.";
}

function buildSimpleSummary(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar o resumo simples.";
  }

  if (calc.requiresCancellationForJuros) {
    return `A troca nao pode seguir neste momento. Pedido principal: ${calc.form.principalTurma}. Nova compra: ${calc.form.novaTurma}. Como ha juros no pedido principal, sera necessario cancelar o pedido principal e aguardar o respectivo reembolso. Depois disso, aguardar 24 horas, ajustar a matricula no LEX e so entao seguir com a nova compra.`;
  }

  if (!calc.canExchange) {
    return `A troca nao pode seguir. Pedido principal: ${calc.form.principalTurma}. Nova compra: ${calc.form.novaTurma}. Como sobraria ${formatMoney(calc.leftover)} na loja, sera necessario cancelar o pedido principal e refazer a matricula correta na LEX apos 24 horas.`;
  }

  if (calc.difference > 0) {
    return `Pode seguir com a troca. Pedido principal: ${calc.form.principalTurma}. Nova compra: ${calc.form.novaTurma}. O responsavel devera pagar a diferenca de ${formatMoney(calc.difference)}. Apos a confirmacao, aguardar 24 horas e depois ajustar a matricula na LEX para liberar o valor na loja.`;
  }

  return `A troca pode seguir. Pedido principal: ${calc.form.principalTurma}. Nova compra: ${calc.form.novaTurma}. Os materiais ficam no mesmo valor, sem diferenca a pagar. Apos a confirmacao, aguardar 24 horas e depois ajustar a matricula na LEX para liberar o valor na loja.`;
}

function buildSchoolMessage(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar a mensagem para a escola.";
  }

  const principalAmount = formatMoney(calc.principal.paidMaterials);

  if (calc.requiresCancellationForJuros) {
    return `Neste momento, nao sera possivel seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}. Como ha juros aplicados no pedido principal, a troca nao pode seguir diretamente.

Nesse cenario, sera necessario seguir com o cancelamento do pedido principal e o respectivo reembolso. Ate a conclusao desse processo e o prazo de 24 horas, nao deve ser realizada nenhuma alteracao na LEX, para que o cancelamento nao seja impactado.

Depois das 24 horas, a escola devera ajustar a matricula do aluno na turma correta na LEX, para que o SLM correspondente volte a ficar disponivel na loja. Apos esse ajuste, podera ser realizada uma nova compra do material correto, com novo pagamento.`;
  }

  if (!calc.canExchange) {
    return `Nao sera possivel seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}. Como sobraria ${formatMoney(calc.leftover)} na loja, a troca nao pode seguir.

Nesse cenario, sera necessario seguir com o cancelamento do pedido principal e o respectivo reembolso. Ate a conclusao desse processo e o prazo de 24 horas, nao deve ser realizada nenhuma alteracao na LEX, para que o cancelamento nao seja impactado.

Depois das 24 horas, a escola devera ajustar a matricula do aluno na turma correta na LEX, para que o SLM correspondente volte a ficar disponivel na loja. Apos esse ajuste, podera ser realizada uma nova compra do material correto, com novo pagamento.`;
  }

  if (calc.difference > 0) {
    return `Vamos seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra sera para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}. Apos a analise, identificamos diferenca de ${formatMoney(calc.difference)} a pagar para concluir a compra do material correto.

Apos a confirmacao da troca, o credito sera disponibilizado em ate 24 horas no CPF do responsavel pela compra principal. Antes desse prazo, nao deve ser feita nenhuma alteracao na LEX.

Depois das 24 horas, a escola devera:

- ajustar a matricula do aluno na turma correta na LEX;
- orientar o responsavel a acessar novamente a loja com o mesmo CPF da compra principal;
- realizar a nova compra do material correto, com o pagamento complementar de ${formatMoney(calc.difference)}.

Somente apos a liberacao do credito, o ajuste da matricula na LEX e o pagamento da diferenca a nova compra podera ser concluida.`;
  }

  return `Vamos seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra sera para a turma ${calc.form.novaTurma}, tambem no valor de ${formatMoney(calc.nova.paidMaterials)}. Como os materiais permanecem com o mesmo valor, nao havera diferenca a pagar nem saldo sobrando na loja.

Apos a confirmacao da troca, o credito sera disponibilizado em ate 24 horas no CPF do responsavel pela compra principal. Antes desse prazo, nao deve ser feita nenhuma alteracao na LEX.

Depois das 24 horas, a escola devera:

- ajustar a matricula do aluno na turma correta na LEX;
- orientar o responsavel a acessar novamente a loja com o mesmo CPF da compra principal;
- realizar a nova compra do material correto.

Somente apos a liberacao do credito e o ajuste da matricula na LEX o material correto ficara disponivel para compra.`;
}

function buildGuardianMessage(calc) {
  if (!calc.ready) {
    return "Preencha o pedido principal e a nova compra para gerar a mensagem para o responsavel.";
  }

  const principalAmount = formatMoney(calc.principal.paidMaterials);

  if (calc.requiresCancellationForJuros) {
    return `Neste momento, nao sera possivel seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}. Como ha juros aplicados no pedido principal, a troca nao pode seguir diretamente.

Nesse cenario, sera necessario seguir com o cancelamento do pedido principal e o respectivo reembolso. Antes da conclusao desse processo e do prazo de 24 horas, nao sera necessario realizar nenhuma acao.

Depois das 24 horas, sera necessario entrar em contato com a escola para que ela ajuste a matricula do aluno na turma correta na LEX. Somente apos esse ajuste o material correto voltara a ficar disponivel na loja. A partir disso, podera ser realizada uma nova compra do material correto, com novo pagamento.`;
  }

  if (!calc.canExchange) {
    return `Nao sera possivel seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra seria para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}. Como sobraria ${formatMoney(calc.leftover)} na loja, a troca nao pode seguir.

Nesse cenario, sera necessario seguir com o cancelamento do pedido principal e o respectivo reembolso. Antes da conclusao desse processo e do prazo de 24 horas, nao sera necessario realizar nenhuma acao.

Depois das 24 horas, sera necessario entrar em contato com a escola para que ela ajuste a matricula do aluno na turma correta na LEX. Somente apos esse ajuste o material correto voltara a ficar disponivel na loja. A partir disso, podera ser realizada uma nova compra do material correto, com novo pagamento.`;
  }

  if (calc.difference > 0) {
    return `Vamos seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra sera para a turma ${calc.form.novaTurma}, no valor de ${formatMoney(calc.nova.paidMaterials)}. Apos a analise, identificamos diferenca de ${formatMoney(calc.difference)} a pagar para concluir a compra do material correto.

Apos a confirmacao da troca, o credito sera disponibilizado em ate 24 horas no CPF utilizado na compra principal. Antes desse prazo, nao sera necessario realizar nenhuma acao.

Depois das 24 horas, sera necessario entrar em contato com a escola para que ela ajuste a matricula do aluno na turma correta na LEX. Ate a finalizacao da troca e o cumprimento desse prazo, nao deve ser feito nenhum ajuste na LEX da familia.

Apos a conclusao desse ajuste, voce podera acessar novamente a loja com o mesmo CPF da compra principal, realizar a nova compra do material correto e concluir o pagamento complementar de ${formatMoney(calc.difference)}.`;
  }

  return `Vamos seguir com a troca neste caso. O pedido principal foi realizado para a turma ${calc.form.principalTurma}, no valor de ${principalAmount}, e a nova compra sera para a turma ${calc.form.novaTurma}, tambem no valor de ${formatMoney(calc.nova.paidMaterials)}. Como os materiais permanecem com o mesmo valor, nao havera diferenca a pagar nem saldo sobrando na loja.

Apos a confirmacao da troca, o credito sera disponibilizado em ate 24 horas no CPF utilizado na compra principal. Antes desse prazo, nao sera necessario realizar nenhuma acao.

Depois das 24 horas, sera necessario entrar em contato com a escola para que ela ajuste a matricula do aluno na turma correta na LEX. Ate a finalizacao da troca e o cumprimento desse prazo, nao deve ser feito nenhum ajuste na LEX da familia.

Apos a conclusao desse ajuste, voce podera acessar novamente a loja com o mesmo CPF da compra principal e realizar a nova compra do material correto.`;
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
  const requiresCancellationForJuros = ready && jurosCredit > 0;
  const canExchange = ready && leftover <= 0 && !requiresCancellationForJuros;

  const baseCalc = {
    ready,
    canExchange,
    requiresCancellationForJuros,
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
    ruleUsed: buildRuleUsed(baseCalc),
    voucherReactivationWarning: buildVoucherReactivationWarning(baseCalc),
    simpleSummary: appendVoucherReactivationSentence(buildSimpleSummary(baseCalc), baseCalc),
    schoolMessage: appendVoucherMessageParagraph(buildSchoolMessage(baseCalc), baseCalc),
    guardianMessage: appendVoucherMessageParagraph(buildGuardianMessage(baseCalc), baseCalc)
  };
}
