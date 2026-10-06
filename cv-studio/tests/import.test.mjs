import test from "node:test";
import assert from "node:assert/strict";
import { extractDocument } from "../lib/extract-document.mjs";
import { applySelection } from "../src/import-selection.mjs";
import { blankResume } from "../shared/model.mjs";
function pdf(text = "Camille Laurent", count = 1) {
  const stream = text ? `BT /F1 12 Tf 40 780 Td (${text}) Tj ET` : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array(count).fill("3 0 R").join(" ")}] /Count ${count} >>`,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let data = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(data));
    data += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(data);
  data +=
    `xref\n0 ${offsets.length}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
      .join("") +
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(data);
}
const file = (name, content) => ({
  originalname: name,
  buffer: Buffer.isBuffer(content) ? content : Buffer.from(content),
});
test("UTF-8 text imports without an API key and preserves literal content", async () => {
  const result = await extractDocument(
    file("cv.txt", "Camille\r\n<script>texte non exécuté</script>"),
  );
  assert.equal(result.text, "Camille\n<script>texte non exécuté</script>");
});
test("PDF text is extracted by the local parser", async () => {
  const result = await extractDocument(file("cv.pdf", pdf()));
  assert.match(result.text, /Camille Laurent/);
  assert.ok(result.notes.length);
});
test("image-only PDF explains OCR requirement", async () => {
  await assert.rejects(extractDocument(file("scan.pdf", pdf(""))), /OCR/);
});
test("large PDFs, corrupt documents, invalid encodings and empty files fail clearly", async () => {
  await assert.rejects(
    extractDocument(file("long.pdf", pdf("Text", 21))),
    /20 pages/,
  );
  await assert.rejects(
    extractDocument(file("bad.pdf", "%PDF-no-valid-document")),
    /illisible/,
  );
  await assert.rejects(
    extractDocument(file("bad.docx", "PKbroken")),
    /Word est illisible/,
  );
  await assert.rejects(
    extractDocument(file("bad.txt", Buffer.from([255, 255]))),
    /UTF-8/,
  );
  await assert.rejects(extractDocument(file("empty.txt", " ")), /Aucun texte/);
  await assert.rejects(
    extractDocument(file("large.txt", "x".repeat(60001))),
    /60 000/,
  );
});
test("selected fields are applied without replacing unrelated facts", () => {
  const original = {
    ...blankResume(),
    name: "Existing name",
    email: "person@example.com",
  };
  const result = applySelection(
    original,
    "skills",
    "JavaScript\n\nGestion de projet",
  );
  assert.equal(result.name, original.name);
  assert.equal(result.email, original.email);
  assert.deepEqual(result.skills, ["JavaScript", "Gestion de projet"]);
  assert.deepEqual(original.skills, []);
});
test("experience fields can be imported separately; overlong selections never truncate", () => {
  const first = applySelection(blankResume(), "new-experience", "Développeur");
  const second = applySelection(first, "experiences:0:organization", "Atelier");
  assert.equal(second.experiences[0].title, "Développeur");
  assert.equal(second.experiences[0].organization, "Atelier");
  assert.throws(
    () => applySelection(second, "name", "x".repeat(201)),
    /trop long/,
  );
  assert.throws(
    () =>
      applySelection(
        second,
        "experiences:0:bullets",
        Array(13).fill("a").join("\n"),
      ),
    /trop long/,
  );
  assert.throws(() => applySelection(second, "__proto__", "x"), /Choisissez/);
});

test("DOCX text imports without an API key", async () => {
  const result = await extractDocument(
    file(
      "cv.docx",
      Buffer.from(
        "UEsDBBQAAAAIAAerRl26d6ScywAAAFMBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbJWQvVLDQAyEX+XmWiYnQ0HB2E4BtEDBC2jOsn3D/c1JCeHtkRNIQUcp7Wq/HfX7U4rmSI1DyYO9dZ3dj/37VyU2qmQe7CpSHwDYr5SQXamUVZlLSyg6tgUq+g9cCO667h58yUJZdrJl2LF/ohkPUczzSdcXSqPI1jxejBtrsFhrDB5FdTjm6Q9l90Nwenn28Boq36jBwti/av0WJjJv2OQFk8bBZ2kTTMUfkiLcZvwXr8xz8HS939JqK56YQ15SdFclYci/PeD8tvEbUEsDBBQAAAAIAAerRl1fM5VSlQAAAAcBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRD5AnTIwoKZdWLoiLhAlblPRPOSE1+3JwEARA6N///osd8PDr+JGnJcYFLSNhKHvTrTqUoPslpRFbYSswJWSDojZOPI6NzFRqJspsteljjxj0uaiZ8KdlHvkTwO2phitAh5tC+L8TPSPHadpMXSM5uoplB8nvhpV1jxTUXCPbNG+46aygH2Hmxf7F1BLAwQUAAAACAAHq0ZdbrWOkIkAAAC2AAAAEQAAAHdvcmQvZG9jdW1lbnQueG1sRY5LDsMgDESvgjhATLvoIspn0W0vQYEmSBgjQ5L29oV00c2zZka2Z5jfGMTuOHuKo7x0Ss7TcPSWzIYuFlHjmPtjlGspqQfIZnWoc0fJxZq9iFGXKnmBg9gmJuNy9nHBAFelboDaR9lOPsl+2kwN3FCmu0YfghMPvXH9NkAzG/lkOvlbhH+p6QtQSwECFAMUAAAACAAHq0ZduneknMsAAABTAQAAEwAAAAAAAAAAAAAAgAEAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUAxQAAAAIAAerRl1fM5VSlQAAAAcBAAALAAAAAAAAAAAAAACAAfwAAABfcmVscy8ucmVsc1BLAQIUAxQAAAAIAAerRl1utY6QiQAAALYAAAARAAAAAAAAAAAAAACAAboBAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAwADALkAAAByAgAAAAA=",
        "base64",
      ),
    ),
  );
  assert.match(result.text, /Camille Laurent/);
});
