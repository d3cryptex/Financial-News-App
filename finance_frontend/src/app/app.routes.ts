import { Routes } from '@angular/router';
import { SigninComponent } from './pages/signin/signin.component';
import { MainComponent } from './pages/main/main.component';
import { UserprofileComponent } from './pages/userprofile/userprofile.component';
import { SignupComponent } from './pages/signup/signup.component';

export const routes: Routes = [
    { path: '', component: MainComponent },
    { path: 'signin', component: SigninComponent},
    { path: 'signup', component: SignupComponent},
    { path: 'profile/:id', component: UserprofileComponent},
    { path: 'profile', redirectTo: '/profile/me', pathMatch: 'full' }
];
