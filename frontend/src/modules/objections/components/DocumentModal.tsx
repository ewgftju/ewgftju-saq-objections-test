import { renderToStaticMarkup } from "react-dom/server";
import { useState } from "react";
import { Button, Modal } from "../../../components/ui";
import { OUTCOMES } from "../../../data/constants";
import type {
  CaseCertificate,
  CaseDocument,
  CaseRequest,
  CommissionMember,
  ObjectionCase,
} from "../../../types";
import {
  formatDate,
  formatDateTime,
  formatMoney,
} from "../../../utils/dateFormat";
import { downloadFile } from "../../../utils/download";
import { DEMO_USER } from "../../../config";

export function DocumentContent({
  c,
  kind,
  document,
  requestPreview,
  appendixFindingPreview,
  appendixPreview,
  certificatePreview,
  protocolPreview,
}: {
  c: ObjectionCase;
  kind: string;
  document?: CaseDocument;
  requestPreview?: Pick<
    CaseRequest,
    "recipient" | "deadline" | "customText" | "template" | "author"
  >;
  appendixFindingPreview?: Record<string, string>;
  appendixPreview?: Record<string, string>;
  certificatePreview?: CaseCertificate;
  protocolPreview?: {
    date: string;
    number: string;
    audio: string;
    recommendations?: string;
    members: CommissionMember[];
    votes: Record<string, Record<string, string>>;
    voteReasons?: Record<string, Record<string, string>>;
  };
}) {
  const snapshot = document?.snapshot ? { ...c, ...document.snapshot } : c;
  const request =
    requestPreview ||
    (document?.requestId
      ? c.requests.find((item) => item.id === document.requestId)
      : undefined);
  const certificate = certificatePreview || snapshot.certificate || undefined;
  const title =
    document?.name ||
    (kind === "source"
      ? c.document.name
      : kind === "original"
        ? c.type === "control"
          ? "Жалоба"
          : "Возражение"
        : "Материал обращения");
  if (kind === "request" && request && request.template === "other")
    return (
      <article className="print-document other-request-template">
        <div className="other-request-template-header">
          <div>
            ҚАЗАҚСТАН РЕСПУБЛИКАСЫ
            <br />
            ҚАРЖЫ МИНИСТРЛІГІ
          </div>
          <span>ҚР</span>
          <div>
            МИНИСТЕРСТВО ФИНАНСОВ
            <br />
            РЕСПУБЛИКИ КАЗАХСТАН
          </div>
        </div>
        <div className="other-request-template-contacts">
          <span>
            010000, Астана қаласы, Мәңгілік Ел даңғылы 8, 4-кіреберіс
            <br />
            тел.: +7 (7172) 75-04-71, 75-04-89, факс: 75-03-52
            <br />
            administrator@minfin.gov.kz
          </span>
          <span>
            010000, город Астана, проспект Мәңгілік Ел, 8, подъезд 4
            <br />
            тел.: +7 (7172) 75-04-71, 75-04-89, факс: 75-03-52
            <br />
            administrator@minfin.gov.kz
          </span>
        </div>
        <div className="other-request-template-line" />
        <p className="other-request-template-recipient">
          <b>{request.recipient || "<Кому направить запрос>"}</b>
        </p>
        <p className="other-request-template-body">
          {request.customText || "<Текст запроса>"}
        </p>
        <div className="other-request-template-signature">
          <b>
            Ішкі мемлекеттік аудит
            <br />
            бойынша апелляция
            <br />
            департаментінің директоры
          </b>
          <b>Ш. Күреңбек тегі</b>
        </div>
        <p className="other-request-template-executor">
          Орын.: {request.author || DEMO_USER.fullName}
          <br />
          Тел.: 00-00-00
        </p>
      </article>
    );

  if (kind === "request" && request)
    return (
      <article className="print-document request-template">
        <div className="request-template-header">
          <div>
            ҚАЗАҚСТАН РЕСПУБЛИКАСЫ
            <br />
            ҚАРЖЫ МИНИСТРЛІГІ
          </div>
          <span>ҚР</span>
          <div>
            МИНИСТЕРСТВО ФИНАНСОВ
            <br />
            РЕСПУБЛИКИ КАЗАХСТАН
          </div>
        </div>
        <div className="request-template-line" />
        <p className="request-template-recipient">
          <b>{request.recipient || "Кому направить запрос"}</b>
        </p>
        <p
          className={`request-template-body ${
            request.customText === undefined ? "standard" : "custom"
          }`}
        >
          {request.customText !== undefined
            ? request.customText
            :
            `Қазақстан Республикасы Қаржы министрлігінің апелляциялық
комиссиясының қарауына «${c.org}» ${formatDate(c.appealDate || c.filed)}
жылғы №${c.appealNumber || c.document.number} камералдық бақылау
нәтижелері бойынша анықталған бұзушылықтарды жою туралы
хабарламаларда көрсетілген бұзушылықтарға қарсылықтарының келіп
түсуіне байланысты ${formatDateTime(request.deadline)} мерзімде
қарсылықтың дәлелдері бойынша дәлелді жауапты және растайтын
құжаттарды қоса бере отырып ұсынуыңызды талап етеміз.`}
        </p>
        <p>Қосымша __ бетте.</p>
        <div className="request-template-signature">
          <b>Апелляция департаментінің директоры</b>
          <span>________________</span>
        </div>
      </article>
    );

  if (kind === "request-appendix")
    return (
      <article className="print-document appendix-template">
        <p className="appendix-template-number">Таблица №1</p>
        <table>
          <thead>
            <tr>
              <th>№ п-п</th>
              <th>Нарушение, по которым поступило возражение</th>
              <th>Возражение объекта аудита</th>
              <th>
                Мотивированный ответ ДВГА по доводам возражения объекта аудита
                с приложением подтверждающих документов по фактам нарушений
              </th>
            </tr>
          </thead>
          <tbody>
            {snapshot.issues
              .filter((point) => point.disputed)
              .map((point) => (
                <tr key={point.id}>
                  <td>{point.number}</td>
                  <td>{appendixFindingPreview?.[point.id] ?? point.authorityFinding ?? ""}</td>
                  <td>{point.title}</td>
                  <td aria-label="Мотивированный ответ ДВГА">
                    {appendixPreview?.[point.id] ?? point.position ?? ""}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </article>
    );

  if (kind === "certificate") {
    const applicantArguments = snapshot.issues
      .filter((point) => point.disputed)
      .map((point) => point.argument)
      .join("\n");
    const disputedPoints = snapshot.issues
      .filter((point) => point.disputed)
      .map((point) => point.title)
      .join("; ");
    const authorityArguments = snapshot.issues
      .filter((point) => point.disputed)
      .map(
        (point) =>
          `Пункт ${point.number}. Нарушение: ${point.authorityFinding || "—"}\nМотивированный ответ: ${point.position || "—"}`,
      )
      .join("\n\n");
    return (
      <article className="print-document certificate-template">
        <h1>Справка</h1>
        <h2>по результатам изучения и анализа возражения</h2>
        <p className="certificate-template-intro">
          В Министерство финансов Республики Казахстан поступило возражение от{" "}
          {formatDate(snapshot.appealDate || snapshot.filed)} года №
          {snapshot.appealNumber || snapshot.document.number} «{snapshot.org}»,
          БИН {snapshot.bin} (далее – объект государственного аудита) к
          уведомлению {snapshot.issuer} от {formatDate(snapshot.document.date)}
          года №{snapshot.document.number}.
        </p>
        <p className="certificate-template-point-list">{disputedPoints || "—"}</p>
        <p className="certificate-template-lead">
          По результатам проведенного анализа рабочий орган (ДАВГА) сообщает
          следующее:
        </p>
        <p className="certificate-template-line">
          <b>Доводы ДВГА:</b> {authorityArguments || "—"}
        </p>
        <p className="certificate-template-line">
          <b>Доводы объекта гос. аудита (заявителя):</b>{" "}
          {applicantArguments || "—"}
        </p>
        <p className="certificate-template-line">
          <b>Доводы рабочего органа (ДАВГА МФ РК):</b>{" "}
          {certificate?.davgaArguments || "—"}
        </p>
        <table className="certificate-members-table">
          <tbody>
            <tr>
              {(certificate?.memberPositions.length
                ? certificate.memberPositions
                : [{ id: "preview", name: "ФИО члена АК", argument: "" }]
              ).map((member) => (
                <th key={member.id}>{member.name}</th>
              ))}
            </tr>
            <tr>
              {(certificate?.memberPositions.length
                ? certificate.memberPositions
                : [{ id: "preview", name: "", argument: "" }]
              ).map((member) => (
                <td key={member.id} aria-label={`Довод ${member.name}`} />
              ))}
            </tr>
          </tbody>
        </table>
      </article>
    );
  }

  if (kind === "protocol") {
    const meeting = protocolPreview || snapshot.meeting;
    const members = protocolPreview?.members || snapshot.members;
    const presentMembers = members.filter((member) => member.present);
    const votes = protocolPreview?.votes || snapshot.votes;
    const outcome = snapshot.issues
      .filter((point) => point.disputed)
      .map((point) => point.final || point.proposal);
    const decision = outcome.length && outcome.every((item) => item === "reject")
      ? "отказать"
      : outcome.length && outcome.every((item) => item === "accept")
        ? "удовлетворить"
        : "удовлетворить частично";
    return (
      <article className="print-document protocol-template">
        <h1>
          ПРОТОКОЛ № {meeting?.number || "<Номер протокола>"}
          <br />
          заседания Апелляционной комиссии
        </h1>
        <div className="protocol-template-place-date">
          <span>город Астана</span>
          <span>{formatDate(meeting?.date)}</span>
        </div>
        <p>
          <b>ПРИСУТСТВОВАЛИ (онлайн, Zoom):</b>
          <br />
          {presentMembers.length
            ? presentMembers.map((member) => (
                <span key={member.id}>
                  {member.name}
                  <br />
                </span>
              ))
            : "—"}
        </p>
        <p className="protocol-template-intro">
          Возражение «{snapshot.org}», БИН {snapshot.bin} от{" "}
          {formatDate(snapshot.appealDate || snapshot.filed)} года №
          {snapshot.appealNumber || snapshot.document.number} к уведомлению{" "}
          {snapshot.issuer} от {formatDate(snapshot.document.date)} года №
          {snapshot.document.number}.
        </p>
        <p>
          Количество присутствовавших членов Апелляционной комиссии: {presentMembers.length}.
          <br />
          <b>Результаты голосования членов Апелляционной комиссии:</b>
        </p>
        <table className="protocol-votes-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Суть вопроса / член Апелляционной комиссии</th>
              <th>За / против</th>
              <th>Обоснование</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.issues
              .filter((point) => point.disputed)
              .flatMap((point) => [
                <tr key={`${point.id}-question`}>
                  <td>{point.number}</td>
                  <td colSpan={3}>{point.title}</td>
                </tr>,
                ...presentMembers.map((member) => (
                  <tr key={`${point.id}-${member.id}`}>
                    <td />
                    <td>{member.name}</td>
                    <td>
                      {member.recused
                        ? "Не голосует"
                        : (votes?.[point.id] as { votes?: Record<string, string> } | undefined)?.votes?.[member.id] === "yes" ||
                            protocolPreview?.votes?.[point.id]?.[member.id] === "yes"
                          ? "За"
                          : (votes?.[point.id] as { votes?: Record<string, string> } | undefined)?.votes?.[member.id] === "no" ||
                              protocolPreview?.votes?.[point.id]?.[member.id] === "no"
                            ? "Против"
                            : "—"}
                    </td>
                    <td>
                      {(
                        votes?.[point.id] as
                          | { voteReasons?: Record<string, string> }
                          | undefined
                      )?.voteReasons?.[member.id] ||
                        protocolPreview?.voteReasons?.[point.id]?.[member.id] ||
                        member.reason ||
                        "—"}
                    </td>
                  </tr>
                )),
              ])}
          </tbody>
        </table>
        <p className="protocol-template-result">
          На основании результатов голосования членов Апелляционной комиссии принято РЕШЕНИЕ {decision} {snapshot.appealType} {snapshot.org} от {formatDate(snapshot.appealDate || snapshot.filed)} года №{snapshot.appealNumber || snapshot.document.number}.
        </p>
        <p className="protocol-template-recommendations">
          Рекомендации: {meeting?.recommendations || "—"}
        </p>
        <div className="protocol-template-signatures">
          {presentMembers.map((member) => (
            <p key={member.id}>Член Апелляционной комиссии: __________________ {member.name}</p>
          ))}
          <p>Секретарь Апелляционной комиссии: __________________ ФИО</p>
        </div>
      </article>
    );
  }

  return (
    <article className="print-document">
      <p className="document-watermark">
        ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ · ДАННЫЕ ВЫМЫШЛЕНЫ · БЕЗ ЭЦП
      </p>
      <h2>{title}</h2>
      <p>
        <b>Объект:</b> {c.org}
        <br />
        <b>БИН:</b> {c.bin}
        <br />
        <b>Местонахождение:</b> {c.address}
        <br />
        <b>Заявитель:</b> {c.applicant}
      </p>
      <p>
        <b>Орган, чей документ обжалуется:</b> {c.issuer}
        <br />
        <b>Исходный документ:</b> {c.document.name} № {c.document.number} от{" "}
        {formatDate(c.document.date)}
        <br />
        <b>Обращение:</b> {c.id}
      </p>
      {kind === "source" && (
        <>
          <p>
            Выписка для тестового сценария. Не является полным исходным
            документом.
          </p>
          {c.issues.map((point) => (
            <p key={point.id}>
              <b>Пункт {point.number}.</b> {point.finding}
            </p>
          ))}
        </>
      )}
      {kind === "original" && (
        <>
          <p>
            <b>Адресат:</b> {c.authority}
            <br />
            <b>Копия:</b> {c.issuer}
            <br />
            <b>Подача:</b> {formatDate(c.filed)} · {c.channel}
          </p>
          <p>
            <b>Требования:</b> {c.request}
          </p>
          {c.issues
            .filter((point) => point.disputed)
            .map((point) => (
              <p key={point.id}>
                <b>
                  Пункт {point.number} — {point.title}.
                </b>
                <br />
                {point.argument}
                <br />
                <b>Доказательства:</b> {point.evidence}
              </p>
            ))}
          <p>
            <b>Подписант:</b> {c.applicant}. Подпись имитируется.
          </p>
        </>
      )}
      {kind === "protocol" && (
        <>
          <p>
            <b>Протокол:</b> № {snapshot.meeting?.number || "Проект"} от{" "}
            {formatDate(snapshot.meeting?.date)}
            <br />
            <b>Присутствовали:</b>{" "}
            {snapshot.members
              .filter((member) => member.present)
              .map((member) => member.name)
              .join(", ")}
            <br />
            <b>Секретарь:</b> рабочий орган, без права голоса.
            <br />
            <b>Аудиофиксация:</b>{" "}
            {snapshot.meeting?.audio || "Не зарегистрирована"}
          </p>
          {snapshot.issues
            .filter((point) => point.disputed)
            .map((point) => (
              <section key={point.id}>
                <h3>
                  Пункт {point.number} · {point.title}
                </h3>
                <p>
                  {point.analysis}
                  <br />
                  {point.legal}
                </p>
                <p>
                  <b>Проект / результат:</b>{" "}
                  {point.final || point.proposal
                    ? OUTCOMES[(point.final || point.proposal)!]
                    : "Не определён"}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Член комиссии</th>
                      <th>Голос</th>
                      <th>Отвод</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.members
                      .filter((member) => member.present)
                      .map((member) => (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td>
                            {member.recused
                              ? "Не голосует"
                              : snapshot.votes?.[point.id]?.votes?.[
                                    member.id
                                  ] === "yes"
                                ? "За"
                                : "Против"}
                          </td>
                          <td>{member.reason || "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>
            ))}
          <p>
            <b>Подписи:</b>{" "}
            {snapshot.meeting?.signed
              ? `Зафиксированы ${formatDate(snapshot.meeting.signed)}`
              : "Ожидаются; это проект протокола."}
          </p>
        </>
      )}
      {kind === "result" && (
        <>
          {snapshot.result ? (
            <>
              <p>
                <b>Результат:</b> {snapshot.result.label}
                <br />
                <b>Дата:</b> {formatDate(snapshot.result.date)}
              </p>
              <p>
                <b>Мотивировка:</b>
                <br />
                {snapshot.result.reason}
              </p>
              <p>
                <b>Последствия:</b>
                <br />
                {snapshot.result.effect}
              </p>
              {snapshot.issues.map((point) => (
                <p key={point.id}>
                  <b>Пункт {point.number}:</b>{" "}
                  {!point.disputed
                    ? "Не оспаривался; сохраняется."
                    : point.final
                      ? OUTCOMES[point.final]
                      : "См. резолютивную часть."}
                  {point.amount > 0 && point.remainingAmount != null
                    ? ` Остаток: ${formatMoney(point.remainingAmount)}.`
                    : ""}
                </p>
              ))}
            </>
          ) : (
            <p>Решение ещё не принято.</p>
          )}
          {snapshot.delivery ? (
            <>
              <p>
                <b>Направление:</b> № {snapshot.delivery.number} от{" "}
                {formatDate(snapshot.delivery.date)}. Квитанция{" "}
                {snapshot.delivery.receipt}.
              </p>
              <p>
                <b>Порядок обжалования:</b> {snapshot.delivery.appealCourt}.{" "}
                {snapshot.delivery.appealProcedure}
              </p>
            </>
          ) : (
            <p>
              Перед направлением необходимо заполнить суд и применимый порядок
              обжалования в форме оформления результата.
            </p>
          )}
          {c.type !== "control" && (
            <p>
              При судебном обжаловании исполнение решения комиссии
              приостанавливается до вынесения решения суда (статья 58-4 пункт 7
              Закона о госаудите).
            </p>
          )}
        </>
      )}
      {![
        "source",
        "original",
        "result",
        "protocol",
        "request",
        "request-appendix",
      ].includes(kind) && (
        <>
          <p>{document?.text}</p>
          {["analysis", "position"].includes(kind) &&
            snapshot.issues
              .filter((point) => point.disputed)
              .map((point) => (
                <p key={point.id}>
                  <b>Пункт {point.number}.</b>
                  <br />
                  {point.position}
                  <br />
                  {point.analysis}
                  <br />
                  {point.legal}
                </p>
              ))}
          {kind === "hearing" && snapshot.hearing && (
            <>
              <p>Заявитель: {snapshot.hearing.subject || "—"}</p>
              <p>Орган: {snapshot.hearing.issuer || "—"}</p>
            </>
          )}
        </>
      )}
      <p className="document-footer">
        Сформировано в тестовом модуле SAQ. {document?.author || "Заявитель"}.{" "}
        {formatDate(document?.date || c.filed)}.
      </p>
    </article>
  );
}

export function wordDocumentHtml({
  c,
  kind,
  document,
}: Pick<Parameters<typeof DocumentContent>[0], "c" | "kind" | "document">) {
  const css =
    "body{font:14pt 'Times New Roman',serif;line-height:1.45;color:#111}p{white-space:pre-wrap}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #111;padding:8px;vertical-align:top}.certificate-template{padding:20mm 15mm}.certificate-template h1,.certificate-template h2{text-align:center;font-size:16pt}.certificate-template-intro{text-align:justify;text-indent:12mm}.certificate-template-line{padding:6px 0;border-bottom:2px solid #111}.certificate-members-table th{text-align:center}";
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Справка</title><style>${css}</style></head><body>${renderToStaticMarkup(
    <DocumentContent c={c} kind={kind} document={document} />,
  )}</body></html>`;
}

export default function DocumentModal(props: {
  c: ObjectionCase;
  kind: string;
  document?: CaseDocument;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const otherRequestCss =
    ".other-request-template{box-sizing:border-box;min-height:880px;padding:30px 48px 54px;font-family:'Times New Roman',Times,serif;font-size:14px;line-height:1.35}.other-request-template-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;color:#0872ae;font-family:Georgia,'Times New Roman',serif;font-size:14px;font-weight:700;line-height:1.05;text-align:center}.other-request-template-header span{display:grid;width:52px;height:52px;place-items:center;border:1px solid #9a7700;border-radius:50%;background:#ddbd47;color:#1f4e35;font-size:13px}.other-request-template-contacts{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:12px;padding-top:8px;border-top:2px solid #4d9bc4;color:#287dac;font-family:Georgia,'Times New Roman',serif;font-size:9px;line-height:1.3}.other-request-template-contacts span:last-child{text-align:right}.other-request-template-line{height:1px;margin:28px 0 44px;background:#4d9bc4}.other-request-template-recipient{width:46%;margin:0 0 44px auto!important;font-size:14px;line-height:1.4}.other-request-template-body{margin:0!important;overflow-wrap:anywhere;white-space:pre-wrap;text-align:justify;text-indent:28px}.other-request-template-signature{display:grid;grid-template-columns:1fr auto;gap:26px;align-items:end;margin:48px 0 28px;font-size:14px}.other-request-template-executor{margin:0!important;font-size:10px;font-style:italic;line-height:1.25}";
  const css =
    "body{font:14px Arial,sans-serif;line-height:1.6;color:#111;max-width:850px;margin:28px auto;padding:24px}h2{text-align:center}p{white-space:pre-wrap}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:8px;text-align:left}.document-watermark{color:#555;text-align:center;font-size:11px}.document-footer{font-size:12px;border-top:1px solid #bbb;padding-top:16px}.appendix-template{box-sizing:border-box;min-height:680px;padding:52px 54px 96px;font-family:'Times New Roman',Times,serif}.appendix-template-number{margin:0 14px 14px 0!important;font-size:16px!important;text-align:right}.appendix-template table{table-layout:fixed;font-size:16px;line-height:1.35}.appendix-template th,.appendix-template td{border:1px solid #111;padding:7px 9px;vertical-align:top;word-break:break-word}.appendix-template th{text-align:center;font-size:17px;background:white}.appendix-template tbody tr{height:40px}.appendix-template th:first-child,.appendix-template td:first-child{width:5%;text-align:center;font-weight:bold}.appendix-template th:nth-child(2),.appendix-template td:nth-child(2){width:23%}.appendix-template th:nth-child(3),.appendix-template td:nth-child(3){width:31%}.appendix-template th:nth-child(4),.appendix-template td:nth-child(4){width:41%}.certificate-template{box-sizing:border-box;min-height:900px;padding:58px 68px;font-family:'Times New Roman',Times,serif;font-size:16px;line-height:1.45}.certificate-template h1,.certificate-template h2{text-align:center;font-size:22px;margin:0;font-weight:700}.certificate-template h2{font-size:20px;margin-bottom:34px}.certificate-template-intro{text-align:justify;text-indent:28px}.certificate-template-point-list{margin:28px 46px}.certificate-template-lead{margin-top:30px;font-weight:700;text-align:center}.certificate-template-line{border-bottom:2px solid #111;padding:6px 0;margin:20px 0}.certificate-template-section-title{margin:28px 0 12px 46px;font-size:20px;font-weight:700}.certificate-members-table{table-layout:fixed}.certificate-members-table th,.certificate-members-table td{border:1px solid #111;padding:10px;vertical-align:top;white-space:pre-wrap}.certificate-members-table th{text-align:center;font-weight:700}.protocol-template{box-sizing:border-box;padding:56px 64px;font-family:'Times New Roman',Times,serif;font-size:16px;line-height:1.4}.protocol-template h1{margin:0 0 34px;text-align:center;font-size:21px;font-weight:400}.protocol-template-place-date{display:flex;justify-content:space-between;margin-bottom:28px}.protocol-template-intro,.protocol-template-result{text-align:justify;text-indent:28px}.protocol-votes-table{table-layout:fixed}.protocol-votes-table th,.protocol-votes-table td{border:1px solid #111;padding:7px 8px;vertical-align:top}.protocol-votes-table th{text-align:center;font-weight:400}.protocol-template-signatures{margin-top:46px}@page{size:A4;margin:18mm}";
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>SAQ — документ</title><style>${css}${otherRequestCss}</style></head><body>${renderToStaticMarkup(<DocumentContent {...props} />)}</body></html>`;
  return (
    <Modal title="Просмотр документа" onClose={props.onClose} wide>
      <div className="actions">
        <Button
          onClick={() =>
            downloadFile(
              `${props.c.id}-${props.kind}.html`,
              html,
              "text/html;charset=utf-8",
            )
          }
        >
          Скачать HTML
        </Button>
        <Button
          primary
          onClick={() => {
            const popup = window.open("", "_blank");
            if (!popup) {
              setError(
                "Браузер заблокировал окно печати. Разрешите всплывающие окна или скачайте документ.",
              );
              return;
            }
            popup.document.write(html);
            popup.document.close();
            popup.focus();
            popup.print();
          }}
        >
          Печать / PDF
        </Button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <DocumentContent {...props} />
    </Modal>
  );
}
