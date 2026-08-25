import React, { useState } from 'react';
import {
  X,
  Crown,
  Users,
  Building2,
  Calendar,
  Clock,
  Search,
  Filter,
  UserPlus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  DollarSign,
  KeyRound,
  LogIn,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  Zap,
  Sparkles,
  ChevronRight,
  Sliders,
  ExternalLink,
  Lock,
  User,
  Eye,
  EyeOff,
  Save,
  Check,
  LogOut,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { UserAccount, SubscriptionPlanId, SubscriptionStatus } from '../types';
import { SUBSCRIPTION_PLANS, calculateRemainingDays, isDurationUnlimited } from '../services/subscriptionService';
import { PendingApprovalsTab } from './superadmin/PendingApprovalsTab';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList: UserAccount[];
  currentUser: UserAccount | null;
  onUpdateUser: (userId: string, updates: Partial<UserAccount>) => Promise<void>;
  onCreateUser: (user: Omit<UserAccount, 'id' | 'createdAt'>) => Promise<UserAccount>;
  onDeleteUser: (userId: string) => Promise<void>;
  onImpersonateUser: (user: UserAccount) => void;
  onLogout?: () => void;
  onOpenAuthModal?: () => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  usersList,
  currentUser,
  onUpdateUser,
  onCreateUser,
  onDeleteUser,
  onImpersonateUser,
  onLogout,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'approvals' | 'add_new' | 'admin_profile'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // New Client Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDurationType, setNewDurationType] = useState<
    'trial_3' | 'trial_7' | 'trial_14' | 'trial_30' | 'week_1' | 'month_1' | 'month_3' | 'month_6' | 'year_1' | 'off'
  >('trial_3');
  const [newPin, setNewPin] = useState('1234');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Editing Client State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('active');
  const [editPin, setEditPin] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Super Admin Own Profile State
  const superAdminAccount = usersList.find((u) => u.role === 'super_admin') || currentUser;
  const [adminUsername, setAdminUsername] = useState(superAdminAccount?.username || 'admin');
  const [adminPassword, setAdminPassword] = useState(superAdminAccount?.password || 'admin123');
  const [adminEmail, setAdminEmail] = useState(superAdminAccount?.email || 'admin@snapbooth.id');
  const [adminDisplayName, setAdminDisplayName] = useState(superAdminAccount?.displayName || 'Super Admin Master');
  const [adminPin, setAdminPin] = useState(superAdminAccount?.boothAccessPin || '9988');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminSaving, setIsAdminSaving] = useState(false);

  if (!isOpen) return null;

  // Calculate Summary Metrics
  const clientsOnly = usersList.filter((u) => u.role === 'client');
  const totalClients = clientsOnly.length;

  // Pending Approvals
  const pendingApprovalClients = clientsOnly.filter(
    (u) => u.subscriptionStatus === 'pending_approval' || u.approvalStatus === 'pending'
  );
  
  const activeClients = clientsOnly.filter((u) => {
    if (u.subscriptionStatus === 'pending_approval' || u.approvalStatus === 'pending') return false;
    const isUnl = isDurationUnlimited(u.subscriptionEndDate);
    const rem = calculateRemainingDays(u.subscriptionEndDate);
    return (u.subscriptionStatus === 'active' || isUnl) && (isUnl || rem >= 0);
  }).length;

  const trialClients = clientsOnly.filter((u) => {
    if (u.subscriptionStatus === 'pending_approval' || u.approvalStatus === 'pending') return false;
    const rem = calculateRemainingDays(u.subscriptionEndDate);
    return u.subscriptionStatus === 'trial' && rem >= 0;
  }).length;

  const expiringSoonClients = clientsOnly.filter((u) => {
    if (u.subscriptionStatus === 'pending_approval' || u.approvalStatus === 'pending') return false;
    const isUnl = isDurationUnlimited(u.subscriptionEndDate);
    const rem = calculateRemainingDays(u.subscriptionEndDate);
    const isExp = !isUnl && (u.subscriptionStatus === 'expired' || rem < 0);
    return !isUnl && !isExp && rem < 3 && rem >= 0;
  });

  const expiredClients = clientsOnly.filter((u) => {
    if (u.subscriptionStatus === 'pending_approval' || u.approvalStatus === 'pending') return false;
    const isUnl = isDurationUnlimited(u.subscriptionEndDate);
    const rem = calculateRemainingDays(u.subscriptionEndDate);
    return !isUnl && (u.subscriptionStatus === 'expired' || rem < 0);
  }).length;

  // Filtered List
  const filteredUsers = clientsOnly.filter((user) => {
    const matchSearch =
      (user.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.phone || '').includes(searchQuery);

    const isPending = user.subscriptionStatus === 'pending_approval' || user.approvalStatus === 'pending';
    const isUnl = isDurationUnlimited(user.subscriptionEndDate);
    const remaining = calculateRemainingDays(user.subscriptionEndDate);
    const isExpired = !isPending && !isUnl && (user.subscriptionStatus === 'expired' || remaining < 0);

    let matchStatus = true;
    if (filterStatus === 'pending') matchStatus = isPending;
    else if (filterStatus === 'active') matchStatus = !isPending && (user.subscriptionStatus === 'active' || isUnl) && !isExpired;
    else if (filterStatus === 'expiring_soon') matchStatus = !isPending && !isUnl && !isExpired && remaining < 3 && remaining >= 0;
    else if (filterStatus === 'trial') matchStatus = !isPending && user.subscriptionStatus === 'trial' && !isExpired;
    else if (filterStatus === 'unlimited') matchStatus = !isPending && isUnl;
    else if (filterStatus === 'expired') matchStatus = isExpired;
    else if (filterStatus === 'suspended') matchStatus = user.subscriptionStatus === 'suspended';

    return matchSearch && matchStatus;
  });

  // Approval Handlers
  const handleApproveUser = async (user: UserAccount, customDuration?: string) => {
    const plan = customDuration || user.requestedDuration || 'monthly_50k';
    let endDate = '2099-12-31';
    let planId: SubscriptionPlanId = 'pro_booth';
    let status: SubscriptionStatus = 'active';

    if (plan === 'off') {
      endDate = '2099-12-31';
      planId = 'lifetime';
      status = 'active';
    } else if (plan === 'weekly_30k' || plan === 'week_1') {
      endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      planId = 'pro_booth';
      status = 'active';
    } else if (plan === 'monthly_50k' || plan === 'month_1') {
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      planId = 'pro_booth';
      status = 'active';
    } else if (plan === 'yearly_500k' || plan === 'year_1') {
      endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      planId = 'pro_booth';
      status = 'active';
    } else if (plan === 'trial_3') {
      endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      planId = 'starter';
      status = 'trial';
    }

    await onUpdateUser(user.id, {
      subscriptionStatus: status,
      approvalStatus: 'approved',
      subscriptionPlan: planId,
      subscriptionStartDate: new Date().toISOString().split('T')[0],
      subscriptionEndDate: endDate,
      approvedAt: new Date().toISOString(),
      approvedBy: superAdminAccount?.displayName || 'Super Admin',
      notes: `Disetujui oleh Super Admin pada ${new Date().toLocaleDateString('id-ID')} • ${user.notes || ''}`,
    });

    setSuccessMessage(`Akun "${user.businessName || user.displayName}" berhasil DISETUJUI & DIAKTIFKAN!`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleRejectUser = async (user: UserAccount, reason: string) => {
    await onUpdateUser(user.id, {
      subscriptionStatus: 'suspended',
      approvalStatus: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason.trim() || 'Pembayaran belum terverifikasi atau data tidak sesuai.',
    });

    setSuccessMessage(`Pendaftaran akun "${user.businessName || user.displayName}" telah DITOLAK.`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Handle Quick Extend or Set Trial / OFF
  const handleExtendDays = async (userId: string, currentEndDate: string, daysToAdd: number, asTrial = false) => {
    const baseTime = new Date(currentEndDate).getTime() > Date.now()
      ? new Date(currentEndDate).getTime()
      : Date.now();
    const newEnd = new Date(baseTime + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await onUpdateUser(userId, {
      subscriptionEndDate: newEnd,
      subscriptionStatus: asTrial ? 'trial' : 'active',
    });

    setSuccessMessage(asTrial ? `Berhasil set masa trial +${daysToAdd} hari.` : `Berhasil memperpanjang durasi +${daysToAdd} hari.`);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const handleSetUnlimited = async (userId: string) => {
    await onUpdateUser(userId, {
      subscriptionEndDate: '2099-12-31',
      subscriptionStatus: 'active',
    });
    setSuccessMessage('Durasi berhasil di-set ke OFF / Tanpa Batas (Unlimited).');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Start Editing Client
  const handleStartEditClient = (client: UserAccount) => {
    setEditingUserId(client.id);
    setEditUsername(client.username || client.email.split('@')[0]);
    setEditPassword(client.password || '123456');
    setEditEmail(client.email);
    setEditBusinessName(client.businessName || '');
    setEditDisplayName(client.displayName || '');
    setEditPhone(client.phone || '');
    setEditEndDate(client.subscriptionEndDate);
    setEditStatus(client.subscriptionStatus);
    setEditPin(client.boothAccessPin || '1234');
  };

  // Handle Save Edit Form
  const handleSaveEdit = async (userId: string) => {
    await onUpdateUser(userId, {
      username: editUsername.trim().toLowerCase(),
      password: editPassword,
      email: editEmail.trim(),
      businessName: editBusinessName.trim(),
      displayName: editDisplayName.trim() || editBusinessName.trim(),
      phone: editPhone.trim(),
      subscriptionEndDate: editEndDate,
      subscriptionStatus: editStatus,
      boothAccessPin: editPin.trim(),
    });
    setEditingUserId(null);
    setSuccessMessage('Kredensial dan pengaturan durasi klien berhasil diperbarui!');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Generate random password
  const generateRandomPass = (length = 8) => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789!@#';
    let res = '';
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Handle Create New Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusinessName || !newEmail) return;

    setIsSubmitting(true);
    try {
      const startDate = new Date().toISOString().split('T')[0];
      let endDate = '2099-12-31';
      let status: SubscriptionStatus = 'active';
      let noteDuration = '';

      if (newDurationType === 'off') {
        endDate = '2099-12-31';
        status = 'active';
        noteDuration = 'Durasi OFF (Tanpa Batas)';
      } else if (newDurationType.startsWith('trial_')) {
        const days = parseInt(newDurationType.replace('trial_', ''), 10) || 3;
        endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        status = 'trial';
        noteDuration = `Masa Trial ${days} Hari`;
      } else if (newDurationType === 'week_1') {
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        status = 'active';
        noteDuration = 'Langganan Mingguan (7 Hari - Rp 30.000)';
      } else if (newDurationType.startsWith('month_')) {
        const months = parseInt(newDurationType.replace('month_', ''), 10) || 1;
        endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        status = 'active';
        noteDuration = months === 1 ? 'Langganan Bulanan (30 Hari - Rp 50.000)' : `Durasi ${months} Bulan`;
      } else if (newDurationType === 'year_1') {
        endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        status = 'active';
        noteDuration = 'Langganan Tahunan (365 Hari - Rp 500.000)';
      }

      const cleanUsername = (newUsername.trim() || newEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9_.-]/g, '');

      await onCreateUser({
        username: cleanUsername,
        password: newPassword.trim() || '123456',
        email: newEmail.trim(),
        displayName: newOwnerName.trim() || newBusinessName.trim(),
        businessName: newBusinessName.trim(),
        role: 'client',
        subscriptionStatus: status,
        subscriptionPlan: newDurationType === 'off' ? 'lifetime' : 'pro_booth',
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        phone: newPhone.trim() || '08123456789',
        boothAccessPin: newPin.trim() || '1234',
        notes: newNotes ? `${noteDuration} • ${newNotes}` : noteDuration,
      });

      setNewUsername('');
      setNewPassword('');
      setNewBusinessName('');
      setNewOwnerName('');
      setNewEmail('');
      setNewPhone('');
      setNewNotes('');
      setActiveTab('customers');
      setSuccessMessage('Klien baru berhasil ditambahkan dan disinkronkan ke Firestore.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save Super Admin Own Profile
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminAccount) return;

    setIsAdminSaving(true);
    try {
      await onUpdateUser(superAdminAccount.id, {
        username: adminUsername.trim().toLowerCase(),
        password: adminPassword,
        email: adminEmail.trim(),
        displayName: adminDisplayName.trim(),
        boothAccessPin: adminPin.trim(),
      });

      setSuccessMessage('Username & Password Super Admin berhasil diperbarui!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAdminSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Super Admin */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Super Admin Management Portal
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  👑 Cloud Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kelola kredensial customer (username/password), status langganan, dan akun Super Admin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                title="Logout dari Super Admin"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 p-2 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Customer ({totalClients})</span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative ${
              activeTab === 'approvals'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-amber-300 hover:text-amber-200 hover:bg-slate-900 border border-amber-500/30'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Persetujuan User Baru</span>
            {pendingApprovalClients.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black font-mono animate-pulse shadow">
                {pendingApprovalClients.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('add_new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'add_new'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Klien Baru</span>
          </button>

          <button
            onClick={() => setActiveTab('admin_profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'admin_profile'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Akun Super Admin (Ganti Password)</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: CUSTOMER LIST */}
          {activeTab === 'customers' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Peringatan Sisa Masa Aktif Klien (< 3 Hari) */}
              {expiringSoonClients.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500/60 shadow-xl shadow-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 animate-in fade-in">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 shadow-inner">
                      <AlertCircle className="w-5 h-5 animate-pulse text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-black text-amber-300">
                          Peringatan Sisa Masa Aktif Klien (&lt; 3 Hari)
                        </h4>
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase font-mono animate-pulse">
                          {expiringSoonClients.length} Akun Mendekati Expired
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                        Terdapat <strong>{expiringSoonClients.length} akun customer</strong> yang sisa masa aktifnya kurang dari 3 hari. Segera lakukan follow up perpanjangan langganan atau tambah durasi.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterStatus(filterStatus === 'expiring_soon' ? 'all' : 'expiring_soon')}
                    className={`shrink-0 w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      filterStatus === 'expiring_soon'
                        ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300'
                        : 'bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span>{filterStatus === 'expiring_soon' ? 'Tampilkan Semua Klien' : `Filter Akun (< 3 Hari)`}</span>
                  </button>
                </div>
              )}

              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Total Klien</span>
                    <Users className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-black text-white mt-1.5">{totalClients}</p>
                  <span className="text-[10px] text-slate-500">Customer Terdaftar</span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('approvals')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    pendingApprovalClients.length > 0
                      ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-amber-300 text-xs font-bold">
                    <span>Approval</span>
                    <Clock className={`w-4 h-4 ${pendingApprovalClients.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                  </div>
                  <p className="text-2xl font-black text-amber-400 mt-1.5">{pendingApprovalClients.length}</p>
                  <span className="text-[10px] text-amber-300/90 font-medium">
                    {pendingApprovalClients.length > 0 ? '⚡ Klik untuk Review' : 'Semua Beres'}
                  </span>
                </button>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Aktif & Unlimited</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-emerald-400 mt-1.5">{activeClients}</p>
                  <span className="text-[10px] text-emerald-500/80">Akses Penuh Booth</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Masa Trial</span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-amber-300 mt-1.5">{trialClients}</p>
                  <span className="text-[10px] text-amber-500/80">Uji Coba Berjalan</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>Expired</span>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <p className="text-2xl font-black text-rose-400 mt-1.5">{expiredClients}</p>
                  <span className="text-[10px] text-rose-500/80">Perlu Follow-up</span>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari username, bisnis, email, PIN..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none font-bold"
                  >
                    <option value="all">Semua Status ({totalClients})</option>
                    <option value="pending">⏳ Menunggu Approval ({pendingApprovalClients.length})</option>
                    <option value="expiring_soon">⚠️ Sisa Masa Aktif &lt; 3 Hari ({expiringSoonClients.length})</option>
                    <option value="active">🟢 Hanya Aktif ({activeClients})</option>
                    <option value="trial">🟡 Hanya Trial ({trialClients})</option>
                    <option value="unlimited">♾️ Hanya Unlimited (OFF)</option>
                    <option value="expired">🔴 Hanya Expired ({expiredClients})</option>
                    <option value="suspended">⚫ Suspended</option>
                  </select>
                </div>
              </div>

              {/* Customer Cards List */}
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 text-xs">
                    Tidak ada data customer yang sesuai dengan pencarian atau filter.
                  </div>
                ) : (
                  filteredUsers.map((client) => {
                    const isPending = client.subscriptionStatus === 'pending_approval' || client.approvalStatus === 'pending';
                    const isUnl = isDurationUnlimited(client.subscriptionEndDate);
                    const remainingDays = calculateRemainingDays(client.subscriptionEndDate);
                    const isExpired = !isPending && !isUnl && (client.subscriptionStatus === 'expired' || remainingDays < 0);
                    const isExpiringSoon = !isPending && !isUnl && !isExpired && remainingDays < 3 && remainingDays >= 0;
                    const isTrial = !isPending && client.subscriptionStatus === 'trial' && !isExpired;
                    const isEditing = editingUserId === client.id;
                    const showPassword = !!showPasswordMap[client.id];

                    return (
                      <div
                        key={client.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPending
                            ? 'border-amber-500/60 bg-amber-950/20 ring-1 ring-amber-500/30'
                            : isExpired
                            ? 'border-rose-900/50 bg-rose-950/10'
                            : isExpiringSoon
                            ? 'border-amber-500/70 bg-amber-950/20 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5'
                            : isTrial
                            ? 'border-amber-900/50 bg-amber-950/10'
                            : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Client Info */}
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`p-3 rounded-2xl border shrink-0 ${
                                isPending
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : isExpired
                                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                                  : isExpiringSoon
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : isTrial
                                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                                  : isUnl
                                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                                  : 'bg-gradient-to-br from-rose-500/20 to-amber-500/20 border-rose-500/30 text-amber-300'
                              }`}
                            >
                              {isUnl ? <InfinityIcon className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-white">
                                  {client.businessName || client.displayName}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-semibold">
                                  @{client.username || client.email.split('@')[0]}
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                    isPending
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                      : isExpired
                                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                      : isExpiringSoon
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse font-mono'
                                      : isTrial
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : isUnl
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  }`}
                                >
                                  {isPending
                                    ? '⏳ Menunggu Approval'
                                    : isExpired
                                    ? '🔴 Expired'
                                    : isExpiringSoon
                                    ? `⚠️ Sisa masa aktif: ${remainingDays === 0 ? 'Hari ini' : `${remainingDays} hari`}`
                                    : isTrial
                                    ? `🟡 Trial (${remainingDays} Hari Lagi)`
                                    : isUnl
                                    ? '♾️ Tanpa Batas (OFF)'
                                    : `🟢 Aktif (${remainingDays} Hari Lagi)`}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                                  {client.email}
                                </span>

                                {/* Password view badge */}
                                <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px] font-mono text-rose-300">
                                  <Lock className="w-3 h-3 text-rose-400" />
                                  <span>
                                    Pass: {showPassword ? (client.password || '123456') : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPasswordMap((prev) => ({
                                        ...prev,
                                        [client.id]: !prev[client.id],
                                      }))
                                    }
                                    className="ml-1 text-slate-400 hover:text-white"
                                  >
                                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </span>

                                {client.phone && (
                                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                                    <Phone className="w-3.5 h-3.5" />
                                    {client.phone}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 font-mono text-amber-300">
                                  <KeyRound className="w-3.5 h-3.5" />
                                  PIN: {client.boothAccessPin || '1234'}
                                </span>
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Calendar className="w-3.5 h-3.5" />
                                  s/d: <strong className="text-slate-300 ml-1">{isUnl ? 'Selamanya (OFF)' : client.subscriptionEndDate}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                            {/* If pending, show quick approve */}
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleApproveUser(client)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer animate-pulse"
                                title="Setujui pendaftaran klien ini"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Setujui</span>
                              </button>
                            )}

                            {/* Quick Extend / Trial / OFF */}
                            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                              <span className="text-[10px] font-bold text-slate-400 px-1.5">Aksi:</span>
                              <button
                                type="button"
                                onClick={() => handleExtendDays(client.id, client.subscriptionEndDate, 3, true)}
                                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[10px] font-bold transition-colors"
                                title="Set/Perpanjang Trial 3 Hari"
                              >
                                +3 H Trial
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExtendDays(client.id, client.subscriptionEndDate, 7, false)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-[10px] font-bold transition-colors"
                                title="Perpanjang 7 Hari (Mingguan)"
                              >
                                +7 H
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExtendDays(client.id, client.subscriptionEndDate, 30, false)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-[10px] font-bold transition-colors"
                                title="Perpanjang 30 Hari (Bulanan)"
                              >
                                +30 H
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetUnlimited(client.id)}
                                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 text-[10px] font-bold transition-colors"
                                title="Set Durasi ke OFF (Tanpa Batas)"
                              >
                                Set OFF
                              </button>
                            </div>

                            {/* Impersonate button */}
                            <button
                              type="button"
                              onClick={() => {
                                onImpersonateUser(client);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
                              title="Masuk sebagai klien ini untuk mengatur booth mereka"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              <span>Masuk</span>
                            </button>

                            {/* Edit detail button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingUserId(null);
                                } else {
                                  handleStartEditClient(client);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1 transition-colors"
                              title="Ganti Username, Password, & Durasi Klien"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit & Durasi</span>
                            </button>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Hapus customer ${client.businessName || client.displayName}?`)) {
                                  onDeleteUser(client.id);
                                }
                              }}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Hapus Klien"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Edit Form for Customer Details & Credentials */}
                        {isEditing && (
                          <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-900/90 p-4 sm:p-5 rounded-2xl space-y-4 animate-in fade-in">
                            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4" />
                              Edit Kredensial & Pengaturan Durasi: {client.businessName || client.displayName}
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                                  <User className="w-3 h-3 text-amber-400" />
                                  Username Klien
                                </label>
                                <input
                                  type="text"
                                  value={editUsername}
                                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                                  placeholder="username"
                                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-500 outline-none"
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-rose-400" />
                                    Password Klien
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setEditPassword(generateRandomPass())}
                                    className="text-[10px] text-amber-400 hover:underline"
                                  >
                                    Generate
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder="Password baru"
                                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-rose-500 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                                  <KeyRound className="w-3 h-3 text-cyan-400" />
                                  PIN Kiosk (4-6 Digit)
                                </label>
                                <input
                                  type="text"
                                  value={editPin}
                                  maxLength={6}
                                  onChange={(e) => setEditPin(e.target.value.replace(/[^0-9]/g, ''))}
                                  placeholder="1234"
                                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1">Status Lisensi:</label>
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value as SubscriptionStatus)}
                                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                                >
                                  <option value="active">🟢 Aktif (Reguler/OFF)</option>
                                  <option value="trial">🟡 Trial (Masa Uji Coba)</option>
                                  <option value="expired">🔴 Expired</option>
                                  <option value="suspended">⚫ Suspended</option>
                                </select>
                              </div>

                              <div className="sm:col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-bold text-slate-400">Tanggal Berakhir / Masa Aktif:</label>
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                        setEditEndDate(d);
                                        setEditStatus('trial');
                                      }}
                                      className="text-amber-400 hover:underline"
                                    >
                                      +7 H Trial
                                    </button>
                                    <span className="text-slate-600">•</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                        setEditEndDate(d);
                                        setEditStatus('active');
                                      }}
                                      className="text-emerald-400 hover:underline"
                                    >
                                      +30 Hari
                                    </button>
                                    <span className="text-slate-600">•</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditEndDate('2099-12-31');
                                        setEditStatus('active');
                                      }}
                                      className="text-cyan-400 hover:underline font-bold"
                                    >
                                      Set OFF (Tanpa Batas)
                                    </button>
                                  </div>
                                </div>
                                <input
                                  type="date"
                                  value={editEndDate}
                                  onChange={(e) => setEditEndDate(e.target.value)}
                                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                                />
                                {isDurationUnlimited(editEndDate) && (
                                  <p className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
                                    <InfinityIcon className="w-3 h-3" />
                                    Mode Durasi: OFF (Tanpa Batas Masa Berlaku / Selamanya Aktif)
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs hover:text-white font-semibold"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(client.id)}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:brightness-110 flex items-center gap-1.5 shadow"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Simpan Kredensial & Durasi</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PENDING APPROVALS */}
          {activeTab === 'approvals' && (
            <PendingApprovalsTab
              pendingUsers={pendingApprovalClients}
              onApprove={handleApproveUser}
              onReject={handleRejectUser}
              onDelete={onDeleteUser}
              superAdminAccount={superAdminAccount}
            />
          )}

          {/* TAB 3: ADD NEW CLIENT */}
          {activeTab === 'add_new' && (
            <form onSubmit={handleCreateClient} className="space-y-5 max-w-2xl mx-auto animate-in fade-in duration-150">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  Formulir Tambah Customer Baru
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Nama Bisnis / Brand Vendor *</label>
                    <input
                      type="text"
                      required
                      value={newBusinessName}
                      onChange={(e) => {
                        setNewBusinessName(e.target.value);
                        if (!newUsername) {
                          setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        }
                      }}
                      placeholder="Contoh: Platinum Photobooth Bali"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Nama Pemilik / PIC</label>
                    <input
                      type="text"
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="Nama Kontak"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Username & Password for New Customer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      Username Login Klien
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      placeholder="contoh: platinumbali"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        Password Akun
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewPassword(generateRandomPass())}
                        className="text-[10px] text-amber-400 hover:underline"
                      >
                        Generate Acak
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Default: 123456"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Email Akun *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="vendor@photobooth.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Pilihan Durasi / Trial / OFF */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Pilihan Masa Aktif / Trial / OFF</span>
                    <span className="text-[11px] text-amber-400 font-normal">Fleksibel & Otomatis</span>
                  </label>
                  <select
                    value={newDurationType}
                    onChange={(e) => setNewDurationType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-500 outline-none"
                  >
                    <optgroup label="🟡 Pilihan Masa Trial (Uji Coba)">
                      <option value="trial_3">Trial 3 Hari (Gratis Uji Coba)</option>
                      <option value="trial_7">Trial 7 Hari (1 Minggu)</option>
                      <option value="trial_14">Trial 14 Hari (2 Minggu)</option>
                      <option value="trial_30">Trial 30 Hari (1 Bulan)</option>
                    </optgroup>
                    <optgroup label="🟢 Paket Langganan Reguler">
                      <option value="week_1">Mingguan (7 Hari) — Rp 30.000</option>
                      <option value="month_1">Bulanan (30 Hari) — Rp 50.000</option>
                      <option value="month_3">3 Bulan (90 Hari) — Rp 140.000</option>
                      <option value="month_6">6 Bulan (180 Hari) — Rp 270.000</option>
                      <option value="year_1">Tahunan (365 Hari) — Rp 500.000</option>
                    </optgroup>
                    <optgroup label="♾️ Tanpa Batas / Durasi OFF">
                      <option value="off">OFF / Tanpa Batas (Unlimited / Selamanya Aktif)</option>
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">PIN Akses Booth (4-6 Digit)</label>
                    <input
                      type="text"
                      value={newPin}
                      maxLength={6}
                      onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="1234"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Catatan Internal</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Contoh: Klien paket wedding Bali"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan ke Cloud...' : 'Simpan & Aktifkan Klien'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SUPER ADMIN PROFILE & SECURITY SETTINGS */}
          {activeTab === 'admin_profile' && (
            <form onSubmit={handleSaveAdminProfile} className="space-y-5 max-w-xl mx-auto animate-in fade-in duration-150">
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Pengaturan Akun Super Administrator
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ganti username, password login, dan master PIN Super Admin
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Username Super Admin
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="admin"
                    className="w-full bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-xs font-medium focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      Password Super Admin
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdminPassword(generateRandomPass(10))}
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      Generate Password Acak
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password login admin"
                      className="w-full bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-xs pr-10 font-mono focus:border-rose-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nama Tampilan Admin
                    </label>
                    <input
                      type="text"
                      required
                      value={adminDisplayName}
                      onChange={(e) => setAdminDisplayName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Master PIN Kiosk
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-xs font-mono focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Email Super Admin
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:border-amber-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAdminSaving}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isAdminSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Simpan Perubahan Akun Super Admin</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
