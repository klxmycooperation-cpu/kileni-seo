type CompactPageTocItem = {
  id: string;
  label: string;
};

export function CompactPageToc({
  label,
  items,
}: {
  label: string;
  items: readonly CompactPageTocItem[];
}) {
  return (
    <nav className="compact-page-toc shell" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
