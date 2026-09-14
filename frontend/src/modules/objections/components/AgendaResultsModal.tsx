import { useState } from "react";
import { Button, Modal, Notice } from "../../../components/ui";
import type { ObjectionCase } from "../../../types";
import { formatDate } from "../../../utils/dateFormat";
import { overall } from "../services/decisions";
import { agendaItemText } from "./AgendaModal";

function pointVotes(c: ObjectionCase) {
  const disputedPoints = c.issues.filter((point) => point.disputed);
  if (!disputedPoints.length) return ["Голоса не зафиксированы"];
  return disputedPoints.map((point) => {
    const result = c.votes?.[point.id];
    if (!result) return `Пункт ${point.number}: голоса не зафиксированы`;
    const votes = result.votes || {};
    const names = (vote: "yes" | "no") =>
      c.members
        .filter((member) => votes[member.id] === vote)
        .map((member) => member.name)
        .join(", ");
    const yes = names("yes") || String(result.yes);
    const no = names("no") || String(result.no);
    return `Пункт ${point.number}: За — ${yes}; Против — ${no}`;
  });
}

function overallResult(c: ObjectionCase) {
  const result = overall(c);
  return result === "accept"
    ? "Удовлетворить"
    : result === "reject"
      ? "Об отказе в удовлетворении"
      : result === "partial"
        ? "Удовлетворить частично"
        : "Не определён";
}

export default function AgendaResultsModal({
  cases,
  date,
  onClose,
}: {
  cases: ObjectionCase[];
  date: string;
  onClose: () => void;
}) {
  const [meetingDate, setMeetingDate] = useState(date);
  const items = cases.filter(
    (c) =>
      c.agendaMeetingDate === meetingDate ||
      (!c.agendaMeetingDate && c.meeting?.date === meetingDate),
  );
  return (
    <Modal title="Сформировать итоги по повестке дня" onClose={onClose} wide>
      <label className="field agenda-date-field">
        <span>Дата заседания</span>
        <input
          type="date"
          value={meetingDate}
          onChange={(event) => setMeetingDate(event.target.value)}
          required
        />
      </label>
      {meetingDate && (
        <p className="muted agenda-results-date">
          Пункты повестки дня на {formatDate(meetingDate)}
        </p>
      )}
      {items.length ? (
        <div className="table-scroll">
          <table className="data-table agenda-results-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Пункт повестки дня</th>
                <th>Голоса по каждому пункту</th>
                <th>Общий результат</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c, index) => (
                <tr key={c.id}>
                  <td>{index + 1}</td>
                  <td>{agendaItemText(c)}</td>
                  <td>
                    {pointVotes(c).map((summary) => (
                      <p key={summary} className="agenda-vote-summary">
                        {summary}
                      </p>
                    ))}
                  </td>
                  <td>{overallResult(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Notice>
          По выбранной дате нет направленных пунктов повестки дня.
        </Notice>
      )}
      <div className="dialog-actions">
        <Button onClick={onClose}>Закрыть</Button>
      </div>
    </Modal>
  );
}
