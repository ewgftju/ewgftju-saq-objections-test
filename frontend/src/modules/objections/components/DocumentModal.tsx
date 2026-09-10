import { renderToStaticMarkup } from "react-dom/server";
import { useState } from "react";
import { Button, Modal } from "../../../components/ui";
import { OUTCOMES } from "../../../data/constants";
import type { CaseDocument, CaseRequest, ObjectionCase } from "../../../types";
import {
  formatDate,
  formatDateTime,
  formatMoney,
} from "../../../utils/dateFormat";
import { downloadFile } from "../../../utils/download";

export function DocumentContent({
  c,
  kind,
  document,
  requestPreview,
}: {
  c: ObjectionCase;
  kind: string;
  document?: CaseDocument;
  requestPreview?: Pick<CaseRequest, "recipient" | "deadline">;
}) {
  const snapshot = document?.snapshot ? { ...c, ...document.snapshot } : c;
  const request =
    requestPreview ||
    (document?.requestId
      ? c.requests.find((item) => item.id === document.requestId)
      : undefined);
  const title =
    document?.name ||
    (kind === "source"
      ? c.document.name
      : kind === "original"
        ? c.type === "control"
          ? "Жалоба"
          : "Возражение"
        : "Материал обращения");
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
        <p className="request-template-body">
          Қазақстан Республикасы Қаржы министрлігінің апелляциялық
          комиссиясының қарауына «{c.org}» {formatDate(c.appealDate || c.filed)}
          жылғы №{c.appealNumber || c.document.number} камералдық бақылау
          нәтижелері бойынша анықталған бұзушылықтарды жою туралы
          хабарламаларда көрсетілген бұзушылықтарға қарсылықтарының келіп
          түсуіне байланысты {formatDateTime(request.deadline)} мерзімде
          қарсылықтың дәлелдері бойынша дәлелді жауапты және растайтын
          құжаттарды қоса бере отырып ұсынуыңызды талап етеміз.
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
                  <td>{point.title}</td>
                  <td>{point.argument}</td>
                  <td aria-label="Мотивированный ответ ДВГА" />
                </tr>
              ))}
          </tbody>
        </table>
      </article>
    );

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

export default function DocumentModal(props: {
  c: ObjectionCase;
  kind: string;
  document?: CaseDocument;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const css =
    "body{font:14px Arial,sans-serif;line-height:1.6;color:#111;max-width:850px;margin:28px auto;padding:24px}h2{text-align:center}p{white-space:pre-wrap}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:8px;text-align:left}.document-watermark{color:#555;text-align:center;font-size:11px}.document-footer{font-size:12px;border-top:1px solid #bbb;padding-top:16px}.appendix-template{box-sizing:border-box;min-height:680px;padding:52px 54px 96px;font-family:'Times New Roman',Times,serif}.appendix-template-number{margin:0 14px 14px 0!important;font-size:16px!important;text-align:right}.appendix-template table{table-layout:fixed;font-size:16px;line-height:1.35}.appendix-template th,.appendix-template td{border:1px solid #111;padding:7px 9px;vertical-align:top;word-break:break-word}.appendix-template th{text-align:center;font-size:17px;background:white}.appendix-template tbody tr{height:40px}.appendix-template th:first-child,.appendix-template td:first-child{width:5%;text-align:center;font-weight:bold}.appendix-template th:nth-child(2),.appendix-template td:nth-child(2){width:23%}.appendix-template th:nth-child(3),.appendix-template td:nth-child(3){width:31%}.appendix-template th:nth-child(4),.appendix-template td:nth-child(4){width:41%}@page{size:A4;margin:18mm}";
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>SAQ — документ</title><style>${css}</style></head><body>${renderToStaticMarkup(<DocumentContent {...props} />)}</body></html>`;
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
