import assert from "node:assert/strict";
import test from "node:test";
import { Children, createElement, isValidElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  initialState,
  createDemoRepository,
  STORAGE_KEY,
} from "../../../api/objectionsRepository";
import { members } from "../../../data/objections";
import type { Action, DemoState, Role } from "../../../types";
import { applyAction, nextAction } from "../services/workflow";
import {
  addMonths,
  filingDeadline,
  reviewDeadline,
  reviewDuration,
} from "../services/deadlines";
import { evaluateVotes, overall, remainingIssues } from "../services/decisions";
import { DocumentContent } from "../components/DocumentModal";
import { AgendaDocument } from "../components/AgendaModal";
import AgendaResultsModal from "../components/AgendaResultsModal";
import CasesList from "../pages/CasesList";
import CaseWorkspace from "../pages/CaseWorkspace";
import ConsiderationProcess from "../components/ConsiderationProcess";
import { caseCsv } from "../../../utils/download";
import { pathForRoute, routeFromPath } from "../routing";
import { DEMO_USER } from "../../../config";
import { actionForm } from "../formDefinitions";

function harness(index = 0) {
  let state = initialState();
  const id = state.cases[index].id;
  return {
    get state() {
      return state;
    },
    get c() {
      return state.cases[index];
    },
    set(next: DemoState) {
      state = next;
    },
    run(action: Action, role: Role, values: Record<string, string> = {}) {
      const form = new FormData();
      Object.entries(values).forEach(([key, value]) => form.set(key, value));
      state = applyAction(state, id, action, role, form);
    },
  };
}
type Harness = ReturnType<typeof harness>;
function screen(h: Harness) {
  h.run("screen", "work", {
    identity: "on",
    document: "on",
    grounds: "on",
    competence: "on",
    assignee: "Демо-исполнитель",
    authority: "Компетентный орган (демо)",
    basis: "Применимый порядок и полномочия проверены (демо)",
    actEffect:
      "Действие акта приостановлено по проверенному общему основанию (демо)",
  });
}
function analysis(h: Harness, partial = false) {
  const values: Record<string, string> = {
    fullCase: "on",
    noWorsening: "on",
    scope: "Изучено всё дело (демо)",
  };
  h.c.issues
    .filter((point) => point.disputed)
    .forEach((point, index) => {
      values[`analysis_${point.id}`] = "Доказательства исследованы (демо)";
      values[`legal_${point.id}`] = "Применимая норма проверена (демо)";
      values[`proposal_${point.id}`] =
        partial && index === 1 ? "partial" : "accept";
      values[`amount_${point.id}`] = String(point.amount / 2);
    });
  h.run(
    h.c.type === "control" ? "control-analysis" : "analysis",
    h.c.type === "control" ? "higher" : "work",
    values,
  );
}
function prepare(h: Harness, partial = false) {
  screen(h);
  h.run("request", "work", {
    recipient: "ДВГА по Атырауской области",
    deadline: "2026-09-10T18:00",
  });
  h.run("send-request-approval", "work");
  h.run("approve-request", "director", { approved: "on" });
  h.run(
    "fill-request-response",
    "dvga",
    Object.fromEntries(
      h.c.issues
        .filter((point) => point.disputed)
        .flatMap((point) => [
          [
            `authorityFinding_${point.id}`,
            "Нарушение, заполненное ДВГА (демо)",
          ],
          [
            `authorityResponse_${point.id}`,
            "Мотивированный ответ ДВГА (демо)",
          ],
        ]),
    ),
  );
  h.run("position", "work");
  analysis(h, partial);
  h.run("members", "work", {
    shared: "on",
    position: "Все позиции зафиксированы",
  });
}
function voteAndSign(h: Harness) {
  const values: Record<string, string> = {
    number: "ПР-1",
    protocolDate: "2026-09-10",
    protocolMember_1: "Председатель Апелляционной комиссии: ФИО",
    protocolMember_2: "Директор ДМБУА: ФИО",
  };
  for (const point of h.c.issues.filter((item) => item.disputed)) {
    values[`protocolVote_${point.id}_protocol-member-1`] = "yes";
    values[`protocolVote_${point.id}_protocol-member-2`] = "yes";
  }
  h.run("vote", "commission", values);
  h.run("sign", "commission", {
    secretary: "on",
    reason: "Итоговая мотивировка",
    ...Object.fromEntries(
      h.c.members.map((member) => [`signed_${member.id}`, "on"]),
    ),
  });
}
function deliver(h: Harness, role: Role = "work") {
  h.run("deliver", role, {
    sent: "on",
    copy: "on",
    published: "on",
    number: "ИСХ-1",
    receipt: "DEMO-1",
    channel: "portal",
    appealCourt: "Суд по подсудности (демо)",
    appealProcedure:
      "Для иска об оспаривании — один месяц со дня вручения решения, ст. 136 АППК",
  });
}

test("три исходных дела: разные сроки и перенос окончания месяца", () => {
  const state = initialState();
  assert.deepEqual(state.cases.map(filingDeadline), [
    "2026-09-10",
    "2026-09-16",
    "2026-11-30",
  ]);
  assert.deepEqual(state.cases.map(reviewDeadline), [
    "2026-09-24",
    "2026-10-14",
    "2026-10-12",
  ]);
  assert.equal(
    reviewDuration({ ...state.cases[1], appealType: "Заявление" }),
    15,
  );
  assert.equal(
    reviewDuration({
      ...state.cases[2],
      appealType: "Жалоба на действие/бездействие",
    }),
    20,
  );
  assert.equal(
    reviewDuration({ ...state.cases[1], appealType: "Возражение на аудиторский отчет" }),
    30,
  );
  assert.equal(addMonths("2026-08-31", 3), "2026-11-30");
  assert.equal(
    state.cases.every((c) => c.status === "received"),
    true,
  );
});

test("запрос в другой орган использует отдельный шаблон и сохраняет исполнителя", () => {
  const h = harness();
  screen(h);
  h.run("request-other", "work", {
    recipient: "Экспертная организация",
    customRequestText: "Просим представить экспертное заключение.",
  });
  assert.deepEqual(h.c.requests.at(-1), {
    id: "request-1",
    recipient: "Экспертная организация",
    date: "2026-09-08",
    text:
      "Запрос сформирован для Экспертная организация. Срок рассмотрения: 2026-09-10T18:00.",
    deadline: "2026-09-10T18:00",
    template: "other",
    author: DEMO_USER.fullName,
    customText: "Просим представить экспертное заключение.",
  });
  assert.equal(
    h.c.documents.some((document) => document.kind === "request-appendix"),
    false,
  );
  const html = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "request",
      document: h.c.documents[0],
    }),
  );
  assert.match(html, /Экспертная организация/);
  assert.match(html, /Просим представить экспертное заключение/);
  assert.match(html, new RegExp(DEMO_USER.fullName));
});

test("ответ ДВГА доступен после согласования, даже если создан запрос в другой орган", () => {
  const h = harness();
  screen(h);
  h.run("request", "work", {
    recipient: "ДВГА по Атырауской области",
  });
  h.run("request-other", "work", {
    recipient: "Экспертная организация",
    customRequestText: "Просим предоставить заключение.",
  });
  h.run("send-request-approval", "work");
  h.run("approve-request", "director", { approved: "on" });
  assert.equal(nextAction(h.c)?.action, "fill-request-response");
});

test("ответ ДВГА сначала фиксируется инициатором", () => {
  const h = harness();
  screen(h);
  h.run("request", "work", { recipient: "КВГА" });
  h.run("request-other", "work", {
    recipient: "Экспертная организация",
    customRequestText: "Просим предоставить заключение.",
  });
  h.run("send-request-approval", "work");
  h.run("approve-request", "director", { approved: "on" });
  h.run(
    "fill-request-response",
    "dvga",
    Object.fromEntries(
      h.c.issues
        .filter((point) => point.disputed)
        .flatMap((point) => [
          [`authorityFinding_${point.id}`, "Нарушение ДВГА"],
          [`authorityResponse_${point.id}`, "Ответ ДВГА"],
        ]),
    ),
  );
  assert.equal(h.c.status, "response_ready");
  assert.equal(nextAction(h.c)?.action, "position");
  h.run("position", "work");
  assert.equal(h.c.status, "materials");
  assert.equal(h.c.requests[0].confirmed, "2026-09-08");
});

test("уведомление: сквозной маршрут сохраняет неоспоренный пункт и снимки документов", () => {
  const h = harness();
  prepare(h);
  assert.equal(
    h.c.issues.find((point) => point.id === "n1")?.authorityFinding,
    "Нарушение, заполненное ДВГА (демо)",
  );
  h.run("hearing", "work", {
    mode: "favorable",
    reason: "Все заявленные доводы удовлетворяются",
  });
  voteAndSign(h);
  const draft = h.c.documents.find(
    (document) => document.name === "Проект протокола заседания",
  )!;
  assert.equal(draft.snapshot?.meeting?.signed, undefined);
  assert.ok(
    h.c.documents.find(
      (document) => document.name === "Подписанный протокол заседания",
    )?.snapshot?.meeting?.signed,
  );
  assert.deepEqual(
    remainingIssues(h.c).map((point) => point.number),
    ["3"],
  );
  deliver(h);
  assert.equal(h.c.delivery?.received, undefined);
  h.run("receipt", "subject", {
    date: "2026-09-09",
    receipt: "Подтверждение вручения",
  });
  h.run("execute", "dvga", {
    checked: "on",
    note: "Пункты 1 и 2 исключены, пункт 3 оставлен на исполнении",
  });
  assert.equal(h.c.status, "completed");
  assert.match(h.c.result!.effect, /пунктам 3/);
  const outgoing = h.c.documents.find((document) =>
    document.name.startsWith("Заключение"),
  )!;
  assert.equal(outgoing.snapshot?.delivery?.received, undefined);
  const html = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "result",
      document: outgoing,
    }),
  );
  assert.match(html, /Суд по подсудности/);
});

test("отчёт: частичный результат требует заслушивания; доступно судебное обжалование", () => {
  const h = harness(1);
  prepare(h, true);
  assert.throws(
    () => h.run("hearing", "work", { mode: "favorable", reason: "Исключение" }),
    /не является полностью благоприятным/,
  );
  assert.throws(
    () =>
      h.run("hearing", "work", {
        mode: "hold",
        hearingDate: "2026-09-09",
        preliminary: "Проект",
        notified: "on",
      }),
    /3 рабочих дня/,
  );
  h.run("hearing", "work", {
    mode: "hold",
    hearingDate: "2026-09-11",
    preliminary: "Частичное удовлетворение",
    notified: "on",
  });
  h.run("hearing-held", "work", {
    date: "2026-09-11",
    subject: "Позиция объекта",
    note: "Доводы рассмотрены",
    recorded: "on",
  });
  voteAndSign(h);
  deliver(h);
  assert.equal(h.c.issues[1].remainingAmount, 2200000);
  h.run("court", "subject", {
    date: "2026-09-14",
    number: "АД-1",
    note: "Квитанция подачи иска (демо)",
  });
  assert.equal(h.c.status, "court");
  assert.match(h.c.court!.effect, /приостановлено/);
  h.run("court-result", "work", { note: "Судебный акт учтён (демо)" });
  assert.equal(h.c.status, "delivered");
});

test("профконтроль: отдельная передача, полный анализ, заслушивание обеих сторон", () => {
  const h = harness(2);
  screen(h);
  h.run("forward", "dvga", {
    materials: "on",
    mode: "forward",
    reason: "Дело передано по компетенции",
    authority: "Вышестоящий орган (демо)",
  });
  analysis(h);
  h.run("hearing", "higher", {
    mode: "hold",
    hearingDate: "2026-09-11",
    preliminary: "Полная отмена",
    notified: "on",
    issuerNotified: "on",
  });
  h.run("hearing-held", "higher", {
    date: "2026-09-11",
    subject: "Позиция заявителя",
    issuer: "Позиция органа",
    note: "Стороны заслушаны",
    recorded: "on",
  });
  assert.throws(
    () =>
      h.run("control-decision", "higher", {
        competence: "on",
        kind: "reject",
        reason: "Нет",
        effect: "Нет",
        number: "Р-1",
      }),
    /противоречит/,
  );
  h.run("control-decision", "higher", {
    competence: "on",
    kind: "cancel",
    reason: "Доводы подтверждены",
    effect: "Акт отменяется",
    number: "Р-1",
  });
  deliver(h, "higher");
  h.run("execute", "dvga", {
    checked: "on",
    note: "Акт отменён в исходном деле",
  });
  assert.equal(h.c.status, "completed");
  assert.equal(h.c.meeting, null);
});

test("кворум, отсутствие председательствующего, отвод и равенство голосов", () => {
  const composition = members();
  assert.throws(
    () =>
      evaluateVotes(
        composition.map((m, i) => ({ ...m, present: i < 3 })),
        {},
      ),
    /кворума/,
  );
  assert.throws(
    () =>
      evaluateVotes(
        composition.map((m, i) => ({ ...m, present: i >= 2 })),
        {},
      ),
    /председателя/,
  );
  const four = composition.map((m, i) => ({ ...m, present: i < 4 }));
  assert.equal(
    evaluateVotes(four, {
      chair: "yes",
      deputy: "no",
      member1: "yes",
      member2: "no",
    }).approved,
    true,
  );
  assert.equal(
    evaluateVotes(four, {
      chair: "no",
      deputy: "yes",
      member1: "yes",
      member2: "no",
    }).approved,
    false,
  );
  const recused = composition.map((m, i) => ({
    ...m,
    recused: i >= 5,
    reason: i >= 5 ? "Конфликт" : "",
  }));
  assert.equal(
    evaluateVotes(recused, {
      chair: "yes",
      deputy: "yes",
      member1: "yes",
      member2: "no",
      member3: "no",
    }).approved,
    false,
  );
});

test("недостаточные данные и неверная роль не меняют исходное состояние", () => {
  const h = harness();
  const original = structuredClone(h.state);
  assert.throws(() => h.run("screen", "dvga"), /недоступно/);
  assert.throws(() => h.run("screen", "work"), /Подтвердите/);
  assert.deepEqual(h.state, original);
});

test("дополнение и внешний запрос меняют сроки, обычный файл не даёт продления", () => {
  const h = harness();
  screen(h);
  const base = reviewDeadline(h.c);
  h.run("supplement", "work", {
    formal: "on",
    notified: "on",
    text: "Дополнительный довод",
    number: "ДОП-1",
  });
  assert.notEqual(reviewDeadline(h.c), base);
  assert.equal(h.c.extensionDays, 15);
  h.run("pause", "work", {
    recipient: "Другой орган",
    text: "Сведения",
    notified: "on",
  });
  h.run("resume", "work", { date: "2026-09-11", text: "Ответ" });
  assert.equal(h.c.pauseDays, 3);
  assert.equal(h.c.status, "accepted");
  const control = harness(2);
  assert.throws(() => control.run("supplement", "work"), /недоступно/);
});

test("совместимость сохранения, прямые ссылки и React-разметка всех вкладок", () => {
  const storage = new Map<string, string>();
  storage.set(STORAGE_KEY, JSON.stringify(initialState()));
  const repository = createDemoRepository({
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
  });
  const state = repository.load();
  repository.save(state);
  assert.equal(repository.load().cases.length, 3);
  const path = pathForRoute({
    page: "detail",
    caseId: state.cases[0].id,
    tab: "history",
  });
  assert.deepEqual(routeFromPath(path), {
    page: "detail",
    caseId: state.cases[0].id,
    tab: "history",
  });
  const registry = renderToStaticMarkup(
    createElement(CasesList, {
      cases: state.cases,
      date: state.date,
      onOpen() {},
      onCreate() {},
      onExport() {},
    }),
  );
  assert.match(registry, /ВОЗ-2026-001/);
  state.cases[0].org = '<img src=x onerror="alert(1)">';
  for (const tab of ["overview", "review", "documents", "history"] as const) {
    const html = renderToStaticMarkup(
      createElement(CaseWorkspace, {
        c: state.cases[0],
        tab,
        role: "work",
        onBack() {},
        onTab() {},
        onAction() {},
        onDocument() {},
        onUpload() {},
      }),
    );
    assert.ok(!html.includes("<img src=x"));
  }
  state.cases[0].org = "=CMD()";
  assert.match(caseCsv(state.cases), /'=CMD\(\)/);
});

test("сохранённое до обновления голосование переводится на выбор участников АК", () => {
  const legacy = initialState();
  legacy.version = 1;
  legacy.cases[0].status = "commission_voting";
  const storage = new Map<string, string>([
    [STORAGE_KEY, JSON.stringify(legacy)],
  ]);
  const state = createDemoRepository({
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  }).load();
  assert.equal(state.version, 2);
  assert.equal(state.cases[0].status, "commission_members");
});

test("дело открывает процесс, а одно действие передаёт задачу вместе с ролью исполнителя", () => {
  const h = harness();
  const path = pathForRoute({ page: "detail", caseId: h.c.id });
  assert.equal(routeFromPath(path).tab, "review");
  assert.equal(
    routeFromPath(`/cases/${encodeURIComponent(h.c.id)}`).tab,
    "review",
  );
  assert.equal(
    routeFromPath(path.replace(/review$/, "overview")).tab,
    "overview",
  );

  function primaryAction(node: ReactNode): (() => void) | undefined {
    if (
      !isValidElement<{
        children?: ReactNode;
        primary?: boolean;
        onClick?: () => void;
      }>(node)
    )
      return;
    if (node.props.primary) return node.props.onClick;
    for (const child of Children.toArray(node.props.children)) {
      const action = primaryAction(child);
      if (action) return action;
    }
  }

  let selected: { action: Action; role: Role } | undefined;
  const process = () =>
    ConsiderationProcess({
      c: h.c,
      role: "work",
      onAction: (action, role) => {
        selected = { action, role };
      },
      onHistory() {},
    });
  assert.match(renderToStaticMarkup(process()), /Начать рассмотрение/);
  primaryAction(process())!();
  assert.deepEqual(selected, { action: "screen", role: "work" });
  screen(h);
  assert.match(
    renderToStaticMarkup(process()),
    /Сформировать запрос в ДВГА\/КВГА/,
  );
  assert.match(
    renderToStaticMarkup(process()),
    /Сформировать запрос в другой орган/,
  );
  h.run("request", "work", {
    recipient: "ДВГА по Атырауской области",
    deadline: "2026-09-10T18:00",
  });
  const requestMaterialsHtml = renderToStaticMarkup(
    createElement(CaseWorkspace, {
      c: h.c,
      tab: "review",
      role: "work",
      onBack() {},
      onTab() {},
      onAction() {},
      onDocument() {},
      onUpload() {},
    }),
  );
  assert.match(requestMaterialsHtml, /Запрос в ДВГА по Атырауской области/);
  assert.match(requestMaterialsHtml, /Приложение к запросу в ДВГА по Атырауской области/);
  assert.match(requestMaterialsHtml, /Запрос в ДВГА/);
  assert.doesNotMatch(requestMaterialsHtml, /Сформированные документы/);
  assert.ok(h.c.documents.some((document) => document.kind === "request"));
  assert.ok(
    h.c.documents.some((document) => document.kind === "request-appendix"),
  );
  h.c.appealDate = "2026-09-08";
  h.c.appealNumber = "ВОЗ-77";
  const requestDocument = h.c.documents.find(
    (document) => document.kind === "request",
  )!;
  const requestHtml = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "request",
      document: requestDocument,
    }),
  );
  assert.match(requestHtml, /ДВГА по Атырауской области/);
  assert.match(requestHtml, /08\.09\.2026/);
  assert.match(requestHtml, /ВОЗ-77/);
  assert.match(requestHtml, /ГУ «Управление образования»/);
  const appendixDocument = h.c.documents.find(
    (document) => document.kind === "request-appendix",
  )!;
  const appendixHtml = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "request-appendix",
      document: appendixDocument,
    }),
  );
  assert.match(appendixHtml, /Нарушение, по которым поступило возражение/);
  assert.match(
    appendixHtml,
    /<td><\/td><td>Требование к технической спецификации<\/td>/,
  );
  assert.doesNotMatch(
    appendixHtml,
    /Описание соответствует функциональной потребности/,
  );
  const appendixWithResponseHtml = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "request-appendix",
      document: appendixDocument,
      appendixFindingPreview: { [h.c.issues[0].id]: "Нарушение ДВГА" },
      appendixPreview: { [h.c.issues[0].id]: "Мотивированный ответ ДВГА" },
    }),
  );
  assert.match(appendixWithResponseHtml, /Нарушение ДВГА/);
  assert.match(appendixWithResponseHtml, /Мотивированный ответ ДВГА/);
  assert.match(renderToStaticMarkup(process()), /Направить на согласование/);
  h.run("send-request-approval", "work");
  assert.match(renderToStaticMarkup(process()), /Согласовать запрос/);
  h.run("approve-request", "director", { approved: "on" });
  assert.match(renderToStaticMarkup(process()), /Заполнить ответ ДВГА\/КВГА/);

  const control = harness(2);
  screen(control);
  const controlHtml = renderToStaticMarkup(
    createElement(ConsiderationProcess, {
      c: control.c,
      role: "work",
      onAction() {},
      onHistory() {},
    }),
  );
  assert.match(controlHtml, /Сформировать запрос/);
  assert.doesNotMatch(controlHtml, /Заседание, голоса и протокол/);
  assert.doesNotMatch(controlHtml, /Позиции комиссии/);
});

test("справка выводит доводы ДВГА и ДАВГА в печатной форме", () => {
  const h = harness(0);
  screen(h);
  h.run("request", "work", {
    recipient: "ДВГА по Атырауской области",
    deadline: "2026-09-10T18:00",
  });
  h.run("send-request-approval", "work");
  h.run("approve-request", "director", { approved: "on" });
  h.run(
    "fill-request-response",
    "dvga",
    Object.fromEntries(
      h.c.issues
        .filter((point) => point.disputed)
        .flatMap((point) => [
          [
            `authorityFinding_${point.id}`,
            "Нарушение, заполненное ДВГА",
          ],
          [`authorityResponse_${point.id}`, "Мотивированный ответ ДВГА"],
        ]),
    ),
  );
  h.run("position", "work");
  h.run("analysis", "work", {
    davgaArguments: "Доводы ДАВГА для справки",
    certificateMember_1: "ФИО 1",
    certificateMember_2: "ФИО 2",
  });
  assert.equal(h.c.status, "certificate_approval");
  const certificateMaterialsHtml = renderToStaticMarkup(
    createElement(CaseWorkspace, {
      c: h.c,
      tab: "review",
      role: "work",
      onBack() {},
      onTab() {},
      onAction() {},
      onDocument() {},
      onUpload() {},
    }),
  );
  assert.match(certificateMaterialsHtml, /<h4>Справка<\/h4>/);
  assert.match(certificateMaterialsHtml, /Скачать Word/);
  const certificateApprovalHtml = renderToStaticMarkup(
    createElement(ConsiderationProcess, {
      c: h.c,
      role: "work",
      onAction() {},
      onHistory() {},
    }),
  );
  assert.match(certificateApprovalHtml, /Заместитель директора ДАВГА/);
  h.run("approve-certificate", "director");
  assert.equal(h.c.status, "certificate_signed");
  assert.equal(nextAction(h.c)?.action, "sign-certificate");
  h.run("sign-certificate", "work");
  assert.equal(h.c.status, "certificate_approved");
  h.run("send-certificate-to-commission", "work");
  assert.equal(h.c.status, "documents_review");
  assert.equal(nextAction(h.c)?.action, "review-commission-documents");
  const commissionMaterialsHtml = renderToStaticMarkup(
    createElement(CaseWorkspace, {
      c: h.c,
      tab: "review",
      role: "work",
      onBack() {},
      onTab() {},
      onAction() {},
      onDocument() {},
      onUpload() {},
    }),
  );
  assert.match(commissionMaterialsHtml, /Полученный\(ые\) ответ на запрос\(ы\)/);
  assert.doesNotMatch(commissionMaterialsHtml, /<h4>Запрос в ДВГА<\/h4>/);
  assert.doesNotMatch(commissionMaterialsHtml, /<h4>Запрос в другие органы<\/h4>/);
  h.run("review-commission-documents", "commission");
  assert.equal(h.c.status, "commission_members");
  assert.equal(nextAction(h.c)?.action, "choose-commission-members");
  h.run("choose-commission-members", "commission", {
    protocolMember_1: "Председатель Апелляционной комиссии: ФИО",
    protocolMember_2: "Директор ДМБУА: ФИО",
  });
  assert.equal(h.c.status, "commission_voting");
  assert.equal(nextAction(h.c)?.action, "commission-vote");
  h.run(
    "commission-vote",
    "commission",
    {
      commissionMember: "protocol-member-1",
      ...Object.fromEntries(
        h.c.issues
          .filter((point) => point.disputed)
          .flatMap((point) => [
            [`commissionVote_${point.id}`, "yes"],
            [`commissionReason_${point.id}`, "Обоснование председателя"],
          ]),
      ),
    },
  );
  assert.equal(h.c.status, "commission_voting");
  h.run(
    "commission-vote",
    "commission",
    {
      commissionMember: "protocol-member-2",
      ...Object.fromEntries(
        h.c.issues
          .filter((point) => point.disputed)
          .flatMap((point) => [
            [`commissionVote_${point.id}`, "yes"],
            [`commissionReason_${point.id}`, "Обоснование члена АК"],
          ]),
      ),
    },
  );
  assert.equal(h.c.status, "circulated");
  assert.equal(
    h.c.votes?.[h.c.issues.find((point) => point.disputed)!.id]?.voteReasons?.[
      "protocol-member-1"
    ],
    "Обоснование председателя",
  );
  h.run("members", "work", { meetingConducted: "on" });
  assert.equal(h.c.status, "meeting");
  const certificate = h.c.documents.find(
    (document) => document.kind === "certificate",
  )!;
  const html = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "certificate",
      document: certificate,
    }),
  );
  assert.match(html, /Нарушение, заполненное ДВГА/);
  assert.match(html, /Мотивированный ответ ДВГА/);
  assert.match(html, /Доводы ДАВГА для справки/);
  assert.match(html, /Доводы рабочего органа \(ДАВГА МФ РК\):/);
  assert.match(html, /ФИО 1/);
  assert.match(html, /certificate-members-table/);
  assert.match(html, /ГУ «Управление образования»/);
});

test("повестка дня подставляет реквизиты отмеченного обращения", () => {
  const h = harness(0);
  h.c.appealType = "Возражение на аудиторский отчет";
  h.c.appealNumber = "В-17";
  h.c.appealDate = "2026-09-09";
  h.c.org = "КГП «Городской центр услуг»";
  h.c.issuer = "ДВГА по Атырауской области";
  h.c.assignee = "Тестовый исполнитель";
  h.c.issues[0].disputed = true;
  h.c.issues[0].authorityFinding = "Нарушение, указанное ДВГА";
  const html = renderToStaticMarkup(
    createElement(AgendaDocument, {
      cases: [h.c],
      meetingDate: "2026-09-24",
    }),
  );
  assert.match(html, /24\.09\.2026/);
  assert.match(html, /Возражение В-17 от 09\.09\.2026/);
  assert.match(html, /КГП «Городской центр услуг» на аудиторский отчет/);
  assert.match(html, /ДВГА по Атырауской области Нарушение, указанное ДВГА/);
  assert.doesNotMatch(
    html,
    /ДВГА по Атырауской области от Нарушение, указанное ДВГА/,
  );
  assert.match(html, /\(Тестовый исполнитель\)/);
});

test("итоги повестки фильтруются по дате и показывают голоса", () => {
  const h = harness(0);
  h.c.agendaMeetingDate = "2026-09-24";
  h.c.members = [
    {
      id: "chair",
      name: "Председатель",
      present: true,
      recused: false,
      reason: "",
    },
    {
      id: "member",
      name: "Член АК",
      present: true,
      recused: false,
      reason: "",
    },
  ];
  h.c.votes = Object.fromEntries(
    h.c.issues
      .filter((point) => point.disputed)
      .map((point) => {
        point.final = "accept";
        return [
          point.id,
          {
            yes: 1,
            no: 1,
            approved: true,
            chair: "chair",
            present: 2,
            eligible: 2,
            votes: { chair: "yes", member: "no" },
          },
        ];
      }),
  );
  const html = renderToStaticMarkup(
    createElement(AgendaResultsModal, {
      cases: [h.c],
      date: "2026-09-24",
      onClose() {},
    }),
  );
  assert.match(html, /Пункт повестки дня/);
  assert.match(html, /Голоса по каждому пункту/);
  assert.match(html, /Пункт 1: За — Председатель; Против — Член АК/);
  assert.match(html, /Удовлетворить/);
  const emptyHtml = renderToStaticMarkup(
    createElement(AgendaResultsModal, {
      cases: [h.c],
      date: "2026-09-25",
      onClose() {},
    }),
  );
  assert.match(emptyHtml, /нет направленных пунктов повестки дня/);
});

test("протокол формируется с выбранными участниками и голосами по пунктам", () => {
  const h = harness();
  const definition = actionForm("vote", h.c, "2026-09-10", {});
  assert.deepEqual(
    definition.fields.map((field) => field.name),
    ["number", "protocolDate", "secretary", "recommendations"],
  );
  h.c.status = "meeting";
  h.run("vote", "commission", {
    number: "ПР-17",
    protocolDate: "2026-09-10",
    protocolMember_1: "Председатель Апелляционной комиссии: ФИО",
    protocolMember_2: "Эксперт ОЮЛ «АЗК»: ФИО",
    ...Object.fromEntries(
      h.c.issues
        .filter((point) => point.disputed)
        .flatMap((point) => [
          [`protocolVote_${point.id}_protocol-member-1`, "yes"],
          [`protocolVote_${point.id}_protocol-member-2`, "no"],
        ]),
    ),
  });
  assert.deepEqual(
    h.c.members.map((member) => member.name),
    [
      "Председатель Апелляционной комиссии: ФИО",
      "Эксперт ОЮЛ «АЗК»: ФИО",
    ],
  );
  assert.equal(h.c.meeting?.audio, "");
  assert.equal(h.c.votes?.[h.c.issues.find((point) => point.disputed)!.id]?.yes, 1);
  const protocolHtml = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "protocol",
      protocolPreview: {
        date: "2026-09-10",
        number: "ПР-17",
        audio: "",
        members: h.c.members,
        votes: {},
      },
    }),
  );
  assert.match(protocolHtml, /Председатель Апелляционной комиссии: ФИО<br\/>/);
  assert.match(protocolHtml, /Эксперт ОЮЛ «АЗК»: ФИО<br\/>/);
  assert.doesNotMatch(
    protocolHtml,
    /Заместитель Председателя Апелляционной комиссии: Директор ДАВГА/,
  );
  assert.match(protocolHtml, /РЕШЕНИЕ удовлетворить /);

  const changedPreviewHtml = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "protocol",
      protocolPreview: {
        date: "2026-09-10",
        number: "ПР-17",
        audio: "",
        members: h.c.members,
        votes: Object.fromEntries(
          h.c.issues
            .filter((point) => point.disputed)
            .map((point) => [
              point.id,
              {
                "protocol-member-1": "no",
                "protocol-member-2": "yes",
              },
            ]),
        ),
      },
    }),
  );
  assert.match(
    changedPreviewHtml,
    /РЕШЕНИЕ об отказе в удовлетворении /,
  );

  const disputedPoints = h.c.issues.filter((point) => point.disputed);
  disputedPoints[0].final = "reject";
  assert.equal(overall(h.c), "partial");
  const partialProtocolHtml = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "protocol",
      protocolPreview: {
        date: "2026-09-10",
        number: "ПР-17",
        audio: "",
        members: h.c.members,
        votes: {},
      },
    }),
  );
  assert.match(partialProtocolHtml, /РЕШЕНИЕ удовлетворить частично /);
  disputedPoints.forEach((point) => {
    point.final = "reject";
  });
  assert.equal(overall(h.c), "reject");
  const rejectedProtocolHtml = renderToStaticMarkup(
    createElement(DocumentContent, {
      c: h.c,
      kind: "protocol",
      protocolPreview: {
        date: "2026-09-10",
        number: "ПР-17",
        audio: "",
        members: h.c.members,
        votes: {},
      },
    }),
  );
  assert.match(
    rejectedProtocolHtml,
    /РЕШЕНИЕ об отказе в удовлетворении /,
  );
});
