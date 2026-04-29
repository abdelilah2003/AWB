from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML


def _flatten_attack_scenarios(selected_threats: list[dict]) -> list[dict]:
    scenarios = []
    for threat in selected_threats:
        for scenario in threat.get("attack_scenarios", []):
            scenario_text = (scenario or "").strip()
            if not scenario_text:
                continue
            scenarios.append(
                {
                    "threat_name": threat.get("name", ""),
                    "description": scenario_text,
                }
            )
    return scenarios


def _flatten_mitigations(selected_threats: list[dict]) -> list[dict]:
    seen = set()
    mitigations = []

    for threat in selected_threats:
        for mitigation in threat.get("mitigations", []):
            mitigation_text = (mitigation or "").strip()
            if not mitigation_text:
                continue

            dedupe_key = mitigation_text.lower()
            if dedupe_key in seen:
                continue

            seen.add(dedupe_key)
            mitigations.append({"description": mitigation_text})

    return mitigations


def build_safe_slug(value: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in (value or "").strip())
    compact = "-".join(part for part in cleaned.split("-") if part)
    return compact or "rapport"


def generate_report_pdf(
    app_name: str,
    developer_name: str,
    generated_description: str,
    selected_threats: list[dict],
    dfd_image_path: str | None = None,
    report_file_name: str | None = None,
) -> str:
    base_dir = Path(__file__).resolve().parents[2]
    template_dir = base_dir / "resources" / "templates"
    out_dir = base_dir / "resources" / "out"
    pdf_dir = base_dir / "resources" / "pdf"
    assets_dir = base_dir / "resources" / "assets"

    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    file_name = report_file_name or f"threat_modeling_report_{timestamp}.pdf"
    html_path = out_dir / f"{Path(file_name).stem}.html"
    pdf_path = pdf_dir / file_name

    logo_file = assets_dir / "AWB_LOGO.png"
    logo_path = logo_file.resolve().as_uri() if logo_file.exists() else None

    dfd_uri = None
    if dfd_image_path:
        dfd_file = Path(dfd_image_path)
        if dfd_file.exists():
            dfd_uri = dfd_file.resolve().as_uri()

    threats_table = []
    for threat in selected_threats:
        threats_table.append(
            {
                "menace": threat.get("name", ""),
                "description": threat.get("description", "") or "—",
            }
        )

    attack_scenarios = _flatten_attack_scenarios(selected_threats)
    mitigations = _flatten_mitigations(selected_threats)

    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("invoice.html")

    report_data = {
        "company_name": "Attijariwafa Bank",
        "application_name": app_name or "Application",
        "application_version": "v1.0",
        "application_env": "Production",
        "author": developer_name.strip() or "Non renseigne",
        "classification": "CONFIDENTIEL",
        "report_ref": f"TM-{timestamp}",
        "version": "1.0",
        "report_date": datetime.now().strftime("%Y-%m-%d"),
        "tech_stack": "FastAPI / Mistral / Gemini / pytm / WeasyPrint",
        "application_description": generated_description.strip() or "Description indisponible.",
        "dfd_image": dfd_uri,
        "dfd_level": "Niveau 0",
        "dfd_caption": "Figure 1 - Diagramme de flux de donnees et frontieres de confiance.",
        "threats_table": threats_table,
        "attack_scenarios": attack_scenarios,
        "mitigations": mitigations,
        "total_threats": len(threats_table),
        "logo_path": logo_path,
    }

    rendered_html = template.render(**report_data)
    html_path.write_text(rendered_html, encoding="utf-8")

    HTML(string=rendered_html, base_url=str(base_dir.resolve())).write_pdf(str(pdf_path))
    return str(pdf_path)
