export function Faq({ title, items }: { title: string; items: Array<{ q: string; a: string }> }) {
  return <section className="section section-light"><div className="shell two-column-section"><div><h2>{title}</h2></div><div className="faq-list">{items.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div></div></section>;
}
