export function formatPricingOptionCount(count: number, locale: "ru" | "en") {
  if (locale === "en") return `${count} ${count === 1 ? "option" : "options"}`;

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  const word = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? "вариантов"
    : lastDigit === 1
      ? "вариант"
      : lastDigit >= 2 && lastDigit <= 4
        ? "варианта"
        : "вариантов";

  return `${count} ${word}`;
}
