import ast
import importlib
import json
import sys
from pathlib import Path


repo = Path(__file__).resolve().parents[3]
backend_root = repo / "backend"
allowed_roots = [
    backend_root / "cultivator",
    backend_root / "scripts" / "cultivator",
    backend_root / "tests" / "cultivator",
]

module_files = {}
for p in (backend_root / "cultivator").rglob("*.py"):
    rel = p.relative_to(backend_root)
    parts = list(rel.parts)
    if parts[-1] == "__init__.py":
        mod = ".".join(parts[:-1])
    else:
        mod = ".".join(parts).replace(".py", "")
    module_files[mod] = p

module_names = set(module_files.keys())
module_names.add("cultivator")


def module_exists(mod_name: str) -> bool:
    if mod_name in module_names:
        return True
    mod_path = backend_root / Path(*mod_name.split("."))
    return mod_path.with_suffix(".py").exists() or (mod_path / "__init__.py").exists()


validation = {
    "unresolved_module_imports": [],
    "unknown_from_import_symbols": [],
    "scanned_files": [],
    "cycles": [],
    "import_runtime_failures": [],
}

for root in allowed_roots:
    for f in root.rglob("*.py"):
        rel = f.relative_to(repo).as_posix()
        validation["scanned_files"].append(rel)
        try:
            tree = ast.parse(f.read_text(encoding="utf-8"), filename=rel)
        except Exception as e:
            validation["unresolved_module_imports"].append(
                {
                    "file": rel,
                    "import": "<parse_error>",
                    "reason": str(e),
                }
            )
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for n in node.names:
                    if n.name.startswith("cultivator") and not module_exists(n.name):
                        validation["unresolved_module_imports"].append(
                            {
                                "file": rel,
                                "import": f"import {n.name}",
                                "reason": f"module {n.name} not found",
                            }
                        )

            elif isinstance(node, ast.ImportFrom):
                if node.level != 0:
                    continue
                mod = node.module
                if not mod:
                    continue
                if mod.startswith("cultivator"):
                    if not module_exists(mod):
                        validation["unresolved_module_imports"].append(
                            {
                                "file": rel,
                                "import": f"from {mod} import ...",
                                "reason": f"module {mod} not found",
                            }
                        )
                    else:
                        for alias in node.names:
                            if alias.name == "*":
                                continue
                            candidate = f"{mod}.{alias.name}"
                            if module_exists(candidate):
                                continue
                            validation["unknown_from_import_symbols"].append(
                                {
                                    "file": rel,
                                    "import": f"from {mod} import {alias.name}",
                                    "note": "target symbol is not a module; may still be valid as attribute/function/class",
                                }
                            )

edges = {m: set() for m in module_names if m.startswith("cultivator")}
for mod, f in module_files.items():
    rel = f.relative_to(repo).as_posix()
    try:
        tree = ast.parse(f.read_text(encoding="utf-8"), filename=rel)
    except Exception:
        continue
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in node.names:
                if n.name.startswith("cultivator") and n.name in edges:
                    edges[mod].add(n.name)
        elif isinstance(node, ast.ImportFrom):
            if node.level != 0 or not node.module:
                continue
            base = node.module
            if base.startswith("cultivator"):
                if base in edges:
                    edges[mod].add(base)
                for alias in node.names:
                    candidate = f"{base}.{alias.name}"
                    if candidate in edges:
                        edges[mod].add(candidate)

visited = {}
stack = []


def dfs(u):
    visited[u] = 1
    stack.append(u)
    for v in sorted(edges.get(u, ())):
        state = visited.get(v, 0)
        if state == 0:
            dfs(v)
        elif state == 1 and v in stack:
            i = stack.index(v)
            cyc = stack[i:] + [v]
            validation["cycles"].append(cyc)
    stack.pop()
    visited[u] = 2


for m in sorted(edges):
    if visited.get(m, 0) == 0:
        dfs(m)

canon = set()
unique_cycles = []
for cyc in validation["cycles"]:
    core = cyc[:-1]
    if not core:
        continue
    rots = [tuple(core[i:] + core[:i]) for i in range(len(core))]
    key = min(rots)
    if key not in canon:
        canon.add(key)
        unique_cycles.append(list(key) + [key[0]])
validation["cycles"] = unique_cycles

sys.path.insert(0, str(backend_root))
for mod in sorted(m for m in module_names if m.startswith("cultivator")):
    try:
        importlib.import_module(mod)
    except Exception as e:
        validation["import_runtime_failures"].append(
            {
                "module": mod,
                "error": f"{type(e).__name__}: {e}",
            }
        )

summary = {
    "scanned_file_count": len(validation["scanned_files"]),
    "unresolved_module_import_count": len(validation["unresolved_module_imports"]),
    "unknown_from_symbol_count": len(validation["unknown_from_import_symbols"]),
    "cycle_count": len(validation["cycles"]),
    "runtime_import_failure_count": len(validation["import_runtime_failures"]),
}

output = {
    "summary": summary,
    "validation": validation,
}

out_path = repo / "phase2_validation.json"
out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

print("VALIDATION_JSON=" + str(out_path))
print(json.dumps(summary, indent=2))
