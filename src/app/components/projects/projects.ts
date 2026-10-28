import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../core/services/portfolio.service';
import { Project } from '../../core/models/portfolio.model';

@Component({
  selector: 'app-projects',
  imports: [CommonModule],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects {
  private portfolioService = inject(PortfolioService);
  projects = this.portfolioService.getProjects();

  selectedProject: Project | null = null;

  openDetails(project: Project) {
    this.selectedProject = project;
  }

  closeDetails() {
    this.selectedProject = null;
  }
}
