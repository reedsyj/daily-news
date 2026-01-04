import React, { useState } from 'react';
import { X, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { authService } from '../services/supabaseService';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = (props) => {
  const { isOpen, onClose, onLoginSuccess, isStandalone = false } = props;
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  // const [email, setEmail] = useState(''); // Removed email state
  const [username, setUsername] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setError('');
    // setEmail('');
    setUsername('');
    setEmployeeId('');
    setPassword('');
  };

  const handleTabChange = (newMode: 'LOGIN' | 'REGISTER') => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        if (!employeeId || !password) throw new Error("Please fill in Employee ID and password");
        const { user: authUser } = await authService.signIn(employeeId, password);
        
        if (authUser) {
          const user = await authService.getCurrentUser();
          if (user) onLoginSuccess(user);
        }
      } else {
        // Register needs all fields except email
        if (!username || !employeeId || !password) throw new Error("All fields are required");
        const { user: authUser } = await authService.signUp(employeeId, password, username);
        
        if (authUser) {
           const user = await authService.getCurrentUser();
           if (user) onLoginSuccess(user);
        }
      }
      
      onClose();
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isStandalone ? "relative w-full" : "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"}>
      <div className={`bg-gray-900 border border-gray-700 rounded-2xl p-0 w-full ${isStandalone ? '' : 'max-w-md shadow-2xl relative'} overflow-hidden`}>
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-800">
          <button 
            onClick={() => handleTabChange('LOGIN')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'LOGIN' ? 'bg-gray-800 text-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            <LogIn size={18} /> Login
          </button>
          <button 
            onClick={() => handleTabChange('REGISTER')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mode === 'REGISTER' ? 'bg-gray-800 text-purple-400' : 'text-gray-400 hover:text-white'}`}
          >
            <UserPlus size={18} /> Register
          </button>
        </div>

        {!isStandalone && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
          >
            <X size={20} />
          </button>
        )}

        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'LOGIN' ? 'Welcome Back' : 'Join HMATC Hub'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {mode === 'LOGIN' 
              ? 'Enter your Employee ID to access the insider feed.' 
              : 'Create your professional account to comment and share.'}
          </p>

          {error && (
            <div className="mb-4 bg-red-900/30 border border-red-800 rounded-lg p-3 flex items-start gap-2 text-red-200 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Employee ID Field (Both Modes) */}
            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Employee ID (工号)</label>
               <input 
                 type="text" 
                 value={employeeId}
                 onChange={(e) => setEmployeeId(e.target.value)}
                 className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder-gray-700"
                 placeholder="e.g. R522222"
               />
            </div>

            {/* Register Mode: Username */}
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Username (用户名)</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-600 outline-none transition-all placeholder-gray-700"
                    placeholder="e.g. 李白_01"
                  />
                </div>
              </>
            )}

            {/* Password Field (Both Modes) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password (密码)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder-gray-700"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-6 ${
                  mode === 'LOGIN' 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {loading ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span> : (mode === 'LOGIN' ? 'Login' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;