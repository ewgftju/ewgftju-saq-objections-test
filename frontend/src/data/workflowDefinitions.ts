export const STEPS = [
  ["received", "Поступление"],
  ["accepted", "Допустимость и компетенция"],
  ["requested", "Позиция ДВГА"],
  ["materials", "Справка по доводам"],
  ["circulated", "Позиции членов комиссии"],
  ["commission_voting", "Голосование членов АК"],
  ["commission_members", "Выбор участников АК"],
  ["hearing", "Заслушивание"],
  ["meeting", "Заседание и голосование"],
  ["protocol", "Протокол и решение"],
  ["delivered", "Направление результата"],
  ["completed", "Исполнение"],
] as const;
export const CONTROL_STEPS = STEPS;
