// This helper only fills the visible training form. Submission still uses applyAction.
export function fillTrainingForm(form: HTMLFormElement): Record<string, string> {
  const examples: Record<string, string> = {
    basis: "Учебный пример: реквизиты обращения, срок и компетенция органа проверены.",
    evidence: "Учебные материалы: акт сверки, ведомость учёта и пояснение объекта.",
    position: "Учебный пример: позиции членов комиссии представлены по каждому доводу.",
    preliminary: "Учебный проект решения: оценить представленные документы и пересмотреть оспариваемые пункты в указанном объёме.",
    subject: "Учебный пример: заявитель поддержал доводы и представил пояснение.",
    note: "Учебный пример: пояснения рассмотрены, результат зафиксирован в материалах дела.",
    reason: "Учебный пример: решение мотивировано результатами рассмотрения доводов и подтверждающих материалов.",
    execution: "Учебный пример: результат рассмотрения учтён по пунктам исходного документа.",
  };
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) || element.disabled || !element.name) continue;
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      if (!element.name.startsWith("recused_")) element.checked = true;
    } else if (element instanceof HTMLSelectElement) {
      if (element.name.startsWith("vote_")) element.value = "yes";
      else if (!element.value) element.value = Array.from(element.options).find(option => option.value)?.value ?? "";
    } else if (!element.value.trim() && element.type !== "file") {
      element.value = element.type === "number" ? "0" : examples[element.name]
        ?? (element.name.startsWith("position_") ? "Учебная позиция ДВГА: вывод сопоставлен с актами и учётными данными."
        : element.name.startsWith("analysis_") ? "Учебный анализ: довод сопоставлен с исходным выводом, позицией ДВГА и представленными доказательствами."
        : element.name.startsWith("legal_") ? "Учебный пример: применимое основание приведено в материалах этого пункта."
        : "Учебный пример: результат и подтверждающие материалы зафиксированы.");
    }
  }
  const values: Record<string, string> = {};
  for (const [key, value] of new FormData(form)) values[key] = String(value);
  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => { values[input.name] = input.checked ? "on" : ""; });
  return values;
}
