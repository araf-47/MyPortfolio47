import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortfolioService } from '../../core/services/portfolio.service';
import { ContactFormData } from '../../core/models/portfolio.model';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact implements OnDestroy {
  private portfolioService = inject(PortfolioService);
  socialLinks = this.portfolioService.getSocialLinks();

  formData: ContactFormData = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };

  private readonly endpoint = 'https://api.web3forms.com/submit';
  // Same Web3Forms account as CV requests; submissions are routed to Araf's inbox.
  private readonly accessKey = '042619d8-230a-404a-9eb8-5eff6dcb369c';

  isSubmitting = false;
  isSubmitted = false;
  hasError = false;
  errorMessage = '';
  // Brief "Sent ✓" micro-interaction before swapping to the success panel.
  sentTick = false;
  private sentTickTimer: ReturnType<typeof setTimeout> | null = null;

  async onSubmit(): Promise<void> {
    if (!this.formData.name || !this.formData.email || !this.formData.message) {
      return;
    }

    this.isSubmitting = true;
    this.hasError = false;
    this.errorMessage = '';

    const subject =
      this.formData.subject && this.formData.subject.trim().length > 0
        ? `Portfolio Contact: ${this.formData.subject.trim()}`
        : `Portfolio Contact from ${this.formData.name.trim()}`;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: this.accessKey,
          subject,
          from_name: this.formData.name.trim(),
          name: this.formData.name.trim(),
          email: this.formData.email.trim(),
          replyto: this.formData.email.trim(),
          message: this.formData.message.trim(),
          botcheck: false,
        }),
      });

      let data: { success?: boolean; message?: string } = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success === false) {
        this.hasError = true;
        this.errorMessage =
          data.message || 'Could not send your message. Please try again.';
        return;
      }

      // Brief inline "Sent ✓" feedback before swapping to the success panel.
      this.sentTick = true;
      if (this.sentTickTimer) clearTimeout(this.sentTickTimer);
      this.sentTickTimer = setTimeout(() => {
        this.sentTick = false;
        this.isSubmitted = true;
        this.formData = {
          name: '',
          email: '',
          subject: '',
          message: '',
        };
      }, 1000);
    } catch {
      this.hasError = true;
      this.errorMessage = 'Network error while sending your message. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  ngOnDestroy(): void {
    if (this.sentTickTimer) clearTimeout(this.sentTickTimer);
  }

  resetForm(): void {
    this.isSubmitted = false;
    this.hasError = false;
    this.errorMessage = '';
    this.sentTick = false;
  }
}
