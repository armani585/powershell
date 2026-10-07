import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  FileText,
  Download,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Check,
  ArrowRight,
  Save,
} from "lucide-react";
import { Resume, fitPage } from "../shared/resume.mjs";
import {
  blankResume,
  blankEntry,
  sampleResume,
  defaultDesign,
  resumeSchema,
  designSchema,
  resultSchema,
  templateResultSchema,
} from "../shared/model.mjs";
import { readDraft, parseBackup, DRAFT_KEY } from "./storage.mjs";
import "../shared/resume.css";
import "./style.css";
import { TextImport } from "./TextImport.jsx";
const initial = (() => {
  try {
    return readDraft(window.localStorage);
  } catch {
    return {
      draft: null,
      error: "Le stockage est inaccessible. Sauvegardez votre CV en JSON.",
    };
  }
})();
function Button({ children, icon: Icon, className = "", ...props }) {
  return (
    <button className={`button ${className}`} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}
function Field({ label, value, onChange, multiline = false, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          {...props}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
    </label>
  );
}
function EntryEditor({ kind, entries, onChange }) {
  const title = kind === "experiences" ? "Expérience" : "Formation";
  const update = (i, key, value) =>
    onChange(
      entries.map((item, index) =>
        index === i ? { ...item, [key]: value } : item,
      ),
    );
  return (
    <section className="editor-section">
      <div className="section-heading">
        <h3>{kind === "experiences" ? "Expériences" : "Formation"}</h3>
        <Button
          icon={Plus}
          onClick={() => onChange([...entries, blankEntry()])}
          disabled={entries.length >= (kind === "experiences" ? 20 : 15)}
        >
          Ajouter
        </Button>
      </div>
      {!entries.length && (
        <p className="helper">
          Ajoutez une {title.toLowerCase()} pour la faire apparaître sur votre
          CV.
        </p>
      )}
      {entries.map((item, i) => (
        <fieldset className="entry-editor" key={i}>
          <legend>
            {title} {i + 1}
          </legend>
          <Field
            label={kind === "experiences" ? "Poste" : "Diplôme"}
            value={item.title}
            onChange={(v) => update(i, "title", v)}
            maxLength={200}
          />
          <Field
            label={kind === "experiences" ? "Entreprise" : "Établissement"}
            value={item.organization}
            onChange={(v) => update(i, "organization", v)}
            maxLength={200}
          />
          <div className="field-row">
            <Field
              label="Période"
              value={item.period}
              onChange={(v) => update(i, "period", v)}
              maxLength={100}
            />
            <Field
              label="Lieu"
              value={item.location}
              onChange={(v) => update(i, "location", v)}
              maxLength={200}
            />
          </div>
          <Field
            label="Missions ou réalisations — une par ligne"
            value={item.bullets.join("\n")}
            multiline
            onChange={(v) => update(i, "bullets", v.split("\n"))}
          />
          <Button
            icon={Trash2}
            onClick={() => onChange(entries.filter((_, index) => index !== i))}
          >
            Supprimer cette {title.toLowerCase()}
          </Button>
        </fieldset>
      ))}
    </section>
  );
}
function Preview({ resume, design, onFit }) {
  const container = useRef(null);
  const paper = useRef(null);
  const [width, setWidth] = useState(650);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(1, entry.contentRect.width)),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    onFit(fitPage(paper.current.querySelector(".cv-page")));
  }, [resume, design, onFit, width]);
  const scale = Math.min(1, width / 794);
  return (
    <div className="preview-container" ref={container}>
      <div
        className="paper-frame"
        style={{ width: 794 * scale, height: 1123 * scale }}
      >
        <div
          className="paper-scale"
          ref={paper}
          style={{ transform: `scale(${scale})` }}
        >
          <Resume resume={resume} design={design} />
        </div>
      </div>
    </div>
  );
}
function Proposal({ proposal, onApply, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby="proposal-title" onCancel={onClose}>
      <div className="dialog-head">
        <h2 id="proposal-title">{proposal.title || "Relire la proposition"}</h2>
        <Button onClick={onClose}>Fermer</Button>
      </div>
      <p className="helper">
        Vérifiez les informations avant de remplacer votre CV.
      </p>
      {proposal.originalResume && <details className="source-review"><summary>Comparer avec le texte d’origine</summary>
        <p>{proposal.originalResume.profile}</p>
        {proposal.originalResume.experiences.map((entry, i) => <section key={i}><strong>{entry.title} · {entry.organization} · {entry.period}</strong><ul>{entry.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul></section>)}
      </details>}
      {proposal.pageFit && <p className={proposal.pageFit.fits ? "notice" : "notice error"}>
        {proposal.pageFit.fits ? "Vérifié : le CV tient sur une page A4, sans retirer d’expérience." : "Le CV dépasse encore une page : aucune expérience n’a été retirée. L’export reste bloqué pour éviter une coupure."}
      </p>}
      <ul className="notes">
        {proposal.notes.map((note, i) => (
          <li key={i}>{note}</li>
        ))}
      </ul>
      {proposal.resume ? (
        <div className="proposal-copy">
          <h3>
            {proposal.resume.name} · {proposal.resume.title}
          </h3>
          <p>{proposal.resume.profile}</p>
          {["experiences", "education"].map((key) => (
            <section key={key}>
              <h3>{key === "experiences" ? "Expériences" : "Formation"}</h3>
              {proposal.resume[key].map((entry, i) => (
                <div key={i}>
                  <strong>{entry.title}</strong>
                  <p>
                    {[entry.organization, entry.period, entry.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <ul>
                    {entry.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
          {["skills", "languages", "interests"].map((key) => (
            <section key={key}>
              <h3>
                {
                  {
                    skills: "Compétences",
                    languages: "Langues",
                    interests: "Centres d’intérêt",
                  }[key]
                }
              </h3>
              <p>{proposal.resume[key].join(" · ")}</p>
            </section>
          ))}
          <p>
            Coordonnées :{" "}
            {[
              proposal.resume.email,
              proposal.resume.phone,
              proposal.resume.website,
              proposal.resume.location,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      ) : (
        <p>
          Mise en page : {proposal.design.template} · Couleur :{" "}
          {proposal.design.color} · Police : {proposal.design.font} · Densité :{" "}
          {proposal.design.density}
        </p>
      )}
      <div className="dialog-actions">
        <Button onClick={onClose}>Annuler</Button>
        <Button className="primary" icon={Check} onClick={onApply}>
          Appliquer la proposition
        </Button>
      </div>
    </dialog>
  );
}
function App() {
  const [resume, setResume] = useState(initial.draft?.resume || blankResume());
  const [design, setDesign] = useState(initial.draft?.design || defaultDesign);
  const [tab, setTab] = useState("content");
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(initial.error || "");
  const [saveError, setSaveError] = useState(initial.error || "");
  const [storageBlocked, setStorageBlocked] = useState(!!initial.error);
  const [saved, setSaved] = useState(false);
  const [job, setJob] = useState("");
  const [proposal, setProposal] = useState(null);
  const [importMode, setImportMode] = useState("local");
  const [extracted, setExtracted] = useState(null);
  const [fit, setFit] = useState({ fits: true, fontSize: 14 });
  const [demo, setDemo] = useState(
    initial.draft?.resume.experiences.some((e) =>
      e.organization.includes("fictive"),
    ) || false,
  );
  const backup = useRef(null);
  const contentFile = useRef(null);
  const templateFile = useRef(null);
  const importModeChosen = useRef(false);
  const localAI = config?.aiProvider === "ollama";
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/config", {
          signal: controller.signal,
        });
        if (!response.ok) throw Error();
        const next = await response.json();
        setConfig(next);
        if (
          next.aiProvider === "ollama" &&
          next.aiConfigured &&
          !importModeChosen.current
        ) {
          setImportMode("ai");
          importModeChosen.current = true;
        }
      } catch (error) {
        if (error.name !== "AbortError")
          setNotice(
            "Le serveur ne répond pas. Rechargez la page après son démarrage.",
          );
      }
    }
    void refresh();
    const interval = setInterval(refresh, 15000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (storageBlocked) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ resume, design }));
      setSaved(true);
    } catch {
      setStorageBlocked(true);
      setSaveError(
        "Le navigateur ne peut pas conserver le brouillon. Sauvegardez un fichier JSON.",
      );
    }
  }, [resume, design, storageBlocked]);
  const update = (key, value) => {
    setResume((r) => ({ ...r, [key]: value }));
    setDemo(false);
  };
  const download = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  async function request(endpoint, data, isFile = false) {
    if (!config) throw Error("Le serveur n’est pas prêt. Rechargez la page.");
    const response = await fetch("/api/" + endpoint, {
      method: "POST",
      headers: {
        "x-cv-token": config.token,
        ...(!isFile ? { "Content-Type": "application/json" } : {}),
      },
      body: isFile ? data : JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Le serveur ne répond pas. Réessayez." }));
      throw Error(error.error);
    }
    return response;
  }
  async function run(label, action) {
    setBusy(label);
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(
        error.name === "ZodError"
          ? "Le CV contient trop de données ou une valeur invalide. Vérifiez les champs et le nombre de lignes."
          : error.message || "La demande a échoué. Réessayez.",
      );
    } finally {
      setBusy("");
    }
  }
  const validated = () => ({
    resume: resumeSchema.parse(resume),
    design: designSchema.parse(design),
  });
  const pdf = () =>
    run("Création du PDF", async () => {
      const r = await request("pdf", validated());
      download(await r.blob(), "CV.pdf");
      setNotice("Le PDF est prêt.");
    });
  const hasContent = !!(resume.profile || resume.title || resume.experiences.length || resume.education.length || resume.skills.length);
  const actionTitle = action => ({ improve: "Optimisation RH", condense: "Ajustement sur une page", translate: resume.language === "fr" ? "Traduction en anglais" : "Traduction en français" })[action];
  const ai = (action) =>
    run(actionTitle(action), async () => {
      const result = await request("rewrite", {
        resume: resumeSchema.parse(resume),
        action,
        job,
      });
      setProposal({ ...resultSchema.parse(await result.json()), title: actionTitle(action), originalResume: resume });
    });
  const onePage = () => run("Ajustement sur une page", async () => {
    const original = validated();
    const measure = async (r, d) => {
      const response = await request("fit", { resume: r, design: d });
      return response.json();
    };
    let measured = await measure(original.resume, original.design);
    let next = { resume: original.resume, notes: ["Toutes les expériences, formations et informations sont conservées. Seule la mise en page a été ajustée."] };
    if (!measured.fits) {
      if (!config?.aiConfigured) throw Error("La mise en page compacte ne suffit pas. L’assistant doit être disponible pour proposer une rédaction plus courte ; votre CV est conservé.");
      setBusy("Raccourcissement du texte, en conservant chaque expérience");
      const response = await request("rewrite", { resume: original.resume, action: "condense", job });
      next = resultSchema.parse(await response.json());
      measured = await measure(next.resume, measured.design);
      next.notes.unshift("Chaque expérience et formation est conservée. Relisez les descriptions raccourcies avant application.");
    }
    setProposal({ ...next, design: designSchema.parse(measured.design), pageFit: measured, title: "Proposition sur une page", originalResume: original.resume });
  });
  const importFile = (file, kind) => {
    if (!file) return;
    run("Lecture du document", async () => {
      if (file.size > 8 * 1024 * 1024)
        throw Error(
          "Le fichier dépasse 8 Mo. Choisissez un fichier plus petit.",
        );
      const data = new FormData();
      data.append("file", file);
      data.append("kind", kind);
      if (kind === "content" && importMode === "local") {
        const response = await request("import-text", data, true);
        setExtracted(await response.json());
        return;
      }
      const r = await request("import", data, true);
      setProposal(
        (kind === "template" ? templateResultSchema : resultSchema).parse(
          await r.json(),
        ),
      );
    });
  };
  const importBackup = (file) => {
    if (!file) return;
    run("Lecture de la sauvegarde", async () => {
      if (file.size > 300000)
        throw Error("La sauvegarde JSON est trop volumineuse.");
      let data;
      try {
        data = parseBackup(await file.text());
      } catch {
        throw Error(
          "Ce fichier JSON n’est pas une sauvegarde CV Studio valide. Votre CV est conservé.",
        );
      }
      setResume(data.resume);
      setDesign(data.design);
      setDemo(false);
      setNotice("La sauvegarde a été restaurée.");
    });
  };
  const reset = () => {
    if (
      !confirm(
        "Effacer le brouillon et repartir d’un CV vide ? Pensez à sauvegarder votre CV en JSON.",
      )
    )
      return;
    setResume(blankResume());
    setDesign(defaultDesign);
    setDemo(false);
    try {
      localStorage.removeItem(DRAFT_KEY);
      setStorageBlocked(false);
      setSaveError("");
    } catch {
      setSaveError(
        "Le stockage reste inaccessible. Utilisez la sauvegarde JSON.",
      );
    }
    setNotice("Le CV a été réinitialisé.");
  };
  return (
    <>
      <header className="app-header">
        <a className="brand" href="#">
          <span className="brand-icon">
            <FileText size={23} />
          </span>
          <span>
            CV <strong>Studio</strong>
            <small>Votre prochain chapitre</small>
          </span>
        </a>
        <div className="header-actions">
          <Button
            icon={Save}
            disabled={!!busy}
            onClick={() =>
              run("Sauvegarde", async () => {
                download(
                  new Blob([JSON.stringify(validated(), null, 2)], {
                    type: "application/json",
                  }),
                  "CV-Studio.json",
                );
                setNotice("La sauvegarde JSON est prête.");
              })
            }
          >
            Sauvegarder
          </Button>
          <Button
            icon={Upload}
            disabled={!!busy}
            onClick={() => backup.current.click()}
          >
            Restaurer
          </Button>
          <Button
            icon={Download}
            className="primary"
            disabled={!!busy || !config || !fit.fits}
            onClick={pdf}
          >
            Exporter en PDF
          </Button>
        </div>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">L’atelier de votre candidature</p>
            <h1>Faites place à votre parcours.</h1>
            <p>
              Un CV clair, une page, votre histoire. Écrivez, ajustez et
              préparez votre prochaine étape.
            </p>
          </div>
          <span className="intro-detail">
            Format A4
            <br />
            Texte sélectionnable
          </span>
        </section>
        {(notice || saveError || busy) && (
          <div className={`notice ${saveError ? "error" : ""}`} role="status">
            {busy ? busy + "…" : notice}
            {saveError && <p>{saveError}</p>}
          </div>
        )}
        <section className="cv-tools" aria-label="Améliorer votre CV">
          <div><h2>Valorisez votre parcours</h2><p className="helper">Chaque expérience est conservée. Relisez et appliquez les propositions à votre rythme.</p></div>
          <div className="end-actions">
            <Button icon={Sparkles} disabled={!!busy || !hasContent || !config?.aiConfigured} onClick={() => ai("improve")}>Optimiser la rédaction RH</Button>
            <Button icon={FileText} disabled={!!busy || !hasContent || !config} onClick={onePage}>Tenir sur une page</Button>
            <Button disabled={!!busy || !hasContent || !config?.aiConfigured} onClick={() => ai("translate")}>{resume.language === "fr" ? "Traduire en anglais" : "Traduire en français"}</Button>
          </div>
          <details><summary>Adapter la rédaction à un poste (facultatif)</summary><Field label="Poste ou offre à cibler" value={job} onChange={setJob} multiline maxLength={10000} /></details>
          {!hasContent && <p className="helper">Importez et appliquez votre CV, ou renseignez votre parcours pour activer ces actions.</p>}
          {hasContent && !config?.aiConfigured && <p className="helper">{config?.aiMessage || "Connexion à l’assistant…"}</p>}
        </section>
        <div className="workspace">
          <section className="editor-panel" aria-label="Éditeur du CV">
            <div className="tablist" role="tablist" aria-label="Réglages du CV">
              {[
                ["content", "Contenu"],
                ["design", "Mise en page"],
                ["ai", "Assistant IA"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  id={"tab-" + id}
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls={"panel-" + id}
                  tabIndex={tab === id ? 0 : -1}
                  onKeyDown={(e) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                    ) {
                      e.preventDefault();
                      const ids = ["content", "design", "ai"];
                      const next =
                        e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? 2
                            : (ids.indexOf(tab) +
                                (e.key === "ArrowRight" ? 1 : 2)) %
                              3;
                      setTab(ids[next]);
                      document.getElementById("tab-" + ids[next]).focus();
                    }
                  }}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="editor-body"
              role="tabpanel"
              id={"panel-" + tab}
              aria-labelledby={"tab-" + tab}
            >
              {tab === "content" && (
                <>
                  <div className="section-heading">
                    <h2>Votre parcours</h2>
                    <Button
                      icon={Upload}
                      disabled={
                        !!busy ||
                        !config ||
                        (importMode === "ai" && !config.aiConfigured)
                      }
                      onClick={() => contentFile.current.click()}
                    >
                      Importer un CV
                    </Button>
                  </div>
                  <p className="helper">
                    Complétez ce qui vous ressemble. Les champs vides
                    n’apparaissent pas sur le CV.
                  </p>
                  <label className="field">
                    <span>Méthode d’import</span>
                    <select
                      value={importMode}
                      onChange={(e) => {
                        importModeChosen.current = true;
                        setImportMode(e.target.value);
                      }}
                    >
                      <option value="local">
                        Sans IA — aucun crédit OpenAI
                      </option>
                      <option value="ai" disabled={!config?.aiConfigured}>
                        {localAI
                          ? "Avec IA — Ollama, sans crédits OpenAI"
                          : "Avec IA — utilise les crédits API OpenAI"}
                      </option>
                    </select>
                  </label>
                  <p className="helper">
                    {importMode === "local"
                      ? "PDF avec texte sélectionnable, DOCX ou TXT : récupérez le texte, puis répartissez-le dans les champs. Aucun envoi à OpenAI. Les images et scans nécessitent un OCR."
                      : localAI
                        ? "Ollama analyse et structure le texte de votre CV sur le serveur CV Studio. Aucun envoi à OpenAI. Relisez la proposition ; le calcul peut prendre plusieurs minutes."
                        : "Le document sera envoyé à OpenAI pour proposer un CV structuré. Une clé API et des crédits sont nécessaires. Vous pourrez relire avant application."}
                  </p>
                  {localAI && (
                    <p className="ai-state" role="status">
                      {config.aiMessage}
                    </p>
                  )}
                  <section className="editor-section">
                    <h3>Informations personnelles</h3>
                    <Field
                      label="Nom et prénom"
                      value={resume.name}
                      onChange={(v) => update("name", v)}
                      maxLength={200}
                      autoComplete="name"
                    />
                    <Field
                      label="Titre du CV"
                      value={resume.title}
                      onChange={(v) => update("title", v)}
                      placeholder="Ex. Cheffe de projet digital"
                      maxLength={200}
                    />
                    <div className="field-row">
                      <Field
                        label="E-mail"
                        value={resume.email}
                        onChange={(v) => update("email", v)}
                        type="email"
                        autoComplete="email"
                        maxLength={200}
                      />
                      <Field
                        label="Téléphone"
                        value={resume.phone}
                        onChange={(v) => update("phone", v)}
                        type="tel"
                        autoComplete="tel"
                        maxLength={100}
                      />
                    </div>
                    <Field
                      label="Ville ou région"
                      value={resume.location}
                      onChange={(v) => update("location", v)}
                      maxLength={200}
                    />
                    <Field
                      label="Site ou profil professionnel"
                      value={resume.website}
                      onChange={(v) => update("website", v)}
                      maxLength={300}
                    />
                    <label className="field">
                      <span>Langue du CV</span>
                      <select
                        value={resume.language}
                        onChange={(e) => update("language", e.target.value)}
                      >
                        <option value="fr">Français</option>
                        <option value="en">Anglais</option>
                      </select>
                    </label>
                  </section>
                  <section className="editor-section">
                    <h3>Profil</h3>
                    <Field
                      label="Votre présentation en quelques phrases"
                      value={resume.profile}
                      onChange={(v) => update("profile", v)}
                      multiline
                      maxLength={3000}
                    />
                  </section>
                  <EntryEditor
                    kind="experiences"
                    entries={resume.experiences}
                    onChange={(v) => update("experiences", v)}
                  />
                  <EntryEditor
                    kind="education"
                    entries={resume.education}
                    onChange={(v) => update("education", v)}
                  />
                  {[
                    ["skills", "Compétences"],
                    ["languages", "Langues et niveaux"],
                    ["interests", "Centres d’intérêt"],
                  ].map(([key, label]) => (
                    <section className="editor-section" key={key}>
                      <Field
                        label={label + " — une par ligne"}
                        value={resume[key].join("\n")}
                        onChange={(v) => update(key, v.split("\n"))}
                        multiline
                      />
                    </section>
                  ))}
                  <div className="end-actions">
                    <Button
                      onClick={() => {
                        if (
                          confirm("Remplacer le CV par un exemple fictif ?")
                        ) {
                          setResume(sampleResume());
                          setDemo(true);
                        }
                      }}
                    >
                      Charger un exemple fictif
                    </Button>
                    <Button onClick={reset}>Repartir de zéro</Button>
                  </div>
                </>
              )}
              {tab === "design" && (
                <>
                  <h2>Une mise en page à votre image</h2>
                  <p className="helper">
                    Les trois styles conservent un texte sélectionnable et un
                    format A4.
                  </p>
                  <div className="template-options">
                    {[
                      ["essential", "Essentiel", "Une colonne, droit au but."],
                      [
                        "editorial",
                        "Éditorial",
                        "Les compétences dans une colonne latérale.",
                      ],
                      [
                        "executive",
                        "Classique",
                        "Un en-tête centré et une lecture posée.",
                      ],
                    ].map(([value, label, description]) => (
                      <button
                        key={value}
                        className={
                          design.template === value
                            ? "template selected"
                            : "template"
                        }
                        aria-pressed={design.template === value}
                        onClick={() =>
                          setDesign({ ...design, template: value })
                        }
                      >
                        <span
                          className={"template-mark " + value}
                          aria-hidden="true"
                        >
                          <i />
                          <i />
                          <i />
                        </span>
                        <span>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </span>
                        {design.template === value && (
                          <Check size={18} aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    <span>Couleur des titres</span>
                    <select
                      value={design.color}
                      onChange={(e) =>
                        setDesign({ ...design, color: e.target.value })
                      }
                    >
                      {[
                        ["#183e34", "Vert forêt"],
                        ["#253b60", "Bleu nuit"],
                        ["#713d35", "Terre cuite"],
                        ["#383438", "Graphite"],
                        ["#593f70", "Prune"],
                        ...(![
                          "#183e34",
                          "#253b60",
                          "#713d35",
                          "#383438",
                          "#593f70",
                        ].includes(design.color)
                          ? [[design.color, "Couleur du modèle importé"]]
                          : []),
                      ].map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Police</span>
                    <select
                      value={design.font}
                      onChange={(e) =>
                        setDesign({ ...design, font: e.target.value })
                      }
                    >
                      <option value="sans">Sans empattement — moderne</option>
                      <option value="serif">
                        Avec empattement — classique
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Espacement</span>
                    <select
                      value={design.density}
                      onChange={(e) =>
                        setDesign({ ...design, density: e.target.value })
                      }
                    >
                      <option value="comfortable">Aéré</option>
                      <option value="compact">Compact</option>
                    </select>
                  </label>
                  <section className="editor-section">
                    <h3>Partir d’un modèle</h3>
                    <p className="helper">
                      Importez un PDF ou une image. L’IA adapte le style à l’une
                      de ces mises en page, sans copier le contenu du document.
                    </p>
                    <Button
                      icon={Upload}
                      disabled={
                        !!busy ||
                        !config?.aiConfigured ||
                        config?.visionSupported === false
                      }
                      onClick={() => templateFile.current.click()}
                    >
                      Importer un modèle
                    </Button>
                    {(!config?.aiConfigured ||
                      config?.visionSupported === false) && (
                      <p className="helper">
                        {localAI
                          ? "L’import visuel n’est pas disponible avec ce modèle Ollama. Choisissez une mise en page ci-dessus, ou utilisez OpenAI pour analyser un modèle visuel."
                          : "Configurez une clé OpenAI pour activer cet import."}
                      </p>
                    )}
                  </section>
                </>
              )}
              {tab === "ai" && (
                <>
                  <span className="assistant-icon">
                    <Sparkles size={24} />
                  </span>
                  <h2>Un regard sur vos mots</h2>
                  <p className="helper">
                    L’assistant propose une nouvelle formulation. Relisez chaque
                    proposition : une extraction ou une reformulation peut
                    contenir des erreurs.
                  </p>
                  <p className="ai-state">
                    {!config
                      ? "Connexion au serveur…"
                      : config.aiMessage ||
                        (config.aiConfigured
                          ? "Assistant disponible"
                          : "Clé OpenAI à configurer dans les secrets Codespaces ou .env.local.")}
                  </p>
                  <Field
                    label="Offre ou poste visé (facultatif)"
                    value={job}
                    onChange={setJob}
                    multiline
                    maxLength={10000}
                  />
                  <div className="ai-actions">
                    {[
                      [
                        "improve",
                        "Optimiser la rédaction RH",
                        "Valoriser les missions réelles, sans inventer de résultats.",
                      ],
                      [
                        "condense",
                        "Tenir sur une page",
                        "Raccourcir la prose en conservant les faits.",
                      ],
                      [
                        "translate",
                        resume.language === "fr"
                          ? "Traduire en anglais"
                          : "Traduire en français",
                        "Conserver les noms, les coordonnées et les niveaux.",
                      ],
                    ].map(([action, label, description]) => (
                      <button
                        key={action}
                        disabled={!!busy || !hasContent || !config || (action !== "condense" && !config.aiConfigured)}
                        onClick={() => action === "condense" ? onePage() : ai(action)}
                      >
                        <span>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ))}
                  </div>
                  <p className="helper">
                    {localAI
                      ? "Ces actions utilisent Ollama sur le serveur CV Studio, sans envoi à OpenAI ni crédits API. Elles utilisent les ressources du serveur et peuvent prendre plusieurs minutes. Relisez les propositions du modèle."
                      : "Ces actions envoient le CV et l’offre à OpenAI. Les quotas et la facturation de votre projet s’appliquent."}
                  </p>
                </>
              )}
            </div>
          </section>
          <section className="preview-panel" aria-label="Votre CV">
            <div className="preview-heading">
              <div>
                <p className="eyebrow">Votre document</p>
                <h2>Aperçu en direct</h2>
              </div>
              <span className={fit.fits ? "fit-state" : "fit-state overflow"}>
                {fit.fits ? "1 page A4" : "Contenu trop long"}
              </span>
            </div>
            {demo && (
              <p className="demo-note">
                Démonstration : Camille Laurent et son parcours sont fictifs.
              </p>
            )}
            {!fit.fits && (
              <p className="notice error">
                Le contenu dépasse une page. Choisissez l’espacement compact,
                condensez ou retirez du contenu avant l’export PDF.
              </p>
            )}
            <Preview resume={resume} design={design} onFit={setFit} />
            <p className="preview-note">
              Le texte s’ajuste jusqu’à 11,5 px. L’export est bloqué si le
              contenu dépasse encore une page.
            </p>
          </section>
        </div>
        <footer>
          <span>
            {storageBlocked
              ? "Brouillon en mémoire uniquement"
              : saved
                ? "Brouillon enregistré dans ce navigateur"
                : "Enregistrement…"}
          </span>
          <span>Sans compte · Sauvegarde JSON pour changer d’appareil</span>
        </footer>
      </main>
      <input
        ref={backup}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          importBackup(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={contentFile}
        type="file"
        accept={
          importMode === "local" || localAI
            ? ".pdf,.docx,.txt"
            : ".pdf,.docx,.txt,.png,.jpg,.jpeg"
        }
        hidden
        onChange={(e) => {
          importFile(e.target.files[0], "content");
          e.target.value = "";
        }}
      />
      <input
        ref={templateFile}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        hidden
        onChange={(e) => {
          importFile(e.target.files[0], "template");
          e.target.value = "";
        }}
      />
      {extracted && (
        <TextImport
          document={extracted}
          resume={resume}
          onApply={(next) => {
            setResume(next);
            setDemo(false);
          }}
          onClose={() => setExtracted(null)}
          onDownload={(text) =>
            download(
              new Blob([text], { type: "text/plain;charset=utf-8" }),
              "CV-texte.txt",
            )
          }
        />
      )}
      {proposal && (
        <Proposal
          proposal={proposal}
          onClose={() => setProposal(null)}
          onApply={() => {
            if (proposal.resume) {
              setResume(proposal.resume);
              setDemo(false);
            } if (proposal.design) setDesign(proposal.design);
            setProposal(null);
            setNotice("La proposition a été appliquée.");
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
