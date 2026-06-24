'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Helper to call backend API
  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && pathname !== '/login') {
      // Token expired or invalid
      logout();
      return { error: 'Unauthorized', status: 401 };
    }

    const data = await res.json();
    if (!res.ok) {
      return { error: data.message || 'Something went wrong', status: res.status };
    }
    return { data, status: res.status };
  };

  // Fetch current user and companies
  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      if (pathname !== '/login') router.push('/login');
      return;
    }

    try {
      const meRes = await apiCall('/auth/me');
      if (meRes.error) {
        setLoading(false);
        return;
      }
      setUser(meRes.data);

      // Fetch companies
      const compRes = await apiCall('/companies');
      if (!compRes.error) {
        setCompanies(compRes.data);

        // Check if there is a selected company in localStorage
        const storedCompId = localStorage.getItem('selectedCompanyId');
        if (storedCompId) {
          const comp = compRes.data.find(c => c.id === storedCompId);
          if (comp) {
            setSelectedCompany(comp);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const login = async (email, password) => {
    const res = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.error) {
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      router.push('/companies');
      await fetchUser();
    }
    return res;
  };

  const register = async (email, password, fullName) => {
    const res = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedCompanyId');
    setUser(null);
    setSelectedCompany(null);
    setCompanies([]);
    router.push('/login');
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    if (company) {
      localStorage.setItem('selectedCompanyId', company.id);
      router.push('/dashboard');
    } else {
      localStorage.removeItem('selectedCompanyId');
      router.push('/companies');
    }
  };

  const refreshCompanies = async () => {
    const compRes = await apiCall('/companies');
    if (!compRes.error) {
      setCompanies(compRes.data);
      if (selectedCompany) {
        const stillExists = compRes.data.find(c => c.id === selectedCompany.id);
        if (!stillExists) {
          setSelectedCompany(null);
          localStorage.removeItem('selectedCompanyId');
        }
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        companies,
        selectedCompany,
        login,
        register,
        logout,
        selectCompany,
        apiCall,
        refreshCompanies,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
