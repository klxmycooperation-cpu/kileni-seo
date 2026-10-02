import type { Locale } from "../../config/site";
import { getEnglishPriceConfig } from "../../config/prices";
import { Calculator } from "../forms/Calculator";
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { PublicShell } from "../layout/PublicShell";
import { CanvasText } from "../ui/canvas-text";

export function CalculatorPage({ locale }: { locale: Locale }) { const ru = locale === "ru"; const enPricing = getEnglishPriceConfig(); const numericPrices = ru || Boolean(enPricing); const title = ru ? "Узнайте примерную стоимость" : numericPrices ? "Estimate the likely cost" : "Define the scope for an individual estimate"; return <PublicShell locale={locale}><div className="page-dark-top"><Breadcrumbs locale={locale} items={[{ label: ru ? "Калькулятор" : "Calculator" }]}/><section className="page-hero shell"><p className="eyebrow light">{ru ? "Предварительный расчёт" : "Initial estimate"}</p><h1><CanvasText text={title} lineGap={7} animationDuration={10}/></h1><p>{ru ? "Выберите объём и нужные работы. Покажем диапазон и объясним, из чего он сложился. Точную смету согласуем после короткого разговора." : numericPrices ? "Choose the scope and required work. We will show a range and explain it. The final quote follows a short conversation." : "Choose the scope and required work. We will explain the factors and prepare an individual quote after a short conversation."}</p></section></div><section className="section"><div className="shell"><Calculator locale={locale} enPricing={enPricing}/></div></section></PublicShell>; }
