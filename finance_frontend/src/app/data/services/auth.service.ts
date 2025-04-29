import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  saveUserData(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  saveSessionUserData(user: any): void {
    sessionStorage.setItem('user', JSON.stringify(user));
  }

  getUserData(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return this.getUserData() !== null;
  }

  logout(): void {
    localStorage.removeItem('user');
  }
}
