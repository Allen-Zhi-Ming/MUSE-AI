import { ipcMain } from 'electron';
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "898517228830-g30q75r1lfls873jkslhspgrkh9m8d1j.apps.googleusercontent.com");

export function registerAuthHandlers() {
  ipcMain.handle('auth:google', async (_, token: string) => {
    if (!token) {
      throw new Error("Missing credential token");
    }
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID || "898517228830-g30q75r1lfls873jkslhspgrkh9m8d1j.apps.googleusercontent.com",
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error("Invalid credential token");
      }
      return {
        user: {
          id: payload.sub,
          name: payload.name || payload.email.split("@")[0],
          email: payload.email,
          avatar: payload.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
          provider: "google"
        }
      };
    } catch (err: any) {
      console.error("Google Auth Verification Error:", err);
      throw new Error("Token verification failed");
    }
  });
}
