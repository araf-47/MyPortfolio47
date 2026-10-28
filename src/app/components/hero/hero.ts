import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../core/services/portfolio.service';

@Component({
  selector: 'app-hero',
  imports: [CommonModule],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero implements OnInit, OnDestroy {
  private portfolioService = inject(PortfolioService);
  profile = this.portfolioService.getProfile();

  typedName = signal('');
  private fullText = this.profile.name;
  private index = 0;
  private deleting = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startTyping();
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private startTyping(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    const delay = this.deleting ? 60 : 120;
    this.timer = setInterval(() => {
      if (!this.deleting) {
        if (this.index < this.fullText.length) {
          this.index++;
          this.typedName.set(this.fullText.slice(0, this.index));
        } else {
          if (this.timer) clearInterval(this.timer);
          this.timer = null;
          setTimeout(() => {
            this.deleting = true;
            this.startTyping();
          }, 1500);
        }
      } else {
        if (this.index > 0) {
          this.index--;
          this.typedName.set(this.fullText.slice(0, this.index));
        } else {
          if (this.timer) clearInterval(this.timer);
          this.timer = null;
          setTimeout(() => {
            this.deleting = false;
            this.startTyping();
          }, 500);
        }
      }
    }, delay);
  }
}
