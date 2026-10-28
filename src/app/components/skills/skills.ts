import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../core/services/portfolio.service';

@Component({
  selector: 'app-skills',
  imports: [CommonModule],
  templateUrl: './skills.html',
  styleUrl: './skills.scss',
})
export class Skills {
  private portfolioService = inject(PortfolioService);
  skillCategories = this.portfolioService.getSkillCategories();
}
