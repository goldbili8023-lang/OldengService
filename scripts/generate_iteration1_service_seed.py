#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_DB_PATH = REPO_ROOT / "supabase" / "migrations" / "iteration1.db"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "supabase" / "migrations" / "20260410193000_replace_service_seed_from_iteration1.sql"
UUID_NAMESPACE = uuid.UUID("31b53dcb-246e-48c8-8ced-d05ac5903863")

SUPPORTED_SOURCE_CATEGORIES = {
    "library",
    "community_centre",
    "food_relief",
    "health_service",
    "support_service",
}
HOUSING_SUBTYPES = {
    "assisted_living",
    "care_home",
    "group_home",
    "hospice",
    "nursing_home",
    "residential_home",
    "retirement_home",
    "shelter",
}
COUNSELING_SUBTYPES = {
    "ambulatory_care",
    "day_care",
    "day_centre",
    "disability_service",
    "mental_health_hospital",
    "outreach",
}
PREFERRED_TAG_ORDER = [
    "wheelchair accessible",
    "accessible toilet",
    "internet access",
    "senior focused",
    "food relief",
    "medical clinic",
    "pharmacy",
    "hospital",
    "mental health support",
    "council operated",
    "community hall",
    "24/7 access",
]


@dataclass(frozen=True)
class ServiceLocationRecord:
    id: str
    service_name: str
    category: str
    address: str
    suburb: str
    latitude: float
    longitude: float
    opening_hours: str
    capacity_status: str
    current_status: str
    description: str
    created_at: str
    updated_at: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a Supabase migration that replaces seed service data with content from iteration1.db."
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="Path to the SQLite source database.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH, help="Path to the generated SQL migration.")
    return parser.parse_args()


def normalize(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def truthy(value: object) -> bool:
    return normalize(value).lower() in {"1", "true", "yes", "limited", "designated"}


def slug_uuid(kind: str, value: str) -> str:
    return str(uuid.uuid5(UUID_NAMESPACE, f"{kind}:{value}"))


def parse_tags(raw_value: object) -> dict[str, object]:
    raw_text = normalize(raw_value)
    if not raw_text:
        return {}
    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def first_non_empty(*values: object) -> str:
    for value in values:
        text = normalize(value)
        if text:
            return text
    return ""


def build_address(tags: dict[str, object]) -> str:
    addr_full = normalize(tags.get("addr:full"))
    if addr_full:
        return addr_full

    parts = [
        normalize(tags.get("addr:unit")),
        normalize(tags.get("addr:door")),
        normalize(tags.get("addr:housenumber")),
        normalize(tags.get("addr:street")),
    ]
    address = " ".join(part for part in parts if part)
    if address:
        return address

    return first_non_empty(tags.get("addr:housename"), tags.get("addr:place"))


def load_opening_hours(connection: sqlite3.Connection) -> dict[int, str]:
    by_resource: dict[int, list[str]] = defaultdict(list)
    rows = connection.execute(
        """
        SELECT resource_id, day_of_week, open_time, close_time, notes
        FROM opening_hour
        ORDER BY resource_id, opening_hour_id
        """
    ).fetchall()

    for row in rows:
        note = normalize(row["notes"])
        if note:
            by_resource[row["resource_id"]].append(note)
            continue

        day = normalize(row["day_of_week"])
        open_time = normalize(row["open_time"])
        close_time = normalize(row["close_time"])
        if day and open_time and close_time:
            by_resource[row["resource_id"]].append(f"{day} {open_time}-{close_time}")

    collapsed: dict[int, str] = {}
    for resource_id, values in by_resource.items():
        deduped = list(dict.fromkeys(value for value in values if value))
        if deduped:
            collapsed[resource_id] = "; ".join(deduped)
    return collapsed


def map_category(source_category: str, name: str, description: str, tags: dict[str, object]) -> str | None:
    if source_category == "library":
        return "library"
    if source_category == "community_centre":
        return "community_center"
    if source_category == "food_relief":
        return "food_bank"
    if source_category == "health_service":
        health_kind = normalize(tags.get("healthcare") or tags.get("amenity")).lower()
        combined = f"{name} {description}".lower()
        if health_kind in {"counselling", "psychotherapist"} or re.search(r"counsell?ing|mental|psych|wellbeing", combined):
            return "counseling"
        return "health"
    if source_category == "support_service":
        subtype = normalize(tags.get("social_facility")).lower()
        combined = f"{name} {description}".lower()
        if subtype in HOUSING_SUBTYPES or re.search(
            r"aged care|retirement|nursing|assisted living|residential|housing|hostel|village",
            combined,
        ):
            return "housing"
        if subtype in COUNSELING_SUBTYPES or re.search(
            r"counsell?ing|mental|psych|wellbeing|outreach|support",
            combined,
        ):
            return "counseling"
        return "community_center"
    return None


def humanize_kind(value: str) -> str:
    cleaned = normalize(value).replace("_", " ")
    return cleaned[:1].upper() + cleaned[1:] if cleaned else ""


def build_description(
    mapped_category: str,
    raw_description: str,
    tags: dict[str, object],
    health_kind: str,
    support_subtype: str,
    accessibility_notes: str,
) -> str:
    description = normalize(raw_description)
    if not description:
        if mapped_category == "library":
            description = "Library service."
        elif mapped_category == "community_center":
            description = "Community support venue."
        elif mapped_category == "food_bank":
            description = "Food relief service."
        elif mapped_category == "housing":
            description = f"{humanize_kind(support_subtype) or 'Housing'} support."
        elif mapped_category == "counseling":
            description = "Support and counselling service."
        elif mapped_category == "health":
            label = humanize_kind(health_kind)
            description = f"{label or 'Health'} service."

    extras: list[str] = []
    operator = normalize(tags.get("operator"))
    phone = normalize(tags.get("phone"))
    if operator:
        extras.append(f"Operator: {operator}.")
    if phone:
        extras.append(f"Phone: {phone}.")
    if accessibility_notes:
        extras.append(accessibility_notes if accessibility_notes.endswith(".") else f"{accessibility_notes}.")

    combined = " ".join(part.strip() for part in [description, *extras] if part).strip()
    return combined[:400]


def derive_tags(
    mapped_category: str,
    name: str,
    description: str,
    tags: dict[str, object],
    row: sqlite3.Row,
    opening_hours: str,
) -> list[str]:
    derived: set[str] = set()
    combined = f"{name} {description}".lower()
    health_kind = normalize(tags.get("healthcare") or tags.get("amenity")).lower()
    operator = normalize(tags.get("operator")).lower()

    if truthy(row["wheelchair_access"]) or truthy(tags.get("wheelchair")):
        derived.add("wheelchair accessible")
    if truthy(row["accessible_toilet"]) or truthy(tags.get("toilets:wheelchair")):
        derived.add("accessible toilet")

    internet_access = normalize(tags.get("internet_access")).lower()
    if internet_access and internet_access not in {"no", "none"}:
        derived.add("internet access")

    if mapped_category == "food_bank":
        derived.add("food relief")

    if tags.get("social_facility:for") == "senior" or re.search(r"senior|aged care|retirement", combined):
        derived.add("senior focused")

    if health_kind in {"clinic", "doctor", "doctors"}:
        derived.add("medical clinic")
    if health_kind == "pharmacy":
        derived.add("pharmacy")
    if health_kind == "hospital":
        derived.add("hospital")
    if mapped_category == "counseling" or health_kind in {"counselling", "psychotherapist"} or re.search(
        r"counsell?ing|mental|psych|wellbeing",
        combined,
    ):
        derived.add("mental health support")

    if "council" in operator or operator.startswith("city of "):
        derived.add("council operated")

    if normalize(tags.get("community_centre")).lower() == "community_hall":
        derived.add("community hall")

    if normalize(opening_hours) == "24/7":
        derived.add("24/7 access")

    return [tag for tag in PREFERRED_TAG_ORDER if tag in derived]


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    return sql_string(str(value))


def chunked(values: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(values), size):
        yield values[index:index + size]


def build_service_rows(connection: sqlite3.Connection) -> tuple[list[ServiceLocationRecord], dict[str, list[str]], Counter[str], Counter[str]]:
    opening_hours_lookup = load_opening_hours(connection)
    rows = connection.execute(
        """
        SELECT
          r.resource_id,
          r.category_id,
          c.category_name,
          r.name,
          r.description,
          r.address,
          r.suburb,
          r.latitude,
          r.longitude,
          r.phone,
          r.website,
          r.status,
          r.created_at,
          r.updated_at,
          r.tags_json,
          ra.wheelchair_access,
          ra.step_free_access,
          ra.accessible_toilet,
          ra.lift_available,
          ra.seating_available,
          ra.accessibility_notes
        FROM resource r
        JOIN resource_category c ON c.category_id = r.category_id
        LEFT JOIN resource_accessibility ra ON ra.resource_id = r.resource_id
        WHERE r.name IS NOT NULL
          AND TRIM(r.name) <> ''
          AND c.category_name IN ('community_centre', 'food_relief', 'health_service', 'library', 'support_service')
        ORDER BY r.resource_id
        """
    ).fetchall()

    service_rows: list[ServiceLocationRecord] = []
    location_tags: dict[str, list[str]] = {}
    category_counts: Counter[str] = Counter()
    tag_counts: Counter[str] = Counter()

    for row in rows:
        tags = parse_tags(row["tags_json"])
        name = normalize(row["name"])
        raw_description = normalize(row["description"])
        source_category = normalize(row["category_name"])
        mapped_category = map_category(source_category, name, raw_description, tags)
        if not mapped_category:
            continue

        health_kind = normalize(tags.get("healthcare") or tags.get("amenity"))
        support_subtype = normalize(tags.get("social_facility"))
        accessibility_notes = normalize(row["accessibility_notes"])
        address = first_non_empty(row["address"], build_address(tags))
        suburb = first_non_empty(row["suburb"], tags.get("addr:suburb"))
        opening_hours = first_non_empty(opening_hours_lookup.get(row["resource_id"]), tags.get("opening_hours"))
        description = build_description(
            mapped_category=mapped_category,
            raw_description=raw_description,
            tags=tags,
            health_kind=health_kind,
            support_subtype=support_subtype,
            accessibility_notes=accessibility_notes,
        )

        current_status = "open" if normalize(row["status"]).lower() in {"", "active", "open"} else "closed"
        location_id = slug_uuid("service_location", str(row["resource_id"]))
        service_row = ServiceLocationRecord(
            id=location_id,
            service_name=name,
            category=mapped_category,
            address=address,
            suburb=suburb,
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
            opening_hours=opening_hours,
            capacity_status="available",
            current_status=current_status,
            description=description,
            created_at=normalize(row["created_at"]) or "now()",
            updated_at=normalize(row["updated_at"]) or "now()",
        )
        service_rows.append(service_row)
        category_counts[mapped_category] += 1

        derived_tag_names = derive_tags(
            mapped_category=mapped_category,
            name=name,
            description=description,
            tags=tags,
            row=row,
            opening_hours=opening_hours,
        )
        if derived_tag_names:
            location_tags[location_id] = derived_tag_names
            tag_counts.update(derived_tag_names)

    return service_rows, location_tags, category_counts, tag_counts


def render_tag_insert(all_tags: list[str]) -> str:
    rows = ",\n".join(f"  ({sql_literal(tag)})" for tag in all_tags)
    return (
        "INSERT INTO service_tags (tag_name)\n"
        "VALUES\n"
        f"{rows}\n"
        "ON CONFLICT (tag_name) DO NOTHING;"
    )


def render_service_location_insert(service_rows: list[ServiceLocationRecord]) -> str:
    rendered_rows = []
    for row in service_rows:
        rendered_rows.append(
            "  ("
            + ", ".join(
                [
                    sql_literal(row.id),
                    sql_literal(row.service_name),
                    sql_literal(row.category),
                    sql_literal(row.address),
                    sql_literal(row.suburb),
                    sql_literal(row.latitude),
                    sql_literal(row.longitude),
                    sql_literal(row.opening_hours),
                    sql_literal(row.capacity_status),
                    sql_literal(row.current_status),
                    sql_literal(row.description),
                    "NULL",
                    sql_literal(row.created_at),
                    sql_literal(row.updated_at),
                ]
            )
            + ")"
        )

    return (
        "INSERT INTO service_locations (\n"
        "  id,\n"
        "  service_name,\n"
        "  category,\n"
        "  address,\n"
        "  suburb,\n"
        "  latitude,\n"
        "  longitude,\n"
        "  opening_hours,\n"
        "  capacity_status,\n"
        "  current_status,\n"
        "  description,\n"
        "  created_by,\n"
        "  created_at,\n"
        "  updated_at\n"
        ")\n"
        "VALUES\n"
        + ",\n".join(rendered_rows)
        + "\n"
        "ON CONFLICT (id) DO UPDATE SET\n"
        "  service_name = EXCLUDED.service_name,\n"
        "  category = EXCLUDED.category,\n"
        "  address = EXCLUDED.address,\n"
        "  suburb = EXCLUDED.suburb,\n"
        "  latitude = EXCLUDED.latitude,\n"
        "  longitude = EXCLUDED.longitude,\n"
        "  opening_hours = EXCLUDED.opening_hours,\n"
        "  capacity_status = EXCLUDED.capacity_status,\n"
        "  current_status = EXCLUDED.current_status,\n"
        "  description = EXCLUDED.description,\n"
        "  updated_at = EXCLUDED.updated_at;"
    )


def render_location_tag_insert(location_tags: dict[str, list[str]]) -> str:
    values: list[str] = []
    for location_id, tag_names in sorted(location_tags.items()):
        for tag_name in tag_names:
            values.append(f"  ({sql_literal(location_id)}, {sql_literal(tag_name)})")

    chunks = []
    for group in chunked(values, 500):
        chunk_sql = (
            "WITH seed(location_id, tag_name) AS (\n"
            "VALUES\n"
            + ",\n".join(group)
            + "\n"
            ")\n"
            "INSERT INTO location_tags (location_id, tag_id)\n"
            "SELECT seed.location_id::uuid, service_tags.id\n"
            "FROM seed\n"
            "JOIN service_tags ON service_tags.tag_name = seed.tag_name\n"
            "ON CONFLICT (location_id, tag_id) DO NOTHING;"
        )
        chunks.append(chunk_sql)
    return "\n\n".join(chunks)


def render_sql(
    db_path: Path,
    service_rows: list[ServiceLocationRecord],
    location_tags: dict[str, list[str]],
    category_counts: Counter[str],
    tag_counts: Counter[str],
) -> str:
    all_tags = [tag for tag in PREFERRED_TAG_ORDER if tag in tag_counts]
    category_lines = "\n".join(
        f"  - {category}: {count}"
        for category, count in sorted(category_counts.items())
    )
    tag_lines = "\n".join(
        f"  - {tag}: {tag_counts[tag]}"
        for tag in all_tags
    )

    sections = [
        "/*",
        "  # Replace service seed data from iteration1.db",
        "",
        f"  Generated by scripts/generate_iteration1_service_seed.py from {db_path.as_posix()}",
        f"  Imported {len(service_rows)} service locations.",
        "  Category counts:",
        category_lines,
        "  Tag counts:",
        tag_lines,
        "",
        "  This migration only refreshes service-related seed data.",
        "  Tutorials, exercise resources, and area statistics are left unchanged.",
        "*/",
        "",
        "-- Remove previous seeded relationships while preserving worker-created services.",
        "DELETE FROM location_tags",
        "WHERE location_id IN (",
        "  SELECT id",
        "  FROM service_locations",
        "  WHERE created_by IS NULL",
        ");",
        "",
        "DELETE FROM service_locations",
        "WHERE created_by IS NULL;",
        "",
        "DELETE FROM service_tags st",
        "WHERE NOT EXISTS (",
        "  SELECT 1",
        "  FROM location_tags lt",
        "  WHERE lt.tag_id = st.id",
        ");",
        "",
        "-- Insert the refreshed tag catalog.",
        render_tag_insert(all_tags),
        "",
        "-- Insert mapped service locations from the SQLite source.",
        render_service_location_insert(service_rows),
        "",
        "-- Rebuild tag assignments using tag names to preserve existing tag ids on conflict.",
        render_location_tag_insert(location_tags),
        "",
    ]
    return "\n".join(sections)


def main() -> int:
    args = parse_args()
    db_path = args.db.resolve()
    output_path = args.output.resolve()

    if not db_path.exists():
        raise SystemExit(f"SQLite source database not found: {db_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        service_rows, location_tags, category_counts, tag_counts = build_service_rows(connection)
    finally:
        connection.close()

    sql_text = render_sql(
        db_path=db_path,
        service_rows=service_rows,
        location_tags=location_tags,
        category_counts=category_counts,
        tag_counts=tag_counts,
    )
    output_path.write_text(sql_text, encoding="utf-8", newline="\n")

    print(f"Generated {output_path}")
    print(f"Imported service locations: {len(service_rows)}")
    print("Category counts:")
    for category, count in sorted(category_counts.items()):
        print(f"  {category}: {count}")
    print("Tag counts:")
    for tag in [tag for tag in PREFERRED_TAG_ORDER if tag in tag_counts]:
        print(f"  {tag}: {tag_counts[tag]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
