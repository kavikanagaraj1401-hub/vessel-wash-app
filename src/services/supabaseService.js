import { supabase, isSupabaseConfigured, getIsolatedAuthClient } from './supabaseClient';
import { extractNameFromEmail, isKavipriyanEmail } from '../logic/authUtils';

/**
 * Supabase Data & Realtime Service for Vessel Wash App
 * Handles database operations for:
 * - members
 * - application_settings (roster rules & configuration JSON)
 * - attendance_history
 * - washer_activity
 * - Realtime subscriptions
 */
export const supabaseService = {
  /**
   * Fetch active members, application rules, and attendance from Supabase on app load.
   */
  async fetchInitialData() {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, reason: 'unconfigured' };
    }

    try {
      // 1. Fetch Members ordered by rotation_order
      const { data: dbMembers, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('rotation_order', { ascending: true });

      if (membersError) throw membersError;

      const normalizedMembers = (dbMembers || []).map((m, idx) => ({
        id: m.id,
        name: m.full_name || m.name,
        email: m.email || null,
        role: m.role || 'member',
        code: `M${m.rotation_order || idx + 1}`,
        status: m.is_active !== undefined ? (m.is_active ? 'active' : 'inactive') : 'active',
        rotation_order: m.rotation_order || idx + 1,
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));

      // 2. Fetch Application Settings (Rules, days config, queue)
      const { data: dbSettings, error: settingsError } = await supabase
        .from('application_settings')
        .select('*');

      if (settingsError) throw settingsError;

      const settingsMap = new Map(
        (dbSettings || []).map(s => [s.setting_key || s.key, s.setting_value || s.value])
      );

      // 3. Fetch Attendance History
      const { data: dbAttendance, error: attendanceError } = await supabase
        .from('attendance_history')
        .select('*');

      if (attendanceError) throw attendanceError;

      // 4. Fetch Washer Activity
      const { data: dbWasherActivity, error: washerError } = await supabase
        .from('washer_activity')
        .select('*');

      if (washerError) throw washerError;

      return {
        success: true,
        members: normalizedMembers.length > 0 ? normalizedMembers : null,
        daysConfig: settingsMap.get('days_config') || null,
        initialQueue: settingsMap.get('initial_queue') || null,
        rosterRules: settingsMap.get('roster_rules') || null,
        adminUserIds: settingsMap.get('admin_user_ids') || null,
        attendanceHistory: dbAttendance || [],
        washerActivity: dbWasherActivity || [],
      };
    } catch (err) {
      console.warn('⚠️ Supabase fetchInitialData error:', err.message || err);
      return { success: false, error: err };
    }
  },

  /**
   * Upsert members from an uploaded Excel roster, persisting their rotation_order.
   * Conforms strictly to schema: full_name, is_active, rotation_order (omits id on insert).
   */
  async upsertMembersFromRoster(membersList = [], queueOrder = []) {
    if (!isSupabaseConfigured || !supabase || !membersList.length) return false;

    try {
      const { data: existing } = await supabase.from('members').select('*');
      const existingMap = new Map(
        (existing || []).map(m => [(m.full_name || m.name || '').toLowerCase(), m])
      );

      for (let idx = 0; idx < membersList.length; idx++) {
        const m = membersList[idx];
        const queuePos = queueOrder.indexOf(m.id);
        const order = queuePos !== -1 ? queuePos + 1 : idx + 1;
        const found = existingMap.get((m.name || '').toLowerCase());

        const payload = {
          full_name: m.name,
          is_active: m.status === 'active',
          rotation_order: order,
        };

        if (found && found.id) {
          await supabase.from('members').update(payload).eq('id', found.id);
        } else {
          // Omit id completely so PostgreSQL generates UUID via gen_random_uuid()
          await supabase.from('members').insert([payload]);
        }
      }
      console.info(`✓ Successfully synced ${membersList.length} members to Supabase.`);
      return true;
    } catch (err) {
      console.error('Failed to upsert members to Supabase:', err);
      return false;
    }
  },

  /**
   * Store application rules, timetable matrix, initial queue, and admin user IDs into application_settings as JSON.
   * Conforms strictly to schema: setting_key, setting_value.
   */
  async saveApplicationRules({ daysConfig, initialQueue, rosterRules, adminUserIds }) {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const settingsItems = [
        { setting_key: 'days_config', setting_value: daysConfig },
        { setting_key: 'initial_queue', setting_value: initialQueue },
        { setting_key: 'roster_rules', setting_value: rosterRules || {} },
        { setting_key: 'admin_user_ids', setting_value: adminUserIds },
      ];

      for (const item of settingsItems) {
        if (!item.setting_value) continue;

        const { data: existing } = await supabase
          .from('application_settings')
          .select('id')
          .eq('setting_key', item.setting_key)
          .maybeSingle();

        if (existing && existing.id) {
          await supabase
            .from('application_settings')
            .update({
              setting_value: item.setting_value,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('application_settings').insert([
            {
              setting_key: item.setting_key,
              setting_value: item.setting_value,
              updated_at: new Date().toISOString(),
            },
          ]);
        }
      }

      console.info('✓ Successfully saved application settings & rules to Supabase.');
      return true;
    } catch (err) {
      console.error('Failed to save application rules to Supabase:', err);
      return false;
    }
  },

  /**
   * Save designated admin user IDs to Supabase application_settings.
   */
  async saveAdminUserIds(adminUserIds) {
    if (!isSupabaseConfigured || !supabase || !adminUserIds) return false;
    try {
      const { data: existing } = await supabase
        .from('application_settings')
        .select('id')
        .eq('setting_key', 'admin_user_ids')
        .maybeSingle();

      if (existing && existing.id) {
        await supabase
          .from('application_settings')
          .update({
            setting_value: adminUserIds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('application_settings').insert([
          {
            setting_key: 'admin_user_ids',
            setting_value: adminUserIds,
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      return true;
    } catch (err) {
      console.warn('Failed to save admin_user_ids to Supabase:', err);
      return false;
    }
  },

  /**
   * Insert a new member directly into the members table with an assigned rotation order.
   * Conforms strictly to schema: full_name, is_active, rotation_order (omits id to auto-generate UUID).
   */
  async addMemberToDatabase(newMember, rotationOrder) {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const payload = {
        full_name: newMember.name,
        is_active: newMember.status === 'active',
        rotation_order: rotationOrder || 999,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('members').insert([payload]).select();
      if (error) throw error;

      console.info(`✓ Added new member ${newMember.name} to Supabase with UUID:`, data?.[0]?.id);
      return data?.[0] || true;
    } catch (err) {
      console.error('Failed to insert member to Supabase:', err);
      return false;
    }
  },

  /**
   * Update an existing member's name or status in Supabase.
   * Conforms strictly to schema: full_name, is_active.
   */
  async updateMemberInDatabase(member) {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const isUuid =
        typeof member.id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

      const payload = {
        full_name: member.name,
        is_active: member.status === 'active',
      };

      let query = supabase.from('members').update(payload);
      if (isUuid) {
        query = query.eq('id', member.id);
      } else {
        query = query.eq('full_name', member.name);
      }

      const { error } = await query;
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update member in Supabase:', err);
      return false;
    }
  },

  /**
   * Update a member's role ('admin' or 'member') directly in the Supabase members table.
   * Conforms strictly to schema: role, updated_at.
   */
  async updateMemberRole(memberId, newRole) {
    if (!isSupabaseConfigured || !supabase || !memberId) return false;
    try {
      const isUuid =
        typeof memberId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);

      let query = supabase
        .from('members')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        });

      if (isUuid) {
        query = query.eq('id', memberId);
      } else {
        query = query.eq('full_name', memberId);
      }

      const { error } = await query;
      if (error) throw error;
      console.info(`✓ Successfully updated member ${memberId} role to "${newRole}" in Supabase.`);
      return true;
    } catch (err) {
      console.error('Failed to update member role in Supabase:', err);
      return false;
    }
  },

  /**
   * Fetch a member's role directly from the members table by email.
   */
  async fetchMemberRole(email) {
    if (!isSupabaseConfigured || !supabase || !email) return null;
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, email, role')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (error) throw error;
      return data?.role || null;
    } catch (err) {
      console.warn('Could not fetch member role:', err);
      return null;
    }
  },

  /**
   * Set or update authentication token for active Supabase Realtime WebSocket connection.
   */
  setRealtimeAuth(accessToken) {
    if (!isSupabaseConfigured || !supabase || !supabase.realtime) return;
    try {
      if (accessToken) {
        supabase.realtime.setAuth(accessToken);
        console.info('🔐 Supabase Realtime auth token attached');
      }
    } catch (err) {
      console.warn('⚠️ Could not set Realtime auth token:', err);
    }
  },

  /**
   * Save live attendance update and calculated washer activity to Supabase using upsert.
   * Conforms strictly to schema in PostgreSQL: id, date, meal, is_provided, eaters, washers_count, etc.
   */
  async saveAttendanceAndWasherActivity({
    date,
    meal,
    isProvided,
    eaters = [],
    washersCount = 1,
    assignedSlots = [],
    nextWasherId = null,
    nextWasherName = null,
  }) {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const recordId = `${date}_${meal}`;

      // 1. Attendance History: upsert record matching database schema (id, date, meal, is_provided, eaters, washers_count)
      const attRecord = {
        id: recordId,
        date,
        meal,
        meal_type: meal, // for backward/schema compatibility
        is_provided: Boolean(isProvided),
        eaters: eaters || [],
        washers_count: washersCount || 1,
        updated_at: new Date().toISOString(),
      };

      const { error: attErr } = await supabase
        .from('attendance_history')
        .upsert(attRecord, { onConflict: 'id' });

      if (attErr) {
        console.warn('⚠️ Supabase attendance_history upsert warning:', attErr.message);
      }

      // 2. Washer Activity: upsert record matching schema (id, date, meal, assigned_washer_ids, assigned_washer_names, next_washer_id, next_washer_name)
      const washRecord = {
        id: recordId,
        date,
        meal,
        meal_type: meal, // for backward/schema compatibility
        assigned_washer_ids: (assignedSlots || []).map(s => s.assignedMemberId).filter(Boolean),
        assigned_washer_names: (assignedSlots || []).map(s => s.assignedMemberName).filter(Boolean),
        next_washer_id: nextWasherId || null,
        next_washer_name: nextWasherName || null,
        updated_at: new Date().toISOString(),
      };

      const { error: washErr } = await supabase
        .from('washer_activity')
        .upsert(washRecord, { onConflict: 'id' });

      if (washErr) {
        console.warn('⚠️ Supabase washer_activity upsert warning:', washErr.message);
      }

      return true;
    } catch (err) {
      console.error('Failed to sync attendance/washer to Supabase:', err);
      return false;
    }
  },

  /**
   * Set up Supabase Realtime channel explicitly listening to changes on attendance_history, members, washer_activity, and application_settings.
   * Attaches session access token and handles teardown and automatic reconnection.
   */
  subscribeToRosterRealtime(onRealtimeChange, session = null) {
    if (!isSupabaseConfigured || !supabase) return () => {};

    try {
      // Clean up previous active channel before creating new one
      if (this._activeChannel) {
        try {
          supabase.removeChannel(this._activeChannel);
        } catch {
          // ignore
        }
        this._activeChannel = null;
      }

      // Explicitly attach token to Realtime WebSocket if available
      const token = session?.access_token;
      if (token) {
        this.setRealtimeAuth(token);
      }

      const channelName = `roster-realtime-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_history' },
          payload => {
            console.info('📡 [Realtime] attendance_history update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('attendance_history', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'washer_activity' },
          payload => {
            console.info('📡 [Realtime] washer_activity update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('washer_activity', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'members' },
          payload => {
            console.info('📡 [Realtime] members update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('members', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'application_settings' },
          payload => {
            console.info('📡 [Realtime] application_settings update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('application_settings', payload);
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn('⚠️ Realtime subscription warning/error:', err);
          } else {
            console.info('🔌 Supabase Realtime channel status:', status);
          }
          if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.info('🔄 Realtime channel dropped. Re-subscribing in 2s...');
            setTimeout(() => {
              if (this._activeChannel === channel) {
                this.subscribeToRosterRealtime(onRealtimeChange, session);
              }
            }, 2000);
          }
        });

      this._activeChannel = channel;

      return () => {
        try {
          supabase.removeChannel(channel);
          if (this._activeChannel === channel) {
            this._activeChannel = null;
          }
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.warn('Could not establish Supabase Realtime subscription:', err);
      return () => {};
    }
  },

  /**
   * Resolves a Username or Email to an actual registered email.
   * If identifier already has '@', returns it directly.
   * Otherwise looks up in local members cache and Supabase members database table.
   */
  async resolveMemberEmailFromIdentifier(identifier = '', membersList = []) {
    if (!identifier || typeof identifier !== 'string') return null;
    const clean = identifier.trim().toLowerCase();
    if (clean.includes('@')) {
      return clean;
    }

    // 1. Check local members list first
    if (Array.isArray(membersList) && membersList.length > 0) {
      const match = membersList.find(m => {
        const nameMatch = m.name && m.name.trim().toLowerCase() === clean;
        const codeMatch = m.code && m.code.trim().toLowerCase() === clean;
        const emailPrefixMatch = m.email && m.email.split('@')[0].trim().toLowerCase() === clean;
        const partialNameMatch = m.name && m.name.toLowerCase().includes(clean);
        return (nameMatch || codeMatch || emailPrefixMatch || partialNameMatch) && m.email;
      });
      if (match && match.email) {
        return match.email.toLowerCase().trim();
      }
    }

    // 2. Query Supabase database members table with a 5s safety timeout
    if (isSupabaseConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('members')
          .select('email, full_name')
          .or(`full_name.ilike.%${clean}%,email.ilike.${clean}@%`)
          .not('email', 'is', null)
          .limit(1);

        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: null }), 5000));
        const res = await Promise.race([queryPromise, timeoutPromise]);

        if (res && res.data && res.data[0]?.email) {
          return res.data[0].email.toLowerCase().trim();
        }
      } catch (err) {
        console.warn('Error resolving username in Supabase:', err);
      }
    }

    return null;
  },

  /**
   * Supabase Auth: Log in with Username or Email along with password.
   */
  async signInWithUsernameOrEmail(identifier, password, membersList = []) {
    if (!identifier || !password) {
      return { success: false, error: new Error('Username/Email and Password are required.') };
    }

    const resolvedEmail = await this.resolveMemberEmailFromIdentifier(identifier, membersList);
    if (!resolvedEmail) {
      if (!identifier.includes('@')) {
        return {
          success: false,
          error: new Error(
            `No account credentials found for "${identifier}". Please ask your Administrator to create credentials for you.`
          ),
        };
      }
      return this.signInWithEmail(identifier.trim().toLowerCase(), password);
    }

    return this.signInWithEmail(resolvedEmail, password);
  },

  /**
   * Admin-Only: Create or register credentials for a member in Supabase Auth and link to members table.
   * Uses RPC call create_member_credential if available, or isolated client auth.signUp fallback.
   */
  async createMemberCredentials({ memberId, name, email, password, role = 'member' }) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: new Error('Supabase is not configured.') };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: new Error('A valid email address is required.') };
    }
    if (!password || password.length < 6) {
      return { success: false, error: new Error('Password must be at least 6 characters.') };
    }

    try {
      // 1. Try RPC call first
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_member_credential', {
          member_id: String(memberId || ''),
          member_email: cleanEmail,
          member_password: password,
          member_role: role || 'member',
        });

        if (!rpcErr && (rpcRes?.success || rpcRes === true)) {
          console.info(`✓ Successfully created credentials for ${name} via RPC create_member_credential`);
          return { success: true, email: cleanEmail, method: 'rpc' };
        }
      } catch (rpcEx) {
        // RPC not defined, fall back to isolated client
      }

      // 2. Fallback: Use isolated Supabase Auth client without touching Admin session
      const isolatedClient = getIsolatedAuthClient();
      if (isolatedClient) {
        const { data: signUpData, error: signUpErr } = await isolatedClient.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: name,
              role: role,
            },
          },
        });

        if (signUpErr && !signUpErr.message?.toLowerCase().includes('already registered')) {
          throw signUpErr;
        }
      }

      // 3. Update members table with email & role
      const isUuid =
        typeof memberId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);

      let query = supabase.from('members').update({
        email: cleanEmail,
        role: role,
        updated_at: new Date().toISOString(),
      });

      if (isUuid) {
        query = query.eq('id', memberId);
      } else {
        query = query.eq('full_name', name);
      }

      const { error: updateErr } = await query;
      if (updateErr) throw updateErr;

      console.info(`✓ Successfully created and linked credentials for ${name} (${cleanEmail})`);
      return { success: true, email: cleanEmail, method: 'isolated_auth' };
    } catch (err) {
      console.error('Failed to create member credentials:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Admin-Only: Trigger a password reset or change a member's password directly from the Admin Panel.
   * Tries RPC admin_reset_member_password or sends password reset email.
   */
  async adminResetMemberPassword({ memberId, email, newPassword }) {
    if (!isSupabaseConfigured || !supabase || !email) {
      return { success: false, error: new Error('Supabase is not configured or email is missing.') };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. If new password provided, try direct RPC override
      if (newPassword && newPassword.length >= 6) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_reset_member_password', {
            target_email: cleanEmail,
            new_password: newPassword,
          });

          if (!rpcErr && (rpcRes?.success || rpcRes === true)) {
            console.info(`✓ Successfully reset password for ${cleanEmail} via RPC`);
            return { success: true, method: 'direct_rpc' };
          }
        } catch (rpcEx) {
          // RPC not defined, fall back to email reset
        }
      }

      // 2. Fallback: Trigger standard password reset email for the member
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (resetErr) throw resetErr;

      console.info(`✓ Sent password reset email to ${cleanEmail}`);
      return { success: true, method: 'email_link' };
    } catch (err) {
      console.error('Failed to reset member password:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Supabase Auth: Log in with email and password
   */
  async signInWithEmail(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: new Error('Supabase is not configured.') };
    }
    try {
      const cleanEmail = email.trim().toLowerCase();
      const signInPromise = supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sign-in request timed out after 10 seconds. Please check your network connection.')), 10000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
      if (error) throw error;
      return { success: true, session: data.session, user: data.user };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Supabase Auth: Sign up with email and password
   */
  async signUpWithEmail(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: new Error('Supabase is not configured.') };
    }
    try {
      const trimmedEmail = email.trim();
      const fullName = extractNameFromEmail(trimmedEmail);
      const role = isKavipriyanEmail(trimmedEmail) ? 'admin' : 'member';

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) throw error;

      // Automatically sync/insert into members database table as required
      await this.syncAuthMember({
        email: trimmedEmail,
        fullName,
        role,
      });

      return {
        success: true,
        session: data.session,
        user: data.user,
        requiresEmailConfirmation: !data.session && !!data.user,
      };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  /**
   * Supabase Auth: Log out / sign out
   */
  async signOut() {
    if (!isSupabaseConfigured || !supabase) return { success: true };
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.warn('Error signing out from Supabase:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Supabase Auth: Get current active session
   */
  async getSession() {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data?.session || null;
    } catch (err) {
      console.warn('Error getting session:', err);
      return null;
    }
  },

  /**
   * Supabase Auth: Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    if (!isSupabaseConfigured || !supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },

  /**
   * Insert or upsert a member record into the `members` database table on user authentication.
   * - Maps full_name (extracted from email), email, role ('admin' for Kavipriyan, otherwise 'member').
   */
  async syncAuthMember({ email, fullName, role = 'member' }) {
    if (!isSupabaseConfigured || !supabase || !email) return null;

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const cleanName = fullName || extractNameFromEmail(trimmedEmail);
      const assignedRole = role || (isKavipriyanEmail(trimmedEmail) ? 'admin' : 'member');

      // 1. Check if record with matching email already exists
      const { data: existingByEmail } = await supabase
        .from('members')
        .select('*')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (existingByEmail && existingByEmail.id) {
        const updatePayload = {
          full_name: cleanName || existingByEmail.full_name,
          role: assignedRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        const { data: updated } = await supabase
          .from('members')
          .update(updatePayload)
          .eq('id', existingByEmail.id)
          .select()
          .single();
        return updated || existingByEmail;
      }

      // 2. Check if an existing member with the same name exists (e.g. Kavipriyan created from seed)
      const { data: existingByName } = await supabase
        .from('members')
        .select('*')
        .ilike('full_name', cleanName)
        .maybeSingle();

      if (existingByName && existingByName.id) {
        const updatePayload = {
          email: trimmedEmail,
          role: assignedRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        const { data: updated } = await supabase
          .from('members')
          .update(updatePayload)
          .eq('id', existingByName.id)
          .select()
          .single();
        return updated || existingByName;
      }

      // 3. Otherwise, insert a new record with next rotation_order
      const { data: allMembers } = await supabase
        .from('members')
        .select('rotation_order')
        .order('rotation_order', { ascending: false })
        .limit(1);

      const nextOrder = (allMembers?.[0]?.rotation_order || 0) + 1;

      const newMemberPayload = {
        full_name: cleanName,
        email: trimmedEmail,
        role: assignedRole,
        is_active: true,
        rotation_order: nextOrder,
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('members')
        .insert([newMemberPayload])
        .select()
        .single();

      if (insertErr) throw insertErr;
      console.info(`✓ Successfully registered auth member "${cleanName}" (${assignedRole}) into Supabase`);
      return inserted;
    } catch (err) {
      console.warn('⚠️ Warning: syncAuthMember could not complete:', err.message || err);
      return null;
    }
  },
};
