/**
 * Tech tree test fixture (T3001): invented, clearly fake technologies with the confirmed model of
 * TECH_TREE_GDD.md section 4.3 (`gameVersion`, `flags`, `effects` and `repeatable` added in T3301).
 * Covers every area, kind and tier, prerequisite chains (also across fields), requirements with and
 * without `not`, variants, DLC and unlocks linked to simulator ids. Only for the tests: never
 * imported by a page of the site; the version tests add it to js/tech-versions.js as a second
 * version (rulesetId `fixture`).
 */
export const TECH_DATA = {
  "rulesetId": "fixture",
  "label": "Test fixture (fake technologies)",
  "gameVersion": "Fixture v0.0.1",
  "source": "invented test data (tests/fixtures/tech-tree)",
  "areas": [
    "physics",
    "society",
    "engineering"
  ],
  "fields": [
    {
      "id": "fixture_signal_theory",
      "area": "physics",
      "name": "Fixture Signal Theory"
    },
    {
      "id": "fixture_quantum_knitting",
      "area": "physics",
      "name": "Fixture Quantum Knitting"
    },
    {
      "id": "fixture_civic_studies",
      "area": "society",
      "name": "Fixture Civic Studies"
    },
    {
      "id": "fixture_xeno_gardening",
      "area": "society",
      "name": "Fixture Xeno Gardening"
    },
    {
      "id": "fixture_hull_folding",
      "area": "engineering",
      "name": "Fixture Hull Folding"
    },
    {
      "id": "fixture_drive_tinkering",
      "area": "engineering",
      "name": "Fixture Drive Tinkering"
    }
  ],
  "tiers": [
    {
      "tier": 0,
      "previouslyUnlocked": null
    },
    {
      "tier": 1,
      "previouslyUnlocked": 0
    },
    {
      "tier": 2,
      "previouslyUnlocked": 6
    },
    {
      "tier": 3,
      "previouslyUnlocked": 6
    },
    {
      "tier": 4,
      "previouslyUnlocked": 6
    },
    {
      "tier": 5,
      "previouslyUnlocked": 6
    }
  ],
  "technologies": [
    {
      "id": "tech_fixture_spark_counting",
      "name": "Fixture Spark Counting",
      "area": "physics",
      "field": "fixture_signal_theory",
      "tier": 0,
      "baseCost": null,
      "kind": "starter",
      "flags": [
        "start"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": null,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_spark_counting.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_echo_relay",
      "name": "Fixture Echo Relay",
      "area": "physics",
      "field": "fixture_signal_theory",
      "tier": 1,
      "baseCost": 111,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_spark_counting"
      ],
      "requirements": [],
      "unlocks": [
        {
          "type": "building",
          "id": "building_fixture_pretend_relay_mast",
          "name": "Fixture Pretend Relay Mast",
          "sim": {
            "collection": "buildings",
            "id": "fixture_pretend_relay_mast"
          }
        }
      ],
      "effects": [],
      "drawWeight": {
        "base": 9,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_echo_relay.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_lattice_ping",
      "name": "Fixture Lattice Ping",
      "area": "physics",
      "field": "fixture_signal_theory",
      "tier": 2,
      "baseCost": 222,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_echo_relay"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 8,
        "modifiers": [
          "x2 Fixture: pretend council trait"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_lattice_ping.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_prism_cascade",
      "name": "Fixture Prism Cascade",
      "area": "physics",
      "field": "fixture_signal_theory",
      "tier": 3,
      "baseCost": 333,
      "kind": "rare",
      "flags": [
        "rare"
      ],
      "prerequisites": [
        "tech_fixture_lattice_ping"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 7,
        "modifiers": [
          "x0.5 Fixture: pretend caution"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_prism_cascade.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_null_choir",
      "name": "Fixture Null Choir",
      "area": "physics",
      "field": "fixture_signal_theory",
      "tier": 4,
      "baseCost": 444,
      "kind": "dangerous",
      "flags": [
        "dangerous"
      ],
      "prerequisites": [
        "tech_fixture_prism_cascade",
        "tech_fixture_knot_seed"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 6,
        "modifiers": [
          "x0.5 Fixture: pretend caution"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_null_choir.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_salvaged_lens",
      "name": "Fixture Salvaged Lens",
      "area": "physics",
      "field": "fixture_signal_theory",
      "tier": 2,
      "baseCost": 222,
      "kind": "acquisition",
      "flags": [],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 0,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_salvaged_lens.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_found_beacon",
      "name": "Fixture Found Beacon",
      "area": "physics",
      "field": "fixture_signal_theory",
      "tier": 3,
      "baseCost": 333,
      "kind": "event",
      "flags": [
        "event"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 0,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_found_beacon.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_knot_seed",
      "name": "Fixture Knot Seed",
      "area": "physics",
      "field": "fixture_quantum_knitting",
      "tier": 0,
      "baseCost": null,
      "kind": "starter",
      "flags": [
        "start"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": null,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_knot_seed.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_braided_field",
      "name": "Fixture Braided Field",
      "area": "physics",
      "field": "fixture_quantum_knitting",
      "tier": 1,
      "baseCost": 111,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_knot_seed"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 9,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_braided_field.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_tangle_loom",
      "name": "Fixture Tangle Loom",
      "area": "physics",
      "field": "fixture_quantum_knitting",
      "tier": 2,
      "baseCost": 222,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_braided_field"
      ],
      "requirements": [
        {
          "text": "Fixture authority: Imaginary Hive",
          "not": true
        }
      ],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 8,
        "modifiers": [
          "x2 Fixture: pretend council trait"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_tangle_loom.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_paradox_spindle",
      "name": "Fixture Paradox Spindle",
      "area": "physics",
      "field": "fixture_quantum_knitting",
      "tier": 5,
      "baseCost": 555,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_null_choir",
        "tech_fixture_tangle_loom"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 5,
        "modifiers": []
      },
      "dlc": [
        "Fixture Pack One"
      ],
      "icon": "technologies/tech_fixture_paradox_spindle.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_repeat_signal_gain",
      "name": "Fixture Repeat Signal Gain",
      "area": "physics",
      "field": "fixture_quantum_knitting",
      "tier": 5,
      "baseCost": 555,
      "kind": "repeatable",
      "flags": [
        "repeatable"
      ],
      "prerequisites": [
        "tech_fixture_paradox_spindle"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 5,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_repeat_signal_gain.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": [],
      "repeatable": {
        "costPerLevel": 555,
        "levels": null
      }
    },
    {
      "id": "tech_fixture_town_tally",
      "name": "Fixture Town Tally",
      "area": "society",
      "field": "fixture_civic_studies",
      "tier": 0,
      "baseCost": null,
      "kind": "starter",
      "flags": [
        "start"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": null,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_town_tally.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_council_drafts",
      "name": "Fixture Council Drafts",
      "area": "society",
      "field": "fixture_civic_studies",
      "tier": 1,
      "baseCost": 111,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_town_tally"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 9,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_council_drafts.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": [
        {
          "id": "tech_fixture_council_drafts_hive",
          "name": "Fixture Hive Drafts",
          "condition": "Fixture authority: Imaginary Hive"
        }
      ]
    },
    {
      "id": "tech_fixture_ledger_rites",
      "name": "Fixture Ledger Rites",
      "area": "society",
      "field": "fixture_civic_studies",
      "tier": 2,
      "baseCost": 222,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_council_drafts"
      ],
      "requirements": [],
      "unlocks": [
        {
          "type": "district",
          "id": "district_fixture_pretend_archive_ward",
          "name": "Fixture Pretend Archive Ward",
          "sim": {
            "collection": "districts",
            "id": "fixture_pretend_archive_ward"
          },
          "jobs": [
            {
              "id": "fixture_pretend_clerk",
              "sim": "fixture_pretend_clerk"
            },
            {
              "id": "fixture_unlinked_scribe"
            }
          ]
        }
      ],
      "effects": [],
      "drawWeight": {
        "base": 8,
        "modifiers": [
          "x2 Fixture: pretend council trait"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_ledger_rites.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_charter_weave",
      "name": "Fixture Charter Weave",
      "area": "society",
      "field": "fixture_civic_studies",
      "tier": 3,
      "baseCost": 333,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_ledger_rites"
      ],
      "requirements": [
        {
          "text": "Fixture origin: Pretend Origin",
          "not": false
        }
      ],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 7,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_charter_weave.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_assembly_echo",
      "name": "Fixture Assembly Echo",
      "area": "society",
      "field": "fixture_civic_studies",
      "tier": 4,
      "baseCost": 444,
      "kind": "rare",
      "flags": [
        "rare"
      ],
      "prerequisites": [
        "tech_fixture_charter_weave"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 6,
        "modifiers": [
          "x0.5 Fixture: pretend caution"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_assembly_echo.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_grand_compact",
      "name": "Fixture Grand Compact",
      "area": "society",
      "field": "fixture_civic_studies",
      "tier": 5,
      "baseCost": 555,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_assembly_echo",
        "tech_fixture_charter_weave"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 5,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_grand_compact.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_repeat_civic_drill",
      "name": "Fixture Repeat Civic Drill",
      "area": "society",
      "field": "fixture_civic_studies",
      "tier": 5,
      "baseCost": 555,
      "kind": "repeatable",
      "flags": [
        "repeatable"
      ],
      "prerequisites": [
        "tech_fixture_grand_compact"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 5,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_repeat_civic_drill.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": [],
      "repeatable": {
        "costPerLevel": 555,
        "levels": null
      }
    },
    {
      "id": "tech_fixture_moss_primer",
      "name": "Fixture Moss Primer",
      "area": "society",
      "field": "fixture_xeno_gardening",
      "tier": 0,
      "baseCost": null,
      "kind": "starter",
      "flags": [
        "start"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": null,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_moss_primer.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_spore_terrace",
      "name": "Fixture Spore Terrace",
      "area": "society",
      "field": "fixture_xeno_gardening",
      "tier": 1,
      "baseCost": 111,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_moss_primer"
      ],
      "requirements": [],
      "unlocks": [
        {
          "type": "edict",
          "id": "fixture_pretend_mulching",
          "name": "Fixture Pretend Mulching"
        }
      ],
      "effects": [],
      "drawWeight": {
        "base": 9,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_spore_terrace.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_vine_lattice",
      "name": "Fixture Vine Lattice",
      "area": "society",
      "field": "fixture_xeno_gardening",
      "tier": 2,
      "baseCost": 222,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_spore_terrace"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 8,
        "modifiers": [
          "x2 Fixture: pretend council trait"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_vine_lattice.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_bloom_engine",
      "name": "Fixture Bloom Engine",
      "area": "society",
      "field": "fixture_xeno_gardening",
      "tier": 3,
      "baseCost": 333,
      "kind": "dangerous",
      "flags": [
        "dangerous"
      ],
      "prerequisites": [
        "tech_fixture_vine_lattice"
      ],
      "requirements": [
        {
          "text": "Fixture ethic: Make-Believe Purist",
          "not": true
        }
      ],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 7,
        "modifiers": [
          "x0.5 Fixture: pretend caution"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_bloom_engine.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_garden_vault",
      "name": "Fixture Garden Vault",
      "area": "society",
      "field": "fixture_xeno_gardening",
      "tier": 4,
      "baseCost": 444,
      "kind": "rare",
      "flags": [
        "rare"
      ],
      "prerequisites": [
        "tech_fixture_bloom_engine"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 6,
        "modifiers": [
          "x0.5 Fixture: pretend caution"
        ]
      },
      "dlc": [
        "Fixture Pack Two"
      ],
      "icon": "technologies/tech_fixture_garden_vault.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_whisper_garden",
      "name": "Fixture Whisper Garden",
      "area": "society",
      "field": "fixture_xeno_gardening",
      "tier": 4,
      "baseCost": 444,
      "kind": "event",
      "flags": [
        "event"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 0,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_whisper_garden.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_rivet_basics",
      "name": "Fixture Rivet Basics",
      "area": "engineering",
      "field": "fixture_hull_folding",
      "tier": 0,
      "baseCost": null,
      "kind": "starter",
      "flags": [
        "start"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": null,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_rivet_basics.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_plate_folding",
      "name": "Fixture Plate Folding",
      "area": "engineering",
      "field": "fixture_hull_folding",
      "tier": 1,
      "baseCost": 111,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_rivet_basics"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 9,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_plate_folding.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_crease_alloys",
      "name": "Fixture Crease Alloys",
      "area": "engineering",
      "field": "fixture_hull_folding",
      "tier": 2,
      "baseCost": 222,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_plate_folding",
        "tech_fixture_rivet_basics"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 8,
        "modifiers": [
          "x2 Fixture: pretend council trait"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_crease_alloys.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_origami_hulls",
      "name": "Fixture Origami Hulls",
      "area": "engineering",
      "field": "fixture_hull_folding",
      "tier": 3,
      "baseCost": 333,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_crease_alloys"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 7,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_origami_hulls.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": [
        {
          "id": "tech_fixture_origami_hulls_bio",
          "name": "Fixture Grown Hulls",
          "condition": "Fixture ships: pretend biological"
        }
      ]
    },
    {
      "id": "tech_fixture_pleat_armor",
      "name": "Fixture Pleat Armor",
      "area": "engineering",
      "field": "fixture_hull_folding",
      "tier": 4,
      "baseCost": 444,
      "kind": "rare",
      "flags": [
        "rare"
      ],
      "prerequisites": [
        "tech_fixture_origami_hulls"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 6,
        "modifiers": [
          "x0.5 Fixture: pretend caution"
        ]
      },
      "dlc": [
        "Fixture Pack One",
        "Fixture Pack Two"
      ],
      "icon": "technologies/tech_fixture_pleat_armor.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_final_fold",
      "name": "Fixture Final Fold",
      "area": "engineering",
      "field": "fixture_hull_folding",
      "tier": 5,
      "baseCost": 555,
      "kind": "dangerous",
      "flags": [
        "dangerous"
      ],
      "prerequisites": [
        "tech_fixture_pleat_armor",
        "tech_fixture_comet_nozzle"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 5,
        "modifiers": [
          "x0.5 Fixture: pretend caution"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_final_fold.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_repeat_fold_density",
      "name": "Fixture Repeat Fold Density",
      "area": "engineering",
      "field": "fixture_hull_folding",
      "tier": 5,
      "baseCost": 555,
      "kind": "repeatable",
      "flags": [
        "repeatable"
      ],
      "prerequisites": [
        "tech_fixture_final_fold"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 5,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_repeat_fold_density.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": [],
      "repeatable": {
        "costPerLevel": 555,
        "levels": null
      }
    },
    {
      "id": "tech_fixture_wheel_spin",
      "name": "Fixture Wheel Spin",
      "area": "engineering",
      "field": "fixture_drive_tinkering",
      "tier": 0,
      "baseCost": null,
      "kind": "starter",
      "flags": [
        "start"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": null,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_wheel_spin.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_puff_thruster",
      "name": "Fixture Puff Thruster",
      "area": "engineering",
      "field": "fixture_drive_tinkering",
      "tier": 1,
      "baseCost": 111,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_wheel_spin"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 9,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_puff_thruster.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_comet_nozzle",
      "name": "Fixture Comet Nozzle",
      "area": "engineering",
      "field": "fixture_drive_tinkering",
      "tier": 2,
      "baseCost": 222,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_puff_thruster"
      ],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 8,
        "modifiers": [
          "x2 Fixture: pretend council trait"
        ]
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_comet_nozzle.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_wake_skimmer",
      "name": "Fixture Wake Skimmer",
      "area": "engineering",
      "field": "fixture_drive_tinkering",
      "tier": 3,
      "baseCost": 333,
      "kind": "normal",
      "flags": [],
      "prerequisites": [
        "tech_fixture_comet_nozzle"
      ],
      "requirements": [
        {
          "text": "Fixture year: 2999 or later",
          "not": false
        }
      ],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 7,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_wake_skimmer.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_drift_coil",
      "name": "Fixture Drift Coil",
      "area": "engineering",
      "field": "fixture_drive_tinkering",
      "tier": 4,
      "baseCost": 444,
      "kind": "acquisition",
      "flags": [],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 0,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_drift_coil.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    },
    {
      "id": "tech_fixture_ghost_drive",
      "name": "Fixture Ghost Drive",
      "area": "engineering",
      "field": "fixture_drive_tinkering",
      "tier": 5,
      "baseCost": 555,
      "kind": "event",
      "flags": [
        "event"
      ],
      "prerequisites": [],
      "requirements": [],
      "unlocks": [],
      "effects": [],
      "drawWeight": {
        "base": 0,
        "modifiers": []
      },
      "dlc": [],
      "icon": "technologies/tech_fixture_ghost_drive.png",
      "description": "Invented fixture technology for tests; not a real game technology.",
      "variants": []
    }
  ]
};
