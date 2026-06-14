-- ============================================================
-- Gastro Referral & Registry System — PostgreSQL Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive search

-- ─────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
    'NURSE', 'DOCTOR', 'ADMIN',
    'GASTROENTEROLOGIST', 'HEPATOLOGIST', 'REFERRING_PHYSICIAN', 'RESEARCHER'
);
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE referral_status AS ENUM (
    'PENDING', 'UNDER_REVIEW', 'SCHEDULED',
    'COMPLETED', 'CANCELLED', 'REFERRED_OUT'
);
CREATE TYPE facility_type AS ENUM ('HOSPITAL', 'CLINIC', 'PRIVATE');
CREATE TYPE specialty AS ENUM ('GASTROENTEROLOGY', 'HEPATOLOGY', 'GI_SURGERY');
CREATE TYPE feedback_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');
CREATE TYPE timeline_status_type AS ENUM ('WORKFLOW', 'FEEDBACK');
CREATE TYPE procedure_type AS ENUM ('GASTROSCOPY', 'COLONOSCOPY', 'ERCP', 'SIGMOIDOSCOPY');
CREATE TYPE liver_diagnosis AS ENUM ('HEP_B', 'HEP_C', 'CIRRHOSIS', 'HCC');
CREATE TYPE liver_risk_flag AS ENUM ('NORMAL', 'OVERDUE', 'TREND_ALERT');

-- ─────────────────────────────────────────────────────────────
-- FACILITIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facilities (
    id              SERIAL PRIMARY KEY,
    facility_name   VARCHAR(255) NOT NULL,
    facility_type   facility_type NOT NULL,
    region          VARCHAR(100) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    metadata        JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_facilities_facility_name ON facilities(facility_name);
CREATE INDEX idx_facilities_facility_type ON facilities(facility_type);
CREATE INDEX idx_facilities_region        ON facilities(region);
CREATE INDEX idx_facilities_city          ON facilities(city);
CREATE INDEX idx_facilities_deleted_at    ON facilities(deleted_at);
CREATE INDEX idx_facilities_region_city   ON facilities(region, city);

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role    NOT NULL DEFAULT 'NURSE',
    department      VARCHAR(255),
    phone           VARCHAR(20),
    facility_id     INTEGER REFERENCES facilities(id),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_facility_id ON users(facility_id);
CREATE INDEX idx_users_deleted_at  ON users(deleted_at);

-- ─────────────────────────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
    id                      SERIAL PRIMARY KEY,
    full_name               VARCHAR(255) NOT NULL,
    age                     INTEGER      NOT NULL CHECK (age BETWEEN 0 AND 150),
    sex                     VARCHAR(10)  NOT NULL CHECK (sex IN ('MALE','FEMALE','OTHER')),
    phone                   VARCHAR(20),
    ghana_card              VARCHAR(50)  UNIQUE,
    address                 TEXT,
    emergency_contact       VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    medical_history         TEXT,
    allergies               TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_patients_full_name       ON patients USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_patients_ghana_card      ON patients(ghana_card);
CREATE INDEX idx_patients_created_at      ON patients(created_at DESC);
CREATE INDEX idx_patients_deleted_at      ON patients(deleted_at);

-- ─────────────────────────────────────────────────────────────
-- REFERRALS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER        NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    created_by          INTEGER        NOT NULL REFERENCES users(id),
    referring_physician_id INTEGER     REFERENCES users(id),
    source_facility     VARCHAR(255),
    symptoms            JSONB          NOT NULL DEFAULT '[]',
    vitals              JSONB,
    chief_complaint     TEXT,
    clinical_notes      TEXT,
    risk_level          risk_level     NOT NULL DEFAULT 'LOW',
    status              referral_status NOT NULL DEFAULT 'PENDING',
    feedback_status     feedback_status NOT NULL DEFAULT 'PENDING',
    urgency             VARCHAR(50),
    assigned_doctor_id  INTEGER        REFERENCES users(id),
    facility_id         INTEGER        REFERENCES facilities(id),
    accepted_at         TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    outcome_summary     TEXT,
    recommendation_text TEXT,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

CREATE INDEX idx_referrals_patient_id        ON referrals(patient_id);
CREATE INDEX idx_referrals_status            ON referrals(status);
CREATE INDEX idx_referrals_feedback_status   ON referrals(feedback_status);
CREATE INDEX idx_referrals_risk_level        ON referrals(risk_level);
CREATE INDEX idx_referrals_assigned_doctor   ON referrals(assigned_doctor_id);
CREATE INDEX idx_referrals_referring_physician ON referrals(referring_physician_id);
CREATE INDEX idx_referrals_facility_id       ON referrals(facility_id);
CREATE INDEX idx_referrals_created_at        ON referrals(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- CONSULTATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
    id                      SERIAL PRIMARY KEY,
    referral_id             INTEGER NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    doctor_id               INTEGER NOT NULL REFERENCES users(id),
    diagnosis               TEXT,
    icd_code                VARCHAR(20),
    notes                   TEXT,
    treatment_plan          TEXT,
    investigations_ordered  JSONB,
    outcome                 VARCHAR(100),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

CREATE INDEX idx_consultations_referral_id ON consultations(referral_id);
CREATE INDEX idx_consultations_doctor_id   ON consultations(doctor_id);

-- ─────────────────────────────────────────────────────────────
-- FOLLOW-UPS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    referral_id     INTEGER REFERENCES referrals(id),
    scheduled_by    INTEGER REFERENCES users(id),
    next_visit_date DATE    NOT NULL,
    reason          TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED'
                    CHECK (status IN ('SCHEDULED','COMPLETED','MISSED','CANCELLED')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX idx_followups_patient_id      ON followups(patient_id);
CREATE INDEX idx_followups_next_visit_date ON followups(next_visit_date);
CREATE INDEX idx_followups_status          ON followups(status);

-- ─────────────────────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(100) NOT NULL,
    resource_id     INTEGER,
    ip_address      INET,
    user_agent      VARCHAR(500),
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id       ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at    ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource      ON audit_logs(resource_type, resource_id);

-- ─────────────────────────────────────────────────────────────
-- SPECIALISTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS specialists (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id),
    specialty       specialty NOT NULL,
    subspecialties  TEXT[] NOT NULL DEFAULT '{}',
    institution_id  INTEGER NOT NULL REFERENCES facilities(id),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    bio             TEXT,
    interests       TEXT[] NOT NULL DEFAULT '{}',
    is_public       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_specialists_specialty      ON specialists(specialty);
CREATE INDEX idx_specialists_institution_id ON specialists(institution_id);
CREATE INDEX idx_specialists_deleted_at     ON specialists(deleted_at);

-- ─────────────────────────────────────────────────────────────
-- REFERRAL TIMELINE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_timeline (
    id              SERIAL PRIMARY KEY,
    referral_id     INTEGER NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    actor_id        INTEGER NOT NULL REFERENCES users(id),
    from_status     VARCHAR(50),
    to_status       VARCHAR(50) NOT NULL,
    status_type     timeline_status_type NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_timeline_referral_id ON referral_timeline(referral_id);
CREATE INDEX idx_referral_timeline_created_at  ON referral_timeline(referral_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- PROCEDURES (ENDOSCOPY)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedures (
    id              SERIAL PRIMARY KEY,
    patient_id      INTEGER NOT NULL REFERENCES patients(id),
    doctor_id       INTEGER NOT NULL REFERENCES users(id),
    facility_id     INTEGER NOT NULL REFERENCES facilities(id),
    procedure_type  procedure_type NOT NULL,
    indication      TEXT,
    findings        TEXT,
    impression      TEXT,
    recommendation  TEXT,
    image_urls      TEXT[] NOT NULL DEFAULT '{}',
    procedure_date  DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_procedures_patient_id     ON procedures(patient_id);
CREATE INDEX idx_procedures_doctor_id      ON procedures(doctor_id);
CREATE INDEX idx_procedures_facility_id    ON procedures(facility_id);
CREATE INDEX idx_procedures_procedure_type ON procedures(procedure_type);
CREATE INDEX idx_procedures_procedure_date ON procedures(procedure_date);
CREATE INDEX idx_procedures_deleted_at     ON procedures(deleted_at);
CREATE INDEX idx_procedures_patient_date   ON procedures(patient_id, procedure_date DESC);

-- ─────────────────────────────────────────────────────────────
-- LIVER REGISTRY (CLD TRACKING)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liver_registry (
    id                SERIAL PRIMARY KEY,
    patient_id        INTEGER NOT NULL REFERENCES patients(id),
    facility_id       INTEGER NOT NULL REFERENCES facilities(id),
    recorded_by       INTEGER NOT NULL REFERENCES users(id),
    diagnosis         liver_diagnosis NOT NULL,
    fibroscan_score   NUMERIC(5,2),
    viral_load        NUMERIC(12,2),
    afp               NUMERIC(10,2),
    alt               NUMERIC(10,2),
    ast               NUMERIC(10,2),
    ultrasound_date   DATE,
    next_review_date  DATE NOT NULL,
    risk_flag         liver_risk_flag NOT NULL DEFAULT 'NORMAL',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_liver_registry_patient_id       ON liver_registry(patient_id);
CREATE INDEX idx_liver_registry_facility_id      ON liver_registry(facility_id);
CREATE INDEX idx_liver_registry_diagnosis        ON liver_registry(diagnosis);
CREATE INDEX idx_liver_registry_next_review_date ON liver_registry(next_review_date);
CREATE INDEX idx_liver_registry_risk_flag        ON liver_registry(risk_flag);
CREATE INDEX idx_liver_registry_deleted_at       ON liver_registry(deleted_at);

-- ─────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_facilities_updated_at   BEFORE UPDATE ON facilities   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_specialists_updated_at  BEFORE UPDATE ON specialists  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_procedures_updated_at   BEFORE UPDATE ON procedures   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_liver_registry_updated_at BEFORE UPDATE ON liver_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_patients_updated_at     BEFORE UPDATE ON patients     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_referrals_updated_at    BEFORE UPDATE ON referrals    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_consultations_updated_at BEFORE UPDATE ON consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_followups_updated_at    BEFORE UPDATE ON followups    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- SEED: Demo users  (passwords handled by FastAPI bcrypt seed)
-- NOTE: The application seeds users via app/seed.py on startup.
-- This file creates the schema only; no hard-coded passwords here.
-- ─────────────────────────────────────────────────────────────

-- Demo patients for testing
INSERT INTO patients (full_name, age, sex, phone, ghana_card, address, medical_history) VALUES
    ('Kofi Asante',        52, 'MALE',   '0244001001', 'GHA-000000001-1', 'Accra, Greater Accra',   'Hypertension, Type 2 Diabetes'),
    ('Abena Mensah',       38, 'FEMALE', '0244001002', 'GHA-000000002-2', 'Kumasi, Ashanti Region', 'None significant'),
    ('Kwame Osei',         67, 'MALE',   '0244001003', NULL,              'Tamale, Northern Region', 'Hepatitis B (chronic)'),
    ('Akosua Darko',       45, 'FEMALE', '0244001004', 'GHA-000000004-4', 'Takoradi, Western Region','Cirrhosis'),
    ('Yaw Boateng',        29, 'MALE',   '0244001005', NULL,              'Cape Coast, Central',     'None')
ON CONFLICT (ghana_card) DO NOTHING;
