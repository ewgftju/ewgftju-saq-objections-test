import { Button, Notice, PageHeading } from "../../../components/ui";
import type { CaseNotification } from "../../../types";
import { formatDate } from "../../../utils/dateFormat";

export default function NotificationsPage({
  notifications,
  onOpenCase,
}: {
  notifications: CaseNotification[];
  onOpenCase: (caseId: string) => void;
}) {
  return (
    <>
      <PageHeading
        title="Уведомления"
        subtitle="Автоматические сообщения объектам аудита и заявителям"
      />
      {notifications.length === 0 ? (
        <Notice>Уведомлений пока нет.</Notice>
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Получатель</th>
                  <th>Текст уведомления</th>
                  <th>Обращение</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td>{formatDate(notification.date)}</td>
                    <td>{notification.recipient}</td>
                    <td>{notification.text}</td>
                    <td>
                      <Button onClick={() => onOpenCase(notification.caseId)}>
                        Открыть
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
