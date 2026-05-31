"""Manual corrections applied on top of raw ESPN data.

Edit this file when:
- An owner's ESPN display name is wrong or has changed
- Two ESPN accounts are co-owners and should be merged into one identity for stats

The pipeline applies these in `pull.py` (after seasons are written) and consumers
(records.py, owners index) honor them.
"""

# Map: ESPN owner_id (the "from") -> canonical owner_id ("merge into")
# After merging, the "from" owner_id no longer exists as a standalone profile;
# their team-seasons and aliases roll up into the canonical owner.
# Two flavors of merge:
#   CO_OWNER_MERGES — two distinct *people* sharing a team. The merged-in name
#                     should appear on the canonical owner's profile as "w/ X".
#   ALIAS_MERGES    — same person, different ESPN account (rejoined the league
#                     under a new account, etc.). Should NOT show as a co-owner.
CO_OWNER_MERGES: dict[str, str] = {
    # Jordan Klein -> Ben Goldstein (co-owners of Team Goldstein starting 2025)
    "{66C8A4F0-C025-44A2-A334-D147EA70FF65}": "{CBF6473A-C5A3-46D7-8EF8-BFAF0D868891}",
    # Seth Taratoot -> Jake Fischer (co-owners of Jake and Seth starting 2024)
    "{8B6D12FA-18EA-40A3-8CC7-F8EBF4D1BAB0}": "{4F3E4D57-5F87-4D74-92C0-40815B7DFD51}",
}

ALIAS_MERGES: dict[str, str] = {
    # Ben Wolbransky's 2016 ESPN account -> his current "Ben Wolby" account.
    # Same human, two ESPN logins over the league's history.
    "{1DB8E6B9-8F38-4F44-A790-11FCE25AD209}": "{429F0506-3667-4F0B-A2ED-1761D0A3F682}",
}

MERGES: dict[str, str] = {**CO_OWNER_MERGES, **ALIAS_MERGES}

# Display names that, if found on a team after merge canonicalization, came
# from a CO-OWNER merge (not an alias merge). Fallback when owner_original_ids
# isn't reliable.
CO_OWNER_SOURCE_NAMES: set[str] = {
    "Jordan Klein",
    "seth taratoot",
}
# Kept for backward-compat callers; same semantics as CO_OWNER_SOURCE_NAMES.
MERGE_SOURCE_NAMES = CO_OWNER_SOURCE_NAMES

# Override an owner's display name (applies to the canonical owner profile).
DISPLAY_NAME_OVERRIDES: dict[str, str] = {
    # 2016 ESPN account's name rewrite. Applied at apply_overrides_to_team time
    # so the 2016 team's owner_names array reads "Ben Wolbransky" everywhere.
    "{1DB8E6B9-8F38-4F44-A790-11FCE25AD209}": "Ben Wolbransky",
    # Display the merged Wolby/Wolbransky profile as "Ben Wolbransky" (the
    # name the user goes by today).
    "{429F0506-3667-4F0B-A2ED-1761D0A3F682}": "Ben Wolbransky",
}


def canonical_id(owner_id: str | None) -> str | None:
    """Resolve an ESPN owner_id to its canonical post-merge id."""
    if not owner_id:
        return owner_id
    return MERGES.get(owner_id, owner_id)


def canonical_name(owner_id: str | None, original: str | None) -> str | None:
    """Resolve display name: if there's an override, use it; else use original."""
    if owner_id and owner_id in DISPLAY_NAME_OVERRIDES:
        return DISPLAY_NAME_OVERRIDES[owner_id]
    return original


def apply_overrides_to_team(team: dict) -> dict:
    """Canonicalize owner_ids on a team in-place. Keeps owner_names parallel
    (with renames applied) so the frontend can still show every co-owner. Also
    emits `owner_original_ids` so downstream code can tell which name came from
    the canonical owner vs. a merged co-owner.
    """
    # If owner_original_ids is already on the team (e.g., re-applying overrides
    # on already-processed data), use that as the source of truth.
    source_ids = team.get("owner_original_ids") or list(team.get("owner_ids", []))
    new_ids: list[str] = []
    new_originals: list[str] = []
    new_names: list[str] = []
    for oid, name in zip(source_ids, team.get("owner_names", [])):
        new_ids.append(canonical_id(oid) or oid)
        new_originals.append(oid)
        new_names.append(canonical_name(oid, name) or name)
    team["owner_ids"] = new_ids
    team["owner_original_ids"] = new_originals
    team["owner_names"] = new_names
    return team


def apply_overrides_to_members(members: list[dict]) -> list[dict]:
    """Apply display-name overrides to member records (keeps ids stable)."""
    for m in members:
        if m.get("id") in DISPLAY_NAME_OVERRIDES:
            m["name"] = DISPLAY_NAME_OVERRIDES[m["id"]]
    return members
