export type FragrancePalette = {
  ink: string;
  deep: string;
  mid: string;
  muted: string;
  pale: string;
  mist: string;
};

export type MarketplaceLink = {
  id: string;
  label: string;
  href: string;
};

export type Fragrance = {
  id: string;
  slug: string;
  temporaryTitle: string;
  realTitle: string | null;
  heroPhrase: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  imageAlt: string;
  palette: FragrancePalette;
  volume: string | null;
  notes: {
    opening: string;
    heart: string;
    trail: string;
  };
  marketplaceLinks: MarketplaceLink[];
  status: "concept" | "active" | "archived";
  seoTitle: string;
  seoDescription: string;
};

export const fragrances: Fragrance[] = [
  {
    id: "01",
    slug: "01",
    temporaryTitle: "KILENI 01",
    realTitle: null,
    heroPhrase: "Первая позиция в каталоге KILENI.",
    shortDescription:
      "Краткое описание аромата будет добавлено после утверждения информации о продукте.",
    fullDescription:
      "Здесь появится полное описание KILENI 01. Текст можно будет заменить в едином файле каталога.",
    image: "/images/fragrances/kileni-01.jpg",
    imageAlt: "Голубая упаковка и флакон KILENI",
    palette: {
      ink: "#15202A",
      deep: "#2B3D48",
      mid: "#447084",
      muted: "#6B9CAC",
      pale: "#C6D8E1",
      mist: "#E5EBF0",
    },
    volume: null,
    notes: {
      opening: "Описание будет добавлено",
      heart: "Описание будет добавлено",
      trail: "Описание будет добавлено",
    },
    marketplaceLinks: [],
    status: "concept",
    seoTitle: "KILENI 01 — аромат KILENI",
    seoDescription: "Страница аромата KILENI 01 в каталоге KILENI.",
  },
  {
    id: "02",
    slug: "02",
    temporaryTitle: "KILENI 02",
    realTitle: null,
    heroPhrase: "Вторая позиция в каталоге KILENI.",
    shortDescription:
      "Краткое описание аромата будет добавлено после утверждения информации о продукте.",
    fullDescription:
      "Здесь появится полное описание KILENI 02. Текст можно будет заменить в едином файле каталога.",
    image: "/images/fragrances/kileni-02.jpg",
    imageAlt: "Бордовая упаковка и флакон KILENI",
    palette: {
      ink: "#1B0E18",
      deep: "#361729",
      mid: "#773250",
      muted: "#A86C7F",
      pale: "#D1A3AF",
      mist: "#EFE2E1",
    },
    volume: null,
    notes: {
      opening: "Описание будет добавлено",
      heart: "Описание будет добавлено",
      trail: "Описание будет добавлено",
    },
    marketplaceLinks: [],
    status: "concept",
    seoTitle: "KILENI 02 — аромат KILENI",
    seoDescription: "Страница аромата KILENI 02 в каталоге KILENI.",
  },
  {
    id: "03",
    slug: "03",
    temporaryTitle: "KILENI 03",
    realTitle: null,
    heroPhrase: "Третья позиция в каталоге KILENI.",
    shortDescription:
      "Краткое описание аромата будет добавлено после утверждения информации о продукте.",
    fullDescription:
      "Здесь появится полное описание KILENI 03. Текст можно будет заменить в едином файле каталога.",
    image: "/images/fragrances/kileni-03.jpg",
    imageAlt: "Серебристая упаковка и флакон KILENI",
    palette: {
      ink: "#292B2F",
      deep: "#4F4F53",
      mid: "#6F6F73",
      muted: "#9F9EA2",
      pale: "#D6D4D5",
      mist: "#F2F0F1",
    },
    volume: null,
    notes: {
      opening: "Описание будет добавлено",
      heart: "Описание будет добавлено",
      trail: "Описание будет добавлено",
    },
    marketplaceLinks: [],
    status: "concept",
    seoTitle: "KILENI 03 — аромат KILENI",
    seoDescription: "Страница аромата KILENI 03 в каталоге KILENI.",
  },
];
