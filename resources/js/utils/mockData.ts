// Mock Data Store for Gurukul Educational Management System

// Organization/Institution interface for multi-tenancy
export interface Organization {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  subscription_plan: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'inactive' | 'suspended';
  max_students: number;
  created_at: string;
  settings?: {
    academic_year_start: string;
    currency: string;
    timezone: string;
    session?: string;
    sessions?: string[];
    date_format?: string;
  };
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'receptionist' | 'teacher' | 'accountant' | 'librarian' | 'student' | 'parent';
  organization_id?: string; // null for super_admin
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
}

export interface Student {
  id: string;
  organization_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  class: string;
  section: string;
  roll_number: string;
  admission_date: string;
  father_name: string;
  father_phone: string;
  father_occupation: string;
  mother_name: string;
  mother_phone: string;
  mother_occupation: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  category: string;
  religion: string;
  caste: string;
  previous_school: string;
  transport_required: boolean;
  transport_pickup_point: string;
  transport_vehicle: string;
  transport_route_details: string;
  hostel_required: boolean;
  status: 'active' | 'inactive';
}

export interface AlumniRecord {
  id: string;
  student_id: string;
  organization_id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  class: string;
  section: string;
  session: string;
  passing_year: string;
  alumni_status: 'left_school';
  current_city: string;
  organization_name: string;
}

export interface Fee {
  id: string;
  student_id: string;
  fee_type: string;
  amount: number;
  discount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  status: 'pending' | 'partial' | 'paid';
  due_date: string;
  created_at: string;
}

export interface FeePayment {
  id: string;
  fee_id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  payment_date: string;
  collected_by: string;
  status?: 'active' | 'reverted';
  reverted_at?: string;
  reverted_by?: string;
  revert_reason?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  class: string;
  section: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  marked_by: string;
  remarks?: string;
}

export interface Exam {
  id: string;
  organization_id: string;
  name: string;
  class: string;
  section: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  total_marks: number;
  passing_marks: number;
  created_by: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained: number;
  grade: string;
  remarks?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  publication_year: string;
  quantity: number;
  available_quantity: number;
  rack_number: string;
  status: 'available' | 'out_of_stock';
}

export interface BookIssue {
  id: string;
  book_id: string;
  student_id: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  status: 'issued' | 'returned' | 'overdue';
  fine?: number;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_role?: string;
  recipient_id?: string;
  recipient_label?: string;
  subject: string;
  message: string;
  sent_at: string;
  read: boolean;
}

export interface Class {
  id: string;
  name: string;
  section: string;
  teacher_id: string;
  teacher_name: string;
  subject?: string;
  room_number: string;
  capacity: number;
  enrolled_students: number;
}

export interface TimeTableEntry {
  id: string;
  classId: string;
  day: string;
  periodId: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  room: string;
  startTime: string;
  endTime: string;
}

export interface LessonPlanEntry {
  id: string;
  timetableEntryId: string;
  classId: string;
  day: string;
  periodId: string;
  subject: string;
  teacherName: string;
  room: string;
  startTime: string;
  endTime: string;
  lessonDate: string;
  lessonTitle: string;
  topic: string;
  status: 'planned' | 'in_progress' | 'completed' | 'carried_forward';
}

// Mock Organizations Database
export const mockOrganizations: Organization[] = [
  {
    id: 'org1',
    name: 'Gurukul School',
    slug: 'gurukul-school',
    address: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    phone: '9876543210',
    email: 'info@gurukul.com',
    website: 'https://www.gurukul.com',
    logo: 'https://www.gurukul.com/logo.png',
    subscription_plan: 'premium',
    subscription_status: 'active',
    max_students: 500,
    created_at: '2020-01-01',
    settings: {
      academic_year_start: '2023-04-01',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      session: '2025-2026',
      sessions: ['2023-2024', '2024-2025', '2025-2026'],
    },
  },
  {
    id: 'org2',
    name: 'Vidya Mandir',
    slug: 'vidya-mandir',
    address: '456 Park Avenue',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    phone: '9876543220',
    email: 'info@vidyamandir.com',
    website: 'https://www.vidyamandir.com',
    logo: 'https://www.vidyamandir.com/logo.png',
    subscription_plan: 'basic',
    subscription_status: 'active',
    max_students: 300,
    created_at: '2021-01-01',
    settings: {
      academic_year_start: '2023-04-01',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      session: '2025-2026',
      sessions: ['2023-2024', '2024-2025', '2025-2026'],
    },
  },
];

// Mock Users Database
export const mockUsers: User[] = [
  {
    id: 'superadmin1',
    email: 'superadmin@gurukul.com',
    password: 'superadmin123',
    name: 'Super Admin',
    role: 'super_admin',
    organization_id: undefined, // Super admin doesn't belong to any org
    status: 'active',
  },
  {
    id: '1',
    email: 'admin@gurukul.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    organization_id: 'org1',
    phone: '9876543210',
    address: '123 Admin Street, Mumbai',
    status: 'active',
  },
  {
    id: '2',
    email: 'teacher@gurukul.com',
    password: 'teacher123',
    name: 'John Teacher',
    role: 'teacher',
    organization_id: 'org1',
    phone: '9876543211',
    address: '456 Teacher Lane, Mumbai',
    status: 'active',
  },
  {
    id: '3',
    email: 'receptionist@gurukul.com',
    password: 'reception123',
    name: 'Sarah Reception',
    role: 'receptionist',
    organization_id: 'org1',
    phone: '9876543212',
    address: '789 Reception Road, Mumbai',
    status: 'active',
  },
  {
    id: '4',
    email: 'accountant@gurukul.com',
    password: 'account123',
    name: 'Mike Accountant',
    role: 'accountant',
    organization_id: 'org1',
    phone: '9876543213',
    address: '321 Account Avenue, Mumbai',
    status: 'active',
  },
  {
    id: '5',
    email: 'librarian@gurukul.com',
    password: 'library123',
    name: 'Emma Librarian',
    role: 'librarian',
    organization_id: 'org1',
    phone: '9876543214',
    address: '654 Library Street, Mumbai',
    status: 'active',
  },
  {
    id: '6',
    email: 'student@gurukul.com',
    password: 'student123',
    name: 'Alex Student',
    role: 'student',
    organization_id: 'org1',
    status: 'active',
  },
  {
    id: '7',
    email: 'parent@gurukul.com',
    password: 'parent123',
    name: 'Robert Parent',
    role: 'parent',
    organization_id: 'org1',
    phone: '9876543215',
    address: '987 Parent Place, Mumbai',
    status: 'active',
  },
  {
    id: '8',
    email: 'teacher2@gurukul.com',
    password: 'teacher123',
    name: 'Priya Sharma',
    role: 'teacher',
    organization_id: 'org1',
    phone: '9876543216',
    address: '111 Teacher Colony, Mumbai',
    status: 'active',
  },
  {
    id: '9',
    email: 'teacher3@gurukul.com',
    password: 'teacher123',
    name: 'Rajesh Kumar',
    role: 'teacher',
    organization_id: 'org1',
    phone: '9876543217',
    address: '222 Faculty Block, Mumbai',
    status: 'inactive',
  },
  {
    id: '10',
    email: 'accountant2@gurukul.com',
    password: 'account123',
    name: 'Sunita Patel',
    role: 'accountant',
    organization_id: 'org1',
    phone: '9876543218',
    address: '333 Finance Wing, Mumbai',
    status: 'active',
  },
  {
    id: '11',
    email: 'admin2@vidyamandir.com',
    password: 'admin123',
    name: 'Neha Verma',
    role: 'admin',
    organization_id: 'org2',
    phone: '9890011223',
    address: '15 Civil Lines, Delhi',
    status: 'active',
  },
  {
    id: '12',
    email: 'reception@vidyamandir.com',
    password: 'reception123',
    name: 'Kavita Sharma',
    role: 'receptionist',
    organization_id: 'org2',
    phone: '9890011224',
    address: '18 Model Town, Delhi',
    status: 'active',
  },
  {
    id: '13',
    email: 'teacher.math@gurukul.com',
    password: 'teacher123',
    name: 'Anjali Deshmukh',
    role: 'teacher',
    organization_id: 'org1',
    phone: '9890011225',
    address: '24 Academic Heights, Mumbai',
    status: 'active',
  },
  {
    id: '14',
    email: 'teacher.science@gurukul.com',
    password: 'teacher123',
    name: 'Vikram Nair',
    role: 'teacher',
    organization_id: 'org1',
    phone: '9890011226',
    address: '42 Staff Quarters, Mumbai',
    status: 'inactive',
  },
  {
    id: '15',
    email: 'librarian2@gurukul.com',
    password: 'library123',
    name: 'Farah Khan',
    role: 'librarian',
    organization_id: 'org1',
    phone: '9890011227',
    address: '9 Library Enclave, Mumbai',
    status: 'active',
  },
  {
    id: '16',
    email: 'accounts@vidyamandir.com',
    password: 'account123',
    name: 'Deepak Arora',
    role: 'accountant',
    organization_id: 'org2',
    phone: '9890011228',
    address: '77 Finance Street, Delhi',
    status: 'active',
  },
  {
    id: '17',
    email: 'teacher.english@vidyamandir.com',
    password: 'teacher123',
    name: 'Sneha Malhotra',
    role: 'teacher',
    organization_id: 'org2',
    phone: '9890011229',
    address: '31 Teachers Colony, Delhi',
    status: 'active',
  },
  {
    id: '18',
    email: 'teacher.history@vidyamandir.com',
    password: 'teacher123',
    name: 'Arvind Joshi',
    role: 'teacher',
    organization_id: 'org2',
    phone: '9890011230',
    address: '12 Heritage Lane, Delhi',
    status: 'inactive',
  },
  {
    id: '19',
    email: 'frontdesk@gurukul.com',
    password: 'reception123',
    name: 'Pooja Mehra',
    role: 'receptionist',
    organization_id: 'org1',
    phone: '9890011231',
    address: '51 Reception Square, Mumbai',
    status: 'active',
  },
  {
    id: '20',
    email: 'admin.ops@gurukul.com',
    password: 'admin123',
    name: 'Ritesh Kulkarni',
    role: 'admin',
    organization_id: 'org1',
    phone: '9890011232',
    address: '88 Admin Block, Mumbai',
    status: 'active',
  },
];

// Mock Students Database
export const mockStudents: Student[] = [
  {
    id: 's1',
    organization_id: 'org1',
    admission_no: 'ADM-2020-001',
    first_name: 'Rahul',
    last_name: 'Sharma',
    email: 'rahul.sharma@example.com',
    phone: '9876543210',
    date_of_birth: '2010-05-15',
    gender: 'male',
    blood_group: 'B+',
    class: '10',
    section: 'A',
    roll_number: '101',
    admission_date: '2020-04-01',
    father_name: 'Rajesh Sharma',
    father_phone: '9876543211',
    father_occupation: 'Engineer',
    mother_name: 'Priya Sharma',
    mother_phone: '9876543212',
    mother_occupation: 'Teacher',
    address: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    category: 'General',
    religion: 'Hindu',
    caste: 'General',
    previous_school: 'ABC School',
    transport_required: true,
    transport_pickup_point: 'Main Gate Stop',
    transport_vehicle: 'Bus 12',
    transport_route_details: 'North Zone Route via Main Gate and Central Market',
    hostel_required: false,
    status: 'active',
  },
  {
    id: 's2',
    organization_id: 'org1',
    admission_no: 'ADM-2021-002',
    first_name: 'Priya',
    last_name: 'Patel',
    email: 'priya.patel@example.com',
    phone: '9876543220',
    date_of_birth: '2011-08-22',
    gender: 'female',
    blood_group: 'O+',
    class: '9',
    section: 'B',
    roll_number: '201',
    admission_date: '2021-04-01',
    father_name: 'Anil Patel',
    father_phone: '9876543221',
    father_occupation: 'Business',
    mother_name: 'Sunita Patel',
    mother_phone: '9876543222',
    mother_occupation: 'Homemaker',
    address: '456 Park Avenue',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    category: 'OBC',
    religion: 'Hindu',
    caste: 'OBC',
    previous_school: 'XYZ School',
    transport_required: false,
    transport_pickup_point: '',
    transport_vehicle: '',
    transport_route_details: '',
    hostel_required: true,
    status: 'active',
  },
  {
    id: 's3',
    organization_id: 'org1',
    admission_no: 'ADM-2020-003',
    first_name: 'Mohammed',
    last_name: 'Khan',
    email: 'mohammed.khan@example.com',
    phone: '9876543230',
    date_of_birth: '2010-12-10',
    gender: 'male',
    blood_group: 'A+',
    class: '10',
    section: 'B',
    roll_number: '102',
    admission_date: '2020-04-01',
    father_name: 'Ahmed Khan',
    father_phone: '9876543231',
    father_occupation: 'Doctor',
    mother_name: 'Fatima Khan',
    mother_phone: '9876543232',
    mother_occupation: 'Nurse',
    address: '789 Lake Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    category: 'General',
    religion: 'Islam',
    caste: 'General',
    previous_school: 'PQR School',
    transport_required: true,
    transport_pickup_point: 'Lake Road Junction',
    transport_vehicle: 'Van 4',
    transport_route_details: 'East Route covering Lake Road and Station Circle',
    hostel_required: false,
    status: 'active',
  },
  {
    id: 's4',
    organization_id: 'org1',
    admission_no: 'ADM-2022-004',
    first_name: 'Anjali',
    last_name: 'Singh',
    email: 'anjali.singh@example.com',
    phone: '9876543240',
    date_of_birth: '2012-03-18',
    gender: 'female',
    blood_group: 'AB+',
    class: '8',
    section: 'A',
    roll_number: '301',
    admission_date: '2022-04-01',
    father_name: 'Vikram Singh',
    father_phone: '9876543241',
    father_occupation: 'Army Officer',
    mother_name: 'Meera Singh',
    mother_phone: '9876543242',
    mother_occupation: 'Lawyer',
    address: '321 Green Valley',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    category: 'General',
    religion: 'Hindu',
    caste: 'General',
    previous_school: 'LMN School',
    transport_required: false,
    transport_pickup_point: '',
    transport_vehicle: '',
    transport_route_details: '',
    hostel_required: false,
    status: 'active',
  },
  {
    id: 's5',
    organization_id: 'org1',
    admission_no: 'ADM-2021-005',
    first_name: 'David',
    last_name: 'Thomas',
    email: 'david.thomas@example.com',
    phone: '9876543250',
    date_of_birth: '2011-07-05',
    gender: 'male',
    blood_group: 'O-',
    class: '9',
    section: 'A',
    roll_number: '202',
    admission_date: '2021-04-01',
    father_name: 'John Thomas',
    father_phone: '9876543251',
    father_occupation: 'Manager',
    mother_name: 'Mary Thomas',
    mother_phone: '9876543252',
    mother_occupation: 'Teacher',
    address: '654 Hill View',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    category: 'General',
    religion: 'Christian',
    caste: 'General',
    previous_school: 'DEF School',
    transport_required: true,
    transport_pickup_point: 'Hill View Circle',
    transport_vehicle: 'Bus 7',
    transport_route_details: 'South Route via Hill View Circle and Lake Colony',
    hostel_required: true,
    status: 'active',
  },
  {
    id: 's6',
    organization_id: 'org1',
    admission_no: 'ADM-2023-006',
    first_name: 'Sneha',
    last_name: 'Reddy',
    email: 'sneha.reddy@example.com',
    phone: '9876543260',
    date_of_birth: '2013-01-20',
    gender: 'female',
    blood_group: 'B-',
    class: '7',
    section: 'B',
    roll_number: '401',
    admission_date: '2023-04-01',
    father_name: 'Krishna Reddy',
    father_phone: '9876543261',
    father_occupation: 'Farmer',
    mother_name: 'Lakshmi Reddy',
    mother_phone: '9876543262',
    mother_occupation: 'Teacher',
    address: '987 Farm Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    category: 'OBC',
    religion: 'Hindu',
    caste: 'OBC',
    previous_school: 'GHI School',
    transport_required: false,
    transport_pickup_point: '',
    transport_vehicle: '',
    transport_route_details: '',
    hostel_required: false,
    status: 'active',
  },
  {
    id: 's7',
    organization_id: 'org1',
    admission_no: 'ADM-2020-007',
    first_name: 'Aarav',
    last_name: 'Joshi',
    email: 'aarav.joshi@example.com',
    phone: '9876543270',
    date_of_birth: '2010-09-14',
    gender: 'male',
    blood_group: 'A-',
    class: '10',
    section: 'A',
    roll_number: '103',
    admission_date: '2020-04-01',
    father_name: 'Sandeep Joshi',
    father_phone: '9876543271',
    father_occupation: 'Architect',
    mother_name: 'Kiran Joshi',
    mother_phone: '9876543272',
    mother_occupation: 'Professor',
    address: '18 Temple Road',
    city: 'Nashik',
    state: 'Maharashtra',
    pincode: '422001',
    category: 'General',
    religion: 'Hindu',
    caste: 'General',
    previous_school: 'Sunrise School',
    transport_required: true,
    transport_pickup_point: 'Temple Road Stop',
    transport_vehicle: 'Bus 3',
    transport_route_details: 'Temple Road Route via City Library and Market Road',
    hostel_required: false,
    status: 'active',
  },
  {
    id: 's8',
    organization_id: 'org1',
    admission_no: 'ADM-2020-008',
    first_name: 'Diya',
    last_name: 'Mehta',
    email: 'diya.mehta@example.com',
    phone: '9876543280',
    date_of_birth: '2010-11-02',
    gender: 'female',
    blood_group: 'O+',
    class: '10',
    section: 'A',
    roll_number: '104',
    admission_date: '2020-04-01',
    father_name: 'Nirav Mehta',
    father_phone: '9876543281',
    father_occupation: 'Chartered Accountant',
    mother_name: 'Rupal Mehta',
    mother_phone: '9876543282',
    mother_occupation: 'Designer',
    address: '27 River View',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395003',
    category: 'General',
    religion: 'Hindu',
    caste: 'General',
    previous_school: 'Greenfield Academy',
    transport_required: false,
    transport_pickup_point: '',
    transport_vehicle: '',
    transport_route_details: '',
    hostel_required: false,
    status: 'active',
  },
];

export const mockAlumniRecords: AlumniRecord[] = [];

// Mock Fees Database
export const mockFees: Fee[] = [
  {
    id: 'f1',
    student_id: 's1',
    fee_type: 'Tuition Fee',
    amount: 50000,
    discount: 5000,
    total_amount: 45000,
    paid_amount: 45000,
    due_amount: 0,
    status: 'paid',
    due_date: '2024-04-30',
    created_at: '2024-04-01',
  },
  {
    id: 'f2',
    student_id: 's1',
    fee_type: 'Transport Fee',
    amount: 10000,
    discount: 0,
    total_amount: 10000,
    paid_amount: 5000,
    due_amount: 5000,
    status: 'partial',
    due_date: '2024-05-31',
    created_at: '2024-04-01',
  },
  {
    id: 'f3',
    student_id: 's2',
    fee_type: 'Tuition Fee',
    amount: 45000,
    discount: 0,
    total_amount: 45000,
    paid_amount: 0,
    due_amount: 45000,
    status: 'pending',
    due_date: '2024-04-30',
    created_at: '2024-04-01',
  },
  {
    id: 'f4',
    student_id: 's2',
    fee_type: 'Hostel Fee',
    amount: 20000,
    discount: 2000,
    total_amount: 18000,
    paid_amount: 18000,
    due_amount: 0,
    status: 'paid',
    due_date: '2024-04-30',
    created_at: '2024-04-01',
  },
  {
    id: 'f5',
    student_id: 's3',
    fee_type: 'Tuition Fee',
    amount: 50000,
    discount: 10000,
    total_amount: 40000,
    paid_amount: 20000,
    due_amount: 20000,
    status: 'partial',
    due_date: '2024-04-30',
    created_at: '2024-04-01',
  },
  {
    id: 'f6',
    student_id: 's3',
    fee_type: 'Library Fee',
    amount: 3000,
    discount: 0,
    total_amount: 3000,
    paid_amount: 3000,
    due_amount: 0,
    status: 'paid',
    due_date: '2024-05-15',
    created_at: '2024-04-05',
  },
  {
    id: 'f7',
    student_id: 's4',
    fee_type: 'Tuition Fee',
    amount: 38000,
    discount: 3000,
    total_amount: 35000,
    paid_amount: 20000,
    due_amount: 15000,
    status: 'partial',
    due_date: '2024-05-10',
    created_at: '2024-04-03',
  },
  {
    id: 'f8',
    student_id: 's4',
    fee_type: 'Activity Fee',
    amount: 4000,
    discount: 0,
    total_amount: 4000,
    paid_amount: 0,
    due_amount: 4000,
    status: 'pending',
    due_date: '2024-05-20',
    created_at: '2024-04-03',
  },
  {
    id: 'f9',
    student_id: 's5',
    fee_type: 'Tuition Fee',
    amount: 42000,
    discount: 2000,
    total_amount: 40000,
    paid_amount: 40000,
    due_amount: 0,
    status: 'paid',
    due_date: '2024-04-25',
    created_at: '2024-04-01',
  },
  {
    id: 'f10',
    student_id: 's5',
    fee_type: 'Transport Fee',
    amount: 8000,
    discount: 0,
    total_amount: 8000,
    paid_amount: 3000,
    due_amount: 5000,
    status: 'partial',
    due_date: '2024-05-28',
    created_at: '2024-04-08',
  },
  {
    id: 'f11',
    student_id: 's2',
    fee_type: 'Computer Lab Fee',
    amount: 6000,
    discount: 1000,
    total_amount: 5000,
    paid_amount: 2500,
    due_amount: 2500,
    status: 'partial',
    due_date: '2024-05-18',
    created_at: '2024-04-06',
  },
  {
    id: 'f12',
    student_id: 's1',
    fee_type: 'Exam Fee',
    amount: 7000,
    discount: 0,
    total_amount: 7000,
    paid_amount: 0,
    due_amount: 7000,
    status: 'pending',
    due_date: '2024-06-05',
    created_at: '2024-04-12',
  },
];

// Mock Fee Payments Database
export const mockFeePayments: FeePayment[] = [
  {
    id: 'p1',
    fee_id: 'f1',
    student_id: 's1',
    amount: 45000,
    payment_method: 'online',
    transaction_id: 'TXN001',
    payment_date: '2024-04-15',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p2',
    fee_id: 'f2',
    student_id: 's1',
    amount: 5000,
    payment_method: 'cash',
    transaction_id: 'TXN002',
    payment_date: '2024-04-20',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p3',
    fee_id: 'f4',
    student_id: 's2',
    amount: 18000,
    payment_method: 'cheque',
    transaction_id: 'CHQ001',
    payment_date: '2024-04-10',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p4',
    fee_id: 'f5',
    student_id: 's3',
    amount: 20000,
    payment_method: 'online',
    transaction_id: 'TXN003',
    payment_date: '2024-04-25',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p5',
    fee_id: 'f6',
    student_id: 's3',
    amount: 3000,
    payment_method: 'cash',
    transaction_id: 'TXN004',
    payment_date: '2024-04-18',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p6',
    fee_id: 'f7',
    student_id: 's4',
    amount: 20000,
    payment_method: 'online',
    transaction_id: 'TXN005',
    payment_date: '2024-04-22',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p7',
    fee_id: 'f9',
    student_id: 's5',
    amount: 40000,
    payment_method: 'cheque',
    transaction_id: 'CHQ002',
    payment_date: '2024-04-14',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p8',
    fee_id: 'f10',
    student_id: 's5',
    amount: 3000,
    payment_method: 'cash',
    transaction_id: 'TXN006',
    payment_date: '2024-04-26',
    collected_by: 'accountant@gurukul.com',
  },
  {
    id: 'p9',
    fee_id: 'f11',
    student_id: 's2',
    amount: 2500,
    payment_method: 'online',
    transaction_id: 'TXN007',
    payment_date: '2024-04-21',
    collected_by: 'accountant@gurukul.com',
  },
];

// Mock Attendance Database
export const mockAttendance: Attendance[] = [
  {
    id: 'a1',
    student_id: 's1',
    class: '10',
    section: 'A',
    date: '2024-05-01',
    status: 'present',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a2',
    student_id: 's2',
    class: '9',
    section: 'B',
    date: '2024-05-01',
    status: 'absent',
    marked_by: 'teacher@gurukul.com',
    remarks: 'Medical leave',
  },
  {
    id: 'a3',
    student_id: 's3',
    class: '10',
    section: 'B',
    date: '2024-05-01',
    status: 'present',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a4',
    student_id: 's4',
    class: '8',
    section: 'A',
    date: '2024-05-01',
    status: 'late',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a5',
    student_id: 's5',
    class: '9',
    section: 'A',
    date: '2024-05-01',
    status: 'present',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a6',
    student_id: 's1',
    class: '10',
    section: 'A',
    date: '2024-05-02',
    status: 'late',
    marked_by: 'teacher@gurukul.com',
    remarks: 'Arrived after assembly',
  },
  {
    id: 'a7',
    student_id: 's3',
    class: '10',
    section: 'B',
    date: '2024-05-02',
    status: 'absent',
    marked_by: 'teacher@gurukul.com',
    remarks: 'Family function',
  },
  {
    id: 'a8',
    student_id: 's4',
    class: '8',
    section: 'A',
    date: '2024-05-02',
    status: 'half_day',
    marked_by: 'teacher@gurukul.com',
    remarks: 'Left early',
  },
  {
    id: 'a9',
    student_id: 's5',
    class: '9',
    section: 'A',
    date: '2024-05-02',
    status: 'present',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a10',
    student_id: 's2',
    class: '9',
    section: 'B',
    date: '2024-05-02',
    status: 'present',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a11',
    student_id: 's1',
    class: '10',
    section: 'A',
    date: '2024-05-03',
    status: 'present',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a12',
    student_id: 's3',
    class: '10',
    section: 'B',
    date: '2024-05-03',
    status: 'late',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a13',
    student_id: 's4',
    class: '8',
    section: 'A',
    date: '2024-05-03',
    status: 'present',
    marked_by: 'teacher@gurukul.com',
  },
  {
    id: 'a14',
    student_id: 's5',
    class: '9',
    section: 'A',
    date: '2024-05-03',
    status: 'absent',
    marked_by: 'teacher@gurukul.com',
    remarks: 'Sick leave',
  },
  {
    id: 'a15',
    student_id: 's2',
    class: '9',
    section: 'B',
    date: '2024-05-03',
    status: 'half_day',
    marked_by: 'teacher@gurukul.com',
  },
];

// Mock Exams Database
export const mockExams: Exam[] = [
  {
    id: 'e1',
    organization_id: 'org1',
    name: 'Mid Term',
    class: '10',
    section: 'A',
    subject: 'Mathematics',
    exam_date: '2024-06-15',
    start_time: '09:00',
    end_time: '12:00',
    total_marks: 100,
    passing_marks: 40,
    created_by: 'teacher@gurukul.com',
  },
  {
    id: 'e2',
    organization_id: 'org1',
    name: 'Mid Term',
    class: '10',
    section: 'A',
    subject: 'Science',
    exam_date: '2024-06-17',
    start_time: '09:00',
    end_time: '12:00',
    total_marks: 100,
    passing_marks: 40,
    created_by: 'teacher@gurukul.com',
  },
  {
    id: 'e3',
    organization_id: 'org1',
    name: 'Mid Term',
    class: '9',
    section: 'A',
    subject: 'English',
    exam_date: '2024-06-18',
    start_time: '09:00',
    end_time: '11:30',
    total_marks: 80,
    passing_marks: 32,
    created_by: 'teacher@gurukul.com',
  },
  {
    id: 'e4',
    organization_id: 'org1',
    name: 'Unit Test',
    class: '8',
    section: 'A',
    subject: 'Hindi',
    exam_date: '2024-05-20',
    start_time: '10:00',
    end_time: '11:00',
    total_marks: 50,
    passing_marks: 20,
    created_by: 'teacher@gurukul.com',
  },
];

// Mock Exam Results Database
export const mockExamResults: ExamResult[] = [
  {
    id: 'r1',
    exam_id: 'e1',
    student_id: 's1',
    marks_obtained: 85,
    grade: 'A',
  },
  {
    id: 'r2',
    exam_id: 'e2',
    student_id: 's1',
    marks_obtained: 78,
    grade: 'B+',
  },
  {
    id: 'r3',
    exam_id: 'e1',
    student_id: 's3',
    marks_obtained: 92,
    grade: 'A+',
  },
  {
    id: 'r4',
    exam_id: 'e3',
    student_id: 's5',
    marks_obtained: 65,
    grade: 'B',
  },
  {
    id: 'r5',
    exam_id: 'e4',
    student_id: 's4',
    marks_obtained: 42,
    grade: 'C+',
  },
];

// Mock Books Database
export const mockBooks: Book[] = [
  {
    id: 'b1',
    title: 'Mathematics for Class 10',
    author: 'R.D. Sharma',
    isbn: '978-8193663011',
    category: 'Mathematics',
    publisher: 'Dhanpat Rai',
    publication_year: '2023',
    quantity: 50,
    available_quantity: 42,
    rack_number: 'A-01',
    status: 'available',
  },
  {
    id: 'b2',
    title: 'Science for Class 9',
    author: 'NCERT',
    isbn: '978-8174506917',
    category: 'Science',
    publisher: 'NCERT',
    publication_year: '2023',
    quantity: 60,
    available_quantity: 55,
    rack_number: 'B-02',
    status: 'available',
  },
  {
    id: 'b3',
    title: 'English Grammar',
    author: 'Wren & Martin',
    isbn: '978-8121916010',
    category: 'English',
    publisher: 'S. Chand',
    publication_year: '2022',
    quantity: 40,
    available_quantity: 35,
    rack_number: 'C-03',
    status: 'available',
  },
  {
    id: 'b4',
    title: 'Indian History',
    author: 'Bipan Chandra',
    isbn: '978-0143031031',
    category: 'History',
    publisher: 'Penguin',
    publication_year: '2021',
    quantity: 30,
    available_quantity: 28,
    rack_number: 'D-04',
    status: 'available',
  },
  {
    id: 'b5',
    title: 'Physics Concepts',
    author: 'H.C. Verma',
    isbn: '978-8177091878',
    category: 'Physics',
    publisher: 'Bharati Bhawan',
    publication_year: '2023',
    quantity: 25,
    available_quantity: 0,
    rack_number: 'E-05',
    status: 'out_of_stock',
  },
  {
    id: 'b6',
    title: 'Chemistry Fundamentals',
    author: 'O.P. Tandon',
    isbn: '978-8193233085',
    category: 'Chemistry',
    publisher: 'GRB Publications',
    publication_year: '2023',
    quantity: 35,
    available_quantity: 30,
    rack_number: 'F-06',
    status: 'available',
  },
];

// Mock Book Issues Database
export const mockBookIssues: BookIssue[] = [
  {
    id: 'i1',
    book_id: 'b1',
    student_id: 's1',
    issue_date: '2024-04-10',
    due_date: '2024-04-24',
    status: 'issued',
  },
  {
    id: 'i2',
    book_id: 'b2',
    student_id: 's2',
    issue_date: '2024-04-15',
    due_date: '2024-04-29',
    return_date: '2024-04-28',
    status: 'returned',
  },
  {
    id: 'i3',
    book_id: 'b3',
    student_id: 's3',
    issue_date: '2024-04-05',
    due_date: '2024-04-19',
    status: 'overdue',
    fine: 50,
  },
  {
    id: 'i4',
    book_id: 'b4',
    student_id: 's4',
    issue_date: '2024-04-20',
    due_date: '2024-05-04',
    status: 'issued',
  },
  {
    id: 'i5',
    book_id: 'b6',
    student_id: 's5',
    issue_date: '2024-04-12',
    due_date: '2024-04-26',
    return_date: '2024-04-25',
    status: 'returned',
  },
];

// Mock Messages Database
export const mockMessages: Message[] = [
  {
    id: 'm1',
    sender_id: '1',
    sender_name: 'Admin User',
    sender_role: 'admin',
    recipient_role: 'teacher',
    subject: 'Staff Meeting',
    message: 'Please attend the staff meeting on Monday at 10 AM.',
    sent_at: '2024-04-25T09:00:00Z',
    read: false,
  },
  {
    id: 'm2',
    sender_id: '2',
    sender_name: 'John Teacher',
    sender_role: 'teacher',
    recipient_id: '1',
    subject: 'Exam Schedule',
    message: 'The exam schedule for mid-term has been finalized.',
    sent_at: '2024-04-26T14:30:00Z',
    read: true,
  },
  {
    id: 'm3',
    sender_id: '1',
    sender_name: 'Admin User',
    sender_role: 'admin',
    recipient_role: 'student',
    subject: 'Holiday Notice',
    message: 'School will remain closed on May 1st for May Day.',
    sent_at: '2024-04-27T11:00:00Z',
    read: false,
  },
  {
    id: 'm4',
    sender_id: '4',
    sender_name: 'Mike Accountant',
    sender_role: 'accountant',
    recipient_id: '1',
    subject: 'Fee Collection Report',
    message: 'Monthly fee collection report is ready for review.',
    sent_at: '2024-04-28T16:00:00Z',
    read: false,
  },
  {
    id: 'm5',
    sender_id: '5',
    sender_name: 'Emma Librarian',
    sender_role: 'librarian',
    recipient_role: 'student',
    subject: 'Overdue Books',
    message: 'Please return overdue books to avoid fines.',
    sent_at: '2024-04-29T10:00:00Z',
    read: false,
  },
];

// Mock Classes Database
export const mockClasses: Class[] = [
  {
    id: 'c1',
    name: '10',
    section: 'A',
    teacher_id: '2',
    teacher_name: 'John Teacher',
    subject: 'Mathematics',
    room_number: '101',
    capacity: 40,
    enrolled_students: 35,
  },
  {
    id: 'c2',
    name: '10',
    section: 'B',
    teacher_id: '2',
    teacher_name: 'John Teacher',
    subject: 'Science',
    room_number: '102',
    capacity: 40,
    enrolled_students: 38,
  },
  {
    id: 'c3',
    name: '9',
    section: 'A',
    teacher_id: '2',
    teacher_name: 'John Teacher',
    subject: 'English',
    room_number: '201',
    capacity: 35,
    enrolled_students: 32,
  },
  {
    id: 'c4',
    name: '9',
    section: 'B',
    teacher_id: '2',
    teacher_name: 'John Teacher',
    subject: 'Hindi',
    room_number: '202',
    capacity: 35,
    enrolled_students: 30,
  },
  {
    id: 'c5',
    name: '8',
    section: 'A',
    teacher_id: '2',
    teacher_name: 'John Teacher',
    subject: 'Mathematics',
    room_number: '301',
    capacity: 30,
    enrolled_students: 28,
  },
  {
    id: 'c6',
    name: '7',
    section: 'B',
    teacher_id: '2',
    teacher_name: 'John Teacher',
    subject: 'Science',
    room_number: '302',
    capacity: 30,
    enrolled_students: 25,
  },
];

export const mockTimeTableEntries: TimeTableEntry[] = [
  {
    id: 'tt1',
    classId: 'c1',
    day: 'Monday',
    periodId: 'p1',
    subject: 'Mathematics',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '08:30',
    endTime: '09:15',
  },
  {
    id: 'tt2',
    classId: 'c1',
    day: 'Monday',
    periodId: 'p2',
    subject: 'Science',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '09:20',
    endTime: '10:05',
  },
  {
    id: 'tt3',
    classId: 'c1',
    day: 'Tuesday',
    periodId: 'p1',
    subject: 'English',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '08:30',
    endTime: '09:15',
  },
  {
    id: 'tt4',
    classId: 'c2',
    day: 'Monday',
    periodId: 'p1',
    subject: 'Science',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '102',
    startTime: '08:30',
    endTime: '09:15',
  },
  {
    id: 'tt5',
    classId: 'c2',
    day: 'Wednesday',
    periodId: 'p3',
    subject: 'Mathematics',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '102',
    startTime: '10:20',
    endTime: '11:05',
  },
  {
    id: 'tt6',
    classId: 'c3',
    day: 'Thursday',
    periodId: 'p2',
    subject: 'English',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '201',
    startTime: '09:20',
    endTime: '10:05',
  },
  {
    id: 'tt7',
    classId: 'c1',
    day: 'Wednesday',
    periodId: 'p3',
    subject: 'Social Science',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '10:20',
    endTime: '11:05',
  },
  {
    id: 'tt8',
    classId: 'c1',
    day: 'Friday',
    periodId: 'p4',
    subject: 'Computer',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '11:10',
    endTime: '11:55',
  },
  {
    id: 'tt9',
    classId: 'c2',
    day: 'Tuesday',
    periodId: 'p2',
    subject: 'English',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '102',
    startTime: '09:20',
    endTime: '10:05',
  },
  {
    id: 'tt10',
    classId: 'c2',
    day: 'Thursday',
    periodId: 'p4',
    subject: 'Science',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '102',
    startTime: '11:10',
    endTime: '11:55',
  },
  {
    id: 'tt11',
    classId: 'c3',
    day: 'Monday',
    periodId: 'p1',
    subject: 'English',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '201',
    startTime: '08:30',
    endTime: '09:15',
  },
  {
    id: 'tt12',
    classId: 'c3',
    day: 'Wednesday',
    periodId: 'p3',
    subject: 'Hindi',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '201',
    startTime: '10:20',
    endTime: '11:05',
  },
  {
    id: 'tt13',
    classId: 'c4',
    day: 'Tuesday',
    periodId: 'p1',
    subject: 'Hindi',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '202',
    startTime: '08:30',
    endTime: '09:15',
  },
  {
    id: 'tt14',
    classId: 'c4',
    day: 'Friday',
    periodId: 'p2',
    subject: 'Social Science',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '202',
    startTime: '09:20',
    endTime: '10:05',
  },
  {
    id: 'tt15',
    classId: 'c5',
    day: 'Monday',
    periodId: 'p1',
    subject: 'Mathematics',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '301',
    startTime: '08:30',
    endTime: '09:15',
  },
  {
    id: 'tt16',
    classId: 'c5',
    day: 'Thursday',
    periodId: 'p5',
    subject: 'Science',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '301',
    startTime: '12:30',
    endTime: '01:15',
  },
  {
    id: 'tt17',
    classId: 'c6',
    day: 'Wednesday',
    periodId: 'p2',
    subject: 'Science',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '302',
    startTime: '09:20',
    endTime: '10:05',
  },
  {
    id: 'tt18',
    classId: 'c6',
    day: 'Saturday',
    periodId: 'p3',
    subject: 'English',
    teacherId: '2',
    teacherName: 'John Teacher',
    room: '302',
    startTime: '10:20',
    endTime: '11:05',
  },
];

export const mockLessonPlans: LessonPlanEntry[] = [
  {
    id: 'lp1',
    timetableEntryId: 'tt1',
    classId: 'c1',
    day: 'Monday',
    periodId: 'p1',
    subject: 'Mathematics',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '08:30',
    endTime: '09:15',
    lessonDate: '2026-04-06',
    lessonTitle: 'Linear Equations',
    topic: 'Solving one-variable equations using balancing method',
    status: 'completed',
  },
  {
    id: 'lp2',
    timetableEntryId: 'tt2',
    classId: 'c1',
    day: 'Monday',
    periodId: 'p2',
    subject: 'Science',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '09:20',
    endTime: '10:05',
    lessonDate: '2026-04-06',
    lessonTitle: 'Chemical Reactions',
    topic: 'Indicators of physical and chemical changes with class examples',
    status: 'in_progress',
  },
  {
    id: 'lp3',
    timetableEntryId: 'tt3',
    classId: 'c1',
    day: 'Tuesday',
    periodId: 'p1',
    subject: 'English',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '08:30',
    endTime: '09:15',
    lessonDate: '2026-04-07',
    lessonTitle: 'Reading Comprehension',
    topic: 'Inference, tone, and vocabulary from unseen passages',
    status: 'planned',
  },
  {
    id: 'lp4',
    timetableEntryId: 'tt5',
    classId: 'c2',
    day: 'Wednesday',
    periodId: 'p3',
    subject: 'Mathematics',
    teacherName: 'John Teacher',
    room: '102',
    startTime: '10:20',
    endTime: '11:05',
    lessonDate: '2026-04-08',
    lessonTitle: 'Surface Area',
    topic: 'Surface area of cubes and cuboids with word problems',
    status: 'carried_forward',
  },
  {
    id: 'lp5',
    timetableEntryId: 'tt7',
    classId: 'c1',
    day: 'Wednesday',
    periodId: 'p3',
    subject: 'Social Science',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '10:20',
    endTime: '11:05',
    lessonDate: '2026-04-08',
    lessonTitle: 'Resources and Development',
    topic: 'Types of resources and conservation practices',
    status: 'planned',
  },
  {
    id: 'lp6',
    timetableEntryId: 'tt8',
    classId: 'c1',
    day: 'Friday',
    periodId: 'p4',
    subject: 'Computer',
    teacherName: 'John Teacher',
    room: '101',
    startTime: '11:10',
    endTime: '11:55',
    lessonDate: '2026-04-10',
    lessonTitle: 'Spreadsheet Basics',
    topic: 'Rows, columns, formulas, and cell references',
    status: 'planned',
  },
  {
    id: 'lp7',
    timetableEntryId: 'tt9',
    classId: 'c2',
    day: 'Tuesday',
    periodId: 'p2',
    subject: 'English',
    teacherName: 'John Teacher',
    room: '102',
    startTime: '09:20',
    endTime: '10:05',
    lessonDate: '2026-04-07',
    lessonTitle: 'Grammar Practice',
    topic: 'Active and passive voice transformation',
    status: 'completed',
  },
  {
    id: 'lp8',
    timetableEntryId: 'tt10',
    classId: 'c2',
    day: 'Thursday',
    periodId: 'p4',
    subject: 'Science',
    teacherName: 'John Teacher',
    room: '102',
    startTime: '11:10',
    endTime: '11:55',
    lessonDate: '2026-04-09',
    lessonTitle: 'Life Processes',
    topic: 'Nutrition and respiration in human beings',
    status: 'in_progress',
  },
  {
    id: 'lp9',
    timetableEntryId: 'tt11',
    classId: 'c3',
    day: 'Monday',
    periodId: 'p1',
    subject: 'English',
    teacherName: 'John Teacher',
    room: '201',
    startTime: '08:30',
    endTime: '09:15',
    lessonDate: '2026-04-06',
    lessonTitle: 'Poetry Appreciation',
    topic: 'Imagery, rhyme scheme, and tone in the selected poem',
    status: 'completed',
  },
  {
    id: 'lp10',
    timetableEntryId: 'tt12',
    classId: 'c3',
    day: 'Wednesday',
    periodId: 'p3',
    subject: 'Hindi',
    teacherName: 'John Teacher',
    room: '201',
    startTime: '10:20',
    endTime: '11:05',
    lessonDate: '2026-04-08',
    lessonTitle: 'Gadya Adhyayan',
    topic: 'Path ka saar aur mukhya vichar',
    status: 'planned',
  },
  {
    id: 'lp11',
    timetableEntryId: 'tt13',
    classId: 'c4',
    day: 'Tuesday',
    periodId: 'p1',
    subject: 'Hindi',
    teacherName: 'John Teacher',
    room: '202',
    startTime: '08:30',
    endTime: '09:15',
    lessonDate: '2026-04-07',
    lessonTitle: 'Vyakaran',
    topic: 'Sangya, sarvanam, aur prayog',
    status: 'in_progress',
  },
  {
    id: 'lp12',
    timetableEntryId: 'tt14',
    classId: 'c4',
    day: 'Friday',
    periodId: 'p2',
    subject: 'Social Science',
    teacherName: 'John Teacher',
    room: '202',
    startTime: '09:20',
    endTime: '10:05',
    lessonDate: '2026-04-10',
    lessonTitle: 'Democratic Politics',
    topic: 'What makes elections democratic',
    status: 'planned',
  },
  {
    id: 'lp13',
    timetableEntryId: 'tt15',
    classId: 'c5',
    day: 'Monday',
    periodId: 'p1',
    subject: 'Mathematics',
    teacherName: 'John Teacher',
    room: '301',
    startTime: '08:30',
    endTime: '09:15',
    lessonDate: '2026-04-06',
    lessonTitle: 'Fractions',
    topic: 'Addition and subtraction of like and unlike fractions',
    status: 'completed',
  },
  {
    id: 'lp14',
    timetableEntryId: 'tt16',
    classId: 'c5',
    day: 'Thursday',
    periodId: 'p5',
    subject: 'Science',
    teacherName: 'John Teacher',
    room: '301',
    startTime: '12:30',
    endTime: '01:15',
    lessonDate: '2026-04-09',
    lessonTitle: 'Force and Friction',
    topic: 'Types of force and daily life examples',
    status: 'carried_forward',
  },
  {
    id: 'lp15',
    timetableEntryId: 'tt17',
    classId: 'c6',
    day: 'Wednesday',
    periodId: 'p2',
    subject: 'Science',
    teacherName: 'John Teacher',
    room: '302',
    startTime: '09:20',
    endTime: '10:05',
    lessonDate: '2026-04-08',
    lessonTitle: 'Heat Transfer',
    topic: 'Conduction, convection, and radiation',
    status: 'planned',
  },
  {
    id: 'lp16',
    timetableEntryId: 'tt18',
    classId: 'c6',
    day: 'Saturday',
    periodId: 'p3',
    subject: 'English',
    teacherName: 'John Teacher',
    room: '302',
    startTime: '10:20',
    endTime: '11:05',
    lessonDate: '2026-04-11',
    lessonTitle: 'Writing Skills',
    topic: 'Paragraph writing with topic sentences and supporting details',
    status: 'planned',
  },
];
