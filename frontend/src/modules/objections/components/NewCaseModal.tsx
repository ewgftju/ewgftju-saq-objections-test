import { useState } from "react";
import { Button, Modal, Notice } from "../../../components/ui";
import { makeCase } from "../../../data/objections";
import type { CaseType, DemoState } from "../../../types";
import { dateObject } from "../services/deadlines";
import { required } from "../services/workflow";
import { Field } from "./ActionModal";

const FILE_EXTENSIONS = /\.(pdf|png|jpe?g|docx?|xlsx?|txt)$/i;
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

const APPEAL_TYPES = [
  { value: "statement", label: "Заявление", caseType: "control" },
  {
    value: "preventive-control-complaint",
    label: "Жалоба на акт о результате профилактического контроля",
    caseType: "control",
  },
  {
    value: "action-inaction-complaint",
    label: "Жалоба на действие/бездействие",
    caseType: "control",
  },
  {
    value: "kvga-dvga-decision-complaint",
    label: "Жалоба на решение КВГА/ДВГА",
    caseType: "control",
  },
  {
    value: "notice-objection",
    label: "Возражение на уведомления",
    caseType: "notice",
  },
  {
    value: "audit-objection",
    label: "Возражение на аудиторский отчет",
    caseType: "audit",
  },
] as const satisfies ReadonlyArray<{
  value: string;
  label: string;
  caseType: CaseType;
}>;

export default function NewCaseModal({
  state,
  onSave,
  onClose,
}: {
  state: DemoState;
  onSave: (state: DemoState, caseId: string) => void;
  onClose: () => void;
}) {
  const [appealType, setAppealType] = useState<string>(APPEAL_TYPES[0].value);
  const [error, setError] = useState("");
  const selectedAppealType =
    APPEAL_TYPES.find((item) => item.value === appealType) ?? APPEAL_TYPES[0];
  const type = selectedAppealType.caseType;
  return (
    <Modal title="Новое тестовое обращение" onClose={onClose}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const data = new FormData(event.currentTarget);
            const requirementFiles = data
              .getAll("requirementsFiles")
              .filter(
                (value): value is File =>
                  value instanceof File && value.name.length > 0,
              );
            requirementFiles.forEach((file) => {
              if (file.size > MAX_FILE_SIZE)
                throw new Error(`Файл «${file.name}» превышает 2 МБ`);
              if (!FILE_EXTENSIONS.test(file.name))
                throw new Error(
                  "Поддерживаются PDF, PNG, JPG, DOC(X), XLS(X), TXT",
                );
            });
            const get = (name: string, label: string) =>
              required(data, name, label);
            const bin = get("bin", "БИН");
            if (!/^\d{12}$/.test(bin))
              throw new Error("БИН должен содержать 12 цифр");
            const received = get("received", "Дата получения документа");
            const filed = state.date;
            const documentDate = get("documentDate", "Дата документа");
            [received, filed, documentDate].forEach(dateObject);
            if (
              documentDate > received ||
              received > filed ||
              filed > state.date
            )
              throw new Error(
                "Проверьте порядок дат: документ → получение → подача → регистрация",
              );
            const amount = 0;
            const counter =
              Math.max(
                3,
                ...state.cases.map((c) => Number(c.id.split("-").at(-1)) || 0),
              ) + 1;
            const id = `${type === "control" ? "ЖАЛ" : "ВОЗ"}-2026-${String(counter).padStart(3, "0")}`;
            const c = makeCase({
              id,
              type,
              org: get("org", "Объект"),
              bin,
              address: get("address", "Местонахождение"),
              applicant: get("applicant", "Заявитель"),
              registered: state.date,
              filed,
              channel:
                type === "notice"
                  ? get("channel", "Исходная система")
                  : "Кабинет SAQ",
              issuer: get("issuer", "Орган"),
              authority:
                type === "control"
                  ? "Вышестоящий орган — определить компетенцию"
                  : "Апелляционная комиссия при Министерстве финансов РК",
              document: {
                number: get("number", "Номер документа"),
                date: documentDate,
                received,
                name:
                  type === "notice"
                    ? "Уведомление об устранении нарушений"
                    : type === "audit"
                      ? "Аудиторский отчёт"
                      : "Акт о результатах профилактического контроля",
                appealExplained: data.get("appealExplained") !== "no",
              },
              request: get("request", "Требования"),
              amount,
              issues: [
                {
                  id: "point1",
                  number: get("pointNumber", "Пункт"),
                  title: get("pointTitle", "Заголовок пункта"),
                  finding: get("finding", "Вывод"),
                  argument: get("argument", "Довод"),
                  evidence: get("evidence", "Доказательства"),
                  disputed: true,
                  amount,
                },
              ],
            });
            c.documents = await Promise.all(
              requirementFiles.map(async (file) => ({
                name: file.name,
                filename: file.name,
                kind: "attachment",
                text: "Требования заявителя",
                author: "Заявитель",
                date: state.date,
                dataUrl: await fileDataUrl(file),
              })),
            );
            if (requirementFiles.length) {
              c.history.push({
                date: state.date,
                actor: "Заявитель",
                title: "Добавлены требования заявителя",
                text: requirementFiles.map((file) => file.name).join(", "),
              });
            }
            onSave({ ...state, cases: [...state.cases, c] }, id);
            onClose();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Не удалось создать обращение",
            );
          }
        }}
      >
        <Notice>
          Укажите реквизиты обращения и оспариваемого документа. Дата регистрации определяется датой учёта.
        </Notice>
        <label className="field">
          <span>Вид обращения</span>
          <select
            value={appealType}
            onChange={(event) => setAppealType(event.target.value)}
          >
            {APPEAL_TYPES.map(({ value, label }) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          {[
            { name: "org", label: "Наименование объекта аудита/заявителя" },
            { name: "bin", label: "БИН/ИИН" },
            { name: "address", label: "Местонахождение" },
            { name: "applicant", label: "Представитель" },
            {
              name: "issuer",
              label: "Орган аудита (КВГА/ДВГА)",
              value: "ДВГА по Атырауской области",
            },
            { name: "number", label: "Номер исходного документа" },
          ].map((field) => (
            <Field
              field={{ ...field, type: "text", required: true }}
              key={field.name}
            />
          ))}
          {[
            { name: "documentDate", label: "Дата документа" },
            { name: "received", label: "Дата получения документа" },
          ].map((field) => (
            <Field
              key={field.name}
              field={{
                ...field,
                type: "date",
                value: state.date,
                required: true,
              }}
            />
          ))}
        </div>
        {type === "notice" && (
          <Field
            field={{
              name: "channel",
              label:
                "Портал / цифровая система, по которой поступило уведомление",
              type: "text",
              value: "Веб-портал государственных закупок",
              required: true,
            }}
          />
        )}
        {type === "control" && (
          <Field
            field={{
              name: "appealExplained",
              label: "В акте разъяснён порядок обжалования",
              type: "select",
              value: "yes",
              options: [
                ["yes", "Да"],
                ["no", "Нет — проверить специальный срок по ст. 92 АППК"],
              ],
            }}
          />
        )}
        <Field
          field={{
            name: "request",
            label: "Краткое описание",
            type: "textarea",
            required: true,
          }}
        />
        <label className="field">
          <span>Требования заявителя</span>
          <input
            type="file"
            name="requirementsFiles"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
            multiple
            aria-label="Вложить файлы"
          />
          <small className="muted">Можно вложить несколько файлов до 2 МБ каждый.</small>
        </label>
        <h3 className="form-section">Оспариваемый пункт</h3>
        <Field
          field={{
            name: "pointNumber",
            label: "Номер пункта",
            value: "1",
            type: "text",
            required: true,
          }}
        />
        <Field
          field={{
            name: "pointTitle",
            label: "Краткий заголовок",
            type: "text",
            required: true,
          }}
        />
        {[
          { name: "finding", label: "Вывод исходного документа" },
          { name: "argument", label: "Довод заявителя" },
          { name: "evidence", label: "Документы, подтверждающие довод" },
        ].map((field) => (
          <Field
            key={field.name}
            field={{ ...field, type: "textarea", required: true }}
          />
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button onClick={onClose}>Отмена</Button>
          <Button primary type="submit">
            Зарегистрировать
          </Button>
        </div>
      </form>
    </Modal>
  );
}
