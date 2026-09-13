import { Button, Notice } from "../../../components/ui";
import { ROLES, STATUS } from "../../../data/constants";
import type { Action, CaseStatus, ObjectionCase, Role } from "../../../types";
import { additionalActions, nextAction } from "../services/workflow";

type ProcessStage = {
  label: string;
  description: string;
  statuses: CaseStatus[];
};

const OBJECTION_STAGES: ProcessStage[] = [
  {
    label: "Приём",
    description: "Допустимость и компетенция",
    statuses: ["received"],
  },
  {
    label: "Формирование запроса в ДВГА/КВГА и др",
    description: "Подготовка и направление запросов, получение ответов",
    statuses: [
      "accepted",
      "requested",
      "request_approval",
      "request_approved",
      "response_ready",
      "materials",
      "certificate_approval",
      "certificate_signed",
      "certificate_approved",
      "documents_review",
    ],
  },
  {
    label: "Заседание",
    description: "Голосование и проведение заседания по делу",
    statuses: ["commission_voting", "circulated"],
  },
  {
    label: "Решение",
    description: "Голоса и протокол",
    statuses: ["hearing", "hearing_ready", "meeting", "protocol"],
  },
  {
    label: "Исполнение",
    description: "Направление результата и исполнение",
    statuses: ["decided", "delivered", "completed"],
  },
];

const CONTROL_STAGES: ProcessStage[] = [
  {
    label: "Приём",
    description: "Допустимость и компетенция",
    statuses: ["received"],
  },
  {
    label: "Формирование запроса в ДВГА/КВГА и др",
    description: "Подготовка и направление запросов, получение ответов",
    statuses: [
      "accepted",
      "forwarded",
      "requested",
      "request_approval",
      "request_approved",
      "response_ready",
      "materials",
    ],
  },
  {
    label: "Заслушивание",
    description: "Позиции заявителя и органа",
    statuses: ["hearing", "hearing_ready"],
  },
  { label: "Решение", description: "Решение по жалобе", statuses: ["meeting"] },
  {
    label: "Исполнение",
    description: "Направление результата и исполнение",
    statuses: ["decided", "delivered", "completed"],
  },
];

const TASK_HELP: Partial<Record<Action, string>> = {
  screen:
    "Проверьте заявителя, исходный документ, срок подачи и компетенцию органа. Назначьте ответственного и зафиксируйте основание принятия к рассмотрению.",
  request:
    "Сформируйте один или оба вида запросов. Когда все документы готовы, направьте их директору ДАВГА на согласование.",
  "send-request-approval":
    "Проверьте сформированные запрос и приложение, затем направьте их директору ДАВГА на согласование.",
  "approve-request":
    "Проверьте сформированные документы и подтвердите согласование запроса.",
  "fill-request-response":
    "Заполните мотивированный ответ по каждому пункту и приложите подтверждающие документы.",
  position:
    "Вложите полученные файлы в материалы дела, затем подтвердите поступление ответа.",
  analysis:
    "Заполните доводы ДВГА и позиции членов апелляционной комиссии. Система сформирует справку по шаблону.",
  "approve-certificate":
    "Проверьте сформированную справку и согласуйте её для направления членам апелляционной комиссии.",
  "sign-certificate":
    "Подпишите согласованную справку. После этого она будет готова к направлению вместе с материалами членам апелляционной комиссии.",
  "send-certificate-to-commission":
    "Направьте согласованную справку и все документы по обращению членам апелляционной комиссии для ознакомления.",
  "review-commission-documents":
    "Ознакомьтесь со справкой и материалами обращения. После подтверждения откроется голосование членов апелляционной комиссии.",
  "commission-vote":
    "Выберите «За» или «Против» по каждому оспариваемому пункту и сохраните результаты голосования.",
  members:
    "Подтвердите, что заседание по данному делу проведено. После этого обращение перейдёт на этап принятия решения.",
  hearing:
    "Укажите порядок извещения и дату заслушивания. Если применяется предусмотренное основание для его непроведения, зафиксируйте его в форме.",
  "hearing-held":
    "Зафиксируйте участие сторон, их позиции и результаты состоявшегося заслушивания.",
  vote: "Отметьте присутствующих и отводы, внесите голоса по каждому пункту. Система проверит кворум и результаты голосования.",
  sign: "Проверьте результаты голосования и зарегистрируйте подписание протокола. После этого оформляется результат рассмотрения.",
  deliver:
    "Оформите результат, укажите канал направления и порядок дальнейшего обжалования. Получение результата учитывается отдельно.",
  execute:
    "Зафиксируйте исполнение принятого решения и его последствия для исходного документа.",
  forward:
    "Проверьте возможность удовлетворения жалобы органом, чей акт обжалуется, либо оформите передачу дела вышестоящему органу.",
  "control-analysis":
    "Изучите административное дело, доводы и доказательства. Зафиксируйте анализ и проект решения по пунктам.",
  "control-decision":
    "Оформите мотивированное решение компетентного органа с учётом материалов дела и заслушивания сторон.",
  resume:
    "Зарегистрируйте ответ на внешний запрос. Рассмотрение продолжится с этапа, на котором срок был приостановлен.",
  "court-result":
    "Зарегистрируйте поступивший судебный акт и его последствия для дальнейшего исполнения решения.",
};

export default function ConsiderationProcess({
  c,
  role,
  onAction,
  onHistory,
}: {
  c: ObjectionCase;
  role: Role;
  onAction: (action: Action, role: Role) => void;
  onHistory: () => void;
}) {
  const next = nextAction(c);
  const stages = c.type === "control" ? CONTROL_STAGES : OBJECTION_STAGES;
  const currentStatus = c.status === "paused" ? c.resumeStatus : c.status;
  const inRequestFormationStage = stages[1].statuses.includes(
    currentStatus ?? c.status,
  );
  const availableExtras = additionalActions(c).filter(
    (option) => option.action !== "upload",
  );
  const extras = inRequestFormationStage
    ? availableExtras.filter((option) => option.action === "supplement")
    : availableExtras;
  const lastEvent = c.history.at(-1);
  const taskTitle =
    next?.action === "position" ? "Зафиксировать полученный ответ" : next?.label;
  const taskOwner =
    next?.action === "approve-certificate"
      ? "Заместитель директора ДАВГА"
      : next
        ? ROLES[next.role]
        : "";

  return (
    <section
      className="consideration-process"
      aria-label="Процесс рассмотрения"
    >
      <div className="section-heading">
        <h3>Процесс рассмотрения</h3>
        <span className="badge blue">{STATUS[c.status]}</span>
      </div>
      <ol className="consideration-stages" aria-label="Этапы рассмотрения">
        {stages.map((stage, index) => {
          const current =
            !!currentStatus && stage.statuses.includes(currentStatus);
          return (
            <li key={stage.label} aria-current={current ? "step" : undefined}>
              <span className="consideration-stage-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{stage.label}</strong>
                <span>{stage.description}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {next ? (
        <div className="consideration-task">
          <div>
            <span className="consideration-eyebrow">Текущая задача</span>
            <h4>{taskTitle}</h4>
            <p>{TASK_HELP[next.action]}</p>
            <p className="consideration-owner">
              Исполнитель: <strong>{taskOwner}</strong>
            </p>
          </div>
          <div className="consideration-task-action">
            <Button primary onClick={() => onAction(next.action, next.role)}>
              {c.status === "received" ? "Начать рассмотрение" : next.label}
            </Button>
            {c.status === "accepted" && (
              <Button
                primary
                onClick={() => onAction("request-other", "work")}
              >
                Сформировать запрос в другой орган
              </Button>
            )}
            {c.status === "accepted" && (
              <Button
                primary
                disabled={!c.requests.length}
                onClick={() => onAction("send-request-approval", "work")}
              >
                Направить на согласование
              </Button>
            )}
            {role !== next.role && (
              <small>Действие выполняет {taskOwner}.</small>
            )}
            <small>
              {c.status === "accepted"
                ? "Сначала сформируйте нужные документы, затем направьте их на согласование."
                : "Заполните форму и сохраните действие — откроется следующая задача."}
            </small>
          </div>
        </div>
      ) : (
        <Notice tone={c.status === "completed" ? "green" : "amber"}>
          <strong>{STATUS[c.status]}</strong>
          <p>
            {c.status === "completed"
              ? "Рассмотрение и учёт исполнения завершены. Результат доступен ниже, сформированные документы — во вкладке «Документы»."
              : "Рассмотрение по существу не продолжается. Основание сохранено в истории и документах дела."}
          </p>
        </Notice>
      )}
      {lastEvent && (
        <div className="consideration-last-event">
          <span>
            <span className="muted">Последнее событие: </span>
            {lastEvent.title}
          </span>
          <button className="text-button" onClick={onHistory}>
            Вся история
          </button>
        </div>
      )}
      {currentStatus !== "received" && extras.length > 0 && (
        <details className="consideration-extras">
          <summary>Другие действия по делу</summary>
          <div>
            {extras.map((option) => (
              <Button
                key={option.action}
                onClick={() => onAction(option.action, option.role)}
              >
                {option.label}
                <span className="consideration-action-role">
                  {ROLES[option.role]}
                </span>
              </Button>
            ))}
          </div>
          <p className="small muted">
            Доступные действия зависят от этапа и исполнителя.
          </p>
        </details>
      )}
    </section>
  );
}
