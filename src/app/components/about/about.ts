import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../core/services/portfolio.service';

@Component({
  selector: 'app-about',
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  private portfolioService = inject(PortfolioService);
  profile = this.portfolioService.getProfile();

  stats = [
    { label: 'Experience', value: 'Fresher', icon: 'bi-briefcase-fill', color: 'var(--neon-magenta)' },
    { label: 'Projects Shipped', value: '4+', icon: 'bi-rocket-takeoff-fill', color: 'var(--neon-cyan)' },
    { label: 'Architecture & Scalability', value: '100%', icon: 'bi-cpu-fill', color: 'var(--neon-emerald)' },
    { label: 'Client Satisfaction', value: '5.0★', icon: 'bi-star-fill', color: 'var(--neon-amber)' },
  ];

  strengths = [
    {
      title: 'Full-Stack Synergy',
      desc: 'Seamless end-to-end integration from Java/Spring backends to responsive Angular frontends.',
      icon: 'bi-layers-fill',
    },
    {
      title: 'Clean Code & Architecture',
      desc: 'Domain-driven design, maintainable separation of concerns, and robust automated testing.',
      icon: 'bi-check-all',
    },
    {
      title: 'Performance & Scale',
      desc: 'Database optimization with PostgreSQL & Oracle, and lightning-fast client-side reactive rendering.',
      icon: 'bi-lightning-charge-fill',
    },
  ];
}
