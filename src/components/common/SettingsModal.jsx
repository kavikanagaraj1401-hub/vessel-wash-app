import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import {
  RotateCcw,
  Info,
  Check,
  ShieldAlert,
  Sparkles,
  Lock,
  FileSpreadsheet,
  Users,
  Repeat,
  Upload,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Menu,
  Database,
  Copy,
  LogOut,
} from 'lucide-react';
import { parseExcelTimetable } from '../../logic/excelImporter';
import { MembersScreen } from '../../screens/MembersScreen';
import { RotationScreen } from '../../screens/RotationScreen';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  isSupabaseConfigured,
} from '../../services/supabaseClient';
import { getTodayDateStr } from '../../logic/dateUtils';

export function SettingsModal({
  isOpen,
  onClose,
  isAdmin = false,
  userName = 'Kavipriyan',
  userEmail = '',
  onSignOut,
  members = [],
  queue = [],
  attendanceLogs = [],
  computedDays = [],
  todayDateStr = getTodayDateStr(),
  adminUserIds = ['m1'],
  onToggleAdminRole,
  onAddMember,
  onEditMember,
  onToggleMemberStatus,
  onImportExcel,
  onResetData,
}) {
  const [activeTab, setActiveTab] = useState(() => (isAdmin ? 'excel' : 'rotation')); // 'excel' | 'members' | 'rotation' | 'rules'
  const [resetConfirm, setResetConfirm] = useState(false);

  // If user is not admin, ensure they cannot stay on admin-only tabs
  useEffect(() => {
    if (!isAdmin && (activeTab === 'excel' || activeTab === 'members')) {
      setActiveTab('rotation');
    }
  }, [isAdmin, activeTab]);

  // Excel Upload states
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'parsing' | 'preview' | 'success' | 'error'
  const [parsedData, setParsedData] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Supabase Cloud Configuration states
  const [supabaseConfig, setSupabaseConfig] = useState(() => getSupabaseConfig());
  const [dbUrl, setDbUrl] = useState(supabaseConfig.url || '');
  const [dbKey, setDbKey] = useState(supabaseConfig.key || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveCredentials = () => {
    saveSupabaseConfig(dbUrl, dbKey);
    setSavedSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  const handleCopySql = () => {
    const sql = `-- 1. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    rotation_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. APPLICATION_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.application_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ATTENDANCE_HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.attendance_history (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    is_provided BOOLEAN NOT NULL DEFAULT FALSE,
    eaters JSONB NOT NULL DEFAULT '[]'::jsonb,
    washers_count INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WASHER_ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS public.washer_activity (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    assigned_washer_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    assigned_washer_names JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_washer_id TEXT,
    next_washer_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REALTIME REPLICATION (SAFE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'application_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.application_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance_history') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_history;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'washer_activity') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.washer_activity;
  END IF;
END $$;

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.washer_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access on members" ON public.members;
DROP POLICY IF EXISTS "Allow anonymous write access on members" ON public.members;
CREATE POLICY "Allow anonymous read access on members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access on members" ON public.members FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous read access on application_settings" ON public.application_settings;
DROP POLICY IF EXISTS "Allow anonymous write access on application_settings" ON public.application_settings;
CREATE POLICY "Allow anonymous read access on application_settings" ON public.application_settings FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access on application_settings" ON public.application_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous read access on attendance_history" ON public.attendance_history;
DROP POLICY IF EXISTS "Allow anonymous write access on attendance_history" ON public.attendance_history;
CREATE POLICY "Allow anonymous read access on attendance_history" ON public.attendance_history FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access on attendance_history" ON public.attendance_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anonymous read access on washer_activity" ON public.washer_activity;
DROP POLICY IF EXISTS "Allow anonymous write access on washer_activity" ON public.washer_activity;
CREATE POLICY "Allow anonymous read access on washer_activity" ON public.washer_activity FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write access on washer_activity" ON public.washer_activity FOR ALL USING (true);

-- 5. RPC FUNCTION: create_member_credential (Admin Member Credential Creation)
CREATE OR REPLACE FUNCTION public.create_member_credential(
    member_id TEXT,
    member_email TEXT,
    member_password TEXT,
    member_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = LOWER(TRIM(member_email));
    
    IF new_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            LOWER(TRIM(member_email)),
            crypt(member_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('role', member_role),
            NOW(),
            NOW()
        )
        RETURNING id INTO new_user_id;
    ELSE
        UPDATE auth.users
        SET encrypted_password = crypt(member_password, gen_salt('bf')),
            updated_at = NOW()
        WHERE id = new_user_id;
    END IF;

    UPDATE public.members
    SET email = LOWER(TRIM(member_email)),
        role = member_role,
        updated_at = NOW()
    WHERE id = member_id OR LOWER(TRIM(email)) = LOWER(TRIM(member_email));

    RETURN jsonb_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. RPC FUNCTION: admin_reset_member_password (Admin-Only Password Reset)
CREATE OR REPLACE FUNCTION public.admin_reset_member_password(
    target_email TEXT,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(target_email));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found in authentication system');
    END IF;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(sql).then(() => {
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 2500);
      });
    }
  };

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleReset = () => {
    onResetData();
    setResetConfirm(false);
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('parsing');
    setUploadError('');

    try {
      const result = await parseExcelTimetable(file, members);
      setParsedData(result);
      setUploadStatus('preview');
    } catch (err) {
      console.error('Failed to parse Excel:', err);
      setUploadError(err.message || 'Failed to read the Excel file. Please ensure it is a valid timetable file.');
      setUploadStatus('error');
    }
  };

  const handleApplyExcel = () => {
    if (!parsedData || !onImportExcel) return;
    onImportExcel(parsedData);
    setUploadStatus('success');
    setTimeout(() => {
      onClose();
      setUploadStatus('idle');
      setParsedData(null);
    }, 1500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${
        isOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-[#1E1E1E]/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Side Slide Drawer Container (Sliding in from the right) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex justify-end">
        <div
          className={`w-screen max-w-[420px] bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-border/60 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#1E1E1E] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <Menu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1E1E1E] leading-tight">Menu & Settings</h3>
                <p className="text-[11px] text-neutral-textSecondary">Rotation, members & Excel sync</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-neutral-500 hover:text-[#1E1E1E] hover:bg-[#ECEEF0] transition-colors"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 text-neutral-textSecondary">
            {/* Active User Account Banner in Drawer */}
            <div className="p-3 rounded-2xl bg-white border border-neutral-border/80 shadow-2xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isAdmin ? 'bg-[#A28EF9] text-[#1E1E1E]' : 'bg-[#1E1E1E] text-white'
                  }`}
                >
                  {isAdmin ? '👑' : (userName.charAt(0) || 'U')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#1E1E1E] truncate">{userName}</span>
                    {isAdmin ? (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-violet-100 text-violet-800">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-600">
                        Member
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-textSecondary block truncate">
                    {userEmail || 'Active session'}
                  </span>
                </div>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={async () => {
                    onClose();
                    await onSignOut();
                  }}
                  className="px-2.5 py-1.5 rounded-full text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 active-scale flex-shrink-0 cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Log Out</span>
                </button>
              )}
            </div>

            {/* Navigation Tabs in Settings: Admins see all 4 tabs; Members see only Rotation & Rules */}
            {isAdmin ? (
              <div className="grid grid-cols-4 p-1 bg-[#ECEEF0] rounded-full border border-neutral-border/60 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('excel')}
                  className={`py-1.5 px-1.5 rounded-full flex items-center justify-center gap-1 transition-all select-none truncate cursor-pointer ${
                    activeTab === 'excel'
                      ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
                      : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Excel Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className={`py-1.5 px-1.5 rounded-full flex items-center justify-center gap-1 transition-all select-none truncate cursor-pointer ${
                    activeTab === 'members'
                      ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
                      : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Members</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rotation')}
                  className={`py-1.5 px-1.5 rounded-full flex items-center justify-center gap-1 transition-all select-none truncate cursor-pointer ${
                    activeTab === 'rotation'
                      ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
                      : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Rotation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className={`py-1.5 px-1.5 rounded-full flex items-center justify-center gap-1 transition-all select-none truncate cursor-pointer ${
                    activeTab === 'rules'
                      ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
                      : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Rules</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 p-1 bg-[#ECEEF0] rounded-full border border-neutral-border/60 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('rotation')}
                  className={`py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition-all select-none truncate cursor-pointer ${
                    activeTab === 'rotation'
                      ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
                      : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">Rotation Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rules')}
                  className={`py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition-all select-none truncate cursor-pointer ${
                    activeTab === 'rules'
                      ? 'bg-[#1E1E1E] text-white shadow-xs font-bold'
                      : 'text-neutral-textSecondary hover:text-neutral-textPrimary font-semibold'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">System Rules</span>
                </button>
              </div>
            )}

        {/* TAB 1: EXCEL SYNC & UPLOAD */}
        {activeTab === 'excel' && (
          <div className="space-y-3 animate-fadeIn text-xs">
            <div className="p-3.5 rounded-[22px] bg-[#A4F5A6]/20 border border-[#A4F5A6]/40 text-[#1E1E1E] space-y-1">
              <span className="font-bold flex items-center gap-1 text-xs text-[#1E1E1E]">
                <FileSpreadsheet className="w-4 h-4 text-[#1E1E1E]" />
                Upload Updated Timetable Excel
              </span>
              <p className="text-[11px] text-neutral-textSecondary leading-snug">
                Upload your updated Excel sheet with all past attendance records. The system will detect the last recorded date and seamlessly continue the rotation rules from today onwards.
              </p>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 rounded-xl border-2 border-dashed border-neutral-border hover:border-primary bg-neutral-surfaceSecondary/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors active-scale text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs text-neutral-textPrimary block">
                  Click to Browse or Drop Excel File
                </span>
                <span className="text-[10px] text-neutral-textTertiary">
                  Supports .xlsx, .xls, or .csv (Timetable Format)
                </span>
              </div>
            </div>

            {/* Status: Parsing */}
            {uploadStatus === 'parsing' && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                <span>Reading and analyzing timetable records...</span>
              </div>
            )}

            {/* Status: Error */}
            {uploadStatus === 'error' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Import Failed</span>
                </div>
                <p className="text-[11px] text-rose-700">{uploadError}</p>
              </div>
            )}

            {/* Status: Preview */}
            {uploadStatus === 'preview' && parsedData && (
              <div className="p-3.5 rounded-xl bg-white border border-neutral-border shadow-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-neutral-border pb-2">
                  <span className="font-bold text-xs text-neutral-textPrimary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    File Ready for Sync
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-surfaceSecondary text-neutral-textSecondary border border-neutral-border">
                    {parsedData.sheetName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-neutral-surfaceSecondary/60 border border-neutral-border/60">
                    <span className="text-neutral-textTertiary block text-[10px]">Total Days Found</span>
                    <strong className="text-neutral-textPrimary text-xs">{parsedData.totalRows} days</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-surfaceSecondary/60 border border-neutral-border/60">
                    <span className="text-neutral-textTertiary block text-[10px]">Last Marked Date</span>
                    <strong className="text-primary text-xs">{parsedData.lastMarkedDate || 'None'}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-surfaceSecondary/60 border border-neutral-border/60 col-span-2">
                    <span className="text-neutral-textTertiary block text-[10px]">Recorded Duties Parsed</span>
                    <strong className="text-neutral-textPrimary text-xs">{parsedData.attendanceLogs.length} historical wash records</strong>
                  </div>
                </div>

                {!isAdmin ? (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Applying Excel updates is locked to Admin <strong>Kavipriyan</strong>.</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyExcel}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 active-scale transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply & Sync Timetable from Excel</span>
                  </button>
                )}
              </div>
            )}

            {/* Status: Success */}
            {uploadStatus === 'success' && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-xs font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Timetable applied successfully! Recalculating rotation...</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS MANAGEMENT */}
        {activeTab === 'members' && (
          <div className="animate-fadeIn -mx-5 -mb-4">
            <MembersScreen
              members={members}
              queue={queue}
              attendanceLogs={attendanceLogs}
              isAdmin={isAdmin}
              adminUserIds={adminUserIds}
              onToggleAdminRole={onToggleAdminRole}
              onAddMember={onAddMember}
              onEditMember={onEditMember}
              onToggleMemberStatus={onToggleMemberStatus}
            />
          </div>
        )}

        {/* TAB 3: ROTATION SCHEDULE */}
        {activeTab === 'rotation' && (
          <div className="animate-fadeIn -mx-5 -mb-4">
            <RotationScreen
              computedDays={computedDays}
              todayDateStr={todayDateStr}
              attendanceLogs={attendanceLogs}
            />
          </div>
        )}

        {/* TAB 4: SYSTEM RULES & FACTORY RESET */}
        {activeTab === 'rules' && (
          <div className="space-y-3.5 animate-fadeIn text-xs text-neutral-textSecondary">
            <div className="p-3 rounded-xl bg-neutral-surfaceSecondary border border-neutral-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-neutral-textPrimary font-semibold text-xs">
                <Info className="w-4 h-4 text-primary" />
                <span>Rotation System Engine Rules</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-neutral-textSecondary text-[11px]">
                <li><strong>Single Shared Queue:</strong> One unified queue for Lunch and Dinner. Lunch is assigned first; dinner continues from the remainder.</li>
                <li><strong>Washer Selection:</strong> Assigned to whoever is nearest the front of the queue who ate that meal.</li>
                <li><strong>Absence Defers Turn:</strong> Absent members keep their place at the front; they wash next time they eat.</li>
                <li><strong>Never-Washed Priority:</strong> Members with fewer washes always sit ahead in the queue.</li>
                <li><strong>No Make-Up Debt:</strong> Missed duties never create debt.</li>
              </ul>
            </div>

            {/* Supabase Cloud Connection Panel */}
            <div className="p-3.5 rounded-xl bg-white border border-neutral-border space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-textPrimary">
                  <Database className="w-4 h-4 text-[#7D64F6]" />
                  <span>Supabase Cloud Database</span>
                </div>
                {isSupabaseConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                    Local Storage Mode
                  </span>
                )}
              </div>

              <p className="text-[11px] text-neutral-textSecondary leading-relaxed">
                Connect your Supabase project to track attendance and sync assignments across devices in Realtime.
              </p>

              {isAdmin ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-textPrimary uppercase tracking-wider mb-1">
                      Project URL
                    </label>
                    <input
                      type="text"
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-border focus:border-[#7D64F6] focus:outline-hidden font-mono bg-[#ECEEF0]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-textPrimary uppercase tracking-wider mb-1">
                      Anon / Public API Key
                    </label>
                    <input
                      type="password"
                      value={dbKey}
                      onChange={(e) => setDbKey(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-border focus:border-[#7D64F6] focus:outline-hidden font-mono bg-[#ECEEF0]/40"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveCredentials}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#1E1E1E] text-white text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-1"
                    >
                      {savedSuccess ? 'Saved! Reloading...' : 'Save & Connect'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="py-1.5 px-3 rounded-lg bg-[#ECEEF0] hover:bg-neutral-200 text-neutral-textPrimary text-xs font-semibold flex items-center gap-1 transition-colors border border-neutral-border/60"
                      title="Copy SQL Schema for Supabase SQL Editor"
                    >
                      {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-neutral-surfaceSecondary border border-neutral-border text-[11px] text-neutral-textTertiary">
                  Supabase database configuration is managed by Admin <strong>Kavipriyan</strong>.
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white border border-neutral-border space-y-2 text-xs">
              <h4 className="font-semibold text-neutral-textPrimary">Configuration</h4>
              <div className="flex justify-between py-1 border-b border-neutral-border text-[11px]">
                <span>Timeline:</span>
                <span className="font-semibold text-neutral-textPrimary">Continuous Multi-Year</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-border text-[11px]">
                <span>Current Date:</span>
                <span className="font-semibold text-neutral-textPrimary">{todayDateStr}</span>
              </div>
              <div className="flex justify-between py-1 text-[11px]">
                <span>Admin:</span>
                <span className="font-semibold text-violet-700">👑 Kavipriyan (Primary Admin)</span>
              </div>
            </div>

            {/* Factory Reset */}
            <div className="pt-2 border-t border-neutral-border">
              {!isAdmin ? (
                <div className="p-2.5 rounded-lg bg-neutral-surfaceSecondary border border-neutral-border text-[11px] text-neutral-textTertiary flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-neutral-textSecondary shrink-0" />
                  <span>System reset is locked to Admin <strong>Kavipriyan</strong> only.</span>
                </div>
              ) : !resetConfirm ? (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="text-status-error text-xs font-semibold hover:underline flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Excel Seed Data (Admin Only)</span>
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-status-errorBg border border-status-errorBorder space-y-2">
                  <p className="text-xs text-status-error font-medium">
                    Reset all attendance records and restore initial members and continuous rotation?
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={handleReset}>
                      Yes, Reset Everything
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setResetConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
