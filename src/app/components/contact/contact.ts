import { Component, inject } from '@angular/core';
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
export class Contact {
  private portfolioService = inject(PortfolioService);
  socialLinks = this.portfolioService.getSocialLinks();

  formData: ContactFormData = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };

  isSubmitting = false;
  isSubmitted = false;

  onSubmit() {
    if (!this.formData.name || !this.formData.email || !this.formData.message) {
      return;
    }

    this.isSubmitting = true;

    // Simulate front-end instant feedback
    setTimeout(() => {
      this.isSubmitting = false;
      this.isSubmitted = true;
      this.formData = {
        name: '',
        email: '',
        subject: '',
        message: '',
      };
    }, 900);
  }

  resetForm() {
    this.isSubmitted = false;
  }
}
