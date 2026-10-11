import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  resumeSchema,
  designSchema,
  defaultDesign,
  blankResume,
  sampleResume,
} from "../shared/model.mjs";
import { Resume } from "../shared/resume.mjs";
import { readDraft, parseBackup } from "../src/storage.mjs";
test("blank and sample resumes obey the import contract", () => {
  resumeSchema.parse(blankResume());
  resumeSchema.parse(sampleResume());
});
test("schema rejects excessive data, invalid CSS colors and unsafe design values", () => {
  assert.throws(() =>
    resumeSchema.parse({ ...blankResume(), name: "x".repeat(201) }),
  );
  for (const color of ["#ffffff", "red", "url(https://evil.example)"])
    assert.throws(() => designSchema.parse({ ...defaultDesign, color }));
  assert.throws(() =>
    designSchema.parse({ ...defaultDesign, template: "custom" }),
  );
});
test("all templates escape untrusted imported content", () => {
  for (const template of ["essential", "editorial", "executive"]) {
    const html = renderToStaticMarkup(
      React.createElement(Resume, {
        resume: {
          ...sampleResume(),
          name: "<script>alert(1)</script>",
          profile: "<img src=x onerror=alert(1)>",
        },
        design: { ...defaultDesign, template },
      }),
    );
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<img"));
    assert.ok(html.includes("&lt;script&gt;"));
  }
});
test("restore validates both data and design", () => {
  const data = { resume: sampleResume(), design: defaultDesign };
  assert.deepEqual(parseBackup(JSON.stringify(data)), data);
  assert.throws(() => parseBackup('{"resume":{}}'));
});
test("corrupt and inaccessible drafts are preserved as an error instead of overwritten", () => {
  for (const storage of [
    { getItem: () => "{oops" },
    {
      getItem: () => {
        throw Error("blocked");
      },
    },
  ]) {
    const result = readDraft(storage);
    assert.equal(result.draft, null);
    assert.ok(result.error);
  }
  assert.equal(readDraft({ getItem: () => null }).error, null);
});
