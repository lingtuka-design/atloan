
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    designation TEXT DEFAULT '',
    role TEXT CHECK(role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ndc_records (
    id TEXT PRIMARY KEY,
    dept TEXT,
    refNo TEXT,
    name TEXT,
    desig TEXT,
    office TEXT,
    reason TEXT,
    reasonVal TEXT,
    retireDate TEXT,
    rawRetireDate TEXT,
    issueDate TEXT,
    rawIssueDate TEXT,
    date TEXT,
    copy1Val TEXT,
    ddoName TEXT,
    sigName TEXT,
    sigDesig TEXT,
    showSd INTEGER,
    manualIssue TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dc_records (
    id TEXT PRIMARY KEY,
    name TEXT,
    dept TEXT,
    type TEXT,
    dateSaved TEXT,
    issueDate TEXT,
    sharedInputs TEXT,
    loanInputsArray TEXT,
    allCalculatedData TEXT,
    noteHTMLSaved TEXT,
    legalCertHTMLSaved TEXT,
    ndcCertHTMLSaved TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dak_records (
    id TEXT PRIMARY KEY,
    sl_no INTEGER,
    receive_no TEXT,
    name TEXT,
    department TEXT,
    case_type TEXT,
    sent_date TEXT,
    amount TEXT DEFAULT '',
    action TEXT DEFAULT 'Pending',
    issue_date TEXT,
    assigned_to TEXT,
    created_by TEXT,
    is_new INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
