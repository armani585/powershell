"""Build the downloadable archive after build-standalone.mjs."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
standalone = root / "dist/atelier-autonome.html"
if not standalone.is_file():
    raise SystemExit("Run node scripts/build-standalone.mjs first")
archive = root / "dist/darija-atelier.zip"
with ZipFile(archive, "w", ZIP_DEFLATED) as bundle:
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if path.is_file() and not set(relative.parts) & {"dist", "test-output", "__pycache__"}:
            bundle.write(path, Path(root.name) / relative)
    bundle.write(standalone, root.name + "/dist/atelier-autonome.html")
with ZipFile(archive) as bundle:
    if bundle.testzip() is not None:
        raise SystemExit("Archive integrity check failed")
print("Archive built and verified:", archive)
