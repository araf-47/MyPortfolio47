import { Injectable } from '@angular/core';
import { Project, SkillCategory, SocialLink } from '../models/portfolio.model';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  readonly profile = {
    name: 'Araf A Khoda',
    title: 'Full-Stack Software Developer',
    headline: 'Crafting High-Performance Systems & Mesmerizing Digital Experiences',
    bioP1: `Hello! I'm Araf, a passionate Full-Stack Software Developer dedicated to bridging robust architectural engineering with hyper-polished, responsive user interfaces.`,
    bioP2: `I'm currently deepening my expertise across the Java & Spring ecosystem on the backend, alongside Angular on the frontend — building reliable RESTful services and responsive web applications while learning how to design systems that scale.`,
    bioP3: `From crafting RESTful APIs and reactive Angular interfaces to exploring Flutter & Android for cross-platform apps, I enjoy turning ideas into working software and continuously improving my craft through hands-on projects.`,
    avatar: 'images/araf-profile.jpg',
    location: 'Available Globally / Remote & On-Site',
    experienceYears: 'Fresher',
    completedProjects: '4+',
    satisfactionRate: '100%',
  };

  readonly currentlyLearning = [
    { name: 'Spring Boot Microservices & Security', icon: 'bi-diagram-3-fill', progress: 70 },
    { name: 'Angular Signals & Reactive Patterns', icon: 'bi-lightning-charge-fill', progress: 65 },
    { name: 'Docker & CI/CD Pipelines', icon: 'bi-box-seam-fill', progress: 40 },
    { name: 'Data Structures & Algorithms', icon: 'bi-cpu-fill', progress: 55 },
  ];

  readonly socialLinks: SocialLink[] = [
    {
      platform: 'GitHub',
      url: 'https://github.com',
      icon: 'bi-github',
      label: 'github.com/araf',
    },
    {
      platform: 'LinkedIn',
      url: 'https://linkedin.com',
      icon: 'bi-linkedin',
      label: 'linkedin.com/in/araf',
    },
    {
      platform: 'Twitter / X',
      url: 'https://twitter.com',
      icon: 'bi-twitter-x',
      label: '@araf_dev',
    },
    {
      platform: 'Email',
      url: 'mailto:araf.developer@example.com',
      icon: 'bi-envelope-at-fill',
      label: 'araf.developer@example.com',
    },
  ];

  readonly skillCategories: SkillCategory[] = [
    {
      title: 'Frontend Development',
      category: 'Frontend',
      icon: 'bi-browser-chrome',
      accentGradient: 'linear-gradient(135deg, #FF007A 0%, #7928CA 100%)',
      skills: [
        { name: 'HTML', icon: 'bi-filetype-html', level: 'Semantic & A11y', color: '#E34F26' },
        { name: 'CSS', icon: 'bi-filetype-css', level: 'SCSS & Animations', color: '#1572B6' },
        { name: 'JavaScript', icon: 'bi-filetype-js', level: 'ES6+ & Async Patterns', color: '#F7DF1E' },
        { name: 'Bootstrap', icon: 'bi-bootstrap-fill', level: 'Responsive Grids & UI', color: '#7952B3' },
        { name: 'Angular', icon: 'bi-triangle-fill', level: 'Signals & Standalone Architecture', color: '#DD0031' },
      ],
    },
    {
      title: 'Backend Engineering',
      category: 'Backend',
      icon: 'bi-hdd-network-fill',
      accentGradient: 'linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)',
      skills: [
        { name: 'Java', icon: 'bi-cup-hot-fill', level: 'Modern Java (17/21/25)', color: '#F89820' },
        { name: 'Spring Boot', icon: 'bi-shield-shaded', level: 'REST APIs & Security', color: '#6DB33F' },
      ],
    },
    {
      title: 'Databases & Storage',
      category: 'Databases',
      icon: 'bi-database-fill-gear',
      accentGradient: 'linear-gradient(135deg, #00FF87 0%, #60EFFF 100%)',
      skills: [
        { name: 'SQLite', icon: 'bi-database', level: 'Embedded & Local Storage', color: '#003B57' },
        { name: 'PostgreSQL', icon: 'bi-database-fill-check', level: 'Advanced SQL & Indexing', color: '#336791' },
        { name: 'Oracle', icon: 'bi-database-fill-up', level: 'Enterprise Relational DB', color: '#F80000' },
      ],
    },
    {
      title: 'Mobile Application Development',
      category: 'Mobile',
      icon: 'bi-phone-flip',
      accentGradient: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)',
      skills: [
        { name: 'Android', icon: 'bi-android2', level: 'Native Architecture & Jetpack', color: '#3DDC84' },
        { name: 'Flutter', icon: 'bi-phone', level: 'Cross-Platform UI & Dart', color: '#02569B' },
      ],
    },
  ];

  readonly projects: Project[] = [
    {
      id: 'enterprise-cloud-portal',
      title: 'Enterprise Cloud Portal',
      subtitle: 'Microservices Gateway & Mission Control',
      description:
        'A resilient multi-tenant management portal built with high-throughput Spring Boot REST microservices and an Angular reactive dashboard.',
      fullDescription:
        'Engineered an enterprise administration console managing cluster workloads and real-time telemetry. Built with Spring Boot for low-latency API contracts, Spring Security with JWT/OAuth2, and Angular Signals for reactive real-time telemetry metrics.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
      tags: ['Angular', 'Spring Boot', 'Java', 'PostgreSQL', 'Docker'],
      gradient: 'linear-gradient(135deg, #FF0844 0%, #FFB199 100%)',
      featured: true,
      demoUrl: '#',
      githubUrl: '#',
    },
    {
      id: 'fintech-analytics-engine',
      title: 'Fintech Analytics Engine',
      subtitle: 'Real-Time Financial Intelligence',
      description:
        'Scalable transaction aggregator processing analytical metrics with Oracle and PostgreSQL databases, presented through interactive charts.',
      fullDescription:
        'Designed high-volume transaction processing pipelines backed by Oracle relational engines and PostgreSQL reporting replicas. Features interactive charts, audit logs, and automated compliance reporting.',
      image: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=900&q=80',
      tags: ['Java', 'Spring Boot', 'Oracle', 'Bootstrap', 'Angular'],
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      featured: true,
      demoUrl: '#',
      githubUrl: '#',
    },
    {
      id: 'flutter-cross-platform-hub',
      title: 'OmniPay Mobile Hub',
      subtitle: 'Cross-Platform Mobile Ecosystem',
      description:
        'Sleek mobile digital wallet and checkout experience engineered in Flutter & Android with offline-first SQLite synchronization.',
      fullDescription:
        'Crafted a cross-platform mobile commerce experience supporting contactless transactions, biometric authentication, and offline SQLite synchronization with cloud reconciliation.',
      image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=900&q=80',
      tags: ['Flutter', 'Android', 'SQLite', 'REST API'],
      gradient: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
      featured: false,
      demoUrl: '#',
      githubUrl: '#',
    },
    {
      id: 'reactive-commerce-suite',
      title: 'Vivid Commerce Suite',
      subtitle: 'Next-Gen E-Commerce Frontend',
      description:
        'Blazing-fast responsive e-commerce experience showcasing dynamic filtering, animated product reveals, and frictionless checkout flows.',
      fullDescription:
        'Built with standalone Angular architecture, SCSS keyframes, and Bootstrap grids. Delivers instant client-side transitions, state management, and accessibility standards.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
      tags: ['Angular', 'Bootstrap', 'JavaScript', 'CSS/SCSS'],
      gradient: 'linear-gradient(135deg, #F355DA 0%, #6E0DD0 100%)',
      featured: false,
      demoUrl: '#',
      githubUrl: '#',
    },
  ];

  getProfile() {
    return this.profile;
  }

  getSocialLinks(): SocialLink[] {
    return this.socialLinks;
  }

  getSkillCategories(): SkillCategory[] {
    return this.skillCategories;
  }

  getProjects(): Project[] {
    return this.projects;
  }

  getProjectById(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }
}
