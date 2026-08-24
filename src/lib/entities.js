// Generic CRUD configuration for the entities simple enough to share one
// list+form implementation (src/routes/generic.js). case_documents (has a
// numbering/status workflow) and kpi_deliverables (has nested monthly
// entries) get their own dedicated routes instead — everything here is a
// flat table with simple fields plus, sometimes, a foreign key or two.
//
// Field types: text, textarea, number, date, enum (options[]), fk (table,
// labelField, unitFilter — restrict the dropdown to the current unit when
// true, since e.g. a chemical escort's company almost always belongs to
// whichever unit is creating it, though the table itself is shared).
//
// unitScoped: true means the table has a unit_id column — the generic
// route auto-fills it from req.user.unit_id (STAFF/UNIT_HEAD/INTERN) or
// offers a picker (DEPT_HEAD), and every list is filtered to "my unit"
// unless the viewer is DEPT_HEAD.

const ENTITIES = {
  companies: {
    table: 'companies',
    label: 'Companies', labelSingular: 'Company', icon: '🏢',
    unitScoped: false, orderBy: 'name',
    fields: [
      { name: 'name', label: 'Company Name', type: 'text', required: true, listShow: true },
      { name: 'county', label: 'County', type: 'text', listShow: true },
      { name: 'community', label: 'Community', type: 'text' },
      { name: 'street_address', label: 'Street Address', type: 'text' },
      { name: 'contact_name', label: 'Contact Name', type: 'text' },
      { name: 'contact_phone', label: 'Contact Phone', type: 'text', listShow: true },
      { name: 'contact_email', label: 'Contact Email', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },

  chemicals: {
    table: 'chemicals',
    label: 'Chemicals & Substances', labelSingular: 'Chemical', icon: '🧪',
    unitScoped: false, orderBy: 'name',
    fields: [
      { name: 'name', label: 'Chemical Name (canonical)', type: 'text', required: true, listShow: true },
      { name: 'aliases', label: 'Known alternate spellings (comma-separated)', type: 'taglist', listShow: true,
        help: 'e.g. "AKSHOT, ASKSHOT, AKSHOT 160" — every alternate spelling staff might type, so reports still roll up correctly under one canonical name.' },
      { name: 'category', label: 'Category', type: 'enum', listShow: true,
        options: ['INDUSTRIAL', 'AGROCHEMICAL', 'EXPLOSIVE', 'MINING_REAGENT', 'OTHER'], default: 'OTHER' },
      { name: 'default_unit', label: 'Default Unit', type: 'text', default: 'kg' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },

  chemical_escorts: {
    table: 'chemical_escorts',
    label: 'Chemical Escorts', labelSingular: 'Chemical Escort', icon: '🚚',
    unit: 'CHEMICAL', unitScoped: true, orderBy: 'escort_date DESC',
    fields: [
      { name: 'company_id', label: 'Company', type: 'fk', fkTable: 'companies', fkLabel: 'name', listShow: true },
      { name: 'chemical_id', label: 'Chemical', type: 'fk', fkTable: 'chemicals', fkLabel: 'name', listShow: true },
      { name: 'convoy_count', label: 'Number of Convoys', type: 'number', default: 1, listShow: true },
      { name: 'container_count', label: 'Number of Containers', type: 'number' },
      { name: 'escort_date', label: 'Escort Date', type: 'date', required: true, listShow: true },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },

  chemical_inventory_audits: {
    table: 'chemical_inventory_audits',
    label: 'Nationwide Chemical Inventory', labelSingular: 'Inventory Audit', icon: '📋',
    unit: 'CHEMICAL', unitScoped: true, orderBy: 'audit_date DESC',
    fields: [
      { name: 'facility_name', label: 'Facility Name', type: 'text', required: true, listShow: true },
      { name: 'location', label: 'Location', type: 'text', listShow: true },
      { name: 'audit_date', label: 'Audit Date', type: 'date', required: true, listShow: true },
      { name: 'findings', label: 'Findings', type: 'textarea' },
    ],
  },

  site_inspections: {
    table: 'site_inspections',
    label: 'Site Inspections', labelSingular: 'Site Inspection', icon: '🔍',
    unit: 'ENV_MONITORING', unitScoped: true, orderBy: 'inspection_date DESC',
    fields: [
      { name: 'facility_name', label: 'Facility Name', type: 'text', required: true, listShow: true },
      { name: 'facility_type', label: 'Facility Type', type: 'text', listShow: true,
        help: 'e.g. Mineral Water Factory, Mining Operation, LPG Plant, Construction Site' },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'inspection_date', label: 'Inspection Date', type: 'date', required: true, listShow: true },
      { name: 'outcome', label: 'Outcome', type: 'enum', listShow: true,
        options: ['COMPLIANT', 'NON_COMPLIANT', 'PENDING_REVIEW'], default: 'PENDING_REVIEW' },
      { name: 'findings', label: 'Findings', type: 'textarea' },
      { name: 'action_taken', label: 'Action Taken', type: 'textarea' },
    ],
  },

  complaints: {
    table: 'complaints',
    label: 'Complaints & Investigations', labelSingular: 'Complaint', icon: '📢',
    unit: 'ENV_MONITORING', unitScoped: true, orderBy: 'date_received DESC',
    fields: [
      { name: 'type', label: 'Type', type: 'enum', listShow: true,
        options: ['NOISE', 'WATER', 'AIR', 'WASTE', 'OTHER'] },
      { name: 'complainant_name', label: 'Complainant Name', type: 'text' },
      { name: 'accused_party', label: 'Accused Party / Facility', type: 'text', required: true, listShow: true },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'enum', listShow: true,
        options: ['RECEIVED', 'INVESTIGATING', 'FINDINGS_PRESENTED', 'CLOSED'], default: 'RECEIVED' },
      { name: 'date_received', label: 'Date Received', type: 'date', required: true, listShow: true },
      { name: 'investigation_date', label: 'Investigation Date', type: 'date' },
      { name: 'findings', label: 'Findings', type: 'textarea' },
    ],
  },

  lab_results: {
    table: 'lab_results',
    label: 'Laboratory Results', labelSingular: 'Lab Result', icon: '⚗️',
    unit: 'ENV_MONITORING', unitScoped: true, orderBy: 'sampled_at DESC',
    fields: [
      { name: 'company_id', label: 'Proponent (Company)', type: 'fk', fkTable: 'companies', fkLabel: 'name', required: true, listShow: true },
      { name: 'medium', label: 'Medium', type: 'enum', options: ['WATER', 'SOIL', 'AIR'], required: true, listShow: true },
      { name: 'parameter', label: 'Parameter', type: 'text', required: true, listShow: true,
        help: 'e.g. pH, SS, NH4, NO3, CO, CO2, NO2, VOC, PM2.5, CEC' },
      { name: 'value', label: 'Value', type: 'number', required: true, listShow: true },
      { name: 'unit_of_measure', label: 'Unit', type: 'text', help: 'e.g. mg/l, ppm, µg/m3' },
      { name: 'threshold_min', label: 'EPA Threshold Min', type: 'number' },
      { name: 'threshold_max', label: 'EPA Threshold Max', type: 'number' },
      { name: 'within_range', label: 'Within Acceptable Range?', type: 'enum', options: ['true', 'false'], listShow: true },
      { name: 'sampled_at', label: 'Sample Date', type: 'date', required: true, listShow: true },
    ],
  },

  reporting_quality_entries: {
    table: 'reporting_quality_entries',
    label: 'Proponent Reporting Quality', labelSingular: 'Reporting Quality Entry', icon: '📊',
    unit: 'ENV_MONITORING', unitScoped: true, orderBy: 'year DESC, month DESC',
    fields: [
      { name: 'company_id', label: 'Proponent (Company)', type: 'fk', fkTable: 'companies', fkLabel: 'name', required: true, listShow: true },
      { name: 'medium', label: 'Medium', type: 'enum', options: ['WATER', 'SOIL', 'AIR'], required: true, listShow: true },
      { name: 'month', label: 'Month (1-12)', type: 'number', required: true, listShow: true },
      { name: 'year', label: 'Year', type: 'number', required: true, listShow: true },
      { name: 'timeliness', label: 'Timeliness', type: 'enum', options: ['T', 'L', 'NR'], required: true, listShow: true,
        help: 'T = on time, L = late, NR = no report received' },
      { name: 'completeness_pct', label: 'Completeness %', type: 'number', listShow: true },
      { name: 'cumulative_timeliness_pct', label: 'Cumulative Timeliness %', type: 'number' },
      { name: 'cumulative_completeness_pct', label: 'Cumulative Completeness %', type: 'number' },
    ],
  },

  radiation_inventories: {
    table: 'radiation_inventories',
    label: 'Radiation Source Inventory', labelSingular: 'Inventory Record', icon: '☢️',
    unit: 'RADIATION', unitScoped: true, orderBy: 'inventoried_at DESC',
    fields: [
      { name: 'company_id', label: 'Facility (Company)', type: 'fk', fkTable: 'companies', fkLabel: 'name', required: true, listShow: true },
      { name: 'facility_type', label: 'Facility Type', type: 'enum', options: ['MEDICAL', 'INDUSTRIAL', 'ENVIRONMENTAL'], required: true, listShow: true },
      { name: 'location', label: 'Location', type: 'text', listShow: true },
      { name: 'inventoried_at', label: 'Date Inventoried', type: 'date', required: true, listShow: true },
    ],
  },

  radiation_trainings: {
    table: 'radiation_trainings',
    label: 'Radiation Safety Trainings', labelSingular: 'Training Record', icon: '🎓',
    unit: 'RADIATION', unitScoped: true, orderBy: 'training_date DESC',
    fields: [
      { name: 'training_name', label: 'Training Name', type: 'text', required: true, listShow: true },
      { name: 'category', label: 'Category', type: 'enum', options: ['EXTERNAL', 'INTERNAL'], required: true, listShow: true,
        help: 'EXTERNAL = a proponent institution\'s staff; INTERNAL = ERRS\'s own staff' },
      { name: 'company_id', label: 'Institution (if External)', type: 'fk', fkTable: 'companies', fkLabel: 'name' },
      { name: 'staff_user_id', label: 'Staff Member (if Internal)', type: 'fk', fkTable: 'users', fkLabel: 'name' },
      { name: 'number_of_persons_trained', label: 'Number of Persons Trained', type: 'number', default: 1, listShow: true },
      { name: 'location', label: 'Location', type: 'text' },
      { name: 'training_date', label: 'Training Date', type: 'date', required: true, listShow: true },
    ],
  },

  esia_participations: {
    table: 'esia_participations',
    label: 'ESIA Participation', labelSingular: 'ESIA Participation', icon: '📝',
    unit: 'WASTE', unitScoped: true, orderBy: 'meeting_date DESC',
    fields: [
      { name: 'project_name', label: 'Project Name', type: 'text', required: true, listShow: true },
      { name: 'role', label: 'ERRS Role', type: 'text', listShow: true, help: 'e.g. Consultation, Certification review' },
      { name: 'meeting_date', label: 'Meeting/Event Date', type: 'date', required: true, listShow: true },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },

  reminders: {
    table: 'reminders',
    label: 'Reminders & Follow-ups', labelSingular: 'Reminder', icon: '⏰',
    unitScoped: true, orderBy: 'due_date ASC',
    fields: [
      { name: 'company_id', label: 'Company', type: 'fk', fkTable: 'companies', fkLabel: 'name', listShow: true },
      { name: 'subject', label: 'Subject', type: 'text', required: true, listShow: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'due_date', label: 'Due Date', type: 'date', required: true, listShow: true },
      { name: 'status', label: 'Status', type: 'enum', options: ['SCHEDULED', 'SENT', 'ACKNOWLEDGED'], default: 'SCHEDULED', listShow: true },
    ],
  },

  assets: {
    table: 'assets',
    label: 'Assets & Equipment', labelSingular: 'Asset', icon: '🧰',
    unitScoped: true, unitOptional: true, orderBy: 'calibration_due_date ASC NULLS LAST',
    fields: [
      { name: 'name', label: 'Asset Name', type: 'text', required: true, listShow: true },
      { name: 'category', label: 'Category', type: 'enum', listShow: true,
        options: ['VEHICLE', 'LAPTOP', 'LAB_INSTRUMENT', 'RADIATION_DETECTOR', 'OTHER'] },
      { name: 'serial_number', label: 'Serial Number', type: 'text' },
      { name: 'assigned_to', label: 'Assigned To', type: 'text', listShow: true },
      { name: 'status', label: 'Status', type: 'enum', listShow: true,
        options: ['OPERATIONAL', 'NEEDS_CALIBRATION', 'OUT_OF_SERVICE'], default: 'OPERATIONAL' },
      { name: 'last_calibrated_at', label: 'Last Calibrated', type: 'date' },
      { name: 'calibration_due_date', label: 'Calibration Due', type: 'date', listShow: true },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },

  activity_logs: {
    table: 'activity_logs',
    label: 'Activity Log (Meetings & Trainings)', labelSingular: 'Activity', icon: '🗓️',
    unitScoped: true, orderBy: 'event_date DESC',
    fields: [
      { name: 'type', label: 'Type', type: 'enum', listShow: true,
        options: ['FOREIGN_EVENT', 'LOCAL_EVENT', 'MEETING', 'TRAINING', 'OTHER'] },
      { name: 'title', label: 'Title', type: 'text', required: true, listShow: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'event_date', label: 'Date', type: 'date', required: true, listShow: true },
      { name: 'attendee_count', label: 'Attendee Count', type: 'number' },
    ],
  },
};

module.exports = { ENTITIES };
