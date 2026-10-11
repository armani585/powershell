import React from "react";
const h = React.createElement;
const labels = {
  fr: {
    profile: "Profil",
    experiences: "Expérience",
    education: "Formation",
    skills: "Compétences",
    languages: "Langues",
    interests: "Centres d’intérêt",
  },
  en: {
    profile: "Profile",
    experiences: "Experience",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
  },
};
export function Resume({ resume: r, design: d, id = "resume" }) {
  const l = labels[r.language];
  const heading = (key) => h("h2", null, l[key]);
  const section = (key, children) =>
    h("section", { key, className: "cv-section" }, heading(key), children);
  const entries = (key) =>
    r[key].length
      ? section(
          key,
          r[key].map((e, i) =>
            h(
              "div",
              { className: "cv-entry", key: i },
              h(
                "div",
                { className: "cv-entry-heading" },
                h("h3", null, e.title),
                e.period && h("span", null, e.period),
              ),
              h(
                "p",
                { className: "cv-organization" },
                [e.organization, e.location].filter(Boolean).join(" · "),
              ),
              e.bullets.length > 0 &&
                h(
                  "ul",
                  null,
                  e.bullets.map((b, j) => h("li", { key: j }, b)),
                ),
            ),
          ),
        )
      : null;
  const list = (key) =>
    r[key].length
      ? section(
          key,
          h(
            "ul",
            { className: "cv-list" },
            r[key].map((s, i) => h("li", { key: i }, s)),
          ),
        )
      : null;
  const contact = h(
    "div",
    { className: "cv-contact" },
    [r.location, r.email, r.phone, r.website]
      .filter(Boolean)
      .map((value, i) => h("span", { key: i }, value)),
  );
  const header = h(
    "header",
    { className: "cv-heading" },
    h("h1", null, r.name || (r.language === "fr" ? "Votre nom" : "Your name")),
    r.title && h("p", { className: "cv-title" }, r.title),
    contact,
  );
  const main = h(
    "div",
    { className: "cv-main" },
    r.profile && section("profile", h("p", null, r.profile)),
    entries("experiences"),
    entries("education"),
  );
  const aside = h(
    "aside",
    { className: "cv-aside" },
    list("skills"),
    list("languages"),
    list("interests"),
  );
  return h(
    "article",
    {
      id,
      className: `cv-page cv-${d.template} cv-${d.font} cv-${d.density}`,
      style: { "--cv-accent": d.color },
      "aria-label": r.language === "fr" ? "Aperçu du CV" : "Resume preview",
    },
    header,
    h("div", { className: "cv-layout" }, main, aside),
  );
}
// Self-contained so Playwright can serialize this function for PDF fitting.
export function fitPage(element) {
  if (!element) return { fits: false, fontSize: 12, overflowPx: 0 };
  const content = element.querySelector(".cv-layout");
  const overflow = () => {
    const rect=element.getBoundingClientRect();
    const scale=rect.height/element.offsetHeight || 1;
    const bottom=rect.bottom-parseFloat(getComputedStyle(element).paddingBottom)*scale;
    return Math.max(0,element.scrollHeight-element.clientHeight,
      element.scrollWidth-element.clientWidth,
      content ? (content.getBoundingClientRect().bottom-bottom)/scale : 0);
  };
  let size=14;
  element.style.setProperty("--cv-font-size",size+"px");
  while(overflow()>1 && size>12) {
    size=Math.max(12,size-0.25);
    element.style.setProperty("--cv-font-size",size+"px");
  }
  const overflowPx=Math.ceil(overflow());
  return {fits:overflowPx<=1,fontSize:size,overflowPx};
}
