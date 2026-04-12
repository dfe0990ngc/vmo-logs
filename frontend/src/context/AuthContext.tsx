import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { User } from "@/types/types";

import { login as apiLogin, logout as apiLogout } from "@/api/auth";
import { getMe } from "@/features/users/users.api";
import { isAbortError } from "@/api/requests";
import { cancelAllRequests } from "@/api/client";
import { ACCESS } from "@/api/tokens";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  showAuth: boolean;

  loginData: {
    user_id: string;
    password: string;
  };

  setLoginData: React.Dispatch<
    React.SetStateAction<{ user_id: string; password: string }>
  >;

  setShowAuth: React.Dispatch<React.SetStateAction<boolean>>;

  login: (user_id: string, password: string) => Promise<void>;
  logout: () => void;
  setAuthUser: (_user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/* ------------------------------------------------------------------ */
/* Hook */
/* ------------------------------------------------------------------ */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Provider */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const [loginData, setLoginData] = useState({
    user_id: "",
    password: "",
  });

  const mountedRef = useRef(true);

  /* ------------------------------------------------------------------ */
  /* Bootstrap session */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    mountedRef.current = true;

    const bootstrap = async () => {
      try {
        const accessToken = localStorage.getItem(ACCESS);
        if(accessToken){
          const me = await getMe();
          if (mountedRef.current) {
            setUser(me.user);
          }
        }else{
          setUser(null);
        }
      } catch (error) {
        if (!isAbortError(error) && mountedRef.current) {
          setUser(null);
        }
      } finally {
        if (mountedRef.current) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    const onLogout = () => {
      if (!mountedRef.current) return;
      setUser(null);
      cancelAllRequests();
    };

    window.addEventListener("auth:logout", onLogout);

    return () => {
      mountedRef.current = false;
      cancelAllRequests();
      window.removeEventListener("auth:logout", onLogout);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Login */
  /* ------------------------------------------------------------------ */

  const login = async (user_id: string, password: string) => {
    setIsAuthenticating(true);
    cancelAllRequests(); // cancel stale inflight calls

    try {
      // 1️⃣ Authenticate (tokens only)
      const res = await apiLogin({ user_id, password });

      // 2️⃣ Hydrate identity
      const me = await getMe();

      if (mountedRef.current) {
        setUser(me.user);
        setLoginData({ user_id: "", password: "" });
        setShowAuth(false);
      }
    } catch (error) {
      logout();
      
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      if (mountedRef.current) {
        setIsAuthenticating(false);
      }
    }
  };

  const setAuthUser = async (_user: User) => {
    if(_user){
      setUser(user);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Logout */
  /* ------------------------------------------------------------------ */

  const logout = async () => {
    cancelAllRequests();
    apiLogout(); // clears tokens + emits auth:logout
  };

  /* ------------------------------------------------------------------ */
  /* Context value */
  /* ------------------------------------------------------------------ */

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isBootstrapping || isAuthenticating,
        showAuth,
        loginData,
        setLoginData,
        setShowAuth,
        login,
        logout,
        setAuthUser,
      }}
    >
      <LoadingOverlay
        isVisible={isAuthenticating}
        text="Authenticating…"
      />
      {children}
    </AuthContext.Provider>
  );
}
