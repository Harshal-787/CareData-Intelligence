import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";
import { User, Role } from "../types/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
  settings: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      let sysSettings = null;
      try {
        const settingsRes = await api.get("/system/settings");
        sysSettings = settingsRes.data;
        setSettings(sysSettings);
      } catch (err) {
        console.error("Failed to load platform settings:", err);
      }

      const token = localStorage.getItem("caredata_access_token");
      if (token) {
        try {
          const res = await api.get("/auth/me");
          const userData = res.data;
          
          if (
            userData.isActive === false ||
            userData.organization?.isActive === false
          ) {
            logout();
          } else if (
            sysSettings?.maintenanceMode && 
            userData.role !== "SUPERADMIN"
          ) {
            alert("The platform is currently down for maintenance.");
            logout();
          } else {
            setUser(userData);
          }
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();

    let timeoutId: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (settings?.sessionTimeoutMins && user) {
        timeoutId = setTimeout(() => {
          alert(`Session expired after ${settings.sessionTimeoutMins} minutes of inactivity.`);
          logout();
          window.location.href = '/login?expired=true';
        }, settings.sessionTimeoutMins * 60 * 1000);
      }
    };

    if (settings?.sessionTimeoutMins && user) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keypress', resetTimer);
      resetTimer();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
    // const interval = setInterval(async () => {
    //   const token = localStorage.getItem('caredata_access_token');
    //   if (token) {
    //     try {
    //       const res = await api.get('/auth/me');
    //       if (res.data.isActive === false || res.data.organization?.isActive === false) {
    //         logout();
    //         window.location.href = '/login?suspended=true';
    //       }
    //     } catch {
    //       logout();
    //       window.location.href = '/login';
    //     }
    //   }
    // }, 15000); // Check every 15 seconds

    // return () => clearInterval(interval);
  }, [settings?.sessionTimeoutMins, user?.id]);

  const login = async (email: string, pass: string): Promise<User> => {
    const res = await api.post("/auth/login", { email, password: pass });
    const { accessToken, refreshToken, user: loggedUser } = res.data;
    localStorage.setItem("caredata_access_token", accessToken);
    localStorage.setItem("caredata_refresh_token", refreshToken);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = () => {
    localStorage.removeItem("caredata_access_token");
    localStorage.removeItem("caredata_refresh_token");
    setUser(null);
  };

  const hasRole = (roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        settings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
