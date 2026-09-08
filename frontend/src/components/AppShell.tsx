import { useState } from "react";
import type { ReactNode } from "react";
import { ROLES } from "../data/constants";
import type { Page, Role, Route } from "../types";
import { formatDate } from "../utils/dateFormat";
import { Icon } from "./ui";

const navigation: { page: Page; label: string }[] = [
  { page: "registry", label: "Возражения" },
  { page: "sessions", label: "Заседания комиссии" },
  { page: "processes", label: "Бизнес-процессы" },
  { page: "sources", label: "Нормативная база" },
];

export default function AppShell({
  children,
  route,
  date,
  role,
  onRoleChange,
  onNavigate,
  onClock,
  onReset,
}: {
  children: ReactNode;
  route: Route;
  date: string;
  role: Role;
  onRoleChange: (role: Role) => void;
  onNavigate: (route: Route) => void;
  onClock: () => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`app-shell ${expanded ? "expanded" : ""}`}>
      <aside className="rail">
        <button
          className="brand"
          onClick={() => onNavigate({ page: "registry" })}
          aria-label="Главная SAQ"
        >
          <img src="/saq-logo.png" alt="SAQ" />
          <span>
            <strong>SAQ</strong>
            <small>Смарт Аудит Казахстан</small>
          </span>
        </button>
        <button
          className="rail-menu"
          aria-label={expanded ? "Свернуть меню" : "Развернуть меню"}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name="menu" />
        </button>
        <nav>
          {navigation.map(({ page, label }) => (
            <button
              key={page}
              title={label}
              aria-label={label}
              aria-current={
                route.page === page ||
                (route.page === "detail" && page === "registry")
                  ? "page"
                  : undefined
              }
              className={`rail-item ${route.page === page || (route.page === "detail" && page === "registry") ? "active" : ""}`}
              onClick={() => onNavigate({ page })}
            >
              <Icon name={page} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <span>SAQ</span>
          <small>ДВГА</small>
        </div>
      </aside>
      <header className="topbar">
        <div>
          <h1>Возражения</h1>
          <p className="header-subtitle">
            Департамент внутреннего государственного аудита
          </p>
        </div>
        <div className="topbar-actions">
          <button
            className="date-control"
            onClick={onClock}
            title="Изменить дату демонстрации"
          >
            {formatDate(date)}
          </button>
          <label className="role-control">
            <span>Роль в демо</span>
            <select
              value={role}
              onChange={(event) => onRoleChange(event.target.value as Role)}
            >
              {Object.entries(ROLES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="avatar" aria-hidden="true">
            ДВ
          </div>
        </div>
      </header>
      <main className="content">
        <div className="demo-bar">
          <span>
            <strong>Тестовый модуль.</strong> Вымышленные обращения. Данные
            сохраняются в этом браузере; отправки и подписи имитируются.
          </span>
          <button className="text-button" onClick={onReset}>
            Сбросить демо
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
