# Araf — Personal Portfolio (Angular & Bootstrap)

A modern, high-contrast, fully responsive personal portfolio website engineered with **Angular 22** standalone components, **Bootstrap 5**, and custom **SCSS** featuring glowing neon gradients, glassmorphism, and smooth keyframe animations.

---

## ⚡ Tech Stack

- **Framework:** Angular 22 (Standalone Components, Signals-ready)
- **Styling:** Bootstrap 5, Bootstrap Icons, Custom Modern SCSS
- **Typography:** Outfit & Fira Code (Google Fonts)
- **Architecture:** Modular components & central `PortfolioService`

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure [Node.js](https://nodejs.org/) (v20+ or v22+) is installed.

### 2. Development Server
Run the local dev server:
```bash
npm start
# or
npx ng serve
```
Navigate to `http://localhost:4200/`. The app will automatically reload whenever you edit source files.

### 3. Production Build
Build optimized production artifacts:
```bash
npm run build
# or
npx ng build
```
Production assets are generated in `dist/portfolio/browser`.

---

## 📁 Project Architecture

```
src/
├── app/
│   ├── core/
│   │   ├── models/
│   │   │   └── portfolio.model.ts      # TypeScript interfaces (Project, Skill, SkillCategory)
│   │   └── services/
│   │       └── portfolio.service.ts    # Centralized data store (Bio, Skills, Projects, Socials)
│   ├── components/
│   │   ├── navbar/                     # Sticky glassmorphic navbar with mobile drawer
│   │   ├── hero/                       # High-impact animated gradient hero + glowing avatar
│   │   ├── about/                      # Punchy bio cards + stats counters + highlight chips
│   │   ├── skills/                     # Grouped skills matrix (Frontend, Backend, Databases, Mobile)
│   │   ├── projects/                   # 4 interactive project showcase cards with hover-lift & glows
│   │   ├── contact/                    # Floating-label contact form + social links
│   │   └── footer/                     # Sleek footer with copyright and back-to-top shortcut
│   ├── app.ts                          # Main layout orchestrator
│   ├── app.html
│   └── app.scss
├── styles.scss                         # Global design system & keyframe animations
└── index.html                          # Fonts & viewport metadata
```

---

## 🎨 How to Customize

- **Update Bio, Name, or Experience:**
  Edit `profile` object in [portfolio.service.ts](file:///home/araf/Working-ground/personal-portfolio-Angular-javaFullStack/src/app/core/services/portfolio.service.ts).
- **Add / Modify Skills:**
  Update the `skillCategories` array in [portfolio.service.ts](file:///home/araf/Working-ground/personal-portfolio-Angular-javaFullStack/src/app/core/services/portfolio.service.ts).
- **Add / Modify Projects:**
  Update the `projects` array in [portfolio.service.ts](file:///home/araf/Working-ground/personal-portfolio-Angular-javaFullStack/src/app/core/services/portfolio.service.ts).
- **Replace Images:**
  Swap URLs in `profile.avatar` and `projects[i].image` with your local assets (placed in `public/`) or hosted links.
