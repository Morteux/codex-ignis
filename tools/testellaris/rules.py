"""Empire creation rules of civics, origins and authorities, read from their `potential` and
`possible` conditions, and a satisfiability check over every legal empire.

A question such as "which civic cannot be combined with X?" needs wrong answers that certainly can:
`Rules.satisfiable` tries every authority, ethics combination, species archetype and empire type
(nomadic or not) and says whether one of them meets the conditions of all the items together.
Conditions it does not read (nested blocks, unknown triggers) make an item unusable."""
import itertools

from pdx.parser import Block, parse

LIST_KEYS = ("ethics", "authority", "origin", "civics", "species_archetype", "species_class",
             "graphical_culture", "traits", "preferred_planet_class", "country_type")
# Keys the satisfiability check does not choose a value for: an item that *requires* one of them
# cannot be proved compatible with another item.
UNMODELLED = ("species_class", "graphical_culture", "traits", "preferred_planet_class")
REGULAR_AUTHORITIES = ("auth_democratic", "auth_oligarchic", "auth_dictatorial", "auth_imperial")
PLAYER_AUTHORITIES = REGULAR_AUTHORITIES + ("auth_corporate", "auth_hive_mind", "auth_machine_intelligence")
GESTALT = "ethic_gestalt_consciousness"
ETHIC_POINTS = 3


class Rules:
    """Conditions of one item: `need[key]` is a list of sets (one value of each must be chosen),
    `ban[key]` the forbidden values, `nomadic` True / False / None."""

    def __init__(self):
        self.need = {k: [] for k in LIST_KEYS}
        self.ban = {k: set() for k in LIST_KEYS}
        self.nomadic = None


def _clause(rules, key, block):
    for k, _, v in block.entries:
        if k == "text":
            continue
        if k == "value" and not isinstance(v, Block):
            rules.need[key].append({str(v)})
        elif k in ("OR", "NOT", "NOR") and isinstance(v, Block):
            values = set()
            for kk, _, vv in v.entries:
                if kk == "value" and not isinstance(vv, Block):
                    values.add(str(vv))
                elif kk != "text":
                    return False
            if k == "OR":
                rules.need[key].append(values)
            else:
                rules.ban[key] |= values
        else:
            return False
    return True


def _corporate_pattern(block):
    """`OR = { authority = { value = auth_corporate } civics = { value = civic_galactic_sovereign_megacorp } }`:
    how the game writes "megacorporations only"."""
    found = {}
    for k, _, v in block.entries:
        if not isinstance(v, Block):
            return False
        found[k] = [str(vv) for kk, _, vv in v.entries if kk == "value"]
    return found == {"authority": ["auth_corporate"], "civics": ["civic_galactic_sovereign_megacorp"]}


def read(item, fields=("potential", "possible")):
    """Rules of an item, or None if a condition is not one these templates understand."""
    rules = Rules()
    for field in fields:
        text = item.get(field)
        if not text:
            continue
        try:
            block = parse(text)
        except Exception:  # noqa: BLE001 — an unreadable condition makes the item unusable
            return None
        for k, _, v in block.entries:
            if k in LIST_KEYS and isinstance(v, Block):
                if not _clause(rules, k, v):
                    return None
            elif k == "is_nomadic" and isinstance(v, bool):
                if rules.nomadic not in (None, v):
                    return None
                rules.nomadic = v
            elif k == "always" and v is True:
                continue
            elif k == "OR" and isinstance(v, Block) and _corporate_pattern(v):
                rules.need["authority"].append({"auth_corporate"})
            else:
                return None
    return rules


def ethic_combinations(ethics):
    """Every legal set of ethics of a player empire: gestalt alone, or 3 points on different axes."""
    regular = [e for e in ethics if e["id"] != GESTALT]
    out = [frozenset([GESTALT])]
    for n in range(1, ETHIC_POINTS + 1):
        for combo in itertools.combinations(regular, n):
            if sum(e["cost"] for e in combo) == ETHIC_POINTS and len({e["category"] for e in combo}) == n:
                out.append(frozenset(e["id"] for e in combo))
    return out


def _meets(rules, key, chosen):
    """True if the chosen values of one key meet the conditions of an item."""
    return all(need & chosen for need in rules.need[key]) and not rules.ban[key] & chosen


class Empires:
    """The legal player empires of a ruleset, to test conditions against."""

    def __init__(self, data):
        self.combos = ethic_combinations(data.items("ethics"))
        self.authorities = {a["id"]: read(a) for a in data.items("authorities") if a["id"] in PLAYER_AUTHORITIES}
        if any(r is None for r in self.authorities.values()):
            raise ValueError("an authority has conditions the rules reader does not understand")
        values = {"BIOLOGICAL", "MACHINE"}
        for set_name in ("civics", "origins", "authorities"):
            for item in data.items(set_name):
                r = read(item)
                if r:
                    values |= r.ban["species_archetype"].union(*r.need["species_archetype"])
        self.archetypes = sorted(values)
        self._cache = {}

    @staticmethod
    def strict(rules):
        """True if compatibility of an item can be proved (it requires nothing the check ignores)."""
        return bool(rules) and not any(rules.need[k] for k in UNMODELLED + ("civics", "origin")) \
            and all("default" in need for need in rules.need["country_type"])

    def satisfiable(self, items, authority=None, ethic=None):
        """True if one legal empire meets the conditions of every (id, set name, rules) of `items`,
        optionally with a given authority and holding a given ethic. Requirements of another civic or
        origin that is not among the items count as not met."""
        civics = {i for i, s, _ in items if s == "civics"}
        origins = {i for i, s, _ in items if s == "origins"}
        if len(origins) > 1:
            return False
        rules = [r for _, _, r in items]
        for r in rules:
            if not _meets(r, "civics", civics) or (origins and not _meets(r, "origin", origins)) \
                    or (not origins and r.need["origin"]):
                return False
        nomadic = {r.nomadic for r in rules if r.nomadic is not None}
        if len(nomadic) > 1:
            return False
        for auth, arules in self.authorities.items():
            if authority and auth != authority:
                continue
            if not all(_meets(r, "authority", {auth}) for r in rules):
                continue
            if origins and not _meets(arules, "origin", origins):
                continue
            if not _meets(arules, "civics", civics):
                continue
            for arch in self.archetypes:
                if not all(_meets(r, "species_archetype", {arch}) for r in rules + [arules]):
                    continue
                for combo in self.combos:
                    if ethic and ethic not in combo:
                        continue
                    if all(_meets(r, "ethics", combo) for r in rules + [arules]):
                        return True
        return False
