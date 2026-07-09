import React, { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

interface EditStudentProps {
  user: any;
  studentId: string;
  student?: any | null;
  classRecords: {
    id: number;
    name: string;
    section: string;
  }[];
}

const emptyForm = {
  admission_no: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  class: '',
  section: '',
  roll_number: '',
  admission_date: '',
  father_name: '',
  father_phone: '',
  father_occupation: '',
  mother_name: '',
  mother_phone: '',
  mother_occupation: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  category: '',
  religion: '',
  caste: '',
  previous_school: '',
  transport_required: false,
  transport_pickup_point: '',
  transport_vehicle: '',
  transport_route_details: '',
  hostel_required: false,
  status: 'active',
};

export default function EditStudent({ user, studentId, student, classRecords }: EditStudentProps) {
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [originalAdmissionNo, setOriginalAdmissionNo] = useState('');

  useEffect(() => {
    if (student) {
      setOriginalAdmissionNo(student.admission_no || '');
      setFormData({
        admission_no: student.admission_no || '',
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || '',
        blood_group: student.blood_group || '',
        class: student.class || '',
        section: student.section || '',
        roll_number: student.roll_number || '',
        admission_date: student.admission_date || '',
        father_name: student.father_name || '',
        father_phone: student.father_phone || '',
        father_occupation: student.father_occupation || '',
        mother_name: student.mother_name || '',
        mother_phone: student.mother_phone || '',
        mother_occupation: student.mother_occupation || '',
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || '',
        category: student.category || '',
        religion: student.religion || '',
        caste: student.caste || '',
        previous_school: student.previous_school || '',
        transport_required: Boolean(student.transport_required),
        transport_pickup_point: student.transport_pickup_point || '',
        transport_vehicle: student.transport_vehicle || '',
        transport_route_details: student.transport_route_details || '',
        hostel_required: Boolean(student.hostel_required),
        status: student.status || 'active',
      });
    }

    setLoading(false);
  }, [student, studentId]);

  const classOptions = Array.from(new Set(classRecords.map((classRecord) => String(classRecord.name)))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  const sectionOptions = formData.class
    ? Array.from(
        new Set(
          classRecords
            .filter((classRecord) => String(classRecord.name) === String(formData.class))
            .map((classRecord) => String(classRecord.section))
        )
      ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];

  const updateField = (field: string, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    router.patch(`/students/${studentId}`, {
      ...formData,
      admission_no: originalAdmissionNo,
    });
  };

  if (loading) {
    return (
      <DashboardLayout user={user} activeTab="search_students">
        <div className="min-h-full bg-slate-50 p-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Loading student details...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="search_students">
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Button asChild variant="outline" className="mb-4 gap-2">
                <Link href={`/students/${studentId}`}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to Student Details
                </Link>
              </Button>
              <h1 className="text-3xl font-bold text-slate-900">Edit Student</h1>
              <p className="mt-1 text-sm text-slate-600">Update academic, personal, and parent information.</p>
            </div>

            <Button type="submit" form="edit-student-form" className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>

          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Student Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Admission Number</Label>
                  <Input
                    value={formData.admission_no}
                    disabled
                    readOnly
                    className="cursor-not-allowed bg-slate-100 text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => updateField('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={formData.first_name} onChange={(e) => updateField('first_name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={formData.last_name} onChange={(e) => updateField('last_name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={formData.date_of_birth} onChange={(e) => updateField('date_of_birth', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Admission Date</Label>
                  <Input type="date" value={formData.admission_date} onChange={(e) => updateField('admission_date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => updateField('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select value={formData.blood_group} onValueChange={(value) => updateField('blood_group', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Academic Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={formData.class} onValueChange={(value) => setFormData((current) => ({ ...current, class: value, section: '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions.map((className) => (
                        <SelectItem key={className} value={className}>
                          Class {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={formData.section} onValueChange={(value) => updateField('section', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionOptions.map((section) => (
                        <SelectItem key={section} value={section}>
                          Section {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input value={formData.roll_number} onChange={(e) => updateField('roll_number', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="OBC">OBC</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="ST">ST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Previous School</Label>
                  <Input value={formData.previous_school} onChange={(e) => updateField('previous_school', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Parent Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Father's Name</Label>
                  <Input value={formData.father_name} onChange={(e) => updateField('father_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Father's Phone</Label>
                  <Input value={formData.father_phone} onChange={(e) => updateField('father_phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Father's Occupation</Label>
                  <Input value={formData.father_occupation} onChange={(e) => updateField('father_occupation', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Name</Label>
                  <Input value={formData.mother_name} onChange={(e) => updateField('mother_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Phone</Label>
                  <Input value={formData.mother_phone} onChange={(e) => updateField('mother_phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mother's Occupation</Label>
                  <Input value={formData.mother_occupation} onChange={(e) => updateField('mother_occupation', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-slate-900">Address</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={(e) => updateField('address', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={formData.city} onChange={(e) => updateField('city', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={formData.state} onChange={(e) => updateField('state', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input value={formData.pincode} onChange={(e) => updateField('pincode', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Religion</Label>
                  <Input value={formData.religion} onChange={(e) => updateField('religion', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Caste</Label>
                  <Input value={formData.caste} onChange={(e) => updateField('caste', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
