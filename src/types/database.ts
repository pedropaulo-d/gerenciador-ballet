// ============================================
// Petit Allegro Manager — Database Types
// ============================================

// ---------- Enums ----------

export type EnrollmentStatus = 'active' | 'inactive' | 'pending';
export type ValidityType = 'semester' | 'annual';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'justified';

// ---------- Base ----------

interface Timestamps {
  created_at: string;
  updated_at: string;
}

// ---------- Tables ----------

export interface Location extends Timestamps {
  id: string;
  name: string;
  address: string | null;
  fee_per_student: number;
  is_active: boolean;
}

export interface Class extends Timestamps {
  id: string;
  location_id: string;
  name: string;
  days_of_week: number[]; // 0 = Dom, 6 = Sáb
  start_time: string;  // HH:mm:ss
  end_time: string;
  max_students: number | null;
  is_active: boolean;
}

export interface Student extends Timestamps {
  id: string;
  full_name: string;
  birth_date: string | null;
  guardian_name: string;
  guardian_phone: string | null;
  guardian_email: string | null;
  guardian_cpf: string | null;
  is_internal: boolean;
  notes: string | null;
  is_active: boolean;
}

export interface Enrollment extends Timestamps {
  id: string;
  student_id: string;
  class_id: string;
  status: EnrollmentStatus;
  validity_type: ValidityType;
  starts_at: string;
  ends_at: string;
  base_fee: number;
  due_day: number; // 5 ou 7
}

export interface MonthlyFee extends Timestamps {
  id: string;
  enrollment_id: string;
  reference_month: string; // YYYY-MM-01
  gross_amount: number;
  asaas_fee: number;
  location_fee: number;
  net_amount: number; // coluna gerada (gross - asaas_fee - location_fee)
  status: PaymentStatus;
  paid_at: string | null;
  asaas_payment_id: string | null;
}

export interface Attendance extends Timestamps {
  id: string;
  enrollment_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

// ---------- Insert types (omitem campos gerados) ----------

export type LocationInsert = Omit<Location, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type ClassInsert = Omit<Class, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type EnrollmentInsert = Omit<Enrollment, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type MonthlyFeeInsert = Omit<MonthlyFee, 'id' | 'net_amount' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

// ---------- Update types (todos opcionais) ----------

export type LocationUpdate = Partial<Omit<Location, 'id' | 'created_at' | 'updated_at'>>;
export type ClassUpdate = Partial<Omit<Class, 'id' | 'created_at' | 'updated_at'>>;
export type StudentUpdate = Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>;
export type EnrollmentUpdate = Partial<Omit<Enrollment, 'id' | 'created_at' | 'updated_at'>>;
export type MonthlyFeeUpdate = Partial<Omit<MonthlyFee, 'id' | 'net_amount' | 'created_at' | 'updated_at'>>;
export type AttendanceUpdate = Partial<Omit<Attendance, 'id' | 'created_at' | 'updated_at'>>;

// ---------- Joins úteis para consultas ----------

export interface ClassWithLocation extends Class {
  location: Location;
}

export interface EnrollmentWithDetails extends Enrollment {
  student: Student;
  class: ClassWithLocation;
}

export interface MonthlyFeeWithDetails extends MonthlyFee {
  enrollment: EnrollmentWithDetails;
}

export interface EnrollmentWithClass extends Enrollment {
  class: ClassWithLocation;
}

export interface StudentWithEnrollments extends Student {
  enrollments: EnrollmentWithClass[];
}

/** Used by attendance page: one row per active enrollment with student name + optional attendance record */
export interface AttendanceRow {
  enrollmentId: string;
  studentName: string;
  status: AttendanceStatus | null;
}
