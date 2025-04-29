import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../data/services/user.service';
import { AuthService } from '../../data/services/auth.service';
import { User } from '../../data/interfaces/user';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})

export class SignupComponent implements OnInit{
  public registerForm!: FormGroup;

  public users: User[] = [];
  public usernameTaken = false;
  public emailTaken = false;

  constructor(private formBuilder: FormBuilder, private authService: AuthService, private userService: UserService, private router: Router) {}

  ngOnInit(): void {
    this.isSignUp();
  }

  isSignUp(): void {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    if (form.get('password')?.value !== form.get('confirmPassword')?.value) {
      return { 'mismatch': true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.usernameTaken || this.emailTaken) 
      return;

    const { name, email, password } = this.registerForm.value;
    
    const newUser: User = {
      id: '', 
      name,
      email,
      password,
      isGoogleAccount: false,
      googleId: '',
      avatar_url: ''
    };

    this.userService.createNewUser(newUser).subscribe(
      (user) => {
        this.authService.saveUserData(user);
        console.log('User created successfully:', user);
        this.router.navigate(['/profile', user.id]);
      },
      (error) => {
        console.error('Registration error:', error);
      }
    );
  }

  checkUsername(): void {
    const username = this.registerForm.get('name')?.value;
    if (username) {
      this.userService.checkUsernameExists(username).subscribe((exists) => {
        this.usernameTaken = exists;
      });
    }
  }

  checkEmail(): void {
    const email = this.registerForm.get('email')?.value;
    if (email) {
      this.userService.checkEmailExists(email).subscribe((exists) => {
        this.emailTaken = exists;
      });
    }
  }

  navigate_SignIn() {
    this.router.navigate(['signin']);
  }

  navigate_Main() {
    this.router.navigate(['']);
  }

  get formControls() {
    return this.registerForm.controls;
  }
}
