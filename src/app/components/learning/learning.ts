import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../core/services/portfolio.service';

@Component({
  selector: 'app-learning',
  imports: [CommonModule],
  templateUrl: './learning.html',
  styleUrl: './learning.scss',
})
export class Learning {
  private portfolioService = inject(PortfolioService);
  learningTopics = this.portfolioService.currentlyLearning;
}