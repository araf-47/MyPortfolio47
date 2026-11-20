import { Component, HostListener, inject, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CvRequestService } from '../../core/services/cv-request.service';

@Component({
  selector: 'app-cv-request-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './cv-request-modal.html',
  styleUrl: './cv-request-modal.scss',
})
export class CvRequestModal {
  private readonly cvService = inject(CvRequestService);

  readonly isOpen = this.cvService.isOpen;

  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  email = '';
  note = '';

  readonly touched = signal(false);
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.reset();
        // Focus the email field shortly after render.
        setTimeout(() => this.emailInput?.nativeElement?.focus(), 0);
      }
    });
  }

  get emailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  async submit(): Promise<void> {
    this.touched.set(true);
    if (!this.emailValid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const result = await this.cvService.submitCvRequest(this.email, this.note);
    this.submitting.set(false);

    if (result.ok) {
      this.success.set(true);
    } else {
      this.error.set(result.error || 'Could not submit your request. Please try again.');
    }
  }

  close(): void {
    if (this.submitting()) {
      return;
    }
    this.cvService.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.submitting()) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen() && !this.submitting()) {
      this.close();
    }
  }

  private reset(): void {
    this.email = '';
    this.note = '';
    this.touched.set(false);
    this.submitting.set(false);
    this.success.set(false);
    this.error.set(null);
  }
}