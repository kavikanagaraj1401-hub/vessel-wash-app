import { supabase, isSupabaseConfigured } from './supabaseClient';

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
   * Store application rules, timetable matrix, and initial queue into application_settings as JSON.
   * Conforms strictly to schema: setting_key, setting_value.
   */
  async saveApplicationRules({ daysConfig, initialQueue, rosterRules }) {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const settingsItems = [
        { setting_key: 'days_config', setting_value: daysConfig },
        { setting_key: 'initial_queue', setting_value: initialQueue },
        { setting_key: 'roster_rules', setting_value: rosterRules || {} },
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
   * Save live attendance update and calculated washer activity to Supabase.
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
      // 1. Attendance History (delete previous and record active eaters)
      await supabase
        .from('attendance_history')
        .delete()
        .eq('date', date)
        .eq('meal_type', meal);

      if (isProvided && eaters.length > 0) {
        const attRows = eaters.map(memId => ({
          date,
          meal_type: meal,
          member_id: memId,
          ate_meal: true,
          updated_at: new Date().toISOString(),
        }));
        await supabase.from('attendance_history').insert(attRows);
      }

      // 2. Washer Activity (delete previous and record live assignment)
      await supabase
        .from('washer_activity')
        .delete()
        .eq('date', date)
        .eq('meal_type', meal);

      if (isProvided && assignedSlots.length > 0) {
        const washRows = assignedSlots.map((s, idx) => ({
          date,
          meal_type: meal,
          assigned_member_id: s.assignedMemberId,
          next_member_id: idx === 0 ? nextWasherId : null,
          status: 'assigned',
          created_at: new Date().toISOString(),
        }));
        await supabase.from('washer_activity').insert(washRows);
      }

      return true;
    } catch (err) {
      console.error('Failed to sync attendance/washer to Supabase:', err);
      return false;
    }
  },

  /**
   * Set up Supabase Realtime channel listening to changes on attendance_history, members, and washer_activity.
   */
  subscribeToRosterRealtime(onRealtimeChange) {
    if (!isSupabaseConfigured || !supabase) return () => {};

    try {
      const channel = supabase
        .channel('public:roster-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_history' },
          payload => {
            console.info('📡 Realtime attendance update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('attendance_history', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'washer_activity' },
          payload => {
            console.info('📡 Realtime washer activity update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('washer_activity', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'members' },
          payload => {
            console.info('📡 Realtime members update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('members', payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'application_settings' },
          payload => {
            console.info('📡 Realtime application settings update:', payload.eventType);
            if (onRealtimeChange) onRealtimeChange('application_settings', payload);
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn('Realtime subscription warning:', err);
          } else {
            console.info('🔌 Supabase Realtime channel status:', status);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Could not establish Supabase Realtime subscription:', err);
      return () => {};
    }
  },
};
