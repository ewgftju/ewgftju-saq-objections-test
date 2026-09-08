import { useState } from "react";
import AppShell from "../../components/AppShell";
import { Button, Modal, Notice } from "../../components/ui";
import { initialState } from "../../api/objectionsRepository";
import { ROLES } from "../../data/constants";
import type { Action, CaseDocument, ObjectionCase } from "../../types";
import { caseCsv, downloadFile } from "../../utils/download";
import ActionModal, { Field } from "./components/ActionModal";
import DocumentModal from "./components/DocumentModal";
import NewCaseModal from "./components/NewCaseModal";
import CasesList from "./pages/CasesList";
import CaseWorkspace from "./pages/CaseWorkspace";
import {
  ProcessesPage,
  SessionsPage,
  SourcesPage,
} from "./pages/ReferencePages";
import { dateObject } from "./services/deadlines";
import { useObjectionsModel } from "./useObjectionsModel";

type DialogState =
  | { type: "action"; action: Action }
  | { type: "document"; kind: string; document?: CaseDocument }
  | { type: "new" | "clock" | "reset" | "upload" }
  | null;

export default function ObjectionsModule() {
  const model = useObjectionsModel();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogError, setDialogError] = useState("");
  const [uploading, setUploading] = useState(false);
  const c = model.state.cases.find((item) => item.id === model.route.caseId);
  const close = () => {
    setDialog(null);
    setDialogError("");
  };
  const openCase = (c: ObjectionCase) =>
    model.navigate({ page: "detail", caseId: c.id, tab: "review" });

  async function upload(file?: File) {
    if (!file || !c) return;
    setDialogError("");
    if (file.size > 2 * 1024 * 1024) {
      setDialogError("Максимальный размер файла — 2 МБ");
      return;
    }
    if (!/\.(pdf|png|jpe?g|docx?|xlsx?|txt)$/i.test(file.name)) {
      setDialogError("Поддерживаются PDF, PNG, JPG, DOC(X), XLS(X), TXT");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
        reader.readAsDataURL(file);
      });
      const next = structuredClone(model.state);
      const updated = next.cases.find((item) => item.id === c.id)!;
      updated.documents.push({
        name: file.name,
        filename: file.name,
        kind: "attachment",
        text: "Приложенный материал",
        author: ROLES[model.role],
        date: next.date,
        dataUrl,
      });
      updated.history.push({
        date: next.date,
        actor: ROLES[model.role],
        title: "Добавлен материал",
        text: file.name,
      });
      model.commit(next, "Материал добавлен. Срок рассмотрения не изменён.");
      close();
    } catch (cause) {
      setDialogError(
        cause instanceof Error
          ? cause.message
          : "Недостаточно места для сохранения вложения",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell
      route={model.route}
      date={model.state.date}
      role={model.role}
      onRoleChange={model.setRole}
      onNavigate={model.navigate}
      onClock={() => setDialog({ type: "clock" })}
      onReset={() => setDialog({ type: "reset" })}
    >
      {model.error && <Notice tone="amber">{model.error}</Notice>}
      {model.route.page === "registry" && (
        <CasesList
          cases={model.state.cases}
          date={model.state.date}
          onOpen={openCase}
          onCreate={() => setDialog({ type: "new" })}
          onExport={(cases) =>
            downloadFile(
              "saq-objections.csv",
              caseCsv(cases),
              "text/csv;charset=utf-8",
            )
          }
        />
      )}
      {model.route.page === "detail" &&
        (c ? (
          <CaseWorkspace
            c={c}
            tab={model.route.tab || "review"}
            role={model.role}
            onBack={() => model.navigate({ page: "registry" })}
            onTab={(tab) => model.navigate({ ...model.route, tab })}
            onAction={(action, role) => {
              model.setRole(role);
              setDialog({ type: "action", action });
            }}
            onDocument={(kind, document) =>
              setDialog({ type: "document", kind, document })
            }
            onUpload={() => setDialog({ type: "upload" })}
          />
        ) : (
          <Notice>
            Обращение не найдено в этом браузере.{" "}
            <button
              className="text-button"
              onClick={() => model.navigate({ page: "registry" })}
            >
              Открыть реестр
            </button>
          </Notice>
        ))}
      {model.route.page === "sessions" && (
        <SessionsPage cases={model.state.cases} onOpen={openCase} />
      )}
      {model.route.page === "processes" && <ProcessesPage />}
      {model.route.page === "sources" && <SourcesPage />}
      {dialog?.type === "action" && c && (
        <ActionModal
          key={`${c.id}-${dialog.action}`}
          action={dialog.action}
          c={c}
          date={model.state.date}
          onClose={close}
          onSubmit={(form) => model.perform(c.id, dialog.action, form)}
        />
      )}
      {dialog?.type === "document" && c && (
        <DocumentModal
          c={c}
          kind={dialog.kind}
          document={dialog.document}
          onClose={close}
        />
      )}
      {dialog?.type === "new" && (
        <NewCaseModal
          state={model.state}
          onClose={close}
          onSave={(next, caseId) => {
            model.commit(next, "Тестовое обращение зарегистрировано");
            model.navigate({ page: "detail", caseId });
          }}
        />
      )}
      {dialog?.type === "clock" && (
        <Modal title="Дата демонстрации" onClose={close}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const date = String(
                  new FormData(event.currentTarget).get("date"),
                );
                dateObject(date);
                const minimum = [
                  model.state.date,
                  ...model.state.cases.flatMap((item) =>
                    item.history.map((event) => event.date),
                  ),
                ]
                  .sort()
                  .at(-1)!;
                if (date < minimum || date > "2026-12-31")
                  throw new Error(
                    `Дата должна быть не раньше ${minimum} и не позже 31.12.2026`,
                  );
                model.commit({ ...model.state, date }, "Дата демо изменена");
                close();
              } catch (cause) {
                setDialogError(
                  cause instanceof Error ? cause.message : "Проверьте дату",
                );
              }
            }}
          >
            <Notice>
              Изменение даты помогает показать этапы с обязательными
              интервалами. Даты уже зарегистрированных событий сохраняются.
            </Notice>
            <Field
              field={{
                name: "date",
                label: "Рабочая дата",
                type: "date",
                value: model.state.date,
                required: true,
              }}
            />
            {dialogError && (
              <p className="form-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="dialog-actions">
              <Button onClick={close}>Отмена</Button>
              <Button primary type="submit">
                Изменить дату
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {dialog?.type === "reset" && (
        <Modal title="Перезапустить демонстрацию" onClose={close}>
          <p>
            Три исходных обращения будут восстановлены. Действия и вложения,
            добавленные в этом браузере, будут удалены.
          </p>
          {dialogError && <p className="form-error">{dialogError}</p>}
          <div className="dialog-actions">
            <Button onClick={close}>Отмена</Button>
            <Button
              primary
              onClick={() => {
                try {
                  model.commit(
                    initialState(),
                    "Три исходных обращения восстановлены",
                  );
                  model.navigate({ page: "registry" });
                  close();
                } catch {
                  setDialogError("Браузер не разрешает сохранение данных");
                }
              }}
            >
              Сбросить демо
            </Button>
          </div>
        </Modal>
      )}
      {dialog?.type === "upload" && (
        <Modal title="Добавить материал дела" onClose={close}>
          <Notice>
            Обычное вложение не продлевает срок рассмотрения. Формальное
            дополнение регистрируется отдельным действием.
          </Notice>
          <label className="field">
            <span>Файл — до 2 МБ</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
              disabled={uploading}
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </label>
          {uploading && <p>Сохранение файла…</p>}
          {dialogError && (
            <p className="form-error" role="alert">
              {dialogError}
            </p>
          )}
        </Modal>
      )}
      {model.toast && (
        <div className="react-toast" role="status">
          {model.toast}
        </div>
      )}
    </AppShell>
  );
}
