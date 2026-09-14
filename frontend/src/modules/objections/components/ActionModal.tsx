import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Action, ObjectionCase } from "../../../types";
import { Button, Modal, Notice } from "../../../components/ui";
import { actionForm } from "../formDefinitions";
import type { FormField, FormValues } from "../formDefinitions";
import { disputed } from "../services/decisions";
import { DocumentContent } from "./DocumentModal";
import { DEMO_USER } from "../../../config";
import { downloadFile } from "../../../utils/download";

const COMMISSION_MEMBER_OPTIONS = [
  "ФИО 1",
  "ФИО 2",
  "ФИО 3",
  "ФИО 4",
  "ФИО 5",
  "ФИО 6",
] as const;

const PROTOCOL_MEMBER_OPTIONS = [
  "Председатель Апелляционной комиссии: ФИО",
  "Заместитель Председателя Апелляционной комиссии: ФИО",
  "Директор ДМБУА: ФИО",
  "Эксперт ДЗМС НПП «АТАМЕКЕН»: ФИО",
  "Эксперт ОЮЛ «АЗК»: ФИО",
] as const;

function appendixDocumentHtml(c: ObjectionCase, document: NonNullable<ObjectionCase["documents"][number]>) {
  const safeTitle = document.name.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
  const content = renderToStaticMarkup(
    <DocumentContent c={c} kind="request-appendix" document={document} />,
  );
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: "Times New Roman", serif; color: #111; background: #f0f5f7; }
  .print-document { max-width: 900px; min-height: 1120px; margin: 0 auto; padding: 70px 55px; background: #fff; }
  .appendix-template-number { margin: 0 0 24px; text-align: right; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #111; padding: 8px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
  th { text-align: center; font-weight: 700; }
  th:first-child, td:first-child { width: 7%; text-align: center; }
  @media print { body { padding: 0; background: #fff; } .print-document { min-height: 0; padding: 20mm 15mm; } }
</style></head><body>${content}</body></html>`;
}

export function Field({ field }: { field: FormField }) {
  if (field.type === "heading")
    return <h3 className="form-section">{field.label}</h3>;
  if (field.type === "checkbox")
    return (
      <label className="checkbox-row">
        <input type="checkbox" name={field.name} required={field.required} />
        <span>{field.label}</span>
      </label>
    );
  return (
    <label className="field">
      <span>
        {field.label}
        {field.required && <span className="required"> *</span>}
      </span>
      {field.type === "textarea" ? (
        <textarea
          name={field.name}
          defaultValue={field.value}
          required={field.required}
          rows={3}
        />
      ) : field.type === "select" ? (
        <select
          name={field.name}
          defaultValue={field.value}
          required={field.required}
        >
          {field.options?.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          name={field.name}
          defaultValue={field.value}
          min={field.min}
          max={field.max}
          required={field.required}
          readOnly={field.readOnly}
          step={field.type === "number" ? "any" : undefined}
        />
      )}
    </label>
  );
}

function ProtocolParticipantsFields({
  rows,
  values,
  onAdd,
  onRemove,
}: {
  rows: number[];
  values: FormValues;
  onAdd: () => void;
  onRemove: (row: number) => void;
}) {
  return (
    <>
      <h3 className="form-section">Участники заседания</h3>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Член комиссии</th>
              <th>Выберите ФИО</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row}>
                <td>
                  {index === 0
                    ? "Председатель комиссии/Заместитель председателя"
                    : "Член АК"}
                </td>
                <td>
                  <select
                    name={`protocolMember_${row}`}
                    defaultValue={values[`protocolMember_${row}`] || ""}
                    required
                    aria-label={`Участник заседания ${index + 1}`}
                  >
                    <option value="">Выберите ФИО</option>
                    {PROTOCOL_MEMBER_OPTIONS.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <Button type="button" onClick={() => onRemove(row)}>
                    Удалить строку
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" onClick={onAdd}>
        Добавить члена АК
      </Button>
    </>
  );
}

function ProtocolVotesFields({
  c,
  members,
  values,
}: {
  c: ObjectionCase;
  members: Array<{ id: string; name: string }>;
  values: FormValues;
}) {
  if (!members.length)
    return (
      <Notice>
        Выберите участников заседания — после этого появятся поля для
        фиксации их голосов.
      </Notice>
    );

  return (
    <>
      <h3 className="form-section">Голоса членов АК по каждому пункту</h3>
      <div className="table-scroll">
        <table className="data-table protocol-vote-entry-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Описание оспариваемого пункта</th>
              <th>Член АК</th>
              <th>Голос</th>
              <th>Обоснование</th>
            </tr>
          </thead>
          <tbody>
            {disputed(c).flatMap((point) =>
              members.map((member, index) => {
                const voteName = `protocolVote_${point.id}_${member.id}`;
                const reasonName = `protocolReason_${point.id}_${member.id}`;
                return (
                  <tr key={`${point.id}-${member.id}`}>
                    <td>{index === 0 ? point.number : ""}</td>
                    <td>{index === 0 ? point.title : ""}</td>
                    <td>{member.name}</td>
                    <td>
                      <select
                        name={voteName}
                        defaultValue={values[voteName] || ""}
                        required
                        aria-label={`Голос ${member.name} по пункту ${point.number}`}
                      >
                        <option value="">Выберите голос</option>
                        <option value="yes">За</option>
                        <option value="no">Против</option>
                      </select>
                    </td>
                    <td>
                      <textarea
                        name={reasonName}
                        defaultValue={values[reasonName] || ""}
                        rows={2}
                        aria-label={`Обоснование ${member.name} по пункту ${point.number}`}
                      />
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ActionModal({
  action,
  c,
  date,
  onSubmit,
  onClose,
}: {
  action: Action;
  c: ObjectionCase;
  date: string;
  onSubmit: (form: FormData) => void | Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() => {
    if (action !== "vote") return {};
    return Object.fromEntries([
      ...c.members.map((member, index) => [
        `protocolMember_${member.id.replace("protocol-member-", "") || index + 1}`,
        member.name,
      ]),
      ...disputed(c).flatMap((point) =>
        c.members.flatMap((member) => [
          [
            `protocolVote_${point.id}_${member.id}`,
            c.votes?.[point.id]?.votes?.[member.id] || "",
          ],
          [
            `protocolReason_${point.id}_${member.id}`,
            c.votes?.[point.id]?.voteReasons?.[member.id] || "",
          ],
        ]),
      ),
    ]);
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestTab, setRequestTab] = useState<"form" | "print">("form");
  const [certificateMembers, setCertificateMembers] = useState([1]);
  const [protocolMemberRows, setProtocolMemberRows] = useState(() =>
    action === "vote" && c.members.length
      ? c.members.map(
          (member, index) =>
            Number(member.id.replace("protocol-member-", "")) || index + 1,
        )
      : [1],
  );
  const definition = actionForm(action, c, date, values);
  const isRequest = action === "request" || action === "request-other";
  const isOtherRequest = action === "request-other";
  const requestDeadline =
    values.deadline ||
    definition.fields.find((field) => field.name === "deadline")?.value ||
    `${date}T18:00`;
  const requestRecipient =
    values.recipient ??
    definition.fields.find((field) => field.name === "recipient")?.value ??
    "";
  const requestExecutor =
    values.executor ||
    definition.fields.find((field) => field.name === "executor")?.value ||
    DEMO_USER.fullName;
  const customRequestText =
    isOtherRequest ? values.customRequestText ?? "" : undefined;
  const protocolMembers = protocolMemberRows
    .map((row) => ({ row, name: values[`protocolMember_${row}`] }))
    .filter((member): member is { row: number; name: string } => Boolean(member.name))
    .map(({ row, name }) => ({
      id: `protocol-member-${row}`,
      name,
      present: true,
      recused: false,
      reason: "",
    }));
  const authorityRequestForConfirmation = c.requests.find(
    (request) =>
      !!request.responded &&
      !request.confirmed &&
      (request.template === "dvga" ||
        request.recipient.toUpperCase().includes("ДВГА") ||
        request.recipient.toUpperCase().includes("КВГА")),
  );
  const authorityAppendix = authorityRequestForConfirmation
    ? c.documents.find(
        (document) =>
          document.kind === "request-appendix" &&
          document.requestId === authorityRequestForConfirmation.id,
      )
    : undefined;
  const authorityResponseFiles = authorityRequestForConfirmation
    ? c.documents.filter(
        (document) =>
          document.kind === "authority-response-attachment" &&
          document.requestId === authorityRequestForConfirmation.id,
      )
    : [];
  const openAppendix = () => {
    if (!authorityAppendix) return;
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("Не удалось открыть приложение. Разрешите всплывающие окна в браузере.");
      return;
    }
    popup.document.write(appendixDocumentHtml(c, authorityAppendix));
    popup.document.close();
  };
  const downloadAppendix = () => {
    if (!authorityAppendix) return;
    downloadFile(
      `${c.id}-${authorityAppendix.name}.html`,
      appendixDocumentHtml(c, authorityAppendix),
      "text/html;charset=utf-8",
    );
  };
  return (
    <Modal
      title={definition.title}
      onClose={onClose}
      wide={
        action === "vote" ||
        isRequest ||
        action === "fill-request-response" ||
        action === "analysis" ||
        action === "position" ||
        action === "choose-commission-members"
      }
    >
      <form
        onChange={(event) => {
          const form = event.currentTarget;
          const next = Object.fromEntries(
            [...new FormData(form).entries()].map(([key, value]) => [
              key,
              String(value),
            ]),
          );
          form
            .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
            .forEach((input) => {
              next[input.name] = input.checked ? "on" : "";
            });
          setValues(next);
        }}
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            setSaving(true);
            await onSubmit(new FormData(event.currentTarget));
            onClose();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Не удалось сохранить действие",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        {isRequest ? (
          <>
            <div className="request-modal-details">
              <div>
                <span>Исполнитель</span>
                <b>{requestExecutor}</b>
              </div>
              <div>
                <span>Печатная форма</span>
                <b>
                  {isOtherRequest
                    ? "Формируется по шаблону запроса в другой орган"
                    : "Формируется по шаблону"}
                </b>
              </div>
            </div>
            {definition.note && <Notice>{definition.note}</Notice>}
            <div
              className="request-modal-tabs"
              role="tablist"
              aria-label="Режим формирования запроса"
            >
              <button
                type="button"
                className={requestTab === "form" ? "active" : ""}
                onClick={() => setRequestTab("form")}
              >
                Электронная форма
              </button>
              <button
                type="button"
                className={requestTab === "print" ? "active" : ""}
                onClick={() => setRequestTab("print")}
              >
                Печатная форма
              </button>
            </div>
            <div hidden={requestTab !== "form"} className="form-grid">
              {definition.fields.map((field) => (
                <Field key={field.name} field={field} />
              ))}
            </div>
            <div hidden={requestTab !== "print"} className="request-print-preview">
              <DocumentContent
                c={c}
                kind="request"
                requestPreview={{
                  recipient: requestRecipient,
                  deadline: requestDeadline,
                  customText: customRequestText,
                  template: isOtherRequest ? "other" : "dvga",
                  author: requestExecutor,
                }}
              />
            </div>
          </>
        ) : action === "fill-request-response" ? (
          <>
            <div className="request-modal-details">
              <div>
                <span>Автор</span>
                <b>ДВГА/КВГА</b>
              </div>
              <div>
                <span>Печатная форма</span>
                <b>Приложение № 1 к запросу</b>
              </div>
            </div>
            {definition.note && <Notice>{definition.note}</Notice>}
            <div className="request-modal-tabs" role="tablist">
              <button
                type="button"
                className={requestTab === "form" ? "active" : ""}
                onClick={() => setRequestTab("form")}
              >
                Электронная форма
              </button>
              <button
                type="button"
                className={requestTab === "print" ? "active" : ""}
                onClick={() => setRequestTab("print")}
              >
                Печатная форма
              </button>
            </div>
            <div hidden={requestTab !== "form"}>
              {definition.fields.map((field) => (
                <Field key={field.name} field={field} />
              ))}
              <label className="field">
                <span>Подтверждающие документы</span>
                <input
                  type="file"
                  name="responseFiles"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                  multiple
                />
                <small>Можно вложить несколько файлов до 2 МБ каждый.</small>
              </label>
            </div>
            <div hidden={requestTab !== "print"} className="request-print-preview">
              <DocumentContent
                c={c}
                kind="request-appendix"
                appendixFindingPreview={Object.fromEntries(
                  disputed(c).map((point) => [
                    point.id,
                    values[`authorityFinding_${point.id}`] || point.authorityFinding || "",
                  ]),
                )}
                appendixPreview={Object.fromEntries(
                  disputed(c).map((point) => [
                    point.id,
                    values[`authorityResponse_${point.id}`] || point.position || "",
                  ]),
                )}
              />
            </div>
          </>
        ) : action === "analysis" ? (
          <>
            <div className="request-modal-details">
              <div>
                <span>Автор</span>
                <b>Исполнитель ДАВГА</b>
              </div>
              <div>
                <span>Печатная форма</span>
                <b>Справка по шаблону</b>
              </div>
            </div>
            {definition.note && <Notice>{definition.note}</Notice>}
            <div className="request-modal-tabs" role="tablist">
              <button
                type="button"
                className={requestTab === "form" ? "active" : ""}
                onClick={() => setRequestTab("form")}
              >
                Электронная форма
              </button>
              <button
                type="button"
                className={requestTab === "print" ? "active" : ""}
                onClick={() => setRequestTab("print")}
              >
                Печатная форма
              </button>
            </div>
            <div hidden={requestTab !== "form"}>
              {certificateMembers.map((number) => (
                <section className="certificate-member-form" key={number}>
                  <h3 className="form-section">
                    Член апелляционной комиссии {number}
                  </h3>
                  <label className="field">
                    <span>
                      ФИО члена апелляционной комиссии
                      <span className="required"> *</span>
                    </span>
                    <select
                      name={`certificateMember_${number}`}
                      defaultValue={
                        values[`certificateMember_${number}`] ||
                        COMMISSION_MEMBER_OPTIONS[0]
                      }
                      required
                    >
                      {COMMISSION_MEMBER_OPTIONS.map((member) => (
                        <option key={member} value={member}>
                          {member}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
              ))}
              <Button
                type="button"
                onClick={() =>
                  setCertificateMembers((members) => [
                    ...members,
                    members.length + 1,
                  ])
                }
              >
                Добавить члена АК
              </Button>
              <label className="field certificate-authority-arguments">
                <span>
                  Доводы ДАВГА <span className="required"> *</span>
                </span>
                <textarea
                  name="davgaArguments"
                  defaultValue={values.davgaArguments || ""}
                  rows={4}
                  required
                />
              </label>
            </div>
            <div hidden={requestTab !== "print"} className="request-print-preview">
              <DocumentContent
                c={c}
                kind="certificate"
                certificatePreview={{
                  davgaArguments: values.davgaArguments || "",
                  memberPositions: certificateMembers.map((number) => ({
                    id: String(number),
                    name:
                      values[`certificateMember_${number}`] ||
                      COMMISSION_MEMBER_OPTIONS[0],
                    argument: "",
                  })),
                }}
              />
            </div>
          </>
        ) : action === "choose-commission-members" ? (
          <>
            {definition.note && <Notice>{definition.note}</Notice>}
            <ProtocolParticipantsFields
              rows={protocolMemberRows}
              values={values}
              onAdd={() =>
                setProtocolMemberRows((rows) => [
                  ...rows,
                  Math.max(0, ...rows) + 1,
                ])
              }
              onRemove={(row) =>
                setProtocolMemberRows((rows) =>
                  rows.filter((item) => item !== row),
                )
              }
            />
          </>
        ) : action === "vote" ? (
          <>
            <div className="request-modal-details">
              <div>
                <span>Автор</span>
                <b>Апелляционная комиссия</b>
              </div>
              <div>
                <span>Печатная форма</span>
                <b>Протокол по шаблону</b>
              </div>
            </div>
            {definition.note && <Notice>{definition.note}</Notice>}
            <div className="request-modal-tabs" role="tablist">
              <button
                type="button"
                className={requestTab === "form" ? "active" : ""}
                onClick={() => setRequestTab("form")}
              >
                Электронная форма
              </button>
              <button
                type="button"
                className={requestTab === "print" ? "active" : ""}
                onClick={() => setRequestTab("print")}
              >
                Печатная форма
              </button>
            </div>
            <div hidden={requestTab !== "form"}>
              {definition.fields.map((field) => (
                <Field key={field.name} field={field} />
              ))}
              <ProtocolParticipantsFields
                rows={protocolMemberRows}
                values={values}
                onAdd={() =>
                  setProtocolMemberRows((rows) => [
                    ...rows,
                    Math.max(0, ...rows) + 1,
                  ])
                }
                onRemove={(row) =>
                  setProtocolMemberRows((rows) =>
                    rows.filter((item) => item !== row),
                  )
                }
              />
              <ProtocolVotesFields
                c={c}
                members={protocolMembers}
                values={values}
              />
            </div>
            <div hidden={requestTab !== "print"} className="request-print-preview">
              <DocumentContent
                c={c}
                kind="protocol"
                protocolPreview={{
                  date: values.protocolDate || date,
                  number: values.number || `ПР-${c.id}`,
                  audio: "",
                  recommendations: values.recommendations || "—",
                  members: protocolMembers,
                  votes: Object.fromEntries(
                    disputed(c).map((point) => [
                      point.id,
                      Object.fromEntries(
                        protocolMembers.map((member) => [
                          member.id,
                          values[`protocolVote_${point.id}_${member.id}`] || "",
                        ]),
                      ),
                    ]),
                  ),
                  voteReasons: Object.fromEntries(
                    disputed(c).map((point) => [
                      point.id,
                      Object.fromEntries(
                        protocolMembers.map((member) => [
                          member.id,
                          values[`protocolReason_${point.id}_${member.id}`] || "",
                        ]),
                      ),
                    ]),
                  ),
                }}
              />
            </div>
          </>
        ) : action === "commission-vote" ? (
          <>
            {definition.note && <Notice>{definition.note}</Notice>}
            <label className="field">
              <span>Голосующий член АК <span className="required">*</span></span>
              <select name="commissionMember" required defaultValue="">
                <option value="">Выберите ФИО</option>
                {c.members
                  .filter((member) =>
                    disputed(c).some(
                      (point) => !c.votes?.[point.id]?.votes?.[member.id],
                    ),
                  )
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
              </select>
            </label>
            <h3 className="form-section">Оспариваемые пункты</h3>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Описание оспариваемого пункта</th>
                    <th>Голос</th>
                    <th>Обоснование</th>
                  </tr>
                </thead>
                <tbody>
                  {disputed(c).map((point) => (
                    <tr key={point.id}>
                      <td>{point.number}</td>
                      <td>{point.title}</td>
                      <td>
                        <select
                          name={`commissionVote_${point.id}`}
                          defaultValue={values[`commissionVote_${point.id}`] || ""}
                          required
                          aria-label={`Голос по пункту ${point.number}`}
                        >
                          <option value="">Выберите голос</option>
                          <option value="yes">За</option>
                          <option value="no">Против</option>
                        </select>
                      </td>
                      <td>
                        <textarea
                          name={`commissionReason_${point.id}`}
                          rows={2}
                          aria-label={`Обоснование по пункту ${point.number}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : action === "position" ? (
          <>
            <Notice tone="amber">
              Ответ от адресата ещё не подтверждён. Внесите дату поступления и
              вложите все полученные файлы.
            </Notice>
            <div className="response-receipt-grid">
              <section className="response-receipt-card response-receipt-system">
                <div className="response-receipt-heading">
                  <span aria-hidden="true">↓</span>
                  <div>
                    <b>Из кабинета ДВГА/КВГА</b>
                    <small>Электронное поступление</small>
                  </div>
                  <em>{authorityRequestForConfirmation ? "ПОСТУПИЛ" : "НЕ ПОСТУПИЛО"}</em>
                </div>
                {authorityRequestForConfirmation ? (
                  <div className="response-receipt-materials">
                    <b>Заполненное приложение</b>
                    {authorityAppendix ? (
                      <div className="response-appendix-actions">
                        <span>{authorityAppendix.name}</span>
                        <div>
                          <Button type="button" onClick={openAppendix}>
                            Открыть
                          </Button>
                          <Button type="button" onClick={downloadAppendix}>
                            Скачать
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span className="muted">Приложение не найдено</span>
                    )}
                    <b>Подтверждающие документы</b>
                    {authorityResponseFiles.length ? (
                      <ul>
                        {authorityResponseFiles.map((document) =>
                          document.dataUrl ? (
                            <li key={document.name}>
                              <a
                                href={document.dataUrl}
                                download={document.filename || document.name}
                              >
                                {document.name}
                              </a>
                            </li>
                          ) : (
                            <li key={document.name}>{document.name}</li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <span className="muted">Файлы не приложены</span>
                    )}
                  </div>
                ) : (
                  <div className="response-receipt-empty">
                    <b>Ответ не поступил</b>
                  </div>
                )}
              </section>
              <section className="response-receipt-card response-receipt-manual">
                <div className="response-receipt-heading">
                  <span aria-hidden="true">↑</span>
                  <div>
                    <b>Внесено исполнителем</b>
                  </div>
                  <em>ТРЕБУЕТСЯ</em>
                </div>
                <div className="response-receipt-fields">
                  {definition.fields
                    .filter((field) => field.name === "date")
                    .map((field) => (
                      <Field key={field.name} field={field} />
                    ))}
                  <label className="field">
                    <span>
                      Полученные файлы <span className="required">*</span>
                    </span>
                    <input
                      type="file"
                      name="responseFiles"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                      multiple
                      required
                    />
                    <small>Можно вложить несколько файлов до 2 МБ каждый.</small>
                  </label>
                </div>
              </section>
            </div>
          </>
        ) : (
          <>
            {definition.note && <Notice>{definition.note}</Notice>}
            {definition.fields.map((field) => (
              <Field key={field.name} field={field} />
            ))}
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" primary disabled={saving}>
            {saving
              ? "Сохранение..."
              : action === "position"
                ? "Сохранить полученный ответ"
                : definition.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
