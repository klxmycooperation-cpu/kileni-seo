"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { answerSiteQuestion, answerSiteAction, assistantActionFor, ASSISTANT_WELCOME, clampChatPosition, chatPanelLayout, CHAT_SIZE, type AssistantTopic, type ChatPosition, type ChatAction, type AssistantSelection } from "../../lib/site-assistant";
import type { PublicContact } from "../../lib/public-contacts";
import type { Locale } from "../../config/site";
import { planChoiceRows } from "../../lib/site-assistant-plan";
import { ASSISTANT_SESSION_KEY, ASSISTANT_INPUT_LIMIT, ASSISTANT_HISTORY_LIMIT, assistantSelectionFromReply, assistantRestoreAction, createAssistantSession, restoreAssistantSession, hasMeaningfulConversation, validateAssistantInput, type AssistantMessage } from "../../lib/site-assistant-session";
import { AssistantOfferComparison } from "./AssistantOfferComparison";
import { assistantBriefHref, createAssistantBriefHandoff, storeAssistantBriefHandoff } from "../../lib/brief/assistant-handoff";

const POSITION_KEY = "kileni-contact-position:v1";
type Viewport = { width: number; height: number; top: number; left: number };
function welcomeMessage(locale: Locale): AssistantMessage {
  return { id: "welcome", role: "assistant", text: locale === "ru" ? ASSISTANT_WELCOME : "Hello! I am your personal KILENI assistant. I can explain our services, compare plans and help you choose an option for your task and budget. Where shall we start?", links: [] };
}
function menuActions(locale: Locale): ChatAction[] {
  return [
    { id: "start-plan", label: locale === "ru" ? "Подобрать услугу" : "Find a service" },
    { id: "compare", label: locale === "ru" ? "Сравнить тарифы" : "Compare plans" },
    { id: "budget", label: locale === "ru" ? "Подобрать по бюджету" : "Find by budget" },
    { id: "ask-question", label: locale === "ru" ? "Задать вопрос" : "Ask a question" },
    { id: "contacts", label: locale === "ru" ? "Связаться с командой" : "Contact the team" },
  ];
}
const stepNames: Record<string,string> = {
  "plan-topic":"Выбираем услугу", "plan-goal":"Определяем услугу", "plan-platform":"Выбираем площадку",
  "plan-task":"Уточняем задачу", "plan-pages":"Уточняем объём", "plan-products":"Уточняем объём",
  "plan-ads-scope":"Уточняем объём рекламы",
  "plan-regions":"Уточняем регионы", "plan-cards":"Уточняем объём", "plan-materials":"Уточняем объём",
  "plan-unit":"Выбираем способ расчёта", "plan-budget":"Уточняем бюджет", "plan-timing":"Уточняем срок",
  "plan-results":"Результат подбора", "pricing-topic":"Выбираем услугу", "pricing-platform":"Выбираем площадку",
  "plan-stage":"Первый этап работы",
  "pricing-amount":"Уточняем бюджет", "pricing-unit":"Выбираем способ расчёта",
};

function ChatIcon() {
  return <svg className="contact-chat__symbol" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h11A3.5 3.5 0 0 1 21 7.5v7a3.5 3.5 0 0 1-3.5 3.5H10l-4.2 2.8a.5.5 0 0 1-.8-.4v-2.8A3.5 3.5 0 0 1 3 14.5v-7A3.5 3.5 0 0 1 6.5 4Z" fill="currentColor"/><g fill="#4563dd"><circle cx="8" cy="11" r="1.1"/><circle cx="12" cy="11" r="1.1"/><circle cx="16" cy="11" r="1.1"/></g></svg>;
}

export function FloatingContactChat({ catalog, contacts, locale = "ru" }: { catalog: AssistantTopic[]; contacts: PublicContact[]; locale?: Locale }) {
  const text = (ru: string, en: string) => locale === "ru" ? ru : en;
  const [initialCatalog] = useState(catalog);
  const [initialLocale] = useState(locale);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [position, setPosition] = useState<ChatPosition>({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([welcomeMessage(locale)]);
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState<string>();
  const [selection, setSelection] = useState<AssistantSelection>({});
  const inputPlaceholder = selection.step === "plan-budget" || selection.step === "pricing-amount"
    ? text("Напишите бюджет в рублях…", "Your budget in roubles…")
    : selection.step === "plan-timing" ? text("Дата или желаемый срок…", "Date or desired timing…") : text("Напишите ваш вопрос…", "Write your question…");
  const [dragging, setDragging] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [restored, setRestored] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [restoreNotice, setRestoreNotice] = useState("");
  const [inputError, setInputError] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollElementRef = useRef<HTMLDivElement | null>(null);
  const replyRef = useRef<HTMLDivElement>(null);
  const choiceRef = useRef<HTMLDetailsElement>(null);
  const contactsRef = useRef<HTMLDetailsElement>(null);
  const resetCancelRef = useRef<HTMLButtonElement>(null);
  const fraction = useRef({ x: 1, y: .9 });
  const gesture = useRef<{ id: number; x: number; y: number; origin: ChatPosition; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const pageOfferRef = useRef<string|undefined>(undefined);
  const saveSessionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let viewportFrame = 0;
    const updateViewport = () => {
      const view = window.visualViewport;
      const next = { width: view?.width ?? window.innerWidth, height: view?.height ?? window.innerHeight, top: view?.offsetTop ?? 0, left: view?.offsetLeft ?? 0 };
      setViewport(previous => previous && previous.width === next.width && previous.height === next.height && previous.top === next.top && previous.left === next.left ? previous : next);
      const position = clampChatPosition({ x: fraction.current.x * (next.width - CHAT_SIZE - 24) + 12, y: fraction.current.y * (next.height - CHAT_SIZE - 24) + 12 }, next);
      setPosition(previous => previous.x === position.x && previous.y === position.y ? previous : position);
    };
    const scheduleViewport = () => {
      if (viewportFrame) return;
      viewportFrame = requestAnimationFrame(() => { viewportFrame = 0; updateViewport(); });
    };
    const frame = requestAnimationFrame(() => {
      try {
        const savedPosition = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
        if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) fraction.current = { x: Math.max(0, Math.min(1, savedPosition.x)), y: Math.max(0, Math.min(1, savedPosition.y)) };
      } catch { /* A damaged position must not prevent recovering the conversation. */ }
      try {
        const result = restoreAssistantSession(sessionStorage.getItem(ASSISTANT_SESSION_KEY), initialCatalog);
        if (result.notice) setRestoreNotice(initialLocale === "ru" ? result.notice : result.noticeKind === "step" ? "The saved step could not be restored. Your known requirements remain available to review and change." : result.noticeKind === "catalog" ? "The service catalog has changed. Your requirements are preserved; current prices and plan limits have been checked." : "The saved conversation could not be restored. You can start a new conversation.");
        if (result.session) {
          const session = result.session;
          let nextMessages = session.messages.map(message => message.id === "welcome" ? welcomeMessage(initialLocale) : message);
          let nextSelection = session.selection;
          {
            const last = [...nextMessages].reverse().find(message => message.role === "assistant");
            const action = assistantRestoreAction(session, result.catalogChanged);
            if (last && (action || (result.catalogChanged && last.question && !session.selection.plan?.paused && session.selection.step !== "assistant-menu"))) {
              const updated = action ? answerSiteAction(action, initialCatalog, session.topic, session.selection, initialLocale) : answerSiteQuestion(last.question!, initialCatalog, session.topic, session.selection, initialLocale);
              const reply = { ...updated, planHistory: session.selection.planHistory };
              nextMessages = nextMessages.map(message => message.id === last.id ? { ...message, ...reply } : message);
              nextSelection = assistantSelectionFromReply(reply);
            }
          }
          setMessages(nextMessages); setSelection(nextSelection); setTopic(nextSelection.plan?.topic ?? session.topic);
          setOpen(session.open); setDraft(session.draft);
          setRestored(hasMeaningfulConversation(session));
        }
      } catch { setStorageNotice(initialLocale === "ru" ? "Не удалось открыть хранилище. Диалог работает, но может не сохраниться после обновления страницы." : "Storage is unavailable. The assistant works, but this conversation may be lost after refreshing the page."); }
      updateViewport();
    });
    window.addEventListener("resize", scheduleViewport);
    window.visualViewport?.addEventListener("resize", scheduleViewport);
    window.visualViewport?.addEventListener("scroll", scheduleViewport);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(viewportFrame);
      window.removeEventListener("resize", scheduleViewport);
      window.visualViewport?.removeEventListener("resize", scheduleViewport);
      window.visualViewport?.removeEventListener("scroll", scheduleViewport);
    };
  }, [initialCatalog, initialLocale]);

  const storageReady = viewport !== null;
  useEffect(() => {
    if (!storageReady) return;
    const save = () => {
      try { sessionStorage.setItem(ASSISTANT_SESSION_KEY, JSON.stringify(createAssistantSession({ messages, topic, selection, open, draft }, catalog))); }
      catch { setStorageNotice(locale === "ru" ? "Не удалось сохранить диалог. До обновления страницы ваш выбор и черновик доступны здесь." : "This conversation could not be saved. Your current choice and draft remain available until the page is refreshed."); }
    };
    saveSessionRef.current = save;
    const timer = window.setTimeout(save, 150);
    return () => window.clearTimeout(timer);
  }, [messages, topic, selection, open, draft, storageReady, catalog, locale]);

  useEffect(() => {
    const save = () => saveSessionRef.current?.();
    const flush = () => { if (document.hidden) save(); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", flush);
      save();
    };
  }, []);

  useEffect(() => {
    if (resetPending) resetCancelRef.current?.focus();
  }, [resetPending]);

  useEffect(() => {
    const scroll = scrollRef.current;
    const reply = replyRef.current;
    // A newly mounted conversation already starts at zero. Calling scrollTo
    // before its first paint forces the complete dialog layout synchronously.
    if (scroll && scroll !== lastScrollElementRef.current && !showHistory) {
      lastScrollElementRef.current = scroll;
      return;
    }
    lastScrollElementRef.current = scroll;
    if (open && scroll) scroll.scrollTo({ top: showHistory && reply ? scroll.scrollTop + reply.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 10 : 0, behavior: "instant" });
  }, [open, messages, showHistory]);

  function rememberPosition(next: ChatPosition, persist = true) {
    if (!viewport) return;
    fraction.current = { x: (next.x - 12) / Math.max(1, viewport.width - CHAT_SIZE - 24), y: (next.y - 12) / Math.max(1, viewport.height - CHAT_SIZE - 24) };
    if (persist) {
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(fraction.current)); } catch { /* Optional persistence. */ }
    }
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: position, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || !viewport) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > 5) current.moved = true;
    if (current.moved) {
      setDragging(true);
      const next = clampChatPosition({ x: current.origin.x + dx, y: current.origin.y + dy }, viewport);
      setPosition(next);
      rememberPosition(next, false);
    }
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    suppressClick.current = gesture.current.moved;
    if (gesture.current.moved) {
      try { localStorage.setItem(POSITION_KEY, JSON.stringify(fraction.current)); } catch { /* Optional persistence. */ }
    }
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (!viewport || !event.key.startsWith("Arrow")) return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 16;
    const next = clampChatPosition({ x: position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) }, viewport);
    setPosition(next);
    rememberPosition(next);
  }
  function closeChat() { setOpen(false); buttonRef.current?.focus(); }
  function openChat() {
    // The page is only a hint. An explicit selection in the chat remains stronger.
    const pageTopic=catalog.find(item=>item.href===window.location.pathname);
    const selectedElement=document.querySelector<HTMLElement>("article[data-selected='true'][data-offer-id]");
    const id=selectedElement?.dataset.offerId;
    const offer=pageTopic?.offers.find(item=>item.id===id);
    if(offer && id!==pageOfferRef.current) {
      pageOfferRef.current=id;
      const sameService=selection.plan?.topic===pageTopic!.id;
      const inputSelection=sameService?{...selection,step:"plan-compare"}:{step:"plan-compare",plan:{topic:pageTopic!.id}};
      appendReply(text(`Проверить выбранный тариф: ${offer.title}`,`Check selected plan: ${offer.title}`),answerSiteAction({id:"choose-offer",label:offer.title,value:offer.id},catalog,pageTopic!.id,inputSelection,locale),pageTopic!.id,inputSelection);
    } else if(!topic && !selection.plan?.topic && pageTopic)setTopic(pageTopic.id);
    setOpen(true);
  }
  function appendReply(question: string, reply: ReturnType<typeof answerSiteQuestion>, inputTopic: string | undefined, inputSelection: AssistantSelection, clearDraft = false) {
    const keyboardAction = document.activeElement?.tagName === "BUTTON" && document.activeElement.matches(":focus-visible");
    setShowHistory(false);
    setShowMenu(false); setRestored(false); setResetPending(false); setInputError(""); setRestoreNotice("");
    setTransferError("");
    if (choiceRef.current) choiceRef.current.open = false;
    const id = crypto.randomUUID();
    setMessages((current) => [...current, { id: `${id}-user`, role: "user" as const, text: question, links: [] }, { id, role: "assistant" as const, question, inputSelection, inputTopic, ...reply }].slice(-ASSISTANT_HISTORY_LIMIT));
    setSelection(assistantSelectionFromReply(reply));
    setTopic(reply.topic);
    if (clearDraft) setDraft("");
    if (keyboardAction) requestAnimationFrame(() => scrollRef.current?.focus({preventScroll:true}));
  }
  function sendMessage(value: string, inputTopic = topic, inputSelection = selection, clearDraft = false) {
    const input = validateAssistantInput(value);
    if (!input.ok) {
      if (input.error === "too-long") setInputError(text(`Сообщение длиннее ${ASSISTANT_INPUT_LIMIT} символов. Сократите его или отправьте по частям. Черновик остаётся в поле.`, `This message is longer than ${ASSISTANT_INPUT_LIMIT} characters. Shorten it or send it in parts. Your draft remains in the field.`));
      return;
    }
    appendReply(input.question, answerSiteQuestion(input.question, catalog, inputTopic, inputSelection, locale), inputTopic, inputSelection, clearDraft);
  }
  function sendAction(action: ChatAction, inputTopic = topic, inputSelection = selection) {
    if (action.id === "ask-question") { setShowMenu(false); inputRef.current?.focus(); return; }
    if (action.id === "main-menu") { setShowMenu(true); setShowHistory(false); setRestored(false); return; }
    if (action.id === "contacts" && contactsRef.current) contactsRef.current.open = true;
    appendReply(action.label, answerSiteAction(action, catalog, inputTopic, inputSelection, locale), inputTopic, inputSelection);
  }
  function resetConversation() {
    setMessages([welcomeMessage(locale)]); setSelection({}); setTopic(undefined); setDraft(""); setInputError(""); setTransferError(""); setRestoreNotice(""); setShowHistory(false); setShowMenu(false); setRestored(false); setResetPending(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function requestNewConversation() {
    if (hasMeaningfulConversation({ messages, selection, draft })) setResetPending(true);
    else resetConversation();
  }

  function goBack() {
    setShowHistory(false);
    if (selection.planHistory?.length) { sendAction({ id: "back", label: text("Назад", "Back") }); return; }
    const previous = messages.slice(0, -2);
    const reply = [...previous].reverse().find(message => message.role === "assistant");
    if (!reply) return;
    setMessages(previous); setTopic(reply.topic); setSelection(assistantSelectionFromReply(reply)); setTransferError("");
  }
  function editChoice(action: string, actionId?: string) {
    sendAction(actionId ? { id: actionId, label: action } : assistantActionFor(action));
  }

  if (!viewport) return null;
  const panel = chatPanelLayout(position, viewport);
  const choiceRows = planChoiceRows(selection.plan ?? { topic, offer: selection.offer, budget: selection.budget, budgetAnswered: selection.budget !== undefined, budgetUnit: selection.budgetUnit }, catalog);
  const canBack = Boolean(selection.planHistory?.length) || messages.filter(message => message.role === "assistant").length > 1;
  const lastReply = [...messages].reverse().find(message => message.role === "assistant") ?? welcomeMessage(locale);
  const displayedMessages = showHistory ? messages : [lastReply];
  const subtitle = locale === "en" ? showHistory ? "Conversation history" : lastReply.summary ? "Review your choice" : lastReply.comparisons ? "Compare plans" : "Your personal assistant" : showHistory ? "История диалога" : lastReply.summary ? "Проверьте ваш выбор" : lastReply.comparisons ? "Сравнение тарифов" : stepNames[selection.step ?? ""] ?? "Ваш личный помощник";
  const suggestions = (lastReply.suggestions ?? []).filter(prompt => {
    if (prompt === "Назад" && canBack) return false;
    if (lastReply.summary) return !prompt.startsWith("Изменить") && prompt !== "Отменить подбор";
    if (lastReply.comparisons) return selection.plan ? (prompt === "Продолжить подбор" || prompt === "Подготовить резюме" || prompt === "Резюме без выбора тарифа" || (prompt === "Изменить срок" && Boolean(lastReply.timingNotice))) : false;
    return true;
  });
  if (lastReply.comparisons && !selection.plan) suggestions.push("Подобрать под мою задачу");
  const availableActions=lastReply.actions?.filter(action=>suggestions.includes(action.label));
  const actions = (showMenu || messages.length === 1 ? [...(showMenu && selection.plan ? [{ id: "continue-plan", label: text("Продолжить подбор", "Continue selection") }] : []), ...menuActions(locale)] : availableActions ?? suggestions.map((label, index) => ({ id: `legacy:${index}`, label, value: label }))).filter(action => action.id !== "back" || !canBack);
  const primaryActions = actions.slice(0, 6);
  const secondaryActions = actions.slice(6);
  function activate(action: ChatAction) {
    if (action.id.startsWith("legacy:")) sendMessage(action.value ?? action.label);
    else sendAction(action);
  }

  return createPortal(<div className="contact-chat" data-glossary-skip onKeyDown={(event) => { if (open && event.key === "Escape") { event.preventDefault(); if (resetPending) { setResetPending(false); inputRef.current?.focus(); } else closeChat(); } }}>
    <button ref={buttonRef} type="button" className="contact-chat__bubble" data-dragging={dragging} style={{ left: position.x + viewport.left, top: position.y + viewport.top }}
      aria-label={open ? text("Свернуть помощника KILENI", "Minimize the KILENI assistant") : text("Открыть помощника KILENI", "Open the KILENI assistant")} aria-expanded={open} aria-controls={open ? "kileni-contact-dialog" : undefined} aria-describedby="kileni-chat-move-help" title={text(`${open ? "Нажмите, чтобы свернуть чат." : "Нажмите, чтобы открыть чат."} Перетащите, чтобы переместить кружок.`, `${open ? "Click to minimize the chat." : "Click to open the chat."} Drag to move the button.`)}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={() => { if (gesture.current?.moved) suppressClick.current = true; gesture.current = null; setDragging(false); }} onKeyDown={moveWithKeyboard}
      onClick={(event) => { if (suppressClick.current && event.detail > 0) { suppressClick.current = false; return; } suppressClick.current = false; if (open) closeChat(); else { openChat(); if (viewport.width > 640 || event.detail === 0) requestAnimationFrame(() => inputRef.current?.focus()); } }}>
      <ChatIcon/>
    </button>
    <span className="contact-chat__sr" id="kileni-chat-move-help">{text("Кружок можно перетащить мышью или пальцем. С клавиатуры перемещайте его стрелками; Shift со стрелкой перемещает дальше. Enter открывает чат, Escape сворачивает его.", "Drag the button with a mouse or finger. Use arrow keys to move it; Shift and an arrow move it further. Enter opens the chat and Escape minimizes it.")}</span>
    {open && <section id="kileni-contact-dialog" role="dialog" aria-labelledby="kileni-chat-title" className="contact-chat__phone" data-compact={panel.height < 420} data-tight={panel.height < 190} style={{ left: panel.left + viewport.left, top: panel.top + viewport.top, width: panel.width, height: panel.height }}>
      <header className="contact-chat__header">
        <span className="contact-chat__avatar" aria-hidden="true">K</span>
        <div><h2 id="kileni-chat-title">KILENI <small>seo</small></h2><p>{subtitle}</p></div>
        <button type="button" onClick={closeChat} aria-label={text("Свернуть чат", "Minimize chat")} className="contact-chat__close">×</button>
      </header>
      <nav className="contact-chat__toolbar" aria-label={text("Управление диалогом", "Conversation controls")}>
        {canBack && <button type="button" className="contact-chat__restart contact-chat__back" onClick={goBack} aria-label={text("Вернуться на предыдущий шаг", "Return to the previous step")}><span aria-hidden="true">←</span>{text("Назад", "Back")}</button>}
        {messages.length > 1 && <button type="button" className="contact-chat__restart" aria-pressed={showHistory} onClick={() => { setShowHistory(!showHistory); setShowMenu(false); }}>{showHistory ? text("К ответу", "Latest reply") : text("История", "History")}</button>}
        <button type="button" className="contact-chat__restart" aria-pressed={showMenu} onClick={() => { setShowMenu(!showMenu); setShowHistory(false); }}>{text("Меню", "Menu")}</button>
        <button type="button" className="contact-chat__restart" aria-label={text("Начать новый диалог", "Start a new conversation")} onClick={requestNewConversation}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>{text("Новый диалог", "New chat")}</button>
      </nav>
      {resetPending && <div className="contact-chat__reset" role="alertdialog" aria-label={text("Подтвердите новый диалог", "Confirm a new conversation")} aria-describedby="kileni-chat-reset-note"><p id="kileni-chat-reset-note">{text("Начать новый диалог? Текущий выбор, переписка и черновик будут удалены.", "Start a new conversation? Your current choice, messages and draft will be deleted.")}</p><div><button ref={resetCancelRef} type="button" onClick={() => { setResetPending(false); inputRef.current?.focus(); }}>{text("Сохранить диалог", "Keep this conversation")}</button><button type="button" onClick={resetConversation}>{text("Начать новый", "Start new")}</button></div></div>}
      {restored && !resetPending && <div className="contact-chat__restored"><span>{text("Диалог восстановлен.", "Conversation restored.")}</span><button type="button" onClick={() => { setRestored(false); inputRef.current?.focus(); }}>{text("Продолжить", "Continue")}</button><button type="button" onClick={requestNewConversation}>{text("Новый", "Start new")}</button></div>}
      {choiceRows.length > 0 && !lastReply.summary && <details className="contact-chat__choice" ref={choiceRef}>
        <summary>{text("Ваш выбор", "Your choice")}<span>{choiceRows.find(row=>row.label==="Услуга")?.value??text("Уточняем задачу", "Clarifying your task")}{choiceRows.some(row => row.label === "Бюджет") && <small>{choiceRows.find(row => row.label === "Бюджет")?.value}</small>}</span><b aria-hidden="true">⌄</b></summary>
        <dl>{choiceRows.map((row, index) => <div key={`${row.label}:${index}`}><dt>{row.label}</dt><dd>{row.value}{row.action && <button type="button" aria-label={row.action} onClick={() => editChoice(row.action!, row.actionId)}>{text("Изменить", "Change")}</button>}</dd></div>)}</dl>
      </details>}
      <div className="contact-chat__conversation" ref={scrollRef} role="log" aria-label={showHistory ? text("История переписки с помощником", "Conversation history") : text("Ответ помощника", "Assistant reply")} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
        {restoreNotice && <p className="contact-chat__status" role="status">{restoreNotice}</p>}
        {displayedMessages.map(message => {
          const active = message.id === lastReply.id;
          const structured = Boolean(message.comparisons || message.summary);
          return <div key={message.id} ref={active ? replyRef : undefined} className={`contact-chat__message contact-chat__message--${message.role}`} data-structured={structured}>
            <span className="contact-chat__sr">{message.role === "user" ? text("Вы: ", "You: ") : text("Помощник: ", "Assistant: ")}</span>
            <p>{message.summary ? text("Проверьте резюме. Любой пункт можно изменить.", "Review the summary. You can change any item.") : message.comparisons ? message.explanation ?? (message.pricingMode === "budget" ? text("Эти варианты проходят предварительную проверку цены. Уточним требования к задаче?", "These options pass an initial price check. Shall we clarify your requirements?") : text("Нажмите на название, чтобы увидеть состав тарифа.", "Click a plan name to see what it includes.")) : message.text}</p>
            {structured && message.timingNotice && <p className="contact-chat__comparison-note">{message.timingNotice}</p>}
            {message.comparisons && message.topic === "yandex-ads" && !/рекламный бюджет|advertising spend/iu.test(message.explanation ?? "") && <p className="contact-chat__comparison-note">{text("Рекламный бюджет Яндекса оплачивается отдельно.", "Yandex advertising spend is paid separately.")}</p>}
            {message.comparisons && <AssistantOfferComparison key={message.id} offers={message.comparisons} active={active} locale={locale} selectedOfferId={selection.offer ?? selection.plan?.preferredOffer} onChoose={offer => sendAction({ id: "choose-offer", label: text(`Проверить тариф: ${offer.title}`, `Check plan: ${offer.title}`), value: offer.id })}/>}
            {message.summary && <div className="contact-chat__review">
              <h3>{text("Резюме для брифа", "Summary for the brief")}</h3>
              <dl>{message.summary.map((row, index) => <div key={`${row.label}:${index}`}><dt>{row.label}</dt><dd><span>{row.value}</span>{row.action && active && <button type="button" aria-label={row.action} onClick={() => editChoice(row.action!, row.actionId)}>{text("Изменить", "Change")}</button>}</dd></div>)}</dl>
              {message.plan && active && <Link className="contact-chat__transfer" href={assistantBriefHref(createAssistantBriefHandoff(message.plan,catalog),message.id)} onClick={event => {
                try {
                  const handoff = createAssistantBriefHandoff(selection.plan ?? message.plan!,catalog);
                  if (!storeAssistantBriefHandoff(window.sessionStorage,message.id,handoff)) throw new Error("handoff unavailable");
                } catch { event.preventDefault(); setTransferError(text("Не удалось сохранить резюме. Скопируйте его из переписки и добавьте в бриф самостоятельно.", "The summary could not be saved. Copy it from the conversation and add it to the brief.")); return; }
                setOpen(false);
              }}>{text("Перенести резюме в бриф", "Add summary to the brief")}<span aria-hidden="true">↗</span></Link>}
              {active && transferError && <textarea className="contact-chat__summary-copy" readOnly aria-label={text("Резюме для копирования", "Summary to copy")} value={message.summary.map(row=>`${row.label}: ${row.value}`).join("\n")} onFocus={event => event.currentTarget.select()}/>}
            </div>}
            {structured && <details className="contact-chat__conditions"><summary>{text("Условия и пояснения", "Conditions and explanation")}</summary><p>{message.text}</p>{message.links.length > 0 && <div className="contact-chat__links">{message.links.map(link => <Link key={link.href} href={link.href}>{link.label}<span aria-hidden="true">↗</span></Link>)}</div>}</details>}
            {!structured && message.links.length > 0 && <div className="contact-chat__links">{message.links.map(link => <Link key={link.href} href={link.href}>{link.label}<span aria-hidden="true">↗</span></Link>)}</div>}
            {active && message.links.some(link => /(?:^|\/)contacts$/u.test(link.href)) && <div className="contact-chat__contact-row contact-chat__direct-contacts">{contacts.map(contact => <a key={contact.kind} href={contact.href} aria-label={contact.ariaLabel} target={contact.external ? "_blank" : undefined} rel={contact.external ? "noopener noreferrer" : undefined}>{contact.label}<span aria-hidden="true">↗</span></a>)}</div>}
          </div>;
        })}
        {!showHistory && primaryActions.length > 0 && <div className="contact-chat__suggestions" aria-label={text("Варианты ответа", "Available actions")}>{primaryActions.map(action => <button key={`${action.id}:${action.value ?? ""}`} type="button" onClick={() => activate(action)}>{action.label}<span aria-hidden="true">→</span></button>)}</div>}
        {!showHistory && secondaryActions.length > 0 && <details className="contact-chat__more-actions"><summary>{text("Другие действия", "More actions")}</summary><div className="contact-chat__suggestions">{secondaryActions.map(action => <button key={`${action.id}:${action.value ?? ""}`} type="button" onClick={() => activate(action)}>{action.label}<span aria-hidden="true">→</span></button>)}</div></details>}
      </div>
      <footer className="contact-chat__footer">{transferError && <p className="contact-chat__transfer-error" role="alert">{transferError}</p>}
        {storageNotice && <p className="contact-chat__storage-notice" role="status">{storageNotice}</p>}
        {inputError && <p id="kileni-chat-input-error" className="contact-chat__input-error" role="alert">{inputError}</p>}
        <form className="contact-chat__composer" onSubmit={(event) => { event.preventDefault(); sendMessage(draft, topic, selection, true); }}><label className="contact-chat__sr" htmlFor="kileni-chat-input">{text("Ваш вопрос", "Your question")}</label><input ref={inputRef} id="kileni-chat-input" placeholder={inputPlaceholder} value={draft} aria-invalid={Boolean(inputError)} aria-describedby={inputError ? "kileni-chat-input-error" : undefined} autoComplete="off" onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} onChange={(event) => { setDraft(event.target.value); setInputError(""); }}/><button type="submit" disabled={!draft.trim()} aria-label={text("Отправить сообщение", "Send message")}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 7-7 7 7M12 5v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button></form>
        <details className="contact-chat__contacts" ref={contactsRef}><summary>{text("Связаться с командой", "Contact the team")}</summary><div className="contact-chat__contact-row">{contacts.map((contact) => <a key={contact.kind} href={contact.href} aria-label={contact.ariaLabel} target={contact.external ? "_blank" : undefined} rel={contact.external ? "noopener noreferrer" : undefined}>{contact.label}<span aria-hidden="true">↗</span></a>)}</div><p className="contact-chat__note">{text("Ответы по информации сайта. Переписку видите только вы.", "Answers use the information on this website. Only you can see this conversation.")}</p></details>
      </footer>
    </section>}
  </div>, document.body);
}
