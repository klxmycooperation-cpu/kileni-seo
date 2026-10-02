"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Locale } from "../../config/site";

export function AboutProductMotion({ locale, paused, reducedMotion }: { locale: Locale; paused: boolean; reducedMotion: boolean }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let visible = false;
    const update = () => { element.dataset.active = String(visible && !document.hidden); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { threshold: .05 });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <figure ref={root} className="about-product-motion" role="img" data-renderer="image" data-active="false" data-motion={reducedMotion ? "static" : paused ? "paused" : "floating"} aria-label={locale === "ru" ? "Синий стеклянный флакон с серебристой лентой и прозрачными каплями" : "A blue glass bottle with a silver ribbon and clear droplets"}>
      <Image className="about-product-art" src="/visuals/kileni-product-premium-cutout-v2.png" width={1254} height={1254} alt="" unoptimized draggable={false}/>
    </figure>
  );
}

export function AboutWorkflow({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const steps = ru ? [
    ["Разбираемся в задаче", "Смотрим сайт, товары или материалы будущего проекта. Уточняем, кто ваш клиент, что ему нужно и где сейчас возникают трудности.", "Бриф и исходные материалы"],
    ["Согласуем состав и условия", "Описываем результат, объём, срок и цену. Отдельно фиксируем доступы, материалы с вашей стороны и работы, которые рассчитываются дополнительно.", "Письменное задание"],
    ["Показываем работу по этапам", "Сначала согласуем основу: выводы аудита, структуру сайта или концепцию карточки. Затем выполняем согласованный объём и обсуждаем правки в его пределах.", "Промежуточные материалы"],
    ["Проверяем и передаём результат", "Сверяем работу с заданием. Передаём отчёт, файлы, исходники или готовые страницы — по составу заказа. Объясняем, что изменилось и как продолжать работу.", "Результат и проверка"],
  ] : [
    ["Understand the task", "We review the website, products or project material. We identify your customer, what they need and where the current difficulties are.", "Brief and source material"],
    ["Agree on scope and terms", "We define the deliverable, scope, timing and price. Required access, your materials and any separately priced work are recorded explicitly.", "Written scope"],
    ["Share the work in stages", "First we agree on the foundation: audit findings, website structure or a listing concept. Then we deliver the agreed work and discuss revisions within its scope.", "Intermediate deliverables"],
    ["Check and hand over", "We check the result against the brief and hand over the agreed report, files, source code or pages. We explain the changes and how to continue the work.", "Delivery and verification"],
  ];
  return (
    <section className="about-v3-scene about-workflow" aria-labelledby="about-workflow-title">
      <div className="shell about-workflow__inner">
        <header><p className="about-v3-eyebrow">{ru ? "От задачи до передачи результата" : "From the task to the handover"}</p><h2 id="about-workflow-title">{ru ? "Как проходит работа с KILENI" : "How we work at KILENI"}</h2><p>{ru ? "Вы заранее понимаете, за что платите, что нужно подготовить и по каким критериям принимается работа." : "You know what you are paying for, what you need to prepare and how the work will be accepted."}</p></header>
        <ol className="about-workflow__steps">
          {steps.map(([title, text, output], index) => <li className="about-work-step" key={title}><span className="about-work-step__number">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p><span className="about-work-step__output">{output}</span></li>)}
        </ol>
        <div className="about-workflow__agreement"><span aria-hidden="true">↗</span><p>{ru ? "Позиции в поиске и продажи зависят от спроса, конкурентов и самого предложения. В заказе фиксируем работу, которую можем выполнить и проверить; дальнейшее сопровождение обсуждаем отдельно." : "Search rankings and sales depend on demand, competitors and the offer itself. The order defines work we can deliver and verify; ongoing support is agreed separately."}</p></div>
      </div>
    </section>
  );
}
