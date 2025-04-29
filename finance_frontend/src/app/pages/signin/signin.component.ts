declare var google: any;
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../data/services/user.service';
import { AuthService } from '../../data/services/auth.service';
import { User } from '../../data/interfaces/user';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.css'
})

export class SigninComponent implements OnInit {
  public signInForm!: FormGroup;

  public users: User[] = [];
  public emailTaken = false;
  public emailLinkedToGoogle = false;
  public googleSignInError: string | null = null;
  public signInError: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.signInError = null;
    this.googleSignInError = null;

    this.initializeForm();
    this.initializeGoogleSignIn();

    this.signInForm.valueChanges.subscribe(() => {
      if (this.signInError) {
        this.signInError = null;
      }
      if (this.googleSignInError) {
         this.googleSignInError = null;
      }
      this.checkIsGoogleAccount();
    });

     this.checkIfAlreadyLoggedIn();
  }

  checkIfAlreadyLoggedIn(): void {
    const savedUser = this.authService.getUserData();
    if (savedUser && savedUser.id != null) {
      this.router.navigate(['/profile', savedUser.id]);
    }
  }

  initializeForm(): void {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      stay: [false]
    });
  }

  initializeGoogleSignIn(): void {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          client_id: '19662891390-6g6ttj9ge35jb0gqtiou5vedra9hgao4.apps.googleusercontent.com',
          callback: (response: any) => this.onGoogleLogin(response),
        });

        const googleButton = document.getElementById("google-btn");
        if (googleButton) {
            google.accounts.id.renderButton(googleButton, {
              theme: 'filled_black',
              text: 'signin_with',
              size: 'large',
              shape: 'rectangle',
              width: 250
            });
        } else {
            console.error('Google button element not found');
        }
    } else {
        console.error('Google Accounts library not loaded.');
    }
  }

  decodeToken(token: string) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(function (c) {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT token:", e);
        return null;
    }
  }

  onGoogleLogin(response: any) {
    this.googleSignInError = null;

    if (response && response.credential) {
      const tokenLoad = this.decodeToken(response.credential);

      if (!tokenLoad) {
          this.googleSignInError = 'Failed to decode Google token.';
          return;
      }

      if (!tokenLoad.email || !tokenLoad.sub || !tokenLoad.name) {
          console.error("Missing required data from Google token:", tokenLoad);
          this.googleSignInError = 'Incomplete data received from Google.';
          return;
      }

      const userData = {
        name: tokenLoad.name,
        email: tokenLoad.email,
        googleId: tokenLoad.sub,
        avatar_url: tokenLoad.picture
      };


      this.checkEmailLinkedToGoogle(userData);

    } else {
      console.error("Google Sign-In failed or no credential received.", response);
      this.googleSignInError = 'Google Sign-In failed. Please try again.';
    }
  }


  checkIsGoogleAccount(): void {
    const emailControl = this.signInForm.get('email');
    if (emailControl && emailControl.valid && emailControl.value) {
      this.userService.checkEmailLinkedToGoogle(emailControl.value).subscribe((isLinked) => {
        this.emailLinkedToGoogle = isLinked;
        if (isLinked) {
          console.log(`Email ${emailControl.value} is linked to Google. Use Google Sign-In.`);
        }
      });
    } else {
      this.emailLinkedToGoogle = false;
    }
  }



  checkEmailLinkedToGoogle(userdata: any): void {
    this.userService.checkEmailLinkedToGoogle(userdata.email).subscribe(
      (isLinked) => {
        if (isLinked) {
          this.googleSignInError = null;
          this.authorizeUser(userdata);
        } else {
          this.googleSignInError = null;
          this.authorizeUser(userdata);
        }
      },
      (error) => {
        this.googleSignInError = 'Error checking account status. Please try again.';
      }
    );
  }


  authorizeUser(userdata: any): void {
    this.userService.createGoogleUser(userdata).subscribe(
      (user: User | null) => {
        if (user && user.id != null) {
          this.authService.saveUserData(user);
          this.router.navigate(['/profile', user.id]);
        } else {
          this.googleSignInError = 'Failed to process Google Sign-In on the server.';
        }
      },
      (error) => {
        this.googleSignInError = error.error?.message || 'Server error during Google Sign-In. Please try again later.';
      }
    );
  }



  onSubmit() {
    this.signInError = null;
    this.googleSignInError = null;

    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }

    const email = this.formControls['email'].value;
    const password = this.formControls['password'].value;
    const stay = this.formControls['stay'].value;

    if (this.emailLinkedToGoogle) {
        this.signInError = 'This email is linked to a Google account. Please use the "Sign in with Google" button.';
        return;
    }

    this.userService.validateUser(email, password).subscribe(
      (user: User | null) => {
        if (user && user.id != null) {
          if (user.isGoogleAccount) {
              this.signInError = 'This account uses Google Sign-In.';
          } else {
              if (stay) {
                  this.authService.saveUserData(user);
              } else {
                  this.authService.saveSessionUserData(user);
              }
              this.router.navigate(['/profile', user.id]);
          }
        } else {
          this.signInError = 'Incorrect email or password.';
        }
      },
      (error) => {
        this.signInError = 'Login failed due to a server error. Please try again later.';
      }
    );
  }

  navigate_SignUp() {
    this.router.navigate(['signup']);
  }

  navigate_Main() {
    this.router.navigate(['']);
  }

  get formControls() {
    return this.signInForm.controls;
  }
}