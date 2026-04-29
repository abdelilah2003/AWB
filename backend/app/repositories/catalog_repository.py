from typing import Any, Dict, List

from app.core.database import get_connection


class CatalogRepository:
    @staticmethod
    def list_threats():
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        m.id_menace,
                        m.nom_menace,
                        m.description,
                        m.reference_menace,
                        COALESCE(mt.mitigation_count, 0) AS mitigation_count,
                        COALESCE(sc.scenario_count, 0) AS scenario_count,
                        COALESCE(rf.reference_count, 0) AS reference_count
                    FROM menace m
                    LEFT JOIN (
                        SELECT id_menace, COUNT(*) AS mitigation_count
                        FROM mitigation
                        GROUP BY id_menace
                    ) mt ON mt.id_menace = m.id_menace
                    LEFT JOIN (
                        SELECT id_menace, COUNT(*) AS scenario_count
                        FROM scenario_attaque
                        GROUP BY id_menace
                    ) sc ON sc.id_menace = m.id_menace
                    LEFT JOIN (
                        SELECT id_menace, COUNT(*) AS reference_count
                        FROM menace_reference
                        GROUP BY id_menace
                    ) rf ON rf.id_menace = m.id_menace
                    ORDER BY LOWER(m.nom_menace), m.id_menace
                    """
                )
                return cur.fetchall()
        finally:
            conn.close()

    @staticmethod
    def get_threat_by_id(threat_id: int):
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                return CatalogRepository._fetch_threat(cur, threat_id)
        finally:
            conn.close()

    @staticmethod
    def create_threat(payload: Dict[str, Any]):
        conn = get_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO menace (nom_menace, description, reference_menace)
                        VALUES (%s, %s, %s)
                        RETURNING id_menace
                        """,
                        (
                            payload["nom_menace"],
                            payload.get("description"),
                            payload.get("reference_menace"),
                        ),
                    )
                    threat_id = cur.fetchone()["id_menace"]
                    CatalogRepository._replace_threat_relations(cur, threat_id, payload)
                    return CatalogRepository._fetch_threat(cur, threat_id)
        finally:
            conn.close()

    @staticmethod
    def update_threat(threat_id: int, payload: Dict[str, Any]):
        conn = get_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id_menace
                        FROM menace
                        WHERE id_menace = %s
                        LIMIT 1
                        """,
                        (threat_id,),
                    )
                    existing_threat = cur.fetchone()
                    if not existing_threat:
                        return None

                    cur.execute(
                        """
                        UPDATE menace
                        SET nom_menace = %s,
                            description = %s,
                            reference_menace = %s
                        WHERE id_menace = %s
                        """,
                        (
                            payload["nom_menace"],
                            payload.get("description"),
                            payload.get("reference_menace"),
                            threat_id,
                        ),
                    )

                    cur.execute("DELETE FROM mitigation WHERE id_menace = %s", (threat_id,))
                    cur.execute("DELETE FROM scenario_attaque WHERE id_menace = %s", (threat_id,))
                    cur.execute("DELETE FROM menace_reference WHERE id_menace = %s", (threat_id,))

                    CatalogRepository._replace_threat_relations(cur, threat_id, payload)
                    return CatalogRepository._fetch_threat(cur, threat_id)
        finally:
            conn.close()

    @staticmethod
    def delete_threat(threat_id: int):
        conn = get_connection()
        try:
            with conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM menace WHERE id_menace = %s", (threat_id,))
                    return cur.rowcount > 0
        finally:
            conn.close()

    @staticmethod
    def _replace_threat_relations(cur, threat_id: int, payload: Dict[str, Any]):
        for mitigation in payload.get("mitigations", []):
            description = (mitigation.get("description_mitigation") or "").strip()
            if not description:
                continue

            cur.execute(
                """
                INSERT INTO mitigation (id_menace, description_mitigation, conditions_mitigation)
                VALUES (%s, %s, %s)
                """,
                (
                    threat_id,
                    description,
                    mitigation.get("conditions_mitigation"),
                ),
            )

        for scenario in payload.get("scenarios", []):
            description = (scenario.get("description_scenario") or "").strip()
            if not description:
                continue

            cur.execute(
                """
                INSERT INTO scenario_attaque (id_menace, description_scenario, conditions_scenario)
                VALUES (%s, %s, %s)
                """,
                (
                    threat_id,
                    description,
                    scenario.get("conditions_scenario"),
                ),
            )

        linked_reference_ids: set[int] = set()
        for reference in payload.get("references", []):
            reference_code = (reference.get("reference_menace") or "").strip()
            reference_name = (reference.get("nom_reference") or "").strip()
            if not reference_code or not reference_name:
                continue

            cur.execute(
                """
                SELECT id_reference
                FROM reference_menace
                WHERE reference_menace = %s
                LIMIT 1
                """,
                (reference_code,),
            )
            existing_reference = cur.fetchone()

            if existing_reference:
                reference_id = existing_reference["id_reference"]
                cur.execute(
                    """
                    UPDATE reference_menace
                    SET nom_reference = %s,
                        lien = %s
                    WHERE id_reference = %s
                    """,
                    (
                        reference_name,
                        reference.get("lien"),
                        reference_id,
                    ),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO reference_menace (reference_menace, nom_reference, lien)
                    VALUES (%s, %s, %s)
                    RETURNING id_reference
                    """,
                    (
                        reference_code,
                        reference_name,
                        reference.get("lien"),
                    ),
                )
                reference_id = cur.fetchone()["id_reference"]

            if reference_id in linked_reference_ids:
                continue

            linked_reference_ids.add(reference_id)
            cur.execute(
                """
                INSERT INTO menace_reference (id_menace, id_reference)
                VALUES (%s, %s)
                """,
                (threat_id, reference_id),
            )

    @staticmethod
    def _fetch_threat(cur, threat_id: int):
        cur.execute(
            """
            SELECT id_menace, nom_menace, description, reference_menace
            FROM menace
            WHERE id_menace = %s
            LIMIT 1
            """,
            (threat_id,),
        )
        threat = cur.fetchone()
        if not threat:
            return None

        cur.execute(
            """
            SELECT id_mitigation, id_menace, description_mitigation, conditions_mitigation
            FROM mitigation
            WHERE id_menace = %s
            ORDER BY id_mitigation
            """,
            (threat_id,),
        )
        mitigations = cur.fetchall()

        cur.execute(
            """
            SELECT id_scenario, id_menace, description_scenario, conditions_scenario
            FROM scenario_attaque
            WHERE id_menace = %s
            ORDER BY id_scenario
            """,
            (threat_id,),
        )
        scenarios = cur.fetchall()

        cur.execute(
            """
            SELECT
                r.id_reference,
                r.reference_menace,
                r.nom_reference,
                r.lien
            FROM menace_reference mr
            INNER JOIN reference_menace r ON r.id_reference = mr.id_reference
            WHERE mr.id_menace = %s
            ORDER BY LOWER(r.reference_menace), r.id_reference
            """,
            (threat_id,),
        )
        references = cur.fetchall()

        return {
            **threat,
            "mitigations": mitigations,
            "scenarios": scenarios,
            "references": references,
        }

    @staticmethod
    def list_threats_for_analysis():
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id_menace
                    FROM menace
                    ORDER BY LOWER(nom_menace), id_menace
                    """
                )
                threat_ids = cur.fetchall()
                return [
                    CatalogRepository._fetch_threat(cur, row["id_menace"])
                    for row in threat_ids
                ]
        finally:
            conn.close()
