export interface User {
    id: string;
    name: string;
    email: string;
    password: string;
    isGoogleAccount: boolean;
    googleId?: string;
    avatar_url: string;
    bio?: string;
    createdAt?: string | Date;
}
