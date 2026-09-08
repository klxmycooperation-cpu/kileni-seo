#!/usr/bin/env python3
"""Build the customer-facing KILENI service catalogue as a styled DOCX."""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


NAVY = "081626"
BLUE = "4567FF"
PALE_BLUE = "EEF2FF"
PALE_GREY = "F3F5F8"
MID_GREY = "586474"
LINE = "D9DFE8"
WHITE = "FFFFFF"
BLACK = "111827"


@dataclass
class Service:
    name: str
    fields: list[tuple[str, str]] = field(default_factory=list)


@dataclass
class Category:
    name: str
    intro: list[str] = field(default_factory=list)
    services: list[Service] = field(default_factory=list)


def parse_catalog(path: Path) -> tuple[str, list[str], list[Category], list[str]]:
    title = "Каталог услуг KILENI"
    opening: list[str] = []
    closing: list[str] = []
    categories: list[Category] = []
    current_category: Category | None = None
    current_service: Service | None = None
    in_closing = False

    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("# "):
            title = line[2:].strip()
            continue
        if line.startswith("## "):
            name = line[3:].strip()
            if name == "Как начать":
                in_closing = True
                current_category = None
                current_service = None
                continue
            current_category = Category(name=name)
            categories.append(current_category)
            current_service = None
            continue
        if line.startswith("### "):
            if current_category is None:
                continue
            current_service = Service(name=line[4:].strip())
            current_category.services.append(current_service)
            continue
        match = re.match(r"^- \*\*(.+?):\*\*\s*(.+)$", line)
        if match and current_service is not None:
            current_service.fields.append((match.group(1).strip(), match.group(2).strip()))
            continue
        if in_closing:
            closing.append(line)
        elif current_service is None and current_category is not None:
            current_category.intro.append(line)
        elif not categories:
            opening.append(line)

    return title, opening, categories, closing


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color: str = LINE, size: str = "4") -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = borders.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:color"), color)


def set_cell_margins(cell, top=90, start=120, bottom=90, end=120) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def keep_row_together(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("KILENI  ·  ")
    run.font.name = "Arial"
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor.from_string(MID_GREY)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(end)


def add_inline(paragraph, value: str, *, size: float = 9.1, color: str = BLACK) -> None:
    parts = re.split(r"(\*\*.+?\*\*|`.+?`)", value)
    for part in parts:
        if not part:
            continue
        bold = part.startswith("**") and part.endswith("**")
        code = part.startswith("`") and part.endswith("`")
        text = part[2:-2] if bold else part[1:-1] if code else part
        run = paragraph.add_run(text)
        run.bold = bold
        run.font.name = "Arial"
        run.font.size = Pt(8.2 if code else size)
        run.font.color.rgb = RGBColor.from_string(BLUE if code else color)


def configure_document(document: Document) -> None:
    section = document.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.55)
    section.bottom_margin = Cm(1.45)
    section.left_margin = Cm(1.55)
    section.right_margin = Cm(1.55)
    section.header_distance = Cm(.55)
    section.footer_distance = Cm(.55)

    normal = document.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(9.2)
    normal.font.color.rgb = RGBColor.from_string(BLACK)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    for name, size, color, before, after in (
        ("Title", 32, WHITE, 0, 0),
        ("Heading 1", 22, NAVY, 0, 10),
        ("Heading 2", 14, NAVY, 10, 5),
    ):
        style = document.styles[name]
        style.font.name = "Arial"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    if "KILENI Label" not in document.styles:
        label = document.styles.add_style("KILENI Label", WD_STYLE_TYPE.PARAGRAPH)
    else:
        label = document.styles["KILENI Label"]
    label.font.name = "Arial"
    label.font.size = Pt(7.2)
    label.font.bold = True
    label.font.color.rgb = RGBColor.from_string(MID_GREY)
    label.paragraph_format.space_after = Pt(0)
    label.paragraph_format.keep_with_next = True

    header = section.header.paragraphs[0]
    header.text = "KILENI  /  КАТАЛОГ УСЛУГ"
    header.style = document.styles["KILENI Label"]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_page_number(section.footer.paragraphs[0])


def add_cover(document: Document, title: str, service_count: int) -> None:
    table = document.add_table(rows=1, cols=1)
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Cm(17.8)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_shading(cell, NAVY)
    set_cell_border(cell, NAVY, "0")
    set_cell_margins(cell, top=600, start=500, bottom=600, end=500)
    paragraph = cell.paragraphs[0]
    paragraph.style = document.styles["Title"]
    paragraph.add_run(title)
    subtitle = cell.add_paragraph()
    subtitle.paragraph_format.space_before = Pt(16)
    add_inline(subtitle, "Понятные границы, состав, цена и результат", size=13, color=WHITE)
    label = cell.add_paragraph()
    label.paragraph_format.space_before = Pt(28)
    add_inline(label, f"{service_count} услуг и направлений  ·  клиентская версия", size=9, color="B9C4DA")

    document.add_paragraph()
    note = document.add_paragraph()
    note.paragraph_format.space_before = Pt(18)
    add_inline(note, "Документ для обсуждения задачи и выбора подходящего формата работы. Цена, срок и критерий готовности фиксируются до начала проекта.", size=11, color=MID_GREY)
    document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def add_overview(document: Document, opening: list[str], categories: list[Category]) -> None:
    document.add_heading("Как читать каталог", level=1)
    for paragraph in opening:
        p = document.add_paragraph()
        add_inline(p, paragraph, size=9.4, color=BLACK)

    document.add_heading("Разделы", level=2)
    table = document.add_table(rows=0, cols=2)
    table.autofit = False
    for index, category in enumerate(categories, 1):
        row = table.add_row()
        keep_row_together(row)
        row.cells[0].width = Cm(1.4)
        row.cells[1].width = Cm(16.4)
        for cell in row.cells:
            set_cell_border(cell, LINE)
            set_cell_margins(cell, top=90, bottom=90)
        set_cell_shading(row.cells[0], BLUE)
        number = row.cells[0].paragraphs[0]
        number.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_inline(number, f"{index:02d}", size=8.2, color=WHITE)
        entry = row.cells[1].paragraphs[0]
        add_inline(entry, f"**{category.name}** — {len(category.services)} направлений", size=9.2)
    document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def add_service_table(document: Document, service: Service, number: int) -> None:
    table = document.add_table(rows=1, cols=2)
    table.autofit = False
    title_row = table.rows[0]
    title_cell = title_row.cells[0].merge(title_row.cells[1])
    set_cell_shading(title_cell, NAVY)
    set_cell_border(title_cell, NAVY)
    set_cell_margins(title_cell, top=125, start=150, bottom=125, end=150)
    title = title_cell.paragraphs[0]
    title.paragraph_format.space_after = Pt(0)
    add_inline(title, f"{number:02d}  {service.name}", size=12.1, color=WHITE)
    keep_row_together(title_row)

    for index, (label, value) in enumerate(service.fields):
        row = table.add_row()
        row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
        keep_row_together(row)
        row.cells[0].width = Cm(3.6)
        row.cells[1].width = Cm(14.2)
        for cell in row.cells:
            set_cell_border(cell, LINE)
            set_cell_margins(cell, top=80, start=110, bottom=80, end=110)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
        set_cell_shading(row.cells[0], PALE_BLUE if index < 4 else PALE_GREY)
        label_p = row.cells[0].paragraphs[0]
        label_p.paragraph_format.space_after = Pt(0)
        add_inline(label_p, label.upper(), size=7.1, color=MID_GREY)
        value_p = row.cells[1].paragraphs[0]
        value_p.paragraph_format.space_after = Pt(0)
        add_inline(value_p, value, size=8.6, color=BLACK)
    document.add_paragraph().paragraph_format.space_after = Pt(2)


def add_category(document: Document, category: Category, number: int) -> None:
    document.add_heading(category.name, level=1)
    for paragraph in category.intro:
        p = document.add_paragraph()
        p.paragraph_format.space_after = Pt(7)
        add_inline(p, paragraph, size=9.2, color=MID_GREY)
    # Marketplace entries contain longer platform-specific limits and inputs.
    # Give each one a full page so the card never splits between pages.
    services_per_page = 1 if category.name == "Маркетплейсы" else 2
    for service_index, service in enumerate(category.services, 1):
        add_service_table(document, service, service_index)
        if service_index % services_per_page == 0 and service_index < len(category.services):
            document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    if number:
        document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def add_closing(document: Document, closing: list[str]) -> None:
    document.add_heading("Как начать", level=1)
    for paragraph in closing:
        p = document.add_paragraph()
        p.paragraph_format.space_after = Pt(7)
        add_inline(p, paragraph, size=10, color=BLACK)
    cta = document.add_table(rows=1, cols=1).cell(0, 0)
    set_cell_shading(cta, NAVY)
    set_cell_border(cta, NAVY)
    set_cell_margins(cta, top=220, start=220, bottom=220, end=220)
    p = cta.paragraphs[0]
    add_inline(p, "kileni-seo.ru  ·  Сначала задача — затем точный состав, срок и цена", size=11, color=WHITE)


def build(source: Path, target: Path) -> None:
    title, opening, categories, closing = parse_catalog(source)
    service_count = sum(len(category.services) for category in categories)
    if service_count < 60:
        raise ValueError(f"Каталог выглядит неполным: найдено только {service_count} услуг")

    document = Document()
    configure_document(document)
    document.core_properties.title = title
    document.core_properties.subject = "Клиентский каталог услуг KILENI"
    document.core_properties.author = ""
    document.core_properties.last_modified_by = ""
    document.core_properties.keywords = "KILENI, услуги, SEO, разработка, маркетплейсы"

    add_cover(document, title, service_count)
    add_overview(document, opening, categories)
    for index, category in enumerate(categories, 1):
        add_category(document, category, index)
    add_closing(document, closing)

    target.parent.mkdir(parents=True, exist_ok=True)
    document.save(target)
    print(f"{target} ({service_count} services)")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: generate-service-catalog-docx.py SOURCE.md OUTPUT.docx")
    build(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())


if __name__ == "__main__":
    main()
