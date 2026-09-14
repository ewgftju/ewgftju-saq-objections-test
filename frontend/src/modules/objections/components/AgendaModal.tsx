import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Modal } from "../../../components/ui";
import type { ObjectionCase } from "../../../types";
import { formatDate } from "../../../utils/dateFormat";

function appealTypeParts(appealType?: string) {
  const [first = "", ...rest] = (appealType || "").trim().split(/\s+/);
  return { first, rest: rest.join(" ") };
}

function authorityFindings(c: ObjectionCase) {
  return c.issues
    .filter((point) => point.disputed)
    .map((point) => point.authorityFinding?.trim())
    .filter((finding): finding is string => Boolean(finding))
    .join("; ");
}

export function agendaItemText(c: ObjectionCase) {
  const appealType = appealTypeParts(c.appealType);
  return `${appealType.first || "—"} ${c.appealNumber || "—"} от ${formatDate(
    c.appealDate || c.filed,
  )} ${c.org || "—"} ${appealType.rest} ${c.issuer || "—"} ${
    authorityFindings(c) || "—"
  } (${c.assignee || "—"})`;
}

export function AgendaDocument({
  cases,
  meetingDate,
}: {
  cases: ObjectionCase[];
  meetingDate: string;
}) {
  return (
    <article className="print-document agenda-template">
      <h1>
        Қазақстан Республикасының Қаржы министрлігінің апелляциялық
        <br />
        комиссиясының {formatDate(meetingDate)} жылға күн тәртібіндегі
        <br />
        қарастырылатын материалдар тізімі
      </h1>
      <ol>
        {cases.map((c) => (
          <li key={c.id}>{agendaItemText(c)}</li>
        ))}
      </ol>
    </article>
  );
}

function agendaDocumentHtml(cases: ObjectionCase[], meetingDate: string) {
  const content = renderToStaticMarkup(
    <AgendaDocument cases={cases} meetingDate={meetingDate} />,
  );
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Повестка дня</title><style>
    @page { size: A4; margin: 22mm 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; color: #111; background: #edf3f6; }
    .agenda-template { width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 30mm 26mm; background: #fff; font-family: "Times New Roman", Times, serif; font-size: 16pt; line-height: 1.2; }
    .agenda-template h1 { margin: 0 0 18mm; text-align: center; font-size: 16pt; line-height: 1.12; font-weight: 700; }
    .agenda-template ol { margin: 0; padding-left: 12mm; }
    .agenda-template li { padding-left: 4mm; text-align: justify; }
    @media print { body { padding: 0; background: #fff; } .agenda-template { min-height: 0; padding: 0; } }
  </style></head><body>${content}</body></html>`;
}

export default function AgendaModal({
  cases,
  date,
  onSend,
  onClose,
}: {
  cases: ObjectionCase[];
  date: string;
  onSend: (meetingDate: string) => void;
  onClose: () => void;
}) {
  const [meetingDate, setMeetingDate] = useState(date);
  const [error, setError] = useState("");
  const print = () => {
    const popup = window.open("", "_blank");
    if (!popup) {
      setError(
        "Браузер заблокировал окно печати. Разрешите всплывающие окна и повторите попытку.",
      );
      return;
    }
    popup.document.write(agendaDocumentHtml(cases, meetingDate));
    popup.document.close();
    popup.focus();
    popup.print();
  };
  return (
    <Modal title="Сформировать повестку дня" onClose={onClose} wide>
      <label className="field agenda-date-field">
        <span>Дата заседания</span>
        <input
          type="date"
          value={meetingDate}
          onChange={(event) => setMeetingDate(event.target.value)}
          required
        />
      </label>
      <div className="agenda-print-preview">
        <AgendaDocument cases={cases} meetingDate={meetingDate} />
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button onClick={onClose}>Закрыть</Button>
        <Button primary onClick={print}>
          Печать / PDF
        </Button>
        <Button primary onClick={() => onSend(meetingDate)}>
          Направить АК
        </Button>
      </div>
    </Modal>
  );
}
