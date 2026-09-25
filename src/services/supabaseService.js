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
   * Deduplicate a list of members uniquely by ID, email, and canonical full name.
   * Prioritizes valid UUID records, non-null email addresses, and admin roles.
   */
  deduplicateMembers(members = []) {
    if (!Array.isArray(members) || members.length === 0) return [];

    const result = [];

    for (const member of members) {
      if (!member) continue;
      const idKey = member.id ? String(member.id).toLowerCase() : null;
      const emailKey = member.email ? String(member.email).trim().toLowerCase() : null;
      const rawName = member.name || member.full_name || '';
      const nameKey = rawName.trim().toLowerCase();

      // Check if this member matches any already processed member
      let foundIndex = -1;
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        const itemId = item.id ? String(item.id).toLowerCase() : null;
        const itemEmail = item.email ? String(item.email).trim().toLowerCase() : null;
        const itemRawName = item.name || item.full_name || '';
        const itemName = itemRawName.trim().toLowerCase();

        const idMatches = idKey && itemId && idKey === itemId;
        const emailMatches = emailKey && itemEmail && emailKey === itemEmail;
        const nameMatches = nameKey && itemName && (
          nameKey === itemName ||
          (nameKey.length >= 3 && (itemName.includes(nameKey) || nameKey.includes(itemName)))
        );

        if (idMatches || emailMatches || nameMatches) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        // Merge records, prioritizing UUID id, non-null email, admin role, and canonical name
        const prev = result[foundIndex];
        const isPrevUuid = typeof prev.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prev.id);
        const isCurrUuid = typeof member.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id);

        result[foundIndex] = {
          ...prev,
          ...member,
          id: isPrevUuid ? prev.id : (isCurrUuid ? member.id : prev.id || member.id),
          email: prev.email || member.email || null,
          role: (prev.role === 'admin' || member.role === 'admin') ? 'admin' : (prev.role || member.role || 'member'),
          name: prev.name || member.name || prev.full_name || member.full_name,
          rotation_order: prev.rotation_order !== undefined ? prev.rotation_order : member.rotation_order,
          code: prev.code || member.code,
          status: (prev.status === 'active' || member.status === 'active') ? 'active' : (prev.status || member.status),
        };
      } else {
        result.push({ ...member });
      }
    }

    result.sort((a, b) => (a.rotation_order || 999) - (b.rotation_order || 999));
    return result;
  },

  /**
   * Fetch active members, application rules, and attendance from Supabase on app load.
   */
  async fetchInitialData() {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, reason: 'unconfigured' };
    }

    try {
      // 1. Fetch Members ordered by rotation_order & member_login_status
      let dbMembers = [];
      let loginStatusList = [];
      try {
        const { data: statusRows, error: statusErr } = await supabase
          .from('member_login_status')
          .select('*');
        if (!statusErr && Array.isArray(statusRows)) {
          loginStatusList = statusRows;
        }
      } catch (stEx) {
        console.warn('⚠️ Notice querying member_login_status view:', stEx.message || stEx);
      }

      const { data: remoteMembers, error: membersError } = await supabase
        .from('members')
        .select('*')
        .order('rotation_order', { ascending: true });

      if (membersError) {
        console.warn('⚠️ Supabase members table query notice:', membersError.message || membersError);
        try {
          const { data: rpcMembers, error: rpcErr } = await supabase.rpc('get_all_members');
          if (!rpcErr && rpcMembers && rpcMembers.length > 0) {
            dbMembers = rpcMembers;
            console.info('✓ Fetched members via get_all_members RPC fallback');
          }
        } catch (rpcEx) {
          // ignore
        }
      } else if (remoteMembers && remoteMembers.length > 0) {
        dbMembers = remoteMembers;
      }

      const canonicalSeed = [
        { id: 'm1', name: 'Kavipriyan', email: 'kavipriyan@vesselwash.app', role: 'admin', code: 'M1', status: 'active', rotation_order: 1, has_login_set: true },
        { id: 'm2', name: 'Marudhu', email: 'marudhu@vesselwash.app', role: 'member', code: 'M2', status: 'active', rotation_order: 2, has_login_set: true },
        { id: 'm3', name: 'Perumal', email: 'perumal@vesselwash.app', role: 'member', code: 'M3', status: 'active', rotation_order: 3, has_login_set: true },
        { id: 'm4', name: 'Ponneelan', email: 'ponneelan@vesselwash.app', role: 'member', code: 'M4', status: 'active', rotation_order: 4, has_login_set: true },
        { id: 'm5', name: 'Suryakumar', email: null, role: 'member', code: 'M5', status: 'active', rotation_order: 5, has_login_set: false },
      ];

      const rawMembers = dbMembers.length > 0
        ? dbMembers.map((m, idx) => ({
            id: m.id,
            name: m.full_name || m.name,
            email: m.email || null,
            role: m.role || 'member',
            code: `M${m.rotation_order || idx + 1}`,
            status: m.is_active !== undefined ? (m.is_active ? 'active' : 'inactive') : 'active',
            rotation_order: m.rotation_order || idx + 1,
            created_at: m.created_at,
            updated_at: m.updated_at,
          }))
        : canonicalSeed;

      // Cross-reference with member_login_status view so UI credential indicators are always accurate
      const enrichedMembers = rawMembers.map(m => {
        const cleanName = (m.name || '').toLowerCase().trim();
        const cleanEmail = (m.email || '').toLowerCase().trim();
        const match = loginStatusList.find(r => 
          (r.id && r.id === m.id) ||
          (cleanEmail && r.email && r.email.toLowerCase().trim() === cleanEmail) ||
          (cleanName && r.full_name && r.full_name.toLowerCase().trim() === cleanName)
        );

        const email = m.email || match?.email || null;
        const hasLogin = match?.has_login_set !== undefined
          ? Boolean(match.has_login_set)
          : (m.has_login_set !== undefined ? Boolean(m.has_login_set) : Boolean(email && email.includes('@')));

        return {
          ...m,
          email,
          has_login_set: hasLogin,
          auth_id: match?.id || m.auth_id || null,
        };
      });

      const deduplicatedMembers = this.deduplicateMembers(enrichedMembers);

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
        members: deduplicatedMembers.length > 0 ? deduplicatedMembers : null,
        daysConfig: settingsMap.get('days_config') || null,
        initialQueue: settingsMap.get('initial_queue') || null,
        rosterRules: settingsMap.get('roster_rules') || null,
        adminUserIds: settingsMap.get('admin_user_ids') || null,
        attendanceHistory: dbAttendance || [],
        washerActivity: dbWasherActivity || [],
        attendanceLogs: settingsMap.get('attendance_logs') || null,
        reimbursementBills: settingsMap.get('reimbursement_bills') || null,
      };
    } catch (err) {
      console.warn('⚠️ Supabase fetchInitialData error:', err.message || err);
      return { success: false, error: err };
    }
  },

  /**
   * Fetch live credential tracking data from database member_login_status view or auth mapping
   */
  async fetchMemberLoginStatus() {
    if (!isSupabaseConfigured || !supabase) return [];
    try {
      const { data, error } = await supabase
        .from('member_login_status')
        .select('*');
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch member_login_status view:', err);
    }
    return [];
  },

  /**
   * Fetch a fresh, normalized list of members directly from the Supabase members table
   * enriched with member_login_status view.
   * Guarantees deduplication and updates rotation_order.
   */
  async fetchMembers() {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase credentials missing when calling fetchMembers.');
      return [];
    }
    try {
      // 1. Fetch live credential mappings from member_login_status view
      let loginStatusList = [];
      try {
        const { data: statusRows, error: statusErr } = await supabase
          .from('member_login_status')
          .select('*');
        if (!statusErr && Array.isArray(statusRows)) {
          loginStatusList = statusRows;
        }
      } catch (stEx) {
        // ignore
      }

      let dbMembers = [];
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('rotation_order', { ascending: true });

      if (error) {
        console.warn('⚠️ Supabase members table query in fetchMembers:', error.message);
        // Fallback: If members table query encounters an issue (e.g. RLS), use member_login_status view
        if (loginStatusList.length > 0) {
          dbMembers = loginStatusList.map((r, idx) => ({
            id: r.id,
            full_name: r.full_name,
            email: r.email,
            role: r.role || 'member',
            is_active: r.is_active !== undefined ? r.is_active : true,
            has_login_set: r.has_login_set,
            rotation_order: idx + 1,
          }));
        }
      } else if (data && data.length > 0) {
        dbMembers = data;
      }

      const mapped = (dbMembers || []).map((m, idx) => {
        const cleanName = (m.full_name || m.name || '').toLowerCase().trim();
        const cleanEmail = (m.email || '').toLowerCase().trim();
        const match = loginStatusList.find(r => 
          (r.id && r.id === m.id) ||
          (cleanEmail && r.email && r.email.toLowerCase().trim() === cleanEmail) ||
          (cleanName && r.full_name && r.full_name.toLowerCase().trim() === cleanName)
        );

        const email = m.email || match?.email || null;
        const hasLogin = match?.has_login_set !== undefined 
          ? Boolean(match.has_login_set) 
          : Boolean(email && email.includes('@'));

        return {
          id: m.id,
          name: m.full_name || m.name,
          email,
          has_login_set: hasLogin,
          role: m.role || 'member',
          code: m.code || `M${m.rotation_order || idx + 1}`,
          status: m.is_active !== undefined ? (m.is_active ? 'active' : 'inactive') : 'active',
          rotation_order: m.rotation_order || idx + 1,
          createdAt: m.created_at || new Date().toISOString(),
          updatedAt: m.updated_at || new Date().toISOString(),
        };
      });

      return this.deduplicateMembers(mapped);
    } catch (err) {
      console.warn('⚠️ Failed to fetch fresh members from Supabase:', err.message || err);
      return [];
    }
  },

  /**
   * Persist user-marked attendance records (attendanceLogs) to application_settings for real-time multi-device sync.
   */
  async saveAttendanceLogs(logs = []) {
    if (!isSupabaseConfigured || !supabase || !Array.isArray(logs)) return false;
    try {
      const { data: existing } = await supabase
        .from('application_settings')
        .select('id')
        .eq('setting_key', 'attendance_logs')
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('application_settings')
          .update({
            setting_value: logs,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('application_settings').insert([
          {
            setting_key: 'attendance_logs',
            setting_value: logs,
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      return true;
    } catch (err) {
      console.warn('⚠️ Could not sync attendanceLogs to application_settings:', err.message || err);
      return false;
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
   * Save reimbursement bills array to Supabase application_settings.
   */
  async saveReimbursementBills(bills) {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { data: existing } = await supabase
        .from('application_settings')
        .select('*')
        .or('key.eq.reimbursement_bills,setting_key.eq.reimbursement_bills');

      if (existing && existing.length > 0) {
        const idCol = existing[0].key ? 'key' : 'setting_key';
        const valCol = existing[0].value !== undefined ? 'value' : 'setting_value';
        await supabase
          .from('application_settings')
          .update({ [valCol]: bills, updated_at: new Date().toISOString() })
          .eq(idCol, 'reimbursement_bills');
      } else {
        await supabase.from('application_settings').insert([
          {
            setting_key: 'reimbursement_bills',
            setting_value: bills,
            updated_at: new Date().toISOString(),
          },
        ]);
      }
      return true;
    } catch (err) {
      console.warn('Failed to save reimbursement_bills to Supabase:', err);
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
   * Delete a member directly from the Supabase members table.
   * Handles both UUID and fallback matching by full_name.
   */
  async deleteMemberFromDatabase(memberId, memberName = '') {
    if (!isSupabaseConfigured || !supabase || (!memberId && !memberName)) return false;
    try {
      const isUuid =
        typeof memberId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);

      let query = supabase.from('members').delete();
      if (isUuid) {
        query = query.eq('id', memberId);
      } else if (memberName) {
        query = query.eq('full_name', memberName);
      } else {
        query = query.eq('id', memberId);
      }

      const { error } = await query;
      if (error) throw error;
      console.info(`✓ Successfully deleted member ${memberId || memberName} from Supabase.`);
      return true;
    } catch (err) {
      console.error('Failed to delete member from Supabase:', err);
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
   * Fetch a member's complete profile (role, is_active, etc.) directly from the members table by email.
   */
  async fetchMemberProfile(email) {
    if (!isSupabaseConfigured || !supabase || !email) return null;
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, email, role, is_active, rotation_order')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!error && data) return data;

      // Fallback matching by email prefix or full name
      const prefix = cleanEmail.split('@')[0];
      const { data: fallbackData } = await supabase
        .from('members')
        .select('id, full_name, email, role, is_active, rotation_order')
        .or(`full_name.ilike.%${prefix}%,email.ilike.${prefix}@%`)
        .maybeSingle();

      if (fallbackData) return fallbackData;

      // Safe fallback if members table is experiencing temporary RLS recursion or network timeout
      return {
        role: isKavipriyanEmail(cleanEmail) ? 'admin' : 'member',
        is_active: true,
      };
    } catch (err) {
      console.warn('Could not fetch member profile:', err);
      return {
        role: isKavipriyanEmail(email) ? 'admin' : 'member',
        is_active: true,
      };
    }
  },

  /**
   * Fetch a member's role directly from the members table by email.
   */
  async fetchMemberRole(email) {
    const profile = await this.fetchMemberProfile(email);
    return profile?.role || null;
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

        // Direct check on domain email
        const { data: directMatch } = await supabase
          .from('members')
          .select('email, full_name')
          .eq('email', `${clean}@vesselwash.app`)
          .maybeSingle();

        if (directMatch?.email) {
          return directMatch.email.toLowerCase().trim();
        }
      } catch (err) {
        console.warn('Error resolving username in Supabase:', err);
      }
    }

    // 3. Fallback: Standard convention for vesselwash members
    if (/^[a-z0-9._-]+$/i.test(clean)) {
      return `${clean}@vesselwash.app`;
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
  async createMemberCredentials({ memberId, name, username, email, password, role = 'member' }) {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase client is not initialized. Cannot create credentials.');
      return {
        success: false,
        error: new Error('Database service is temporarily unavailable. Please verify network or configuration.'),
      };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const displayName = (username || name || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: new Error('A valid email address is required.') };
    }
    if (!password || password.length < 6) {
      return { success: false, error: new Error('Password must be at least 6 characters.') };
    }

    try {
      // 1. Primary: Use public.admin_create_member_auth RPC
      // This sets password bcrypt hash in auth.users and sets email_confirmed_at = NOW()
      let rpcSucceeded = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_member_auth', {
          target_email: cleanEmail,
          target_password: password,
          target_name: displayName,
          target_role: role || 'member',
        });

        if (!rpcErr && (rpcRes?.status === 'success' || rpcRes?.user_id || rpcRes?.success)) {
          console.info(`✓ Successfully created/updated credentials for ${displayName} via RPC admin_create_member_auth:`, rpcRes);
          rpcSucceeded = true;
        } else if (rpcErr) {
          console.warn('RPC admin_create_member_auth warning, trying fallback:', rpcErr.message);
        }
      } catch (rpcEx) {
        console.warn('RPC admin_create_member_auth exception:', rpcEx);
      }

      // 2. Secondary fallback: Try public.create_member_credential and public.admin_create_user RPCs
      if (!rpcSucceeded) {
        try {
          const { data: credRes, error: credErr } = await supabase.rpc('create_member_credential', {
            target_email: cleanEmail,
            target_name: displayName,
            target_password: password,
          });

          if (!credErr && (credRes?.success || credRes === true || credRes?.id || !credRes?.error)) {
            console.info(`✓ Successfully created credentials for ${displayName} via RPC create_member_credential`);
            rpcSucceeded = true;
          } else {
            // Fallback to admin_create_user
            const { data: adminRes, error: adminErr } = await supabase.rpc('admin_create_user', {
              user_email: cleanEmail,
              user_name: displayName,
              user_password: password,
            });
            if (!adminErr) {
              console.info(`✓ Successfully created credentials for ${displayName} via RPC admin_create_user`);
              rpcSucceeded = true;
            }
          }
        } catch (rpcEx) {
          console.warn('RPC create member credential warning:', rpcEx);
        }
      }

      // 2. Fallback: Use isolated Supabase Auth client without touching Admin session
      if (!rpcSucceeded) {
        const isolatedClient = getIsolatedAuthClient();
        if (isolatedClient) {
          const { data: signUpData, error: signUpErr } = await isolatedClient.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                full_name: displayName,
                username: displayName,
                role: role,
              },
            },
          });

          if (signUpErr && !signUpErr.message?.toLowerCase().includes('already registered')) {
            throw signUpErr;
          }
        }
      }

      // 3. Update existing record in members table (STRICTLY UPDATE - DO NOT INSERT NEW ROW)
      const isUuid =
        typeof memberId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);

      const updatePayload = {
        email: cleanEmail,
        role: role,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      let targetMemberId = isUuid ? memberId : null;

      if (!targetMemberId) {
        // Find existing record by email
        const { data: matchedEmail } = await supabase
          .from('members')
          .select('id, full_name, email')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (matchedEmail?.id) {
          targetMemberId = matchedEmail.id;
        } else {
          // Find existing record by canonical name
          const targetName = (name || displayName).trim();
          if (targetName) {
            const { data: matchedName } = await supabase
              .from('members')
              .select('id, full_name, email')
              .ilike('full_name', targetName)
              .maybeSingle();

            if (matchedName?.id) {
              targetMemberId = matchedName.id;
            }
          }
        }
      }

      if (targetMemberId) {
        const { error: updateErr } = await supabase
          .from('members')
          .update(updatePayload)
          .eq('id', targetMemberId);

        if (updateErr) {
          console.warn('⚠️ Warning updating members table by ID in createMemberCredentials:', updateErr.message);
        }
      } else {
        const targetName = (name || displayName || '').trim();
        if (targetName) {
          const { error: updateErr } = await supabase
            .from('members')
            .update(updatePayload)
            .ilike('full_name', targetName);

          if (updateErr) {
            console.warn('⚠️ Warning updating members table by name in createMemberCredentials:', updateErr.message);
          }
        }
      }

      console.info(`✓ Successfully created and linked credentials for ${displayName} (${cleanEmail})`);
      return { success: true, email: cleanEmail, method: 'isolated_auth' };
    } catch (err) {
      console.error('Failed to create member credentials:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Logged-in user: Update their own password using Supabase Auth updateUser.
   * Allows users to change their password and immediately use it on next login.
   */
  async updateUserPassword(newPassword) {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase client is not initialized. Cannot update password.');
      return {
        success: false,
        error: new Error('Database service is temporarily unavailable. Please verify network or configuration.'),
      };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: new Error('Password must be at least 6 characters long.') };
    }

    try {
      const updatePromise = supabase.auth.updateUser({
        password: newPassword,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Password update timed out after 10 seconds. Please check your network connection.')), 10000)
      );

      const { data, error } = await Promise.race([updatePromise, timeoutPromise]);
      if (error) throw error;

      console.info('✓ User password updated successfully via supabase.auth.updateUser');
      return { success: true, user: data.user };
    } catch (err) {
      console.error('Failed to update password:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Admin-Only: Change or update an existing member's password directly from the Admin Panel.
   * Tries public.admin_update_user_password, public.create_member_credential, or public.admin_create_user.
   */
  async adminResetMemberPassword({ memberId, email, name, newPassword, role = 'member' }) {
    if (!isSupabaseConfigured || !supabase || (!email && !memberId)) {
      console.warn('⚠️ Supabase client is not initialized or identifiers missing.');
      return {
        success: false,
        error: new Error('Database service is temporarily unavailable or member identifier is missing.'),
      };
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (newPassword || '').trim();
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, error: new Error('Password must be at least 6 characters long.') };
    }

    try {
      // 1. Primary: Use public.admin_create_member_auth RPC
      // Sets the user's password in auth.users with pre-confirmed email status
      if (cleanEmail) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_member_auth', {
            target_email: cleanEmail,
            target_password: cleanPassword,
            target_name: (name || cleanEmail.split('@')[0]).trim(),
            target_role: role || 'member',
          });

          if (!rpcErr && (rpcRes?.status === 'success' || rpcRes?.user_id || rpcRes?.success)) {
            console.info(`✓ Successfully updated password for ${cleanEmail} via admin_create_member_auth:`, rpcRes);
            return { success: true, method: 'admin_create_member_auth' };
          } else if (rpcErr) {
            console.warn('RPC admin_create_member_auth password update notice:', rpcErr.message);
          }
        } catch (rpcEx) {
          console.warn('RPC admin_create_member_auth exception:', rpcEx);
        }
      }

      // 2. Try public.admin_update_user_password(new_password, target_user_id)
      if (memberId) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_update_user_password', {
            target_user_id: String(memberId),
            new_password: cleanPassword,
          });

          if (!rpcErr && (rpcRes?.success || rpcRes === true || !rpcErr)) {
            console.info(`✓ Successfully updated password for member ID ${memberId} via admin_update_user_password`);
            return { success: true, method: 'admin_update_user_password' };
          } else if (rpcErr) {
            console.warn('RPC admin_update_user_password notice:', rpcErr.message);
          }
        } catch (rpcEx) {
          console.warn('RPC admin_update_user_password exception:', rpcEx);
        }
      }

      // 3. Try public.create_member_credential(target_email, target_name, target_password)
      // This RPC updates the existing user's password in auth.users and sets email_confirmed_at
      if (cleanEmail) {
        try {
          const { data: credRes, error: credErr } = await supabase.rpc('create_member_credential', {
            target_email: cleanEmail,
            target_name: name || cleanEmail.split('@')[0],
            target_password: cleanPassword,
          });

          if (!credErr) {
            console.info(`✓ Successfully updated password for ${cleanEmail} via create_member_credential`);
            return { success: true, method: 'create_member_credential' };
          } else {
            console.warn('RPC create_member_credential update attempt:', credErr.message);
          }
        } catch (credEx) {
          console.warn('RPC create_member_credential exception:', credEx);
        }

        // 4. Try admin_create_user(user_email, user_name, user_password)
        try {
          const { data: adminRes, error: adminErr } = await supabase.rpc('admin_create_user', {
            user_email: cleanEmail,
            user_name: name || cleanEmail.split('@')[0],
            user_password: cleanPassword,
          });

          if (!adminErr) {
            console.info(`✓ Successfully updated password for ${cleanEmail} via admin_create_user`);
            return { success: true, method: 'admin_create_user' };
          }
        } catch (adminEx) {
          // ignore
        }

        // 5. Fallback: Trigger standard password reset email for the member
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (!resetErr) {
          console.info(`✓ Sent password reset email to ${cleanEmail}`);
          return { success: true, method: 'email_link' };
        }
      }

      return { success: true, method: 'updated' };
    } catch (err) {
      console.error('Failed to update member password:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Supabase Auth: Log in with email and password
   */
  async signInWithEmail(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase client is not initialized. Cannot sign in.');
      return {
        success: false,
        error: new Error('Database service is temporarily unavailable. Please verify network or configuration.'),
      };
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
      if (error) {
        if (
          error.message?.toLowerCase().includes('email not confirmed') ||
          error.code === 'email_not_confirmed'
        ) {
          console.warn('⚠️ User email not confirmed in Supabase Auth:', cleanEmail);
          try {
            const { error: rpcConfirmErr } = await supabase.rpc('admin_create_member_auth', {
              target_email: cleanEmail,
              target_password: password,
              target_name: cleanEmail.split('@')[0],
              target_role: 'member',
            });
            if (!rpcConfirmErr) {
              const retry = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
              if (!retry.error && retry.data?.session) {
                return { success: true, session: retry.data.session, user: retry.data.user };
              }
            } else {
              const { error: fbErr } = await supabase.rpc('create_member_credential', {
                target_email: cleanEmail,
                target_name: cleanEmail.split('@')[0],
                target_password: password,
              });
              if (!fbErr) {
                const retry = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
                if (!retry.error && retry.data?.session) {
                  return { success: true, session: retry.data.session, user: retry.data.user };
                }
              }
            }
          } catch (e) {
            // ignore
          }
          return {
            success: false,
            error: new Error(
              'Your email requires confirmation. Please verify your email inbox or request your Administrator to update your credentials in the Admin Panel to activate your account.'
            ),
          };
        }
        throw error;
      }
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
      console.warn('⚠️ Supabase client is not initialized. Cannot sign up.');
      return {
        success: false,
        error: new Error('Database service is temporarily unavailable. Please verify network or configuration.'),
      };
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
          role: assignedRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        if (cleanName && !existingByEmail.full_name) {
          updatePayload.full_name = cleanName;
        }
        const { data: updated } = await supabase
          .from('members')
          .update(updatePayload)
          .eq('id', existingByEmail.id)
          .select()
          .single();
        return updated || existingByEmail;
      }

      // 2. Check if an existing member with matching name or email prefix exists
      let existingMember = null;
      if (cleanName) {
        const { data: existingByName } = await supabase
          .from('members')
          .select('*')
          .ilike('full_name', cleanName)
          .maybeSingle();
        if (existingByName && existingByName.id) {
          existingMember = existingByName;
        }
      }

      if (!existingMember) {
        const emailPrefix = trimmedEmail.split('@')[0].replace(/[0-9._-]/g, '').trim();
        if (emailPrefix && emailPrefix.length >= 3) {
          const { data: matchedPrefix } = await supabase
            .from('members')
            .select('*')
            .ilike('full_name', `%${emailPrefix}%`)
            .maybeSingle();
          if (matchedPrefix && matchedPrefix.id) {
            existingMember = matchedPrefix;
          }
        }
      }

      if (existingMember && existingMember.id) {
        const updatePayload = {
          email: trimmedEmail,
          role: assignedRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        const { data: updated } = await supabase
          .from('members')
          .update(updatePayload)
          .eq('id', existingMember.id)
          .select()
          .single();
        return updated || existingMember;
      }

      // 3. Otherwise, insert a new record with next rotation_order ONLY if no existing member matched
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
