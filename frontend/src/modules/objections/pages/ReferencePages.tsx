import { Button, Notice, PageHeading } from "../../../components/ui";
import { useState } from "react";
import { STATUS } from "../../../data/constants";
import { CONTROL_STEPS, STEPS } from "../../../data/workflowDefinitions";
import type { AgendaRegistryEntry, ObjectionCase } from "../../../types";
import { formatDate } from "../../../utils/dateFormat";

const sources = [
  [
    "Z1500000392",
    "Закон о государственном аудите и финансовом контроле",
    "12.11.2015 № 392-V",
    "Статьи 58-1–58-5: специальный порядок возражений. Сопоставлена доступная копия; полная сверка текущей официальной редакции не завершена.",
  ],
  [
    "V2000020171",
    "Положение об апелляционной комиссии",
    "20.03.2020 № 302",
    "Материалы, заседание, голосование, протокол. Использована редакция через приказ № 70 от 21.01.2022; требуется окончательная сверка текущего текста.",
  ],
  [
    "V1800016689",
    "Правила внутреннего государственного аудита и финансового контроля",
    "19.03.2018 № 392",
    "Пункты 101–104, приложение 12-1. Проверены нормы подачи возражения и учёта третьих лиц по доступной копии.",
  ],
  [
    "V1500012599",
    "Правила проведения камерального контроля",
    "30.11.2015 № 598",
    "Пункты 23–28, приложения 6 и 7. Дополнительно проверены доступные тексты изменений № 282 и № 523 за 2026 год.",
  ],
  [
    "Z2400000106",
    "Закон о государственных закупках",
    "01.07.2024 № 106-VIII",
    "Статья 25: отдельная жалоба участника закупки. Не смешивается с возражением объекта на уведомление.",
  ],
  [
    "V2400035238",
    "Правила осуществления государственных закупок",
    "09.10.2024 № 687",
    "Глава 19: обжалование итогов конкурса/аукциона. Самостоятельный маршрут вне трёх текущих сценариев.",
  ],
  [
    "K2000000350",
    "Административный процедурно-процессуальный кодекс",
    "29.06.2020 № 350-VI",
    "Статьи 91–100, 136: общий порядок административной жалобы и судебного обжалования.",
  ],
  [
    "K1500000375",
    "Предпринимательский кодекс",
    "29.10.2015 № 375-V",
    "Статья 157: обжалование решений и действий при контроле. Применимость проверяется по виду контроля и субъекту.",
  ],
];

export function SourcesPage() {
  return (
    <>
      <PageHeading
        title="Нормативная база"
        subtitle="Шесть документов со скриншотов и связанные кодексы"
      />
      <Notice tone="amber">
        <strong>Статус нормативной проверки — 08.09.2026</strong>
        <p>
          Процессы сопоставлены с доступными текстами. Полные страницы «Әділет»
          недоступны из среды исследования, поэтому полная сверка всех
          действующих редакций не завершена. Прототип предназначен для
          согласования модели с ДВГА.
        </p>
      </Notice>
      <section className="card">
        <div className="card-body">
          {sources.map(([id, name, number, note]) => (
            <article className="source-entry" key={id}>
              <h3>
                <a
                  href={`https://adilet.zan.kz/rus/docs/${id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {name}
                </a>
              </h3>
              <p className="muted">{number}</p>
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="card card-spaced">
        <div className="card-body">
          <h3>Дополнительная сверка изменений 2026 года</h3>
          <p>
            Приказ № 282: возражение и доказательства направляются через портал
            и/или ту цифровую систему, по которой поступило уведомление;
            заключение возвращается по этому каналу.{" "}
            <a
              href="https://zakon.uchet.kz/rus/docs/V2600038574"
              target="_blank"
              rel="noreferrer"
            >
              Проверенный текст изменений
            </a>
            .
          </p>
          <p>
            Приказ № 523: уточнены полномочия и пункт 28 о приостановлении
            расходных операций; его действие приостанавливается на период
            рассмотрения возражения.{" "}
            <a
              href="https://cdb.kz/sistema/pravovaya-baza/o-vnesenii-izmeneniy-v-nekotorye-prikazy-ministra-finansov-respubliki-kazakhstan-prikaz-523/"
              target="_blank"
              rel="noreferrer"
            >
              Проверенный текст изменений
            </a>
            .
          </p>
          <p className="muted">
            Эта дополнительная сверка не заменяет проверки консолидированных
            официальных редакций и утверждения форм документов.
          </p>
        </div>
      </section>
    </>
  );
}

export function ProcessesPage() {
  return (
    <>
      <PageHeading
        title="Бизнес-процессы"
        subtitle="Разные предметы обжалования — разные маршруты рассмотрения"
      />
      <div className="process-grid">
        {[
          {
            title: "Уведомление камерального контроля",
            deadline: "Подача: 5 рабочих дней. Рассмотрение: 15 рабочих дней.",
            steps: STEPS,
          },
          {
            title: "Аудиторский отчёт",
            deadline: "Подача: 10 рабочих дней. Рассмотрение: 30 рабочих дней.",
            steps: STEPS,
          },
          {
            title: "Акт профилактического контроля",
            deadline:
              "В тестовой модели АППК: подача — 3 месяца, рассмотрение — 20 рабочих дней. Есть специальные правила и исключения.",
            steps: CONTROL_STEPS,
          },
        ].map((process) => (
          <section className="card" key={process.title}>
            <div className="card-head">
              <h3>{process.title}</h3>
            </div>
            <div className="card-body">
              <p>{process.deadline}</p>
              <ol className="process-steps">
                {process.steps.map(([key, label]) => (
                  <li key={key}>{label}</li>
                ))}
              </ol>
            </div>
          </section>
        ))}
      </div>
      <section className="card card-spaced">
        <div className="card-body">
          <h3>Что важно при согласовании</h3>
          <ul className="plain-list">
            <li>
              ДВГА готовит позицию и исполняет результат; специальное возражение
              рассматривает комиссия при уполномоченном органе.
            </li>
            <li>
              В уведомлении остаются неоспоренные пункты и нарушения, по которым
              доводы отклонены.
            </li>
            <li>
              По аудиторскому отчёту учитываются позиции затронутых третьих лиц.
            </li>
            <li>
              По акту профконтроля сначала устанавливаются вид контроля,
              компетентный орган и применимый специальный порядок.
            </li>
            <li>
              Отказ в рассмотрении и отказ в удовлетворении доводов — разные
              результаты.
            </li>
            <li>
              Срок рассмотрения, исполнение исходного документа и исполнение
              решения при судебном обжаловании учитываются раздельно.
            </li>
            <li>
              Дополнение объекта может продлить специальное возражение; обычное
              вложение файла этого не делает.
            </li>
            <li>
              Дата отправки результата и дата его вручения фиксируются отдельно.
            </li>
          </ul>
          <Notice>
            Жалоба участника конкурса/аукциона по статье 25 Закона о госзакупках
            — отдельный процесс у заказчика/организатора. Он не входит в три
            текущих тестовых дела.
          </Notice>
        </div>
      </section>
    </>
  );
}

export function SessionsPage({
  cases,
  agendas,
  onOpen,
  onAgenda,
  onOpenAgendaCase,
  onPreviewAgenda,
  onDownloadAgenda,
  onGenerateAgendaResults,
  onPreviewAgendaResults,
  onDownloadAgendaResults,
}: {
  cases: ObjectionCase[];
  agendas: AgendaRegistryEntry[];
  onOpen: (c: ObjectionCase) => void;
  onAgenda: (cases: ObjectionCase[]) => void;
  onOpenAgendaCase: (caseId: string) => void;
  onPreviewAgenda: (agenda: AgendaRegistryEntry) => void;
  onDownloadAgenda: (agenda: AgendaRegistryEntry) => void;
  onGenerateAgendaResults: (agenda: AgendaRegistryEntry) => void;
  onPreviewAgendaResults: (agenda: AgendaRegistryEntry) => void;
  onDownloadAgendaResults: (agenda: AgendaRegistryEntry) => void;
}) {
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [section, setSection] = useState<"sessions" | "agendas">("sessions");
  const pendingAgendaResults = agendas.filter((agenda) => !agenda.resultsHtml).length;
  const visible = cases.filter(
    (c) =>
      c.type !== "control" &&
      (c.meeting ||
        ["documents_review", "commission_members", "commission_voting", "circulated", "hearing", "hearing_ready", "meeting"].includes(
          c.status,
        )),
  );
  const allSelected =
    visible.length > 0 && visible.every((item) => selectedCaseIds.includes(item.id));
  const toggleCase = (caseId: string) =>
    setSelectedCaseIds((selected) =>
      selected.includes(caseId)
        ? selected.filter((id) => id !== caseId)
        : [...selected, caseId],
    );
  return (
    <>
      <PageHeading
        title="Заседания комиссии"
        subtitle="Подготовка, голосование и подписанные протоколы"
        action={section === "sessions" ? (
          <div className="session-heading-actions">
            <Button
              primary
              disabled={!selectedCaseIds.length}
              onClick={() =>
                onAgenda(visible.filter((c) => selectedCaseIds.includes(c.id)))
              }
            >
              Сформировать повестку дня
            </Button>
          </div>
        ) : undefined}
      />
      <div className="session-tabs" role="tablist" aria-label="Разделы заседаний">
        <button
          type="button"
          role="tab"
          aria-selected={section === "sessions"}
          className={section === "sessions" ? "active" : ""}
          onClick={() => setSection("sessions")}
        >
          Заседания комиссии
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "agendas"}
          className={section === "agendas" ? "active" : ""}
          onClick={() => setSection("agendas")}
        >
          Реестр повесток
          {pendingAgendaResults > 0 && (
            <span
              className="session-tab-badge"
              aria-label={`Требуется сформировать итогов: ${pendingAgendaResults}`}
            >
              {pendingAgendaResults}
            </span>
          )}
        </button>
      </div>
      {section === "sessions" ? (
        <>
          <Notice>
            По Положению заседания проводятся по вторникам и четвергам; допускаются
            другие дни. При отсутствии председателя и заместителя заседание не
            проводится. Секретарь не входит в голосующий состав.
          </Notice>
          <section className="card">
            <div className="table-scroll">
              <table className="registry-table">
            <thead>
              <tr>
                <th>
                  <label className="session-case-selector">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={!visible.length}
                      aria-label="Выбрать все обращения"
                      onChange={() =>
                        setSelectedCaseIds(
                          allSelected ? [] : visible.map((item) => item.id),
                        )
                      }
                    />
                    <span>Обращение</span>
                  </label>
                </th>
                <th>Объект</th>
                <th>Заседание</th>
                <th>Протокол</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td>
                    <label className="session-case-selector">
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.includes(c.id)}
                        onChange={() => toggleCase(c.id)}
                        aria-label={`Выбрать обращение ${c.id}`}
                      />
                      <span>{c.id}</span>
                    </label>
                  </td>
                  <td>{c.org}</td>
                  <td>{formatDate(c.meeting?.date)}</td>
                  <td>{c.meeting?.number || "Готовится"}</td>
                  <td>{STATUS[c.status]}</td>
                  <td>
                    <Button onClick={() => onOpen(c)}>Открыть</Button>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <h3>Материалы к заседанию ещё не подготовлены</h3>
                      <p>
                        После подготовки справки обращение появится в этом
                        разделе.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="card">
          <div className="table-scroll">
            <table className="registry-table agenda-registry-table">
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Дата заседания</th>
                  <th>Сформированная повестка в Word</th>
                  <th>Ссылки на карточки обращений</th>
                  <th>Итоги по повестке</th>
                </tr>
              </thead>
              <tbody>
                {[...agendas]
                  .sort((a, b) => b.number - a.number)
                  .map((agenda) => (
                    <tr key={agenda.id}>
                      <td>{agenda.number}</td>
                      <td>{formatDate(agenda.meetingDate)}</td>
                      <td>
                        <div className="agenda-registry-actions">
                          <Button onClick={() => onPreviewAgenda(agenda)}>
                            Просмотр
                          </Button>
                          <Button onClick={() => onDownloadAgenda(agenda)}>
                            Скачать Word
                          </Button>
                        </div>
                      </td>
                      <td>
                        <div className="agenda-case-links">
                          {agenda.caseIds.map((caseId) => (
                            <button
                              key={caseId}
                              type="button"
                              className="text-button"
                              onClick={() => onOpenAgendaCase(caseId)}
                            >
                              {caseId}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        {agenda.resultsHtml ? (
                          <div className="agenda-registry-actions">
                            <Button onClick={() => onPreviewAgendaResults(agenda)}>
                              Просмотр
                            </Button>
                            <Button onClick={() => onDownloadAgendaResults(agenda)}>
                              Скачать Word
                            </Button>
                          </div>
                        ) : (
                          <Button
                            primary
                            onClick={() => onGenerateAgendaResults(agenda)}
                          >
                            Сформировать итоги по повестке дня
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                {!agendas.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        <h3>Направленных повесток пока нет</h3>
                        <p>После направления повестки членам АК она появится в реестре.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
