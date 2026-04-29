import sys
import time
from pathlib import Path

from graphviz import Source
from pytm.pytm import Actor, Boundary, Dataflow, Datastore, ExternalEntity, Server, TM


def generate_dfd_with_pytm(dfd_json: dict, output_dir: str) -> str:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    tm = TM("Generated DFD")
    tm.description = "DFD genere automatiquement depuis un JSON"

    elements = {}
    boundaries = {}

    for boundary in dfd_json.get("boundaries", []):
        boundary_name = (boundary.get("name") or "").strip()
        if boundary_name:
            boundaries[boundary_name] = Boundary(boundary_name)

    for entity in dfd_json.get("external_entities", []):
        name = (entity.get("name") or "").strip()
        boundary_name = (entity.get("boundary") or "").strip()
        if not name:
            continue

        if name.lower() in {"utilisateur", "user", "users", "utilisateurs"}:
            elements[name] = Actor(name)
        else:
            elements[name] = ExternalEntity(name)

        if boundary_name:
            if boundary_name not in boundaries:
                raise ValueError(f"Boundary inconnue pour external entity {name}: {boundary_name}")
            elements[name].inBoundary = boundaries[boundary_name]

    for process in dfd_json.get("processes", []):
        name = (process.get("name") or "").strip()
        boundary_name = (process.get("boundary") or "").strip()
        if not name:
            continue

        elements[name] = Server(name)

        if boundary_name:
            if boundary_name not in boundaries:
                raise ValueError(f"Boundary inconnue pour process {name}: {boundary_name}")
            elements[name].inBoundary = boundaries[boundary_name]

    for store in dfd_json.get("data_stores", []):
        name = (store.get("name") or "").strip()
        boundary_name = (store.get("boundary") or "").strip()
        if not name:
            continue

        elements[name] = Datastore(name)

        if boundary_name:
            if boundary_name not in boundaries:
                raise ValueError(f"Boundary inconnue pour datastore {name}: {boundary_name}")
            elements[name].inBoundary = boundaries[boundary_name]

    for flow in dfd_json.get("data_flows", []):
        source_name = (flow.get("source") or "").strip()
        target_name = (flow.get("target") or "").strip()
        label = (flow.get("label") or "").strip()

        if source_name not in elements:
            raise ValueError(f"Source inconnue dans le flux: {source_name}")
        if target_name not in elements:
            raise ValueError(f"Target inconnue dans le flux: {target_name}")
        if source_name == target_name:
            raise ValueError(f"Flux invalide avec source egale a target: {source_name}")

        Dataflow(elements[source_name], elements[target_name], label or "data")

    original_argv = sys.argv.copy()
    try:
        sys.argv = [sys.argv[0]]
        tm.process()
    finally:
        sys.argv = original_argv

    dot_content = tm.dfd()
    diagram_name = f"dfd_{int(time.time())}"
    dot_file = output_path / f"{diagram_name}.dot"
    png_file = output_path / f"{diagram_name}.png"

    dot_file.write_text(dot_content, encoding="utf-8")

    src = Source(dot_content, encoding="utf-8")
    src.render(
        filename=diagram_name,
        directory=str(output_path),
        format="png",
        cleanup=True,
    )

    return str(png_file)
