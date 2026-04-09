const USAGE_STORAGE_KEY = "troca-saf-usage-events";
const SIMULATION_USAGE_SESSION_KEY = "troca-saf-usage-simulation";
const MAX_STORED_EVENTS = 600;

export const USAGE_EVENT_TYPES = {
  SIMULATION_USED: "simulation_used",
  LOGIN_SUCCESS: "login_success",
  MESSAGE_COPIED: "message_copied",
  ERP_OPENED: "erp_opened"
};

const EVENT_LABELS = {
  [USAGE_EVENT_TYPES.SIMULATION_USED]: "Simulação",
  [USAGE_EVENT_TYPES.LOGIN_SUCCESS]: "Login concluído",
  [USAGE_EVENT_TYPES.MESSAGE_COPIED]: "Mensagem copiada",
  [USAGE_EVENT_TYPES.ERP_OPENED]: "Nova troca aberta"
};

const METRIC_DEFINITIONS = [
  { type: USAGE_EVENT_TYPES.SIMULATION_USED, label: "Simulação" },
  { type: USAGE_EVENT_TYPES.LOGIN_SUCCESS, label: "Logins" },
  { type: USAGE_EVENT_TYPES.MESSAGE_COPIED, label: "Cópias de mensagem" },
  { type: USAGE_EVENT_TYPES.ERP_OPENED, label: "Nova troca" }
];

const REPORTED_EVENT_TYPES = new Set(METRIC_DEFINITIONS.map((metric) => metric.type));

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function formatInputDate(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildStartTimestamp(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

function buildEndTimestamp(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

function normalizeEvent(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  if (typeof item.type !== "string" || typeof item.occurredAt !== "number") {
    return null;
  }

  return {
    id: typeof item.id === "string" ? item.id : `${item.type}-${item.occurredAt}`,
    type: item.type,
    occurredAt: item.occurredAt
  };
}

export function getDefaultUsageFilters() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  return {
    startDate: formatInputDate(startDate),
    endDate: formatInputDate(endDate)
  };
}

export function getCurrentWeekUsageFilters() {
  const endDate = new Date();
  const startDate = new Date(endDate);
  const dayOfWeek = startDate.getDay();
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  startDate.setDate(startDate.getDate() - distanceToMonday);

  return {
    startDate: formatInputDate(startDate),
    endDate: formatInputDate(endDate)
  };
}

export function getTodayUsageFilters() {
  const today = new Date();

  return {
    startDate: formatInputDate(today),
    endDate: formatInputDate(today)
  };
}

export function readUsageEvents() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(USAGE_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      window.localStorage.removeItem(USAGE_STORAGE_KEY);
      return [];
    }

    return parsedValue
      .map(normalizeEvent)
      .filter(Boolean)
      .sort((left, right) => right.occurredAt - left.occurredAt);
  } catch {
    window.localStorage.removeItem(USAGE_STORAGE_KEY);
    return [];
  }
}

function persistUsageEvents(events) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(events.slice(-MAX_STORED_EVENTS)));
}

export function trackUsageEvent(type) {
  if (typeof window === "undefined" || typeof type !== "string" || !type.trim()) {
    return false;
  }

  const nextEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    occurredAt: Date.now()
  };

  const events = readUsageEvents().slice().reverse();
  events.push(nextEvent);
  persistUsageEvents(events);
  return true;
}

export function ensureSimulationUsageTracked() {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.sessionStorage.getItem(SIMULATION_USAGE_SESSION_KEY) === "1") {
    return false;
  }

  const wasTracked = trackUsageEvent(USAGE_EVENT_TYPES.SIMULATION_USED);
  window.sessionStorage.setItem(SIMULATION_USAGE_SESSION_KEY, "1");
  return wasTracked;
}

function matchesUsageFilters(event, filters) {
  const startTimestamp = filters.startDate ? buildStartTimestamp(filters.startDate) : null;
  const endTimestamp = filters.endDate ? buildEndTimestamp(filters.endDate) : null;

  if (startTimestamp !== null && event.occurredAt < startTimestamp) {
    return false;
  }

  if (endTimestamp !== null && event.occurredAt > endTimestamp) {
    return false;
  }

  return true;
}

export function getUsageReport(filters = {}) {
  const safeFilters = {
    startDate: typeof filters.startDate === "string" ? filters.startDate : "",
    endDate: typeof filters.endDate === "string" ? filters.endDate : ""
  };

  const filteredEvents = readUsageEvents().filter(
    (event) => REPORTED_EVENT_TYPES.has(event.type) && matchesUsageFilters(event, safeFilters)
  );
  const usageByDay = new Map();

  filteredEvents.forEach((event) => {
    const dateKey = formatInputDate(new Date(event.occurredAt));
    usageByDay.set(dateKey, (usageByDay.get(dateKey) ?? 0) + 1);
  });

  const metrics = METRIC_DEFINITIONS.map((metric) => ({
    ...metric,
    value: filteredEvents.filter((event) => event.type === metric.type).length
  }));

  const timeline = Array.from(usageByDay.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, count]) => ({
      dateKey,
      label: shortDateFormatter.format(new Date(`${dateKey}T12:00:00`)),
      count
    }));

  const recentEvents = filteredEvents.slice(0, 8).map((event) => ({
    id: event.id,
    label: EVENT_LABELS[event.type] ?? event.type,
    occurredAtLabel: shortDateTimeFormatter.format(event.occurredAt)
  }));

  return {
    filters: safeFilters,
    totalEvents: filteredEvents.length,
    daysWithUsage: timeline.length,
    lastActivityLabel: filteredEvents[0] ? shortDateTimeFormatter.format(filteredEvents[0].occurredAt) : "Sem registros",
    metrics,
    timeline,
    recentEvents
  };
}
