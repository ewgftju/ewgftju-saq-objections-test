import { useState } from "react";
import { Button, Modal, Notice } from "../../../components/ui";
import { TYPES } from "../../../data/constants";
import { makeCase } from "../../../data/objections";
import type { CaseType, DemoState } from "../../../types";
import { dateObject } from "../services/deadlines";
import { required } from "../services/workflow";
import { Field } from "./ActionModal";

export default function NewCaseModal({
  state,
  onSave,
  onClose,
}: {
  state: DemoState;
  onSave: (state: DemoState, caseId: string) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<CaseType>("notice");
  const [error, setError] = useState("");
  return (
    <Modal title="Новое тестовое обращение" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const data = new FormData(event.currentTarget);
            const get = (name: string, label: string) =>
              required(data, name, label);
            const bin = get("bin", "БИН");
            if (!/^\d{12}$/.test(bin))
              throw new Error("БИН должен содержать 12 цифр");
            const received = get("received", "Дата получения документа");
            const filed = get("filed", "Дата подачи");
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
            const amount = Number(get("amount", "Сумма"));
            if (!Number.isFinite(amount) || amount < 0)
              throw new Error("Сумма должна быть неотрицательной");
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
                  : "Кабинет SAQ (демо)",
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
          Демонстрационная регистрация. Используйте вымышленные сведения. Дата
          регистрации определяется датой демо в шапке.
        </Notice>
        <label className="field">
          <span>Вид обращения</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as CaseType)}
          >
            {Object.entries(TYPES).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          {[
            { name: "org", label: "Наименование объекта (демо)" },
            { name: "bin", label: "БИН" },
            { name: "address", label: "Местонахождение" },
            { name: "applicant", label: "Заявитель / представитель" },
            {
              name: "issuer",
              label: "Орган, выдавший документ",
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
            { name: "filed", label: "Дата подачи обращения" },
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
          <Field
            field={{
              name: "amount",
              label:
                type === "notice"
                  ? "Сумма закупки, тенге"
                  : "Оспариваемая сумма, тенге",
              value: "0",
              type: "number",
              min: "0",
              required: true,
            }}
          />
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
            label: "Требования заявителя",
            type: "textarea",
            required: true,
          }}
        />
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
