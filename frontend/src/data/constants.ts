export const TYPES = {
  statement: "Заявление",
  preventive_control_act_complaint: "Жалоба на акт о результате профилактического контроля",
  action_inaction_complaint: "Жалоба на действие/бездействие",
  kvga_dvga_decision_complaint: "Жалоба на решение КВГА/ДВГА",
  notice_objection: "Возражение на уведомления",
  audit_report_objection: "Возражение на аудиторский отчет",
} as const;
export const ROLES = {
  work: "Рабочий орган",
  dvga: "ДВГА",
  commission: "Апелляционная комиссия",
  subject: "Объект",
  higher: "Вышестоящий орган",
} as const;
export const STATUS = {
  received: "Поступило",
  accepted: "Принято к рассмотрению",
  requested: "Ожидается позиция ДВГА",
  materials: "Анализ материалов",
  circulated: "Позиции членов комиссии",
  hearing: "Подготовка заслушивания",
  hearing_ready: "Заслушивание",
  meeting: "Готово к заседанию",
  protocol: "Подписание протокола",
  decided: "Решение принято",
  delivered: "Результат направлен",
  completed: "Завершено",
  refused: "Отказ в рассмотрении",
  withdrawn: "Оставлено без рассмотрения",
  forwarded: "Передано по компетенции",
  paused: "Срок приостановлен",
  court: "Судебное обжалование",
} as const;
export const OUTCOMES = {
  accept: "Удовлетворить",
  partial: "Удовлетворить частично",
  reject: "Отказать в удовлетворении",
} as const;
export const CLOSED: readonly string[] = ["completed", "refused", "withdrawn"];
export const SOURCE_IDS = {
  audit: "Z1500000392",
  commission: "V2000020171",
  auditRules: "V1800016689",
  notice: "V1500012599",
  purchases: "Z2400000106",
  purchaseRules: "V2400035238",
  appk: "K2000000350",
  business: "K1500000375",
} as const;
