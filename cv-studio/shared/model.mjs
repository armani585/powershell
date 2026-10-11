import { z } from "zod";
const text = (max = 1000) => z.string().max(max);
const entry = z.object({
  title: text(200),
  organization: text(200),
  period: text(100),
  location: text(200),
  bullets: z.array(text(1000)).max(12),
});
export const resumeSchema = z.object({
  language: z.enum(["fr", "en"]),
  name: text(200),
  title: text(200),
  email: text(200),
  phone: text(100),
  website: text(300),
  location: text(200),
  profile: text(3000),
  experiences: z.array(entry).max(20),
  education: z.array(entry).max(15),
  skills: z.array(text(200)).max(40),
  languages: z.array(text(200)).max(15),
  interests: z.array(text(200)).max(15),
});
export const designSchema = z.object({
  template: z.enum(["essential", "editorial", "executive"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .refine((value) => {
      const rgb = [1, 3, 5].map((i) => {
        const n = parseInt(value.slice(i, i + 2), 16) / 255;
        return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
      });
      return (
        1.05 / (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 + 0.05) >=
        4.5
      );
    }, "Choisissez une couleur suffisamment sombre sur blanc."),
  font: z.enum(["sans", "serif"]),
  density: z.enum(["comfortable", "compact"]),
});
export const resultSchema = z.object({
  resume: resumeSchema,
  notes: z.array(text(2000)).max(20),
});
export const templateResultSchema = z.object({
  design: designSchema,
  notes: z.array(text(2000)).max(20),
});
export const defaultDesign = {
  template: "editorial",
  color: "#183e34",
  font: "sans",
  density: "comfortable",
};
export const blankResume = () => ({
  language: "fr",
  name: "",
  title: "",
  email: "",
  phone: "",
  website: "",
  location: "",
  profile: "",
  experiences: [],
  education: [],
  skills: [],
  languages: [],
  interests: [],
});
export const blankEntry = () => ({
  title: "",
  organization: "",
  period: "",
  location: "",
  bullets: [],
});
export const sampleResume = () => ({
  language: "fr",
  name: "Camille Laurent",
  title: "Cheffe de projet digital",
  email: "camille@example.com",
  phone: "",
  website: "",
  location: "Lyon",
  profile:
    "Cheffe de projet digital, je coordonne les équipes et accompagne la mise en place de services numériques. Mon approche associe écoute des besoins, organisation et suivi des livrables.",
  experiences: [
    {
      title: "Cheffe de projet digital",
      organization: "Atelier Horizon — entreprise fictive",
      period: "2022 – 2025",
      location: "Lyon",
      bullets: [
        "Coordonner les équipes de conception et de développement.",
        "Organiser les ateliers de cadrage et suivre les livrables.",
      ],
    },
    {
      title: "Chargée de communication",
      organization: "Studio Rivage — entreprise fictive",
      period: "2020 – 2022",
      location: "Lyon",
      bullets: [
        "Préparer les contenus des campagnes et le calendrier éditorial.",
      ],
    },
  ],
  education: [
    {
      title: "Master communication",
      organization: "Université — exemple fictif",
      period: "2020",
      location: "",
      bullets: [],
    },
  ],
  skills: ["Gestion de projet", "Communication", "Animation d’ateliers"],
  languages: ["Français : langue maternelle", "Anglais : professionnel"],
  interests: ["Photographie", "Randonnée"],
});
