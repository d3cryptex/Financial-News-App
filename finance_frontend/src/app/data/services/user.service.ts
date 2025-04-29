import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class UserService {
  private apiUrl = 'http://localhost:3000/users';

  constructor(private http: HttpClient) { }

  getUsers(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateUserById(id: string, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, userData);
  }

  partialUpdateUserById(id: string, userData: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, userData);
  }

  createNewUser(userData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json; charset=UTF-8'
    });

    return this.http.post(this.apiUrl, userData, { headers });
  }

  createGoogleUser(userData: { name: string; email: string; googleid: string; picture: string }): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json; charset=UTF-8'
    });

    return this.http.post(`${this.apiUrl}/google`, userData, { headers });
  }

  validateUser(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/validate`, { email, password });
  }

  removeUserById(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  checkUsernameExists(username: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-username?name=${username}`);
  }

  checkEmailExists(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-email?email=${email}`);
  }
  
  checkEmailLinkedToGoogle(email: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-email-linked?email=${email}`);
  }

  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${userId}/change-password`, { currentPassword, newPassword });
  }

  changeAvatar(userId: string, file: File): Observable<{ avatar_url: string }> { 
    const formData = new FormData();
    formData.append('avatar', file, file.name);

    return this.http.post<{ avatar_url: string }>(`${this.apiUrl}/${userId}/avatar`, formData);
  }  
}
