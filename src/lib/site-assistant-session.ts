import type { AssistantOffer, AssistantSelection, AssistantTopic, ChatAction, ChatReply } from "./site-assistant";
import type { AssistantPlan } from "./site-assistant-plan";

export const ASSISTANT_SESSION_KEY = "kileni-assistant-session:v1";
export const ASSISTANT_INPUT_LIMIT = 1000;
export const ASSISTANT_HISTORY_LIMIT = 40;
export type AssistantMessage = ChatReply & { id: string; role: "assistant" | "user"; question?: string; inputSelection?: AssistantSelection; inputTopic?: string };
export type AssistantSessionState = { messages: AssistantMessage[]; selection: AssistantSelection; topic?: string; draft: string; open: boolean };
type SavedSession = AssistantSessionState & { version: 2; catalogSignature: string };

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const string = (value: unknown, limit = 12000): value is string => typeof value === "string" && value.length <= limit;
const quantity = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 1000000;
const money = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100000000000;
const unit = (value: unknown) => value === "project" || value === "month" || value === "sku";
const allowedSteps = new Set(["plan-topic", "plan-goal", "plan-services", "plan-platform", "plan-task", "plan-requirements", "plan-outcome", "plan-dependencies", "plan-ads-scope", "plan-pages", "plan-products", "plan-regions", "plan-cards", "plan-materials", "plan-unit", "plan-budget", "plan-budget-confirm", "plan-ad-budget", "plan-timing", "plan-stage", "plan-compare", "plan-results", "plan-summary", "pricing-topic", "pricing-platform", "pricing-amount", "pricing-unit", "goal", "marketplace-scope", "offer", "summary", "assistant-menu"]);
const step = (value: unknown): value is string => typeof value === "string" && allowedSteps.has(value);
const topicId = (value: unknown, catalog: AssistantTopic[]): value is string => typeof value === "string" && catalog.some(topic => topic.id === value);
const offerId = (value: unknown, catalog: AssistantTopic[], topic?: string): value is string => typeof value === "string" && catalog.some(item => (!topic || item.id === topic) && item.offers.some(offer => offer.id === value));

export function assistantSelectionFromReply(reply?: ChatReply): AssistantSelection {
  return { step: reply?.step, offer: reply?.offer, budget: reply?.budget, budgetUnit: reply?.budgetUnit, pricingMode: reply?.pricingMode, plan: reply?.plan, planHistory: reply?.planHistory };
}

function catalogSignature(catalog: AssistantTopic[]) {
  return JSON.stringify(catalog.map(topic => [topic.id, topic.offers.map(offer => [offer.id, offer.title, offer.price, offer.amount, offer.priceType, offer.billingUnit, offer.scope, offer.duration, offer.features, offer.exclusions, offer.contract, offer.href])]));
}

function readPlan(value: unknown, catalog: AssistantTopic[], fallbackTopic?: string, nested = false): AssistantPlan | undefined {
  if (!record(value)) return undefined;
  const result: Record<string, unknown> = {};
  if (topicId(value.topic, catalog)) result.topic = value.topic;
  const topic = typeof result.topic === "string" ? result.topic : fallbackTopic;
  for (const key of ["task", "description", "outcome", "dependencies", "timing", "deferredInput"])
    if (string(value[key])) result[key] = value[key];
  if (string(value.kind, 80)) result.kind = value.kind;
  for (const key of ["pages", "regions", "cards", "materials", "products"])
    if (quantity(value[key])) result[key] = value[key];
  for (const key of ["pagesAnswered", "regionsAnswered", "cardsAnswered", "materialsAnswered", "productsAnswered", "budgetAnswered", "compareRequested", "paused", "requirementsChecked"])
    if (typeof value[key] === "boolean") result[key] = value[key];
  if (step(value.resumeStep)) result.resumeStep = value.resumeStep;
  if (money(value.budget)) result.budget = value.budget;
  if (unit(value.budgetUnit)) result.budgetUnit = value.budgetUnit;
  if (value.cardBudget === "total" || value.cardBudget === "sku") result.cardBudget = value.cardBudget;
  if (["confirmed", "custom", "unknown"].includes(String(value.adsScope))) result.adsScope = value.adsScope;
  for (const key of ["offer", "preferredOffer"])
    if (offerId(value[key], catalog, topic)) result[key] = value[key];
  const fields = ["pages", "cards", "materials"];
  if (record(value.fullScope) && fields.includes(String(value.fullScope.field)) && quantity(value.fullScope.count))
    result.fullScope = { field: value.fullScope.field, count: value.fullScope.count };
  if (record(value.firstStage) && fields.includes(String(value.firstStage.field)) && quantity(value.firstStage.count) && quantity(value.firstStage.original) && value.firstStage.count <= value.firstStage.original && offerId(value.firstStage.offer, catalog, topic))
    result.firstStage = { field: value.firstStage.field, count: value.firstStage.count, original: value.firstStage.original, offer: value.firstStage.offer };
  // Requirements are plain facts, never executable content or saved destinations.
  if (record(value.requirements)) {
    const requirements: Record<string, unknown> = {};
    for (const key of ["languages", "blocks", "forms", "templates", "frames", "textLength", "campaigns", "services", "groups"]) if (quantity(value.requirements[key])) requirements[key] = value.requirements[key];
    if (typeof value.requirements.editHours === "number" && Number.isFinite(value.requirements.editHours) && value.requirements.editHours > 0 && value.requirements.editHours <= 1000000) requirements.editHours = value.requirements.editHours;
    for (const key of ["onlinePayment", "cart", "delivery", "integrations", "accounts", "roles", "migration", "existingSite", "siteReady", "materialsReady", "designReady", "publishing", "imagesOnly", "editing", "sourcesReady", "factsReady"]) if (typeof value.requirements[key] === "boolean") requirements[key] = value.requirements[key];
    if (string(value.requirements.textType, 2000)) requirements.textType = value.requirements.textType;
    for (const key of ["adSpend", "adBudgetTotal"]) if (money(value.requirements[key])) requirements[key] = value.requirements[key];
    if (Object.keys(requirements).length) result.requirements = requirements;
  }
  if (Array.isArray(value.unresolved) && value.unresolved.length <= 50 && value.unresolved.every(item => string(item, 500))) result.unresolved = value.unresolved;
  if (Number.isSafeInteger(value.attempts) && Number(value.attempts) >= 0 && Number(value.attempts) <= 100) result.attempts = value.attempts;
  if (record(value.projectBudget) && string(value.projectBudget.raw, 2000)) result.projectBudget = { raw: value.projectBudget.raw, ...(money(value.projectBudget.amount) ? { amount: value.projectBudget.amount } : {}), ...(typeof value.projectBudget.allocationKnown === "boolean" ? { allocationKnown: value.projectBudget.allocationKnown } : {}) };
  if (record(value.budgetProposal) && string(value.budgetProposal.raw, 2000) && (value.budgetProposal.kind === "range" || value.budgetProposal.kind === "minimum"))
    result.budgetProposal = { raw: value.budgetProposal.raw, kind: value.budgetProposal.kind, ...(money(value.budgetProposal.lower) ? { lower: value.budgetProposal.lower } : {}), ...(money(value.budgetProposal.upper) ? { upper: value.budgetProposal.upper } : {}) };
  if (!nested && Array.isArray(value.projectTasks)) {
    result.projectTasks = value.projectTasks.slice(0, 20).filter(item => record(item) && string(item.id, 80) && topicId(item.topic, catalog) && string(item.description)).map(item => ({ id: item.id, topic: item.topic, description: item.description, ...(readPlan(item.plan, catalog, item.topic, true) ? { plan: readPlan(item.plan, catalog, item.topic, true) } : {}) }));
  }
  if (string(value.activeTask, 80) && (!Array.isArray(result.projectTasks) || result.projectTasks.some(item => record(item) && item.id === value.activeTask))) result.activeTask = value.activeTask;
  return result as AssistantPlan;
}

function readSelection(value: unknown, catalog: AssistantTopic[], topic?: string): AssistantSelection {
  if (!record(value)) return {};
  const plan = readPlan(value.plan, catalog, topic);
  const result: AssistantSelection = {};
  if (step(value.step)) result.step = value.step;
  else if (value.step !== undefined && plan) result.step = "plan-summary";
  if (result.step === "plan-stage" && !plan?.firstStage) result.step = "plan-results";
  if (offerId(value.offer, catalog, plan?.topic ?? topic)) result.offer = value.offer;
  if (money(value.budget)) result.budget = value.budget;
  if (unit(value.budgetUnit)) result.budgetUnit = value.budgetUnit as AssistantSelection["budgetUnit"];
  if (value.pricingMode === "compare" || value.pricingMode === "budget") result.pricingMode = value.pricingMode;
  if (plan) result.plan = plan;
  if (Array.isArray(value.planHistory) && value.planHistory.length <= 1000) result.planHistory = value.planHistory.filter(item => record(item) && step(item.step) && record(item.plan)).map(item => {
    const historyPlan = readPlan(item.plan, catalog, topic)!;
    return { step: item.step === "plan-stage" && !historyPlan.firstStage ? "plan-results" : item.step, plan: historyPlan };
  });
  return result;
}

function readMessage(value: unknown, catalog: AssistantTopic[]): AssistantMessage | undefined {
  if (!record(value) || !string(value.id, 120) || !string(value.text, 50000) || (value.role !== "user" && value.role !== "assistant")) return;
  if (value.role === "user") return { id: value.id, role: "user", text: value.text, links: [] };
  const topic = topicId(value.topic, catalog) ? value.topic : undefined;
  const allowedLinks = new Set(["/contacts", "/brief", "/about", "/pricing", "/en/contacts", "/en/brief", "/en/about", "/en/pricing", ...catalog.flatMap(item => [item.href, ...item.offers.map(offer => offer.href), `${item.href}#marketplace-offers`, `${item.href}#variants`, `${item.href}#offers`])]);
  const links = Array.isArray(value.links) ? value.links.filter(link => record(link) && string(link.label, 300) && typeof link.href === "string" && allowedLinks.has(link.href)).map(link => ({ label: link.label as string, href: link.href as string })) : [];
  const result: AssistantMessage = { id: value.id, role: "assistant", text: value.text, links, topic, ...readSelection(value, catalog, topic) };
  if (string(value.question, 1000)) result.question = value.question;
  if (record(value.inputSelection)) result.inputSelection = readSelection(value.inputSelection, catalog, topic);
  if (topicId(value.inputTopic, catalog)) result.inputTopic = value.inputTopic;
  for (const key of ["explanation", "timingNotice"] as const) if (string(value[key])) result[key] = value[key];
  if (Array.isArray(value.suggestions)) result.suggestions = value.suggestions.filter(item => string(item, 300)).slice(0, 15);
  if (Array.isArray(value.actions)) result.actions = value.actions.filter(action => record(action) && string(action.id, 100) && string(action.label, 300) && (action.value === undefined || string(action.value, 1000))).slice(0, 15).map(action => ({ id: action.id as string, label: action.label as string, ...(typeof action.value === "string" ? { value: action.value } : {}) }));
  if (Array.isArray(value.comparisons)) {
    result.comparisons = value.comparisons.map(item => record(item) ? catalog.find(entry => entry.id === topic)?.offers.find(offer => offer.id === item.id) : undefined).filter((offer): offer is AssistantOffer => Boolean(offer));
  }
  if (Array.isArray(value.summary)) result.summary = value.summary.filter(row => record(row) && string(row.label, 300) && string(row.value, 12000) && (row.action === undefined || string(row.action, 300))).map(row => ({ label: row.label as string, value: row.value as string, ...(row.action ? { action: row.action as string } : {}), ...(string(row.actionId, 100) ? { actionId: row.actionId } : {}) }));
  return result;
}

export function createAssistantSession(state: AssistantSessionState, catalog: AssistantTopic[]): SavedSession {
  return { ...state, version: 2, catalogSignature: catalogSignature(catalog), messages: state.messages.slice(-ASSISTANT_HISTORY_LIMIT) };
}

export function assistantRestoreAction(state: AssistantSessionState, catalogChanged = false): ChatAction | undefined {
  const selection = state.selection;
  if (selection.plan?.paused || selection.step === "assistant-menu") return;
  const last = [...state.messages].reverse().find(message => message.role === "assistant");
  if (last?.summary) return { id: "prepare-summary", label: "Подготовить резюме" };
  if (last?.comparisons && selection.plan) return { id: selection.step === "plan-compare" ? "compare" : "continue-plan", label: "Продолжить подбор" };
  if (last?.comparisons) return { id: selection.pricingMode === "budget" ? "budget" : "compare", label: "Проверить актуальные тарифы" };
  if (!catalogChanged) return;
  if (selection.plan) return { id: "continue-plan", label: "Продолжить подбор" };
  if (selection.offer) return { id: "choose-offer", label: "Проверить актуальный тариф", value: selection.offer };
  if (selection.pricingMode) return { id: selection.pricingMode === "budget" ? "budget" : "compare", label: "Проверить актуальные тарифы" };
}

export function restoreAssistantSession(raw: string | null, catalog: AssistantTopic[]): { session?: AssistantSessionState; notice?: string; noticeKind?: "catalog" | "step" | "corrupt"; catalogChanged?: boolean } {
  if (!raw) return {};
  try {
    const saved: unknown = JSON.parse(raw);
    if (!record(saved) || (saved.version !== undefined && saved.version !== 2) || !Array.isArray(saved.messages) || (saved.version === 2 && !record(saved.selection)) || (saved.draft !== undefined && typeof saved.draft !== "string")) throw new Error("invalid session");
    const ids = new Set<string>();
    const messages = saved.messages.map(item => readMessage(item, catalog)).filter((item): item is AssistantMessage => Boolean(item)).slice(-ASSISTANT_HISTORY_LIMIT).map((message, index) => {
      let id = message.id;
      let suffix = 0;
      while (ids.has(id)) id = `${message.id}:restored:${index}:${suffix++}`;
      ids.add(id);
      return { ...message, id };
    });
    if (!messages.length) throw new Error("empty session");
    const topic = topicId(saved.topic, catalog) ? saved.topic : undefined;
    const lastReply = [...messages].reverse().find(message => message.role === "assistant");
    const selection = readSelection(saved.version === 2 ? saved.selection : lastReply, catalog, topic);
    const sourceSelection = record(saved.selection) ? saved.selection : lastReply;
    const sourcePlan = record(sourceSelection?.plan) ? sourceSelection.plan : undefined;
    const savedOfferIds = [sourceSelection?.offer, sourcePlan?.offer, sourcePlan?.preferredOffer, record(sourcePlan?.firstStage) ? sourcePlan.firstStage.offer : undefined].filter((value): value is string => typeof value === "string");
    const repairedStep = sourceSelection?.step !== undefined && (!step(sourceSelection.step) || (sourceSelection.step === "plan-stage" && !selection.plan?.firstStage));
    const catalogChanged = repairedStep || saved.catalogSignature === undefined || saved.catalogSignature !== catalogSignature(catalog) || savedOfferIds.some(id => !offerId(id, catalog, selection.plan?.topic ?? topic));
    return { session: { messages, topic: selection.plan?.topic ?? topic, selection, draft: typeof saved.draft === "string" ? saved.draft : "", open: saved.open === true }, catalogChanged, ...(repairedStep ? { noticeKind: "step" as const, notice: "Не удалось восстановить текущий шаг. Сохранённые условия доступны; их можно проверить, изменить и продолжить подбор." } : catalogChanged ? { noticeKind: "catalog" as const, notice: "Каталог услуг изменился. Сохранённые условия задачи остались; цены и соответствие тарифу проверены по текущему каталогу." } : {}) };
  } catch {
    return { noticeKind: "corrupt", notice: "Не удалось восстановить сохранённый диалог. Можно начать новый; помощник продолжает работать." };
  }
}

export function hasMeaningfulConversation(state: Pick<AssistantSessionState, "messages" | "selection" | "draft">): boolean {
  return Boolean(state.draft.trim() || state.selection.offer || (state.selection.plan && Object.keys(state.selection.plan).length) || state.messages.some(message => message.role === "user"));
}

export function validateAssistantInput(text: string): { ok: true; question: string } | { ok: false; error: "empty" | "too-long" } {
  const question = text.trim();
  if (!question) return { ok: false, error: "empty" };
  if (question.length > ASSISTANT_INPUT_LIMIT) return { ok: false, error: "too-long" };
  return { ok: true, question };
}
