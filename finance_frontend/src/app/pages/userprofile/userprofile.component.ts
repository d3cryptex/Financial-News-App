declare var google: any;
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { User } from '../../data/interfaces/user';
import { UserService } from '../../data/services/user.service';
import { AuthService } from '../../data/services/auth.service';
import { HeaderComponent } from '../../elements/header/header.component';
import { Subscription } from 'rxjs';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword');
  const confirmNewPassword = control.get('confirmNewPassword');
  if (!newPassword || !confirmNewPassword) { return null; }
  return newPassword.value && confirmNewPassword.value && newPassword.value !== confirmNewPassword.value
         ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-userprofile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './userprofile.component.html',
  styleUrl: './userprofile.component.css'
})

export class UserprofileComponent implements OnInit, OnDestroy {
  @ViewChild('avatarUploadInput') avatarInputRef!: ElementRef<HTMLInputElement>;

  user: User | null = null;
  isLoading: boolean = true;
  loadingError: string | null = null;

  isEditingDetails: boolean = false;
  isEditingBio: boolean = false;
  isChangingPassword: boolean = false;

  profileForm!: FormGroup;
  bioForm!: FormGroup;
  passwordForm!: FormGroup;

  updateProfileError: string | null = null;
  updateProfileSuccess: string | null = null;
  updatePasswordError: string | null = null;
  updatePasswordSuccess: string | null = null;

  defaultAvatar = '/assets/img/avatar.png';
  userId: string | null = null;
  private routeSub: Subscription | undefined;

  isUploadingAvatar: boolean = false;
  previewAvatarUrl: string | ArrayBuffer | null = null;
  uploadError: string | null = null;

  constructor(private userService: UserService, private authService: AuthService, private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private cdRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.initForms();

    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      let idToLoad: string | null = null;
      if (id) {
        idToLoad = id;
        this.userId = id;
      } else {
        const currentUser = this.authService.getUserData();
        if (currentUser?.id) {
          idToLoad = currentUser.id;
          this.userId = currentUser.id;
        }
      }
      if (idToLoad) {
        this.loadUserProfile(idToLoad);
      } else {
        this.loadingError = 'User profile cannot be determined.';
        this.isLoading = false;
        this.router.navigate(['/signin']);
      }
    });
  }

  ngOnDestroy(): void {
      this.routeSub?.unsubscribe();
  }

  initForms(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]]
    });
    this.bioForm = this.fb.group({
       bio: ['']
    });
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  loadUserProfile(id: string): void {
    this.isLoading = true;
    this.loadingError = null;
    this.userService.getUserById(id).subscribe({
      next: (userData: User) => {
        this.user = userData;
        if (this.user) {
          this.profileForm.patchValue({ name: this.user.name });
          this.bioForm.patchValue({ bio: this.user.bio ?? '' });
        }
        this.isLoading = false;
        this.cdRef.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.loadingError = `Error: ${error.error?.message || error.message || 'Could not load profile.'}`;
         if (error.status === 404) {
             this.loadingError = `Profile not found.`;
         }
        this.user = null;
        this.isLoading = false;
        this.cdRef.detectChanges();
      }
    });
  }

  toggleEditDetails(editing: boolean): void {
    this.isEditingDetails = editing;
    this.resetMessagesAndForms('details', editing);
  }
  toggleEditBio(editing: boolean): void {
     this.isEditingBio = editing;
     this.resetMessagesAndForms('bio', editing);
  }
  togglePasswordChange(changing: boolean): void {
     this.isChangingPassword = changing;
     this.resetMessagesAndForms('password', changing);
  }
  resetMessagesAndForms(section: 'details' | 'bio' | 'password', isStartingToEdit: boolean): void {
       this.updateProfileError = null; this.updateProfileSuccess = null;
       this.updatePasswordError = null; this.updatePasswordSuccess = null;
       if (isStartingToEdit && this.user) {
           if (section === 'details') this.profileForm.reset({ name: this.user.name });
           if (section === 'bio') this.bioForm.reset({ bio: this.user.bio ?? '' });
           if (section === 'password') this.passwordForm.reset();
       }
  }

  saveProfileDetails(): void {
    if (!this.profileForm || this.profileForm.invalid || !this.user?.id) { return; }
    this.updateProfileError = null;
    const updatedData = { name: this.profileForm.value.name };
    this.updateUserData(updatedData, 'Profile details updated successfully!');
  }

  saveProfileBio(): void {
    if (!this.bioForm || this.bioForm.invalid || !this.user?.id) { return; }
    this.updateProfileError = null;
    const updatedData = { bio: this.bioForm.value.bio };
    this.updateUserData(updatedData, 'Bio updated successfully!');
  }

  updateUserData(dataToUpdate: Partial<User>, successMessage: string): void {
      if (!this.user?.id) return;
      this.userService.partialUpdateUserById(this.user.id, dataToUpdate)
        .subscribe({
          next: (updatedUser: User) => {
            this.user = { ...this.user, ...dataToUpdate } as User;
            this.authService.saveUserData(this.user);

            this.updateProfileSuccess = successMessage;
            if ('name' in dataToUpdate) this.isEditingDetails = false;
            if ('bio' in dataToUpdate) this.isEditingBio = false;
            this.cdRef.detectChanges();
            setTimeout(() => { this.updateProfileSuccess = null; this.cdRef.detectChanges(); }, 3000);
          },
          error: (error: HttpErrorResponse) => {
             this.updateProfileError = `Error: ${error.error?.message || 'Could not update profile.'}`;
             this.cdRef.detectChanges();
           }
        });
  }

  updatePassword(): void {
       if (!this.passwordForm || this.passwordForm.invalid || !this.user?.id) {
           this.passwordForm?.markAllAsTouched();
           return;
       }
       this.updatePasswordError = null;
       this.updatePasswordSuccess = null;

       const currentPassword = this.passwordForm.value.currentPassword;
       const newPassword = this.passwordForm.value.newPassword;


       this.userService.changePassword(this.user.id, currentPassword, newPassword)
           .subscribe({
               next: () => {
                   this.updatePasswordSuccess = 'Password updated successfully!';
                   this.isChangingPassword = false;
                   this.passwordForm.reset();
                   this.cdRef.detectChanges();
                   setTimeout(() => { this.updatePasswordSuccess = null; this.cdRef.detectChanges(); }, 3000);
               },
               error: (error: HttpErrorResponse) => {
                   this.updatePasswordError = `Error: ${error.error?.message || 'Could not update password.'}`;
                   this.cdRef.detectChanges();
               }
       });
    }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
    (event.target as HTMLImageElement).onerror = null;
  }

  triggerAvatarUpload(): void {
    if (this.isUploadingAvatar) return;
    this.uploadError = null;
    if (this.avatarInputRef?.nativeElement) {
      this.avatarInputRef.nativeElement.value = '';
    }
    this.avatarInputRef?.nativeElement?.click();
  }

  onAvatarFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];

      const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
          this.uploadError = 'Invalid file type. Please select PNG, JPG, or GIF.';
          alert(this.uploadError);
          return;
      }
      const maxSizeInBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
          this.uploadError = 'File is too large. Maximum size is 5MB.';
           alert(this.uploadError);
          return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
          this.previewAvatarUrl = e.target?.result ?? null;
          this.cdRef.detectChanges();
      };
      reader.readAsDataURL(file);

      this.uploadAvatarToServer(file);
    }
  }

  uploadAvatarToServer(file: File): void {
    if (!this.user?.id) {
        this.uploadError = "Cannot upload avatar: User not identified.";
        return;
    }

    this.isUploadingAvatar = true;
    this.uploadError = null;
    this.updateProfileSuccess = null;

    this.userService.changeAvatar(this.user.id, file)
        .subscribe({
            next: (response) => {
                if (this.user && response?.avatar_url) {
                    this.user.avatar_url = response.avatar_url;
                    this.authService.saveUserData(this.user);
                    this.updateProfileSuccess = "Avatar updated!";
                }
                this.isUploadingAvatar = false;
                this.previewAvatarUrl = null;
                this.cdRef.detectChanges();
                setTimeout(() => { this.updateProfileSuccess = null; this.cdRef.detectChanges(); }, 3000);
            },
            error: (error: HttpErrorResponse) => {
                this.uploadError = `Upload failed: ${error.error?.message || error.message || 'Server error'}`;
                this.isUploadingAvatar = false;
                this.previewAvatarUrl = null;
                this.cdRef.detectChanges();
            }
        });
  }

  signOut(): void {
    this.authService.logout();
    this.user = null;
    this.router.navigate(['/']);
  }

  navigate_Main() {
    this.router.navigate(['']);
  }

  get profileFormControls() { return this.profileForm.controls; }
  get bioFormControls() { return this.bioForm.controls; }
  get passwordFormControls() { return this.passwordForm.controls; }
}