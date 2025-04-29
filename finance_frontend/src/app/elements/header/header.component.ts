import { Component, OnInit, HostListener, HostBinding, ElementRef, ViewChild, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../data/interfaces/user';
import { AuthService } from '../../data/services/auth.service';
import { Subscription } from 'rxjs';
import { Event as RouterEvent, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})

export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('mainMenuDropdown') mainMenuDropdownRef?: ElementRef;
  @ViewChild('notificationsMenu') notificationsMenuRef?: ElementRef;

  public user: User | null = null;
  public defaultAvatar = '/assets/img/avatar.png';
  public isMainMenuOpen = false;
  public isNotificationsOpen = false;
  public isMobileMenuOpen = false;

  @HostBinding('class.header-scrolled') isScrolled = false;

  private clickListener: (() => void) | undefined;
  private routerSubscription: Subscription | undefined;

  constructor(
      private router: Router,
      private authService: AuthService,
      private renderer: Renderer2,
      private elementRef: ElementRef
      ) {}

  ngOnInit(): void {
    this.user = this.authService.getUserData();
    this.checkScroll();

    this.routerSubscription = this.router.events.subscribe((event: RouterEvent) => {
        if (event instanceof NavigationEnd) {
            this.closeMobileMenu();
        }
    });
  }

  ngOnDestroy(): void {
      if (this.clickListener) {
          this.clickListener();
      }
      this.routerSubscription?.unsubscribe();
  }


  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScroll();
  }

  private checkScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.isScrolled = scrollPosition > 10;
  }


  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.closeDropdowns();
    if (this.isMobileMenuOpen) {
        this.addGlobalClickListener();
        document.body.style.overflow = 'hidden';
    } else {
        this.removeGlobalClickListener();
         document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      this.removeGlobalClickListener();
      document.body.style.overflow = '';
    }
  }


  toggleMainMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isMainMenuOpen = !this.isMainMenuOpen;
    this.isNotificationsOpen = false;
    this.closeMobileMenu();
    if (this.isMainMenuOpen) {
        this.addGlobalClickListener();
    } else {
        this.removeGlobalClickListener();
    }
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isMainMenuOpen = false;
    this.closeMobileMenu();
     if (this.isNotificationsOpen) {
        this.addGlobalClickListener();
    } else {
        this.removeGlobalClickListener();
    }
  }


  closeDropdowns(): void {
     this.isMainMenuOpen = false;
     this.isNotificationsOpen = false;
     this.removeGlobalClickListener();
  }


  closeAllMenus(): void {
      this.closeMobileMenu();
      this.closeDropdowns();
  }



  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
      this.closeAllMenus();
  }


  private addGlobalClickListener(): void {
      this.removeGlobalClickListener();
      this.clickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => {
          const clickedInsideHeader = this.elementRef.nativeElement.contains(event.target);
          const clickedInsideMainMenu = this.mainMenuDropdownRef?.nativeElement.contains(event.target);
          const clickedInsideNotifications = this.notificationsMenuRef?.nativeElement.contains(event.target);

          if (!clickedInsideHeader && !clickedInsideMainMenu && !clickedInsideNotifications) {
               this.closeAllMenus();
          }
          else if (this.isNotificationsOpen && !this.notificationsMenuRef?.nativeElement.contains(event.target)) {
               this.closeDropdowns();
          }
          else if (this.isMainMenuOpen && !this.mainMenuDropdownRef?.nativeElement.contains(event.target)) {
               this.closeDropdowns();
           }
      });
  }


  private removeGlobalClickListener(): void {
      if (this.clickListener) {
          this.clickListener();
          this.clickListener = undefined;
      }
  }

  navigate_SignIn(): void {
    this.router.navigate(['signin']);
  }

  navigate_Profile(): void {
    if (this.user && this.user.id) {
      this.router.navigate(['/profile', this.user.id]);
    } else {
      console.error('Ошибка: user.id отсутствует!', this.user);
    }
  }

  onAvatarError(event: Event): void {
    console.warn('User avatar failed to load, using default.');
    (event.target as HTMLImageElement).src = this.defaultAvatar;
    (event.target as HTMLImageElement).onerror = null;
  }
}