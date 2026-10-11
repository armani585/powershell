import React, { useEffect, useRef, useState } from "react";
import { applySelection, textTargets } from "./import-selection.mjs";
export function TextImport({ document, resume, onApply, onDownload, onClose }) {
  const dialog = useRef(null);
  const [selection, setSelection] = useState("");
  const [target, setTarget] = useState("name");
  const [message, setMessage] = useState("");
  useEffect(() => {
    dialog.current.showModal();
    return () => dialog.current?.close();
  }, []);
  function apply() {
    try {
      onApply(applySelection(resume, target, selection));
      setMessage(
        "Le champ a été mis à jour. Vous pouvez sélectionner un autre passage.",
      );
    } catch (error) {
      setMessage(error.message);
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-labelledby="text-import-title"
      onCancel={onClose}
      className="text-import-dialog"
    >
      <div className="dialog-head">
        <h2 id="text-import-title">Importer sans IA</h2>
        <button className="button" onClick={onClose}>
          Fermer
        </button>
      </div>
      <p className="helper">
        Le texte a été extrait dans CV Studio, sans envoi à OpenAI. Sélectionnez
        un passage, choisissez son champ, puis appliquez-le. Chaque application
        remplace uniquement le champ choisi.
      </p>
      {document.notes.length > 0 && (
        <ul className="notes">
          {document.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
      <label className="field">
        <span>Texte extrait — sélectionnez un passage</span>
        <textarea
          className="extracted-text"
          value={document.text}
          readOnly
          rows={12}
          onSelect={(e) =>
            setSelection(
              e.currentTarget.value.slice(
                e.currentTarget.selectionStart,
                e.currentTarget.selectionEnd,
              ),
            )
          }
        />
      </label>
      <label className="field">
        <span>Champ à compléter</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {textTargets.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
          <option value="new-experience">
            Ajouter une expérience avec ce titre
          </option>
          <option value="new-education">
            Ajouter une formation avec ce titre
          </option>
          {["experiences", "education"].map((kind) =>
            resume[kind].map((entry, i) => (
              <optgroup
                key={kind + i}
                label={`${kind === "experiences" ? "Expérience" : "Formation"} ${i + 1} — ${entry.title || "sans titre"}`}
              >
                {[
                  ["title", "Titre"],
                  ["organization", "Organisation"],
                  ["period", "Période"],
                  ["location", "Lieu"],
                  ["bullets", "Détails (une ligne par puce)"],
                ].map(([key, label]) => (
                  <option key={key} value={`${kind}:${i}:${key}`}>
                    {label}
                  </option>
                ))}
              </optgroup>
            )),
          )}
        </select>
      </label>
      <p className="helper">
        {selection.trim()
          ? `${selection.trim().length} caractères sélectionnés.`
          : "Aucun passage sélectionné. Le CV reste inchangé tant que vous n’appliquez pas une sélection."}
      </p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="dialog-actions">
        <button className="button" onClick={() => onDownload(document.text)}>
          Télécharger le texte
        </button>
        <button
          className="button primary"
          disabled={!selection.trim()}
          onClick={apply}
        >
          Appliquer la sélection
        </button>
        <button className="button" onClick={onClose}>
          Terminer
        </button>
      </div>
    </dialog>
  );
}
