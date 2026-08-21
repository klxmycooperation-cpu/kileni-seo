import type { Fragrance } from "@/src/content/fragrances";

type FragranceSwitcherProps = {
  fragrances: Fragrance[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function FragranceSwitcher({
  fragrances,
  activeIndex,
  onSelect,
}: FragranceSwitcherProps) {
  return (
    <div className="fragrance-switcher" aria-label="Выбрать аромат">
      <span className="fragrance-switcher__label">БЫСТРЫЙ ВЫБОР</span>
      <div className="fragrance-switcher__options">
        {fragrances.map((fragrance, index) => (
          <button
            key={fragrance.id}
            type="button"
            className={index === activeIndex ? "is-active" : ""}
            aria-pressed={index === activeIndex}
            aria-label={`Показать аромат KILENI ${fragrance.id}`}
            onClick={() => onSelect(index)}
          >
            <span className="fragrance-switcher__number">{fragrance.id}</span>
            <span className="fragrance-switcher__name">KILENI</span>
          </button>
        ))}
      </div>
    </div>
  );
}
