from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"a": MAIN_NS, "r": REL_NS}
OBS_DEFAULT = (
    "Voucher aplica apenas no SLM base. Juros nao entram na composicao do material, "
    "mas entram no credito financeiro."
)
BASE_HEADERS = [
    ("A", "Turma"),
    ("B", "SLM_Base"),
    ("C", "Workbook_Obrigatorio"),
    ("D", "Matematica_Aplicada"),
    ("E", "Pearson_Math"),
    ("F", "Pearson_Science"),
    ("G", "Total_Obrigatorio"),
    ("H", "Total_Com_Todos_Pearson"),
    ("I", "Observacao"),
]

ET.register_namespace("", MAIN_NS)


def qn(name: str) -> str:
    return f"{{{MAIN_NS}}}{name}"


def clamp_number(value: object) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0

    if parsed < 0:
        return 0.0

    return round(parsed + 1e-12, 2)


def format_number(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.2f}".rstrip("0").rstrip(".")


def load_shared_strings(zip_file: zipfile.ZipFile) -> list[str]:
    shared_strings_path = "xl/sharedStrings.xml"
    if shared_strings_path not in zip_file.namelist():
        return []

    root = ET.fromstring(zip_file.read(shared_strings_path))
    values: list[str] = []
    for item in root.findall("a:si", NS):
        text_parts = [node.text or "" for node in item.iter(qn("t"))]
        values.append("".join(text_parts))
    return values


def get_sheet_targets(zip_file: zipfile.ZipFile) -> dict[str, str]:
    workbook_root = ET.fromstring(zip_file.read("xl/workbook.xml"))
    rels_root = ET.fromstring(zip_file.read("xl/_rels/workbook.xml.rels"))
    rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels_root}

    sheets: dict[str, str] = {}
    for sheet in workbook_root.find("a:sheets", NS):
        rel_id = sheet.attrib[f"{{{REL_NS}}}id"]
        sheets[sheet.attrib["name"]] = rel_map[rel_id]
    return sheets


def get_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(qn("t")))

    value_node = cell.find("a:v", NS)
    if value_node is None or value_node.text is None:
        return ""

    if cell_type == "s":
        return shared_strings[int(value_node.text)]

    return value_node.text


def read_catalog(workbook_path: Path) -> list[dict[str, object]]:
    # A planilha Base e a fonte unica usada pela calculadora React.
    with zipfile.ZipFile(workbook_path) as zip_file:
        shared_strings = load_shared_strings(zip_file)
        sheets = get_sheet_targets(zip_file)
        base_root = ET.fromstring(zip_file.read(f"xl/{sheets['Base']}"))

    sheet_data = base_root.find("a:sheetData", NS)
    if sheet_data is None:
        return []

    catalog: list[dict[str, object]] = []
    for row in sheet_data.findall("a:row", NS):
        row_index = row.attrib.get("r", "")
        if row_index == "1":
            continue

        cell_map: dict[str, str] = {}
        for cell in row.findall("a:c", NS):
            reference = cell.attrib.get("r", "")
            column = "".join(char for char in reference if char.isalpha())
            cell_map[column] = get_cell_value(cell, shared_strings)

        turma = cell_map.get("A", "").strip()
        if not turma:
            continue

        slm = clamp_number(cell_map.get("B"))
        workbook = clamp_number(cell_map.get("C"))
        matematica = clamp_number(cell_map.get("D"))
        pearson_math = clamp_number(cell_map.get("E"))
        pearson_science = clamp_number(cell_map.get("F"))
        total_obrigatorio = round(slm + workbook + matematica, 2)
        total_com_pearson = round(total_obrigatorio + pearson_math + pearson_science, 2)

        catalog.append(
            {
                "turma": turma,
                "slm": slm,
                "workbook": workbook,
                "matematica": matematica,
                "pearsonMath": pearson_math,
                "pearsonScience": pearson_science,
                "totalObrigatorio": total_obrigatorio,
                "totalComPearsons": total_com_pearson,
                "observacao": cell_map.get("I", "") or OBS_DEFAULT,
            }
        )

    return catalog


def build_text_cell(column: str, row_number: int, value: str) -> ET.Element:
    cell = ET.Element(qn("c"), {"r": f"{column}{row_number}", "t": "inlineStr"})
    inline = ET.SubElement(cell, qn("is"))
    text = ET.SubElement(inline, qn("t"))
    if value.strip() != value or "\n" in value:
        text.set(f"{{{XML_NS}}}space", "preserve")
    text.text = value
    return cell


def build_number_cell(column: str, row_number: int, value: float) -> ET.Element:
    cell = ET.Element(qn("c"), {"r": f"{column}{row_number}"})
    value_node = ET.SubElement(cell, qn("v"))
    value_node.text = format_number(value)
    return cell


def normalize_payload_item(item: dict[str, object], observations_by_turma: dict[str, str]) -> dict[str, object]:
    turma = str(item.get("turma", "")).strip()
    slm = clamp_number(item.get("slm"))
    workbook = clamp_number(item.get("workbook"))
    matematica = clamp_number(item.get("matematica"))
    pearson_math = clamp_number(item.get("pearsonMath"))
    pearson_science = clamp_number(item.get("pearsonScience"))
    total_obrigatorio = round(slm + workbook + matematica, 2)
    total_com_pearson = round(total_obrigatorio + pearson_math + pearson_science, 2)

    return {
        "turma": turma,
        "slm": slm,
        "workbook": workbook,
        "matematica": matematica,
        "pearsonMath": pearson_math,
        "pearsonScience": pearson_science,
        "totalObrigatorio": total_obrigatorio,
        "totalComPearsons": total_com_pearson,
        "observacao": observations_by_turma.get(turma) or str(item.get("observacao", "")).strip() or OBS_DEFAULT,
    }


def write_catalog(workbook_path: Path, catalog: list[dict[str, object]]) -> list[dict[str, object]]:
    current_catalog = read_catalog(workbook_path)
    observations_by_turma = {item["turma"]: str(item.get("observacao", "")) for item in current_catalog}
    normalized_catalog = [normalize_payload_item(item, observations_by_turma) for item in catalog if str(item.get("turma", "")).strip()]

    with zipfile.ZipFile(workbook_path) as zip_file:
        files = {name: zip_file.read(name) for name in zip_file.namelist()}
        sheets = get_sheet_targets(zip_file)

    sheet_path = f"xl/{sheets['Base']}"
    base_root = ET.fromstring(files[sheet_path])
    sheet_data = base_root.find("a:sheetData", NS)
    if sheet_data is None:
        raise RuntimeError("Nao foi possivel localizar a planilha Base dentro do workbook.")

    for child in list(sheet_data):
        sheet_data.remove(child)

    # Reescreve a aba inteira para evitar residuos de linhas antigas.
    header_row = ET.SubElement(sheet_data, qn("row"), {"r": "1"})
    for column, label in BASE_HEADERS:
        header_row.append(build_text_cell(column, 1, label))

    for row_number, item in enumerate(normalized_catalog, start=2):
        row = ET.SubElement(sheet_data, qn("row"), {"r": str(row_number)})
        row.append(build_text_cell("A", row_number, str(item["turma"])))
        row.append(build_number_cell("B", row_number, float(item["slm"])))
        row.append(build_number_cell("C", row_number, float(item["workbook"])))
        row.append(build_number_cell("D", row_number, float(item["matematica"])))
        row.append(build_number_cell("E", row_number, float(item["pearsonMath"])))
        row.append(build_number_cell("F", row_number, float(item["pearsonScience"])))
        row.append(build_number_cell("G", row_number, float(item["totalObrigatorio"])))
        row.append(build_number_cell("H", row_number, float(item["totalComPearsons"])))
        row.append(build_text_cell("I", row_number, str(item["observacao"])))

    dimension = base_root.find("a:dimension", NS)
    if dimension is not None:
        dimension.set("ref", f"A1:I{len(normalized_catalog) + 1}")

    files[sheet_path] = ET.tostring(base_root, encoding="utf-8", xml_declaration=True)

    with zipfile.ZipFile(workbook_path, "w", compression=zipfile.ZIP_DEFLATED) as output_zip:
        for name, content in files.items():
            output_zip.writestr(name, content)

    return normalized_catalog


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["read", "write"])
    parser.add_argument("workbook")
    args = parser.parse_args()

    workbook_path = Path(args.workbook).resolve()
    if not workbook_path.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {workbook_path}")

    if args.command == "read":
        payload = {"catalog": read_catalog(workbook_path)}
    else:
        incoming_payload = json.load(sys.stdin)
        catalog = incoming_payload["catalog"] if isinstance(incoming_payload, dict) else incoming_payload
        payload = {"catalog": write_catalog(workbook_path, catalog)}

    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        sys.stderr.write(str(exc))
        raise SystemExit(1)
