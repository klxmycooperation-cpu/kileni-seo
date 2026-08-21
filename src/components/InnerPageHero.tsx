type InnerPageHeroProps = {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  description: string;
};

export function InnerPageHero({ index, eyebrow, title, description }: InnerPageHeroProps) {
  return (
    <section className="inner-page-hero">
      <span className="inner-page-hero__index" aria-hidden="true">
        {index}
      </span>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="inner-page-hero__description">{description}</p>
      <span className="inner-page-hero__vertical" aria-hidden="true">
        KILENI / КАТАЛОГ АРОМАТОВ
      </span>
    </section>
  );
}
