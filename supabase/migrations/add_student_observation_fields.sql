-- Add medical and pedagogical observation fields to students
alter table students add column if not exists medical_notes text;
alter table students add column if not exists internal_observations text;
