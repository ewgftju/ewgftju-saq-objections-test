import { useState } from "react";
import type { Action, ObjectionCase } from "../../../types";
import { Button, Modal, Notice } from "../../../components/ui";
import { actionForm } from "../formDefinitions";
import type { FormField, FormValues } from "../formDefinitions";
import { disputed } from "../services/decisions";
import { OUTCOMES } from "../../../data/constants";

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
          step={field.type === "number" ? "any" : undefined}
        />
      )}
    </label>
  );
}

function VotingFields({ c, values }: { c: ObjectionCase; values: FormValues }) {
  return (
    <>
      <h3 className="form-section">Участники заседания</h3>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Член комиссии</th>
              <th>Присутствует</th>
              <th>Отвод</th>
              <th>Основание отвода</th>
            </tr>
          </thead>
          <tbody>
            {c.members.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>
                <td>
                  <input
                    type="checkbox"
                    name={`present_${member.id}`}
                    defaultChecked={member.present}
                    aria-label={`${member.name}: присутствует`}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    name={`recused_${member.id}`}
                    aria-label={`${member.name}: отвод`}
                  />
                </td>
                <td>
                  <input
                    name={`reason_${member.id}`}
                    aria-label={`${member.name}: основание отвода`}
                    required={!!values[`recused_${member.id}`]}
                    disabled={!values[`recused_${member.id}`]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {disputed(c).map((point) => (
        <div key={point.id}>
          <h3 className="form-section">
            Пункт {point.number}:{" "}
            {point.proposal
              ? OUTCOMES[point.proposal]
              : "Проект не подготовлен"}
          </h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Член комиссии</th>
                  <th>Голос по проекту</th>
                </tr>
              </thead>
              <tbody>
                {c.members.map((member) => {
                  const present =
                    values[`present_${member.id}`] ??
                    (member.present ? "on" : "");
                  const excluded = !present || !!values[`recused_${member.id}`];
                  return (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>
                        {excluded ? (
                          <span className="muted">Не голосует</span>
                        ) : (
                          <select
                            name={`vote_${point.id}_${member.id}`}
                            required
                            defaultValue=""
                            aria-label={`Пункт ${point.number}, ${member.name}`}
                          >
                            <option value="">Выберите голос</option>
                            <option value="yes">За проект</option>
                            <option value="no">Против проекта</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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
  onSubmit: (form: FormData) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<FormValues>({});
  const [error, setError] = useState("");
  const definition = actionForm(action, c, date, values);
  return (
    <Modal title={definition.title} onClose={onClose} wide={action === "vote"}>
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
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onSubmit(new FormData(event.currentTarget));
            onClose();
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Не удалось сохранить действие",
            );
          }
        }}
      >
        {definition.note && <Notice>{definition.note}</Notice>}
        {definition.fields.map((field) => (
          <Field key={field.name} field={field} />
        ))}
        {action === "vote" && (
          <>
            <Button
              onClick={(event) => {
                const form = event.currentTarget.form!;
                form
                  .querySelectorAll<HTMLSelectElement>('select[name^="vote_"]')
                  .forEach((select) => {
                    select.value = "yes";
                  });
              }}
            >
              Заполнить тестовые голоса «За»
            </Button>
            <VotingFields c={c} values={values} />
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" primary>
            {definition.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
