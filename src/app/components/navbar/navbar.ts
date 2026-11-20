import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CvRequestService } from '../../core/services/cv-request.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly cvRequestService = inject(CvRequestService);

  isScrolled = false;
  isMobileMenuOpen = false;

  openCvRequest(): void {
    this.cvRequestService.open();
  }

  navItems = [
    { label: 'About', href: '#about' },
    { label: 'Skills', href: '#skills' },
    { label: 'Learning', href: '#learning' },
    { label: 'Projects', href: '#projects' },
    { label: 'Contact', href: '#contact' },
  ];

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 40;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }
}
