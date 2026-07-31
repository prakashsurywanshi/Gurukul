import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BedDouble, Building2, Check, ChevronsUpDown, ClipboardList, DoorOpen, Download, Eye, IndianRupee, Megaphone, PackageOpen, Pencil, Plus, Power, Printer, Search, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

interface HostelManagementProps {
  user: any;
  organization?: {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  students: HostelStudent[];
  classRecords: ClassRecord[];
  staffRecords: StaffRecord[];
  hostels: Hostel[];
  rooms: Room[];
  beds: Bed[];
  feeStructures: HostelFeeStructure[];
  hostelComplaints: HostelComplaint[];
  hostelNotices: HostelNotice[];
  lostFoundItems: LostFoundItem[];
}

type Hostel = {
  id: string;
  name: string;
  type: string;
  address: string;
  warden: string;
  contact: string;
  status: 'active' | 'inactive';
};

type Room = {
  id: string;
  hostelId: string;
  roomNumber: string;
  floor: string;
  roomType: string;
  capacity: number;
  occupied?: number;
  status: 'available' | 'full' | 'maintenance';
};

type Bed = {
  id: string;
  hostelId: string;
  roomId: string;
  bedNumber: string;
  status: 'available' | 'occupied' | 'maintenance';
  assignedStudentId?: string;
  assignedStudentName?: string | null;
  assignedStudentAdmissionNo?: string | null;
  assignedStudentRollNumber?: string | null;
  assignedStudentClass?: string | null;
  assignedStudentSection?: string | null;
  allocationDate?: string | null;
};

type HostelFeeStructure = {
  id: string;
  hostelId: string;
  roomType: string;
  amount: number;
  frequency: string;
  description: string;
  status: 'active' | 'inactive';
};

type HostelComplaint = {
  id: string;
  studentId?: string | null;
  hostelId?: string | null;
  hostelName?: string | null;
  complainantName: string;
  phone?: string | null;
  source: string;
  category: string;
  assignedTo?: string | null;
  complaintDate?: string | null;
  status: 'open' | 'in_review' | 'resolved' | 'closed' | string;
  note?: string | null;
  actionTaken?: string | null;
  studentName?: string | null;
  admissionNumber?: string | null;
  class?: string | null;
  section?: string | null;
  createdAt?: string | null;
};

type HostelNotice = {
  id: string;
  hostelId?: string | null;
  hostelName?: string | null;
  title: string;
  message: string;
  publishDate?: string | null;
  status: 'active' | 'inactive' | string;
  createdBy?: string | null;
  createdAt?: string | null;
};

type LostFoundItem = {
  id: string;
  hostelId?: string | null;
  hostelName?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  admissionNumber?: string | null;
  class?: string | null;
  section?: string | null;
  reportedBy?: string | null;
  itemType: 'lost' | 'found' | string;
  itemName: string;
  location?: string | null;
  reportedDate?: string | null;
  description?: string | null;
  contact?: string | null;
  status: 'open' | 'claimed' | 'resolved' | string;
  resolutionNote?: string | null;
  createdAt?: string | null;
};

type HostelStudent = {
  id: string;
  first_name: string;
  last_name: string;
  admission_no?: string | null;
  class?: string | null;
  section?: string | null;
  roll_number?: string | null;
  hostel_required: boolean;
  status: 'active' | 'inactive';
};

type ClassRecord = {
  id: number;
  name: string;
  section: string;
};

type StaffRecord = {
  id: number;
  name: string;
  phone?: string | null;
  role: string;
  status: 'active' | 'inactive';
};

const bedStatusStyles: Record<Bed['status'], string> = {
  available: 'border-green-600 text-green-600',
  occupied: 'border-red-600 text-red-600',
  maintenance: 'border-blue-600 text-blue-600',
};
const roomTypeLabels: Record<string, string> = {
  single: 'Single',
  double: 'Double',
  triple: 'Triple',
  dormitory: 'Dormitory',
};

const hostelTypeLabels: Record<string, string> = {
  boys: 'Boys',
  girls: 'Girls',
  mixed: 'Mixed',
};

const frequencyLabels: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  'one-time': 'One Time',
};

const formatRole = (role: string) => role.replace(/_/g, ' ');

export default function HostelManagement({ user, organization, students, classRecords, staffRecords, hostels, rooms, beds, feeStructures, hostelComplaints = [], hostelNotices = [], lostFoundItems = [] }: HostelManagementProps) {
  const page = usePage<{ flash?: { success?: string; error?: string } }>();
  const flash = page.props.flash ?? {};
  const [selectedHostelId, setSelectedHostelId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [selectedLostFoundId, setSelectedLostFoundId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('hostels');
  const [studentComboboxOpen, setStudentComboboxOpen] = useState(false);
  const [bedRoomFilterOpen, setBedRoomFilterOpen] = useState(false);
  const [hostelSearchQuery, setHostelSearchQuery] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [bedSearchQuery, setBedSearchQuery] = useState('');
  const [hostelComplaintSearchQuery, setHostelComplaintSearchQuery] = useState('');
  const [hostelComplaintHostelFilter, setHostelComplaintHostelFilter] = useState('all');
  const [noticeSearchQuery, setNoticeSearchQuery] = useState('');
  const [lostFoundSearchQuery, setLostFoundSearchQuery] = useState('');
  const [layoutRoomSearchQuery, setLayoutRoomSearchQuery] = useState('');
  const [roomHostelFilter, setRoomHostelFilter] = useState<string>('');
  const [bedHostelFilter, setBedHostelFilter] = useState<string>('');
  const [bedRoomFilter, setBedRoomFilter] = useState<string>('');
  const [layoutHostelFilter, setLayoutHostelFilter] = useState<string>('');
  const [selectedLayoutRoomId, setSelectedLayoutRoomId] = useState<string | null>(null);

  const [hostelForm, setHostelForm] = useState({
    name: '',
    type: '',
    address: '',
    wardenStaffId: '',
    warden: '',
    contact: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [roomForm, setRoomForm] = useState({
    hostelId: '',
    roomNumber: '',
    floor: '',
    roomType: 'double',
    capacity: '',
    status: 'available' as 'available' | 'full' | 'maintenance',
  });

  const [bedForm, setBedForm] = useState({
    hostelId: '',
    roomId: '',
    bedNumber: '',
    assignedClass: '',
    assignedSection: '',
    status: 'available' as 'available' | 'occupied' | 'maintenance',
    assignedStudentId: '',
  });

  const [feeForm, setFeeForm] = useState({
    hostelId: '',
    roomType: '',
    amount: '',
    frequency: 'monthly',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const [complaintForm, setComplaintForm] = useState({
    studentId: '',
    complainantName: '',
    phone: '',
    assignedTo: '',
    complaintDate: new Date().toISOString().slice(0, 10),
    status: 'open',
    note: '',
    actionTaken: '',
  });

  const [noticeForm, setNoticeForm] = useState({
    hostelId: 'all',
    title: '',
    message: '',
    publishDate: new Date().toISOString().slice(0, 10),
    status: 'active' as 'active' | 'inactive',
  });

  const [lostFoundForm, setLostFoundForm] = useState({
    hostelId: 'all',
    studentId: '',
    itemType: 'lost',
    itemName: '',
    location: '',
    reportedDate: new Date().toISOString().slice(0, 10),
    description: '',
    contact: '',
    status: 'open',
    resolutionNote: '',
  });

  useEffect(() => {
    if (flash.success) {
      toast.success(flash.success);
    }

    if (flash.error) {
      toast.error(flash.error);
    }
  }, [flash.error, flash.success]);

  const roomCounts = useMemo(
    () =>
      hostels.reduce<Record<string, number>>((accumulator, hostel) => {
        accumulator[hostel.id] = rooms.filter((room) => room.hostelId === hostel.id).length;
        return accumulator;
      }, {}),
    [hostels, rooms]
  );

  const activeStaffRecords = useMemo(
    () => staffRecords.filter((staff) => staff.status === 'active'),
    [staffRecords]
  );

  const bedCounts = useMemo(
    () =>
      hostels.reduce<Record<string, number>>((accumulator, hostel) => {
        accumulator[hostel.id] = beds.filter((bed) => bed.hostelId === hostel.id).length;
        return accumulator;
      }, {}),
    [beds, hostels]
  );

  const availableRoomsForSelectedHostel = rooms.filter((room) => room.hostelId === bedForm.hostelId);
  const availableRoomsForBedFilter = rooms.filter((room) => room.hostelId === bedHostelFilter);
  const selectedBedFilterRoom = bedRoomFilter
    ? availableRoomsForBedFilter.find((room) => room.id === bedRoomFilter) ?? null
    : null;
  const selectedBedFilterHostel = bedHostelFilter
    ? hostels.find((hostel) => hostel.id === bedHostelFilter) ?? null
    : null;
  const selectedBed = selectedBedId ? beds.find((bed) => bed.id === selectedBedId) ?? null : null;
  const selectedRoomForBedForm = bedForm.roomId ? rooms.find((room) => room.id === bedForm.roomId) ?? null : null;
  const studentLookup = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const studentsEligibleForAssignment = useMemo(
    () =>
      students.filter(
        (student) =>
          student.status === 'active' &&
          Boolean(student.class) &&
          Boolean(student.section)
      ),
    [students]
  );
  const assignedStudentIds = beds
    .filter((bed) => !selectedBedId || bed.id !== selectedBedId)
    .map((bed) => bed.assignedStudentId)
    .filter((studentId): studentId is string => Boolean(studentId));
  const currentAssignedStudent = bedForm.assignedStudentId ? studentLookup.get(bedForm.assignedStudentId) : undefined;
  const currentAssignedStudentLabel = currentAssignedStudent
    ? `${currentAssignedStudent.first_name} ${currentAssignedStudent.last_name} (${currentAssignedStudent.roll_number || '-'})`
    : '';
  const classOptionsForBed = useMemo(
    () =>
      Array.from(
        new Set([
          ...studentsEligibleForAssignment.map((student) => String(student.class)),
          ...classRecords.map((record) => record.name),
          ...(currentAssignedStudent?.class ? [currentAssignedStudent.class] : []),
        ])
      )
        .filter((className) => className.trim() !== '')
        .sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [classRecords, currentAssignedStudent?.class, studentsEligibleForAssignment]
  );
  const sectionOptionsForBed = useMemo(
    () =>
      Array.from(
        new Set([
          ...studentsEligibleForAssignment
            .filter((student) => student.class === bedForm.assignedClass)
            .map((student) => String(student.section)),
          ...classRecords
            .filter((record) => record.name === bedForm.assignedClass)
            .map((record) => record.section),
          ...(currentAssignedStudent?.class === bedForm.assignedClass && currentAssignedStudent.section
            ? [currentAssignedStudent.section]
            : []),
        ])
      )
        .filter((section) => section.trim() !== '')
        .sort(),
    [bedForm.assignedClass, classRecords, currentAssignedStudent?.class, currentAssignedStudent?.section, studentsEligibleForAssignment]
  );
  const availableStudentsForBed = useMemo(
    () => studentsEligibleForAssignment.filter((student) => !assignedStudentIds.includes(student.id)),
    [assignedStudentIds, studentsEligibleForAssignment]
  );
  const selectableStudentsForBed = useMemo(() => {
    const filteredStudents = availableStudentsForBed.filter(
      (student) =>
        student.class === bedForm.assignedClass &&
        student.section === bedForm.assignedSection
    );

    if (!currentAssignedStudent) {
      return filteredStudents;
    }

    return filteredStudents.some((student) => student.id === currentAssignedStudent.id)
      ? filteredStudents
      : [...filteredStudents, currentAssignedStudent];
  }, [availableStudentsForBed, bedForm.assignedClass, bedForm.assignedSection, currentAssignedStudent]);
  const getHostelName = (hostelId: string) => hostels.find((hostel) => hostel.id === hostelId)?.name || '-';
  const getRoomLabel = (roomId: string) => rooms.find((room) => room.id === roomId)?.roomNumber || '-';
  const getStudentLabel = (studentId?: string) => {
    if (!studentId) {
      return '-';
    }

    const student = studentLookup.get(studentId);
    return student
      ? `${student.first_name} ${student.last_name} (${student.roll_number || '-'})`
      : '-';
  };
  const filteredHostels = useMemo(() => {
    const query = hostelSearchQuery.trim().toLowerCase();
    if (!query) {
      return hostels;
    }

    return hostels.filter((hostel) =>
      [hostel.name, hostel.type, hostel.warden, hostel.address, hostel.contact, hostel.status]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [hostelSearchQuery, hostels]);

  const filteredRooms = useMemo(() => {
    const query = roomSearchQuery.trim().toLowerCase();

    if (!roomHostelFilter) {
      return [];
    }

    return rooms.filter((room) => {
      const matchesHostel = room.hostelId === roomHostelFilter;
      const matchesSearch = !query || [
        getHostelName(room.hostelId),
        room.roomNumber,
        room.floor,
        room.roomType,
        String(room.capacity),
        room.status,
      ].some((value) => value.toLowerCase().includes(query));

      return matchesHostel && matchesSearch;
    });
  }, [roomSearchQuery, roomHostelFilter, rooms, hostels]);

  const filteredBeds = useMemo(() => {
    const query = bedSearchQuery.trim().toLowerCase();

    if (!bedHostelFilter || !bedRoomFilter) {
      return [];
    }

    return beds.filter((bed) => {
      const matchesHostel = bed.hostelId === bedHostelFilter;
      const matchesRoom = bed.roomId === bedRoomFilter;
      const matchesSearch = !query || [
        getHostelName(bed.hostelId),
        getRoomLabel(bed.roomId),
        bed.bedNumber,
        bed.status,
        getStudentLabel(bed.assignedStudentId),
      ].some((value) => value.toLowerCase().includes(query));

      return matchesHostel && matchesRoom && matchesSearch;
    });
  }, [bedSearchQuery, bedHostelFilter, bedRoomFilter, beds, hostels, rooms]);
  const bedsByRoom = useMemo(
    () =>
      beds.reduce<Record<string, Bed[]>>((accumulator, bed) => {
        accumulator[bed.roomId] = [...(accumulator[bed.roomId] ?? []), bed];
        return accumulator;
      }, {}),
    [beds]
  );
  const filteredLayoutRooms = useMemo(() => {
    const query = layoutRoomSearchQuery.trim().toLowerCase();

    return rooms.filter((room) => {
      const roomBeds = bedsByRoom[room.id] ?? [];
      const studentLabels = roomBeds.map((bed) => getStudentLabel(bed.assignedStudentId)).join(' ');
      const matchesHostel = !layoutHostelFilter || room.hostelId === layoutHostelFilter;
      const matchesSearch = !query || [
        getHostelName(room.hostelId),
        room.roomNumber,
        room.floor,
        room.roomType,
        room.status,
        studentLabels,
      ].some((value) => value.toLowerCase().includes(query));

      return matchesHostel && matchesSearch;
    });
  }, [bedsByRoom, layoutHostelFilter, layoutRoomSearchQuery, rooms, hostels, students]);
  const filteredHostelComplaints = useMemo(() => {
    const query = hostelComplaintSearchQuery.trim().toLowerCase();

    return hostelComplaints.filter((complaint) =>
      (hostelComplaintHostelFilter === 'all' || complaint.hostelId === hostelComplaintHostelFilter) &&
      (!query || [
        complaint.complainantName,
        complaint.studentName || '',
        complaint.admissionNumber || '',
        complaint.hostelName || '',
        complaint.phone || '',
        complaint.source,
        complaint.status,
        complaint.assignedTo || '',
        complaint.complaintDate || '',
        complaint.note || '',
        complaint.actionTaken || '',
        complaint.class || '',
        complaint.section || '',
      ].some((value) => String(value).toLowerCase().includes(query)))
    );
  }, [hostelComplaintHostelFilter, hostelComplaintSearchQuery, hostelComplaints]);
  const hostelComplaintStats = useMemo(
    () => ({
      total: hostelComplaints.length,
      open: hostelComplaints.filter((complaint) => complaint.status === 'open').length,
      inReview: hostelComplaints.filter((complaint) => complaint.status === 'in_review').length,
      resolved: hostelComplaints.filter((complaint) => ['resolved', 'closed'].includes(complaint.status)).length,
    }),
    [hostelComplaints]
  );
  const filteredHostelNotices = useMemo(() => {
    const query = noticeSearchQuery.trim().toLowerCase();

    return hostelNotices.filter((notice) =>
      !query || [
        notice.title,
        notice.message,
        notice.hostelName || 'All hostels',
        notice.publishDate || '',
        notice.status,
        notice.createdBy || '',
      ].some((value) => String(value).toLowerCase().includes(query))
    );
  }, [hostelNotices, noticeSearchQuery]);
  const filteredLostFoundItems = useMemo(() => {
    const query = lostFoundSearchQuery.trim().toLowerCase();

    return lostFoundItems.filter((item) =>
      !query || [
        item.itemType,
        item.itemName,
        item.hostelName || 'All hostels',
        item.studentName || '',
        item.admissionNumber || '',
        item.location || '',
        item.reportedDate || '',
        item.contact || '',
        item.status,
        item.description || '',
        item.resolutionNote || '',
      ].some((value) => String(value).toLowerCase().includes(query))
    );
  }, [lostFoundItems, lostFoundSearchQuery]);
  const selectedLayoutRoom = selectedLayoutRoomId
    ? rooms.find((room) => room.id === selectedLayoutRoomId) ?? null
    : filteredLayoutRooms[0] ?? null;
  const selectedLayoutBeds = selectedLayoutRoom
    ? [...(bedsByRoom[selectedLayoutRoom.id] ?? [])].sort((left, right) =>
        left.bedNumber.localeCompare(right.bedNumber, undefined, { numeric: true })
      )
    : [];
  const selectedLayoutOccupiedCount = selectedLayoutBeds.filter((bed) => bed.assignedStudentId).length;
  const vacantBedsForSelectedHostel = useMemo(
    () =>
      bedHostelFilter
        ? beds.filter((bed) => bed.hostelId === bedHostelFilter && bed.status === 'available' && !bed.assignedStudentId).length
        : 0,
    [bedHostelFilter, beds]
  );

  const getNextBedNumber = (roomId: string, excludeBedId?: string | null) => {
    const room = rooms.find((item) => item.id === roomId);

    if (!room) {
      return '';
    }

    const existingBedsInRoom = beds.filter((bed) => bed.roomId === roomId && bed.id !== excludeBedId);
    const nextSerial = existingBedsInRoom.length + 1;

    return `${room.roomNumber}-BED-${String(nextSerial).padStart(2, '0')}`;
  };

  const generatedBedNumber = bedForm.roomId
    ? selectedBedId
      ? selectedBed?.roomId === bedForm.roomId
        ? selectedBed.bedNumber
        : getNextBedNumber(bedForm.roomId, selectedBedId)
      : getNextBedNumber(bedForm.roomId)
    : '';
  const bedCountForSelectedRoom = bedForm.roomId
    ? beds.filter((bed) => bed.roomId === bedForm.roomId && bed.id !== selectedBedId).length
    : 0;
  const roomCapacityReached = Boolean(
    !selectedBedId &&
    selectedRoomForBedForm &&
    bedCountForSelectedRoom >= selectedRoomForBedForm.capacity
  );

  const getBedStudentDetails = (bed: Bed) => {
    const student = bed.assignedStudentId ? studentLookup.get(bed.assignedStudentId) : undefined;
    const name = bed.assignedStudentName || (student ? `${student.first_name} ${student.last_name}`.trim() : '');
    const classLabel = [
      bed.assignedStudentClass || student?.class,
      bed.assignedStudentSection || student?.section,
    ].filter(Boolean).join(' - ');

    return {
      name: name || 'Vacant',
      admissionNo: bed.assignedStudentAdmissionNo || student?.admission_no || '-',
      rollNumber: bed.assignedStudentRollNumber || student?.roll_number || '-',
      classLabel: classLabel || '-',
    };
  };
  const handleViewRoomLayout = (room: Room) => {
    setLayoutHostelFilter(room.hostelId);
    setSelectedLayoutRoomId(room.id);
    setActiveTab('room-view');
  };
  const renderComplaintStatusBadge = (status: HostelComplaint['status']) => {
    if (status === 'resolved') {
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Resolved</Badge>;
    }

    if (status === 'closed') {
      return <Badge className="bg-slate-700 text-white hover:bg-slate-700">Closed</Badge>;
    }

    if (status === 'in_review') {
      return <Badge className="bg-blue-600 text-white hover:bg-blue-600">In Review</Badge>;
    }

    return <Badge className="bg-blue-500 text-white hover:bg-blue-500">Open</Badge>;
  };
  const updateHostelComplaintStatus = (complaintId: string, status: string) => {
    router.patch(`/hostel-management/complaints/${complaintId}/status`, { status }, {
      preserveScroll: true,
    });
  };
  const renderLostFoundStatusBadge = (status: LostFoundItem['status']) => {
    if (status === 'resolved') {
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Resolved</Badge>;
    }

    if (status === 'claimed') {
      return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Claimed</Badge>;
    }

    return <Badge className="bg-blue-500 text-white hover:bg-blue-500">Open</Badge>;
  };
  const escapeHtml = (value: string | number | null | undefined) =>
    String(value ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handlePrintAdmissionReceipt = (bed: Bed) => {
    if (!bed.assignedStudentId) {
      toast.error('Assign a student before printing the admission receipt.');
      return;
    }

    const student = studentLookup.get(bed.assignedStudentId);

    if (!student) {
      toast.error('Student details were not found for this bed allocation.');
      return;
    }

    const receiptWindow = window.open('', '_blank', 'width=900,height=700');

    if (!receiptWindow) {
      toast.error('Popup blocked. Please allow popups to print the admission receipt.');
      return;
    }

    const hostelName = getHostelName(bed.hostelId);
    const roomLabel = getRoomLabel(bed.roomId);
    const organizationName = organization?.name || 'School Name';
    const receiptNumber = `HSTL-${bed.id}`;
    const allocatedOn = bed.allocationDate || new Date().toISOString().slice(0, 10);
    const studentName = `${student.first_name} ${student.last_name}`.trim();
    const classLabel = [student.class, student.section].filter(Boolean).join(' - ') || '-';

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Hostel Admission Receipt ${escapeHtml(receiptNumber)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 32px;
              color: #0f172a;
              background: #f8fafc;
            }
            .receipt {
              max-width: 780px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 32px;
              position: relative;
              overflow: hidden;
            }
            .watermark {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 58px;
              font-weight: 800;
              letter-spacing: 0.18em;
              color: rgba(15, 23, 42, 0.05);
              transform: rotate(-28deg);
              text-transform: uppercase;
              pointer-events: none;
              user-select: none;
            }
            .header {
              position: relative;
              z-index: 1;
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
            }
            .school-name {
              margin: 0;
              font-size: 28px;
              font-weight: 800;
            }
            .meta {
              margin-top: 8px;
              color: #475569;
              line-height: 1.6;
            }
            .title {
              margin: 0;
              font-size: 28px;
              font-weight: 800;
            }
            .subtitle {
              margin: 6px 0 0;
              color: #475569;
            }
            .status {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              background: #dcfce7;
              color: #166534;
              font-size: 13px;
              font-weight: 700;
              padding: 8px 14px;
              height: fit-content;
            }
            .section {
              margin-top: 24px;
              position: relative;
              z-index: 1;
            }
            .section h2 {
              margin: 0 0 12px;
              font-size: 16px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px 24px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .row span {
              color: #475569;
            }
            .footer {
              margin-top: 28px;
              text-align: center;
              color: #64748b;
              font-size: 13px;
              position: relative;
              z-index: 1;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .receipt {
                border: none;
                border-radius: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="watermark">${escapeHtml(organizationName)}</div>
            <div class="header">
              <div>
                <p class="school-name">${escapeHtml(organizationName)}</p>
                <div class="meta">
                  <div>${escapeHtml(organization?.address || '')}</div>
                  <div>${escapeHtml(organization?.phone || '-')} ${organization?.email ? `| ${escapeHtml(organization.email)}` : ''}</div>
                </div>
              </div>
              <div>
                <h1 class="title">Hostel Admission Receipt</h1>
                <p class="subtitle">Receipt No: ${escapeHtml(receiptNumber)}</p>
                <p class="subtitle">Printed On: ${escapeHtml(new Date().toISOString().slice(0, 10))}</p>
                <div class="status">Bed Occupied</div>
              </div>
            </div>

            <div class="section">
              <h2>Student Details</h2>
              <div class="grid">
                <div class="row">
                  <span>Name</span>
                  <strong>${escapeHtml(studentName)}</strong>
                </div>
                <div class="row">
                  <span>Admission No.</span>
                  <strong>${escapeHtml(student.admission_no || '-')}</strong>
                </div>
                <div class="row">
                  <span>Class</span>
                  <strong>${escapeHtml(classLabel)}</strong>
                </div>
                <div class="row">
                  <span>Roll No.</span>
                  <strong>${escapeHtml(student.roll_number || '-')}</strong>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Hostel Allocation Details</h2>
              <div class="grid">
                <div class="row">
                  <span>Hostel</span>
                  <strong>${escapeHtml(hostelName)}</strong>
                </div>
                <div class="row">
                  <span>Room</span>
                  <strong>${escapeHtml(roomLabel)}</strong>
                </div>
                <div class="row">
                  <span>Bed</span>
                  <strong>${escapeHtml(bed.bedNumber)}</strong>
                </div>
                <div class="row">
                  <span>Allocation Date</span>
                  <strong>${escapeHtml(allocatedOn)}</strong>
                </div>
              </div>
            </div>

            <div class="footer">
              This is a system-generated hostel admission receipt.
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  };
  const downloadCsv = (filename: string, rows: string[][]) => {
    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportHostels = () => {
    downloadCsv('hostels-export.csv', [
      ['Name', 'Type', 'Warden', 'Contact', 'Address', 'Rooms', 'Beds', 'Status'],
      ...filteredHostels.map((hostel) => [
        hostel.name,
        hostel.type,
        hostel.warden,
        hostel.contact,
        hostel.address,
        String(roomCounts[hostel.id] || 0),
        String(bedCounts[hostel.id] || 0),
        hostel.status,
      ]),
    ]);
    toast.success('Hostels exported successfully');
  };

  const exportRooms = () => {
    downloadCsv('rooms-export.csv', [
      ['Hostel', 'Room Number', 'Floor', 'Room Type', 'Capacity', 'Status'],
      ...filteredRooms.map((room) => [
        getHostelName(room.hostelId),
        room.roomNumber,
        room.floor,
        room.roomType,
        String(room.capacity),
        room.status,
      ]),
    ]);
    toast.success('Rooms exported successfully');
  };

  const exportBeds = () => {
    downloadCsv('beds-export.csv', [
      ['Hostel', 'Room', 'Bed', 'Assigned Student', 'Status'],
      ...filteredBeds.map((bed) => [
        getHostelName(bed.hostelId),
        getRoomLabel(bed.roomId),
        bed.bedNumber,
        getStudentLabel(bed.assignedStudentId),
        bed.status,
      ]),
    ]);
    toast.success('Beds exported successfully');
  };
  const resetHostelForm = () =>
    setHostelForm({
      name: '',
      type: '',
      address: '',
      wardenStaffId: '',
      warden: '',
      contact: '',
      status: 'active',
    });
  const resetRoomForm = () =>
    setRoomForm({
      hostelId: '',
      roomNumber: '',
      floor: '',
      roomType: 'double',
      capacity: '',
      status: 'available',
    });
  const resetBedForm = () =>
    setBedForm({
      hostelId: '',
      roomId: '',
      bedNumber: '',
      assignedClass: '',
      assignedSection: '',
      status: 'available',
      assignedStudentId: '',
    });
  const resetFeeForm = () =>
    setFeeForm({
      hostelId: '',
      roomType: '',
      amount: '',
      frequency: 'monthly',
      description: '',
      status: 'active',
    });
  const resetComplaintForm = () =>
    setComplaintForm({
      studentId: '',
      complainantName: '',
      phone: '',
      assignedTo: '',
      complaintDate: new Date().toISOString().slice(0, 10),
      status: 'open',
      note: '',
      actionTaken: '',
    });
  const resetNoticeForm = () =>
    setNoticeForm({
      hostelId: 'all',
      title: '',
      message: '',
      publishDate: new Date().toISOString().slice(0, 10),
      status: 'active',
    });
  const resetLostFoundForm = () =>
    setLostFoundForm({
      hostelId: 'all',
      studentId: '',
      itemType: 'lost',
      itemName: '',
      location: '',
      reportedDate: new Date().toISOString().slice(0, 10),
      description: '',
      contact: '',
      status: 'open',
      resolutionNote: '',
    });

  const handleEditHostel = (hostel: Hostel) => {
    const wardenStaff = activeStaffRecords.find(
      (staff) =>
        staff.name === hostel.warden &&
        (!hostel.contact || !staff.phone || staff.phone === hostel.contact)
    );

    setSelectedHostelId(hostel.id);
    setHostelForm({
      name: hostel.name,
      type: hostel.type,
      address: hostel.address,
      wardenStaffId: wardenStaff ? String(wardenStaff.id) : '',
      warden: hostel.warden,
      contact: hostel.contact,
      status: hostel.status,
    });
  };

  const handleCreateHostel = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: hostelForm.name,
      type: hostelForm.type,
      address: hostelForm.address,
      wardenStaffId: hostelForm.wardenStaffId ? Number(hostelForm.wardenStaffId) : null,
      warden: hostelForm.warden,
      contact: hostelForm.contact,
      status: hostelForm.status,
    };

    if (selectedHostelId) {
      router.patch(`/hostel-management/hostels/${selectedHostelId}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setSelectedHostelId(null);
          resetHostelForm();
        },
      });
      return;
    }

    router.post('/hostel-management/hostels', payload, {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedHostelId(null);
        resetHostelForm();
      },
    });
  };

  const handleCreateRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      hostelId: Number(roomForm.hostelId),
      roomNumber: roomForm.roomNumber,
      floor: roomForm.floor,
      roomType: roomForm.roomType,
      capacity: Number(roomForm.capacity),
      monthlyFee: 0,
      status: roomForm.status,
    };

    if (selectedRoomId) {
      router.patch(`/hostel-management/rooms/${selectedRoomId}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setSelectedRoomId(null);
          resetRoomForm();
        },
      });
      return;
    }

    router.post('/hostel-management/rooms', payload, {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedRoomId(null);
        resetRoomForm();
      },
    });
  };

  const handleCreateBed = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      hostelId: Number(bedForm.hostelId),
      roomId: Number(bedForm.roomId),
      bedNumber: generatedBedNumber,
      status: bedForm.assignedStudentId ? 'occupied' : bedForm.status,
      assignedStudentId: bedForm.assignedStudentId ? Number(bedForm.assignedStudentId) : null,
    };

    if (selectedBedId) {
      router.patch(`/hostel-management/beds/${selectedBedId}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setSelectedBedId(null);
          resetBedForm();
        },
      });
      return;
    }

    router.post('/hostel-management/beds', payload, {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedBedId(null);
        resetBedForm();
      },
    });
  };

  const handleCreateFee = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      hostelId: Number(feeForm.hostelId),
      roomType: feeForm.roomType,
      amount: Number(feeForm.amount),
      frequency: feeForm.frequency,
      description: feeForm.description,
      status: feeForm.status,
    };

    if (selectedFeeId) {
      router.patch(`/hostel-management/fee-structures/${selectedFeeId}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setSelectedFeeId(null);
          resetFeeForm();
        },
      });
      return;
    }

    router.post('/hostel-management/fee-structures', payload, {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedFeeId(null);
        resetFeeForm();
      },
    });
  };

  const handleCreateComplaint = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    router.post('/hostel-management/complaints', {
      studentId: complaintForm.studentId ? Number(complaintForm.studentId) : null,
      complainantName: complaintForm.complainantName,
      phone: complaintForm.phone || null,
      assignedTo: complaintForm.assignedTo || null,
      complaintDate: complaintForm.complaintDate,
      status: complaintForm.status,
      note: complaintForm.note,
      actionTaken: complaintForm.actionTaken || null,
    }, {
      preserveScroll: true,
      onSuccess: resetComplaintForm,
    });
  };

  const handleCreateNotice = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      hostelId: noticeForm.hostelId === 'all' ? null : Number(noticeForm.hostelId),
      title: noticeForm.title,
      message: noticeForm.message,
      publishDate: noticeForm.publishDate,
      status: noticeForm.status,
    };

    if (selectedNoticeId) {
      router.patch(`/hostel-management/notices/${selectedNoticeId}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setSelectedNoticeId(null);
          resetNoticeForm();
        },
      });
      return;
    }

    router.post('/hostel-management/notices', payload, {
      preserveScroll: true,
      onSuccess: resetNoticeForm,
    });
  };

  const handleCreateLostFound = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      hostelId: lostFoundForm.hostelId === 'all' ? null : Number(lostFoundForm.hostelId),
      studentId: lostFoundForm.studentId ? Number(lostFoundForm.studentId) : null,
      itemType: lostFoundForm.itemType,
      itemName: lostFoundForm.itemName,
      location: lostFoundForm.location || null,
      reportedDate: lostFoundForm.reportedDate,
      description: lostFoundForm.description || null,
      contact: lostFoundForm.contact || null,
      status: lostFoundForm.status,
      resolutionNote: lostFoundForm.resolutionNote || null,
    };

    if (selectedLostFoundId) {
      router.patch(`/hostel-management/lost-found/${selectedLostFoundId}`, payload, {
        preserveScroll: true,
        onSuccess: () => {
          setSelectedLostFoundId(null);
          resetLostFoundForm();
        },
      });
      return;
    }

    router.post('/hostel-management/lost-found', payload, {
      preserveScroll: true,
      onSuccess: resetLostFoundForm,
    });
  };

  const handleDeleteHostel = (hostelId: string) => {
    if (!window.confirm('Delete this hostel and its linked rooms, beds, and allocations?')) {
      return;
    }

    router.delete(`/hostel-management/hostels/${hostelId}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (selectedHostelId === hostelId) {
          setSelectedHostelId(null);
          resetHostelForm();
        }
        if (roomHostelFilter === hostelId) {
          setRoomHostelFilter('');
        }
        if (bedHostelFilter === hostelId) {
          setBedHostelFilter('');
          setBedRoomFilter('');
        }
      },
    });
  };

  const toggleHostelStatus = (hostelId: string) => {
    const hostel = hostels.find((item) => item.id === hostelId);

    if (!hostel) {
      return;
    }

    router.patch(`/hostel-management/hostels/${hostelId}`, {
      name: hostel.name,
      type: hostel.type,
      address: hostel.address,
      warden: hostel.warden,
      contact: hostel.contact,
      status: hostel.status === 'active' ? 'inactive' : 'active',
    }, {
      preserveScroll: true,
    });
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!window.confirm('Delete this room and its linked beds/allocations?')) {
      return;
    }

    router.delete(`/hostel-management/rooms/${roomId}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (selectedRoomId === roomId) {
          setSelectedRoomId(null);
          resetRoomForm();
        }
        if (bedRoomFilter === roomId) {
          setBedRoomFilter('');
        }
      },
    });
  };

  const toggleRoomStatus = (roomId: string) => {
    const room = rooms.find((item) => item.id === roomId);

    if (!room) {
      return;
    }

    const nextStatus = room.status === 'maintenance'
      ? 'available'
      : room.status === 'available'
      ? 'maintenance'
      : 'maintenance';

    router.patch(`/hostel-management/rooms/${roomId}`, {
      hostelId: Number(room.hostelId),
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomType: room.roomType,
      capacity: room.capacity,
      monthlyFee: 0,
      status: nextStatus,
    }, {
      preserveScroll: true,
    });
  };

  const handleDeleteBed = (bedId: string) => {
    if (!window.confirm('Delete this bed?')) {
      return;
    }

    router.delete(`/hostel-management/beds/${bedId}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (selectedBedId === bedId) {
          setSelectedBedId(null);
          resetBedForm();
        }
      },
    });
  };

  const handleDeleteFeeStructure = (feeId: string) => {
    if (!window.confirm('Delete this fee structure?')) {
      return;
    }

    router.delete(`/hostel-management/fee-structures/${feeId}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (selectedFeeId === feeId) {
          setSelectedFeeId(null);
          resetFeeForm();
        }
      },
    });
  };

  const handleEditNotice = (notice: HostelNotice) => {
    setSelectedNoticeId(notice.id);
    setNoticeForm({
      hostelId: notice.hostelId || 'all',
      title: notice.title,
      message: notice.message,
      publishDate: notice.publishDate || new Date().toISOString().slice(0, 10),
      status: notice.status === 'inactive' ? 'inactive' : 'active',
    });
  };

  const handleDeleteNotice = (noticeId: string) => {
    if (!window.confirm('Delete this hostel notice?')) {
      return;
    }

    router.delete(`/hostel-management/notices/${noticeId}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (selectedNoticeId === noticeId) {
          setSelectedNoticeId(null);
          resetNoticeForm();
        }
      },
    });
  };

  const handleEditLostFound = (item: LostFoundItem) => {
    setSelectedLostFoundId(item.id);
    setLostFoundForm({
      hostelId: item.hostelId || 'all',
      studentId: item.studentId || '',
      itemType: item.itemType,
      itemName: item.itemName,
      location: item.location || '',
      reportedDate: item.reportedDate || new Date().toISOString().slice(0, 10),
      description: item.description || '',
      contact: item.contact || '',
      status: item.status,
      resolutionNote: item.resolutionNote || '',
    });
  };

  const handleDeleteLostFound = (itemId: string) => {
    if (!window.confirm('Delete this lost and found item?')) {
      return;
    }

    router.delete(`/hostel-management/lost-found/${itemId}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (selectedLostFoundId === itemId) {
          setSelectedLostFoundId(null);
          resetLostFoundForm();
        }
      },
    });
  };

  const toggleFeeStatus = (feeId: string) => {
    const structure = feeStructures.find((item) => item.id === feeId);

    if (!structure) {
      return;
    }

    router.patch(`/hostel-management/fee-structures/${feeId}`, {
      hostelId: Number(structure.hostelId),
      roomType: structure.roomType,
      amount: structure.amount,
      frequency: structure.frequency.toLowerCase(),
      description: structure.description,
      status: structure.status === 'active' ? 'inactive' : 'active',
    }, {
      preserveScroll: true,
    });
  };

  return (
    <DashboardLayout user={user} activeTab="hostel-management">
      <div className="bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Manage Hostel</h1>
              <p className="mt-1 text-sm text-slate-600">Manage hostels, rooms, beds, and hostel fee structures from one place.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Hostels</p>
                    <p className="text-2xl font-bold text-slate-900">{hostels.length}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Rooms</p>
                    <p className="text-2xl font-bold text-slate-900">{rooms.length}</p>
                  </div>
                  <DoorOpen className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Beds</p>
                    <p className="text-2xl font-bold text-slate-900">{beds.length}</p>
                  </div>
                  <BedDouble className="h-8 w-8 text-violet-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Fee Structures</p>
                    <p className="text-2xl font-bold text-slate-900">{feeStructures.length}</p>
                  </div>
                  <IndianRupee className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Hostel Complaints</p>
                    <p className="text-2xl font-bold text-slate-900">{hostelComplaintStats.total}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="hostels">Hostels</TabsTrigger>
              <TabsTrigger value="rooms">Rooms</TabsTrigger>
              <TabsTrigger value="room-view">Room View</TabsTrigger>
              <TabsTrigger value="beds">Beds</TabsTrigger>
              <TabsTrigger value="fees">Fee Structure</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
              <TabsTrigger value="notices">Notices</TabsTrigger>
              <TabsTrigger value="lost-found">Lost & Found</TabsTrigger>
            </TabsList>

            <TabsContent value="hostels" className="flex-none">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedHostelId ? 'Edit Hostel' : 'Create Hostel'}</CardTitle>
                    <CardDescription>Add or update hostel building and warden details.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateHostel} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Hostel Name</Label>
                          <Input value={hostelForm.name} onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Hostel Type</Label>
                          <Select value={hostelForm.type} onValueChange={(value) => setHostelForm({ ...hostelForm, type: value })}>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="boys">Boys</SelectItem>
                              <SelectItem value="girls">Girls</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Address</Label>
                          <Textarea value={hostelForm.address} onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })} rows={3} />
                        </div>
                        <div className="space-y-2">
                          <Label>Warden Name</Label>
                          <Select
                            value={hostelForm.wardenStaffId}
                            onValueChange={(value) => {
                              const selectedStaff = activeStaffRecords.find((staff) => String(staff.id) === value);

                              setHostelForm({
                                ...hostelForm,
                                wardenStaffId: value,
                                warden: selectedStaff?.name ?? '',
                                contact: selectedStaff?.phone ?? '',
                              });
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                            <SelectContent>
                              {activeStaffRecords.map((staff) => (
                                <SelectItem key={staff.id} value={String(staff.id)}>
                                  {staff.name} - {formatRole(staff.role)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Contact</Label>
                          <Input value={hostelForm.contact} readOnly placeholder="Auto-filled from staff" />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={hostelForm.status} onValueChange={(value: 'active' | 'inactive') => setHostelForm({ ...hostelForm, status: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        {selectedHostelId && (
                          <Button type="button" variant="outline" onClick={() => { setSelectedHostelId(null); resetHostelForm(); }}>
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                          <Plus className="h-4 w-4" />
                          {selectedHostelId ? 'Update Hostel' : 'Create Hostel'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hostel List</CardTitle>
                    <CardDescription>Overview of created hostels with linked rooms and beds.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative w-full max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={hostelSearchQuery}
                          onChange={(event) => setHostelSearchQuery(event.target.value)}
                          placeholder="Search hostels"
                          className="pl-10"
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={exportHostels}>
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Warden</TableHead>
                          <TableHead>Rooms</TableHead>
                          <TableHead>Beds</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHostels.map((hostel) => (
                          <TableRow
                            key={hostel.id}
                            className={`cursor-pointer ${selectedHostelId === hostel.id ? 'bg-blue-50' : ''}`}
                            onClick={() => handleEditHostel(hostel)}
                          >
                            <TableCell className="font-medium">{hostel.name}</TableCell>
                            <TableCell>{hostelTypeLabels[hostel.type] ?? hostel.type}</TableCell>
                            <TableCell>{hostel.warden}</TableCell>
                            <TableCell>{roomCounts[hostel.id] || 0}</TableCell>
                            <TableCell>{bedCounts[hostel.id] || 0}</TableCell>
                            <TableCell>
                              <Badge variant={hostel.status === 'active' ? 'default' : 'secondary'}>{hostel.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Edit hostel"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEditHostel(hostel);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title={hostel.status === 'active' ? 'Mark inactive' : 'Activate hostel'}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleHostelStatus(hostel.id);
                                  }}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Delete hostel"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteHostel(hostel.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredHostels.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="py-6 text-center text-sm text-slate-500">
                              No hostels found for the current search.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            <TabsContent value="rooms" className="flex-none">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedRoomId ? 'Edit Room' : 'Create Room'}</CardTitle>
                    <CardDescription>Create rooms inside a hostel with capacity details.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateRoom} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Hostel</Label>
                          <Select value={roomForm.hostelId} onValueChange={(value) => setRoomForm({ ...roomForm, hostelId: value })}>
                            <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                            <SelectContent>
                              {hostels.map((hostel) => (
                                <SelectItem key={hostel.id} value={hostel.id}>{hostel.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Room Number</Label>
                          <Input value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Floor</Label>
                          <Input value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Room Type</Label>
                          <Select value={roomForm.roomType} onValueChange={(value) => setRoomForm({ ...roomForm, roomType: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="double">Double</SelectItem>
                              <SelectItem value="triple">Triple</SelectItem>
                              <SelectItem value="dormitory">Dormitory</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Capacity</Label>
                          <Input type="number" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={roomForm.status} onValueChange={(value: 'available' | 'full' | 'maintenance') => setRoomForm({ ...roomForm, status: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="full">Full</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        {selectedRoomId && (
                          <Button type="button" variant="outline" onClick={() => { setSelectedRoomId(null); resetRoomForm(); }}>
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                          <Plus className="h-4 w-4" />
                          {selectedRoomId ? 'Update Room' : 'Create Room'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Room List</CardTitle>
                    <CardDescription>Select a hostel to view its rooms and search within the result.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
                      <Select value={roomHostelFilter} onValueChange={setRoomHostelFilter}>
                        <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                        <SelectContent>
                          {hostels.map((hostel) => (
                            <SelectItem key={hostel.id} value={hostel.id}>{hostel.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={roomSearchQuery}
                          onChange={(event) => setRoomSearchQuery(event.target.value)}
                          placeholder="Search rooms"
                          className="pl-10"
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={exportRooms} disabled={!roomHostelFilter}>
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostel</TableHead>
                          <TableHead>Room No.</TableHead>
                          <TableHead>Floor</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRooms.map((room) => (
                          <TableRow
                            key={room.id}
                            className={`cursor-pointer ${selectedRoomId === room.id ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              setRoomForm({
                                hostelId: room.hostelId,
                                roomNumber: room.roomNumber,
                                floor: room.floor,
                                roomType: room.roomType,
                                capacity: String(room.capacity),
                                status: room.status,
                              });
                            }}
                          >
                            <TableCell>{getHostelName(room.hostelId)}</TableCell>
                            <TableCell className="font-medium">{room.roomNumber}</TableCell>
                            <TableCell>{room.floor}</TableCell>
                            <TableCell>{roomTypeLabels[room.roomType] ?? room.roomType}</TableCell>
                            <TableCell>{room.capacity}</TableCell>
                            <TableCell>
                              <Badge variant={room.status === 'maintenance' ? 'secondary' : 'default'}>{room.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3"
                                  title="View room beds and students"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleViewRoomLayout(room);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title={room.status === 'maintenance' ? 'Mark available' : 'Mark maintenance'}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleRoomStatus(room.id);
                                  }}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Delete room"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteRoom(room.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredRooms.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="py-6 text-center text-sm text-slate-500">
                              {!roomHostelFilter
                                ? 'Select a hostel to view its rooms.'
                                : 'No rooms found for the selected hostel.'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            <TabsContent value="room-view" className="flex-none">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Room Wise Student View</CardTitle>
                    <CardDescription>Search rooms and view the bed layout with assigned students.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                      <div className="space-y-4">
                        <div className="grid gap-3">
                          <Select
                            value={layoutHostelFilter || 'all'}
                            onValueChange={(value) => {
                              setLayoutHostelFilter(value === 'all' ? '' : value);
                              setSelectedLayoutRoomId(null);
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="All hostels" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All hostels</SelectItem>
                              {hostels.map((hostel) => (
                                <SelectItem key={hostel.id} value={hostel.id}>{hostel.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={layoutRoomSearchQuery}
                              onChange={(event) => {
                                setLayoutRoomSearchQuery(event.target.value);
                                setSelectedLayoutRoomId(null);
                              }}
                              placeholder="Search room or student"
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                          {filteredLayoutRooms.map((room) => {
                            const roomBeds = bedsByRoom[room.id] ?? [];
                            const occupiedBeds = roomBeds.filter((bed) => bed.assignedStudentId).length;
                            const isSelected = selectedLayoutRoom?.id === room.id;

                            return (
                              <button
                                key={room.id}
                                type="button"
                                className={`w-full rounded-lg border p-3 text-left transition ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:border-blue-300'
                                }`}
                                onClick={() => setSelectedLayoutRoomId(room.id)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900">Room {room.roomNumber}</p>
                                    <p className="mt-1 text-xs text-slate-500">{getHostelName(room.hostelId)} - Floor {room.floor || '-'}</p>
                                  </div>
                                  <Badge variant={room.status === 'maintenance' ? 'secondary' : 'default'}>{room.status}</Badge>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                                  <div>
                                    <p className="font-semibold text-slate-900">{room.capacity}</p>
                                    <p>Capacity</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{occupiedBeds}</p>
                                    <p>Students</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{Math.max(room.capacity - occupiedBeds, 0)}</p>
                                    <p>Vacant</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {filteredLayoutRooms.length === 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                              No rooms found for this search.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 rounded-lg border border-slate-200 bg-white">
                        {selectedLayoutRoom ? (
                          <>
                            <div className="border-b border-slate-200 p-5">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-sm text-slate-500">{getHostelName(selectedLayoutRoom.hostelId)}</p>
                                  <h3 className="mt-1 text-2xl font-bold text-slate-900">Room {selectedLayoutRoom.roomNumber}</h3>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {roomTypeLabels[selectedLayoutRoom.roomType] ?? selectedLayoutRoom.roomType} room - Floor {selectedLayoutRoom.floor || '-'}
                                  </p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                                    <p className="text-lg font-bold text-slate-900">{selectedLayoutRoom.capacity}</p>
                                    <p className="text-xs text-slate-500">Beds</p>
                                  </div>
                                  <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                                    <p className="text-lg font-bold text-red-700">{selectedLayoutOccupiedCount}</p>
                                    <p className="text-xs text-red-700">Occupied</p>
                                  </div>
                                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                                    <p className="text-lg font-bold text-emerald-700">{Math.max(selectedLayoutRoom.capacity - selectedLayoutOccupiedCount, 0)}</p>
                                    <p className="text-xs text-emerald-700">Vacant</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-5">
                              {selectedLayoutBeds.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                  {selectedLayoutBeds.map((bed) => {
                                    const studentDetails = getBedStudentDetails(bed);
                                    const isOccupied = Boolean(bed.assignedStudentId);
                                    const isMaintenance = bed.status === 'maintenance';

                                    return (
                                      <div
                                        key={bed.id}
                                        className={`min-h-[170px] rounded-lg border p-4 ${
                                          isMaintenance
                                            ? 'border-blue-200 bg-blue-50'
                                            : isOccupied
                                            ? 'border-red-200 bg-red-50'
                                            : 'border-emerald-200 bg-emerald-50'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex items-center gap-2">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-sm">
                                              <BedDouble className={`h-5 w-5 ${isOccupied ? 'text-red-600' : isMaintenance ? 'text-blue-600' : 'text-emerald-600'}`} />
                                            </span>
                                            <div>
                                              <p className="font-semibold text-slate-900">{bed.bedNumber}</p>
                                              <p className="text-xs capitalize text-slate-500">{bed.status}</p>
                                            </div>
                                          </div>
                                          {isOccupied && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-8 w-8 bg-white p-0"
                                              title="Print admission receipt"
                                              onClick={() => handlePrintAdmissionReceipt(bed)}
                                            >
                                              <Printer className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                        <div className="mt-4 space-y-2 text-sm">
                                          <p className="font-semibold text-slate-900">{studentDetails.name}</p>
                                          {isOccupied ? (
                                            <>
                                              <p className="text-slate-600">Admission: {studentDetails.admissionNo}</p>
                                              <p className="text-slate-600">Class: {studentDetails.classLabel}</p>
                                              <p className="text-slate-600">Roll No: {studentDetails.rollNumber}</p>
                                            </>
                                          ) : (
                                            <p className="text-slate-600">
                                              {isMaintenance ? 'Bed is under maintenance.' : 'Ready for student allocation.'}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                                  No beds have been created for this room yet.
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex min-h-[420px] items-center justify-center p-8 text-center text-sm text-slate-500">
                            Select or search a room to view its bed layout.
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="beds" className="flex-none">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedBedId ? 'Edit Bed' : 'Create Bed'}</CardTitle>
                    <CardDescription>Add individual beds inside each hostel room.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateBed} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Hostel</Label>
                          <Select
                            value={bedForm.hostelId}
                            onValueChange={(value) => setBedForm({ ...bedForm, hostelId: value, roomId: '' })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                            <SelectContent>
                              {hostels.map((hostel) => (
                                <SelectItem key={hostel.id} value={hostel.id}>{hostel.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Room</Label>
                          <Select value={bedForm.roomId} onValueChange={(value) => setBedForm({ ...bedForm, roomId: value })} disabled={!bedForm.hostelId}>
                            <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                            <SelectContent>
                              {availableRoomsForSelectedHostel.map((room) => (
                                <SelectItem key={room.id} value={room.id}>{room.roomNumber} - {roomTypeLabels[room.roomType] ?? room.roomType}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Bed Number</Label>
                          <Input value={generatedBedNumber} disabled placeholder="Select hostel and room to generate bed number" />
                        </div>
                        <div className="space-y-2">
                          <Label>Class</Label>
                          <Select
                            value={bedForm.assignedClass}
                            onValueChange={(value) =>
                              setBedForm({
                                ...bedForm,
                                assignedClass: value,
                                assignedSection: '',
                                assignedStudentId: '',
                                status: 'available',
                              })
                            }
                          >
                            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                            <SelectContent>
                              {classOptionsForBed.map((className) => (
                                <SelectItem key={className} value={className}>{className}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Section</Label>
                          <Select
                            value={bedForm.assignedSection}
                            onValueChange={(value) =>
                              setBedForm({
                                ...bedForm,
                                assignedSection: value,
                                assignedStudentId: '',
                                status: 'available',
                              })
                            }
                            disabled={!bedForm.assignedClass}
                          >
                            <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                            <SelectContent>
                              {sectionOptionsForBed.map((section) => (
                                <SelectItem key={section} value={section}>{section}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Assign Student</Label>
                          <Popover open={studentComboboxOpen} onOpenChange={setStudentComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={studentComboboxOpen}
                                className="w-full justify-between font-normal"
                                disabled={!bedForm.assignedClass || !bedForm.assignedSection}
                              >
                                <span className="truncate">
                                  {bedForm.assignedStudentId
                                    ? currentAssignedStudentLabel || getStudentLabel(bedForm.assignedStudentId)
                                    : 'Search and select student'}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search student" />
                                <CommandList>
                                  <CommandEmpty>No student found.</CommandEmpty>
                                  <CommandGroup>
                                    <CommandItem
                                      value="No student assigned"
                                      onSelect={() => {
                                        setBedForm({
                                          ...bedForm,
                                          assignedStudentId: '',
                                          status: 'available',
                                        });
                                        setStudentComboboxOpen(false);
                                      }}
                                    >
                                      <Check className={cn('h-4 w-4', !bedForm.assignedStudentId ? 'opacity-100' : 'opacity-0')} />
                                      No student assigned
                                    </CommandItem>
                                    {selectableStudentsForBed.map((student) => {
                                      const studentLabel = `${student.first_name} ${student.last_name} (${student.roll_number || '-'})`;

                                      return (
                                        <CommandItem
                                          key={student.id}
                                          value={`${studentLabel} ${student.class || ''} ${student.section || ''}`}
                                          onSelect={() => {
                                            setBedForm({
                                              ...bedForm,
                                              assignedStudentId: student.id,
                                              status: 'occupied',
                                            });
                                            setStudentComboboxOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'h-4 w-4',
                                              bedForm.assignedStudentId === student.id ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          {studentLabel}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={bedForm.assignedStudentId ? 'occupied' : bedForm.status}
                            onValueChange={(value: 'available' | 'occupied' | 'maintenance') =>
                              setBedForm({
                                ...bedForm,
                                status: value,
                                assignedStudentId: value === 'occupied' ? bedForm.assignedStudentId : '',
                              })
                            }
                            disabled={Boolean(bedForm.assignedStudentId)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="occupied">Occupied</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {roomCapacityReached && (
                        <p className="text-sm text-blue-700">
                          This room already has {selectedRoomForBedForm?.capacity} beds. Select an existing bed from the list to assign a student, or increase the room capacity first.
                        </p>
                      )}
                      <div className="flex justify-end gap-2">
                        {selectedBedId && (
                          <Button type="button" variant="outline" onClick={() => { setSelectedBedId(null); resetBedForm(); }}>
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={roomCapacityReached}>
                          <Plus className="h-4 w-4" />
                          {selectedBedId ? 'Update Bed' : 'Create Bed'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bed List</CardTitle>
                    <CardDescription>Select hostel and room to narrow down the available beds.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-[220px_220px_auto]">
                        <Select
                          value={bedHostelFilter}
                          onValueChange={(value) => {
                            setBedHostelFilter(value);
                            setBedRoomFilter('');
                            setBedRoomFilterOpen(false);
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                          <SelectContent>
                            {hostels.map((hostel) => (
                              <SelectItem key={hostel.id} value={hostel.id}>{hostel.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Popover open={bedRoomFilterOpen} onOpenChange={setBedRoomFilterOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={bedRoomFilterOpen}
                              className="w-full justify-between"
                              disabled={!bedHostelFilter}
                            >
                              {selectedBedFilterRoom
                                ? `${selectedBedFilterRoom.roomNumber} - ${roomTypeLabels[selectedBedFilterRoom.roomType] ?? selectedBedFilterRoom.roomType}`
                                : 'Select room'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search room..." />
                              <CommandList>
                                <CommandEmpty>No room found.</CommandEmpty>
                                <CommandGroup>
                                  {availableRoomsForBedFilter.map((room) => {
                                    const roomLabel = `${room.roomNumber} - ${roomTypeLabels[room.roomType] ?? room.roomType}`;

                                    return (
                                      <CommandItem
                                        key={room.id}
                                        value={`${room.roomNumber} ${room.roomType} ${room.floor}`}
                                        onSelect={() => {
                                          setBedRoomFilter(room.id);
                                          setBedRoomFilterOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            bedRoomFilter === room.id ? 'opacity-100' : 'opacity-0'
                                          )}
                                        />
                                        {roomLabel}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button type="button" variant="outline" onClick={exportBeds} disabled={!bedHostelFilter || !bedRoomFilter}>
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative min-w-0 max-w-md flex-1">
                          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            value={bedSearchQuery}
                            onChange={(event) => setBedSearchQuery(event.target.value)}
                            placeholder="Search beds"
                            className="pl-10"
                          />
                        </div>
                        {selectedBedFilterHostel && (
                          <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            Total vacant beds in {selectedBedFilterHostel.name}: <span className="font-semibold">{vacantBedsForSelectedHostel}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostel</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Bed</TableHead>
                          <TableHead>Assigned Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBeds.map((bed) => (
                          <TableRow
                            key={bed.id}
                            className={`cursor-pointer ${selectedBedId === bed.id ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              const assignedStudent = bed.assignedStudentId ? studentLookup.get(bed.assignedStudentId) : undefined;
                              setSelectedBedId(bed.id);
                              setBedForm({
                                hostelId: bed.hostelId,
                                roomId: bed.roomId,
                                bedNumber: bed.bedNumber,
                                assignedClass: assignedStudent?.class || '',
                                assignedSection: assignedStudent?.section || '',
                                status: bed.status,
                                assignedStudentId: bed.assignedStudentId || '',
                              });
                            }}
                          >
                            <TableCell>{getHostelName(bed.hostelId)}</TableCell>
                            <TableCell>{getRoomLabel(bed.roomId)}</TableCell>
                            <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                            <TableCell>{getStudentLabel(bed.assignedStudentId)}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm font-medium capitalize ${
                                  bedStatusStyles[bed.status]
                                }`}
                              >
                                <BedDouble className="h-4 w-4" />
                                {bed.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {bed.assignedStudentId && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3"
                                    title="Print admission receipt"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handlePrintAdmissionReceipt(bed);
                                    }}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Delete bed"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteBed(bed.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredBeds.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="py-6 text-center text-sm text-slate-500">
                              {!bedHostelFilter
                                ? 'Select a hostel to view beds.'
                                : !bedRoomFilter
                                ? 'Select a room to view beds.'
                                : 'No beds found for the selected hostel and room.'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            <TabsContent value="fees" className="flex-none">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedFeeId ? 'Edit Hostel Fee Structure' : 'Create Hostel Fee Structure'}</CardTitle>
                    <CardDescription>Define room-wise hostel fee plans and payment frequency.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateFee} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Hostel</Label>
                          <Select value={feeForm.hostelId} onValueChange={(value) => setFeeForm({ ...feeForm, hostelId: value })}>
                            <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                            <SelectContent>
                              {hostels.map((hostel) => (
                                <SelectItem key={hostel.id} value={hostel.id}>{hostel.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Room Type</Label>
                          <Select value={feeForm.roomType} onValueChange={(value) => setFeeForm({ ...feeForm, roomType: value })}>
                            <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="double">Double</SelectItem>
                              <SelectItem value="triple">Triple</SelectItem>
                              <SelectItem value="dormitory">Dormitory</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select value={feeForm.frequency} onValueChange={(value) => setFeeForm({ ...feeForm, frequency: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={feeForm.status} onValueChange={(value: 'active' | 'inactive') => setFeeForm({ ...feeForm, status: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-3">
                          <Label>Description</Label>
                          <Textarea value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} rows={3} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        {selectedFeeId && (
                          <Button type="button" variant="outline" onClick={() => { setSelectedFeeId(null); resetFeeForm(); }}>
                            Cancel
                          </Button>
                        )}
                        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                          <Plus className="h-4 w-4" />
                          {selectedFeeId ? 'Update Fee Structure' : 'Create Fee Structure'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hostel Fee Structures</CardTitle>
                    <CardDescription>Fee rules for each hostel and room category.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hostel</TableHead>
                          <TableHead>Room Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeStructures.map((structure) => (
                          <TableRow
                            key={structure.id}
                            className={`cursor-pointer ${selectedFeeId === structure.id ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              setSelectedFeeId(structure.id);
                              setFeeForm({
                                hostelId: structure.hostelId,
                                roomType: structure.roomType,
                                amount: String(structure.amount),
                                frequency: structure.frequency,
                                description: structure.description,
                                status: structure.status,
                              });
                            }}
                          >
                            <TableCell>{getHostelName(structure.hostelId)}</TableCell>
                            <TableCell className="font-medium">{roomTypeLabels[structure.roomType] ?? structure.roomType}</TableCell>
                            <TableCell>Rs. {structure.amount.toLocaleString('en-IN')}</TableCell>
                            <TableCell>{frequencyLabels[structure.frequency] ?? structure.frequency}</TableCell>
                            <TableCell>
                              <Badge variant={structure.status === 'active' ? 'default' : 'secondary'}>{structure.status}</Badge>
                            </TableCell>
                            <TableCell>{structure.description}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title={structure.status === 'active' ? 'Mark inactive' : 'Activate fee structure'}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFeeStatus(structure.id);
                                  }}
                                >
                                  <Power className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Delete fee structure"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteFeeStructure(structure.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

              </div>
            </TabsContent>

            <TabsContent value="complaints" className="flex-none">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-500">Total Hostel Complaints</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{hostelComplaintStats.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-500">Open</p>
                      <p className="mt-2 text-2xl font-bold text-blue-700">{hostelComplaintStats.open}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-500">In Review</p>
                      <p className="mt-2 text-2xl font-bold text-blue-700">{hostelComplaintStats.inReview}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-slate-500">Resolved / Closed</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-700">{hostelComplaintStats.resolved}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Hostel Complaints</CardTitle>
                    <CardDescription>Complaints submitted with the Hostel category from student or staff complaint forms.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 grid gap-3 md:grid-cols-[240px_minmax(0,1fr)]">
                      <Select value={hostelComplaintHostelFilter} onValueChange={setHostelComplaintHostelFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter by hostel" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All hostels</SelectItem>
                          {hostels.map((hostel) => (
                            <SelectItem key={hostel.id} value={hostel.id}>{hostel.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={hostelComplaintSearchQuery}
                          onChange={(event) => setHostelComplaintSearchQuery(event.target.value)}
                          placeholder="Search hostel complaints"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Complainant</TableHead>
                          <TableHead>Hostel</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Complaint</TableHead>
                          <TableHead>Action Taken</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHostelComplaints.map((complaint) => (
                          <TableRow key={complaint.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900">{complaint.complainantName}</p>
                                <p className="mt-1 text-sm capitalize text-slate-500">
                                  {complaint.source.replace(/_/g, ' ')}{complaint.phone ? ` - ${complaint.phone}` : ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{complaint.hostelName || '-'}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900">{complaint.studentName || complaint.complainantName}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {[complaint.admissionNumber, complaint.class && complaint.section ? `${complaint.class}-${complaint.section}` : null]
                                    .filter(Boolean)
                                    .join(' - ') || '-'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{complaint.complaintDate || '-'}</TableCell>
                            <TableCell>{complaint.assignedTo || 'Unassigned'}</TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                {renderComplaintStatusBadge(complaint.status)}
                                <Select
                                  value={complaint.status}
                                  onValueChange={(value) => updateHostelComplaintStatus(complaint.id, value)}
                                >
                                  <SelectTrigger className="h-8 w-[145px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_review">In Review</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="line-clamp-3 text-sm text-slate-700">{complaint.note || '-'}</p>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="line-clamp-3 text-sm text-slate-700">{complaint.actionTaken || 'No action recorded'}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredHostelComplaints.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">
                              No hostel complaints found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
