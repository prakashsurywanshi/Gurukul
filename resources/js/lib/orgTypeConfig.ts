import type { OrgType } from '../Pages/sidebarMenu';

export interface OrgTypeFeatures {
    id: OrgType;
    labelKey: string;
    groupWordKey: string;
    timetableWordKey: string;
    testsWordKey: string;
    academicUnitKey: string;
    supportsCourses: boolean;
    supportsSemesters: boolean;
    supportsPromotion: boolean;
    supportsMockTests: boolean;
}

export const ORG_TYPE_FEATURES: Record<OrgType, OrgTypeFeatures> = {
    school: {
        id: 'school',
        labelKey: 'School',
        groupWordKey: 'Class',
        timetableWordKey: 'Class Timetable',
        testsWordKey: 'Exams',
        academicUnitKey: 'Academic Year',
        supportsCourses: false,
        supportsSemesters: false,
        supportsPromotion: true,
        supportsMockTests: false,
    },
    college: {
        id: 'college',
        labelKey: 'College',
        groupWordKey: 'Course',
        timetableWordKey: 'Lecture Timetable',
        testsWordKey: 'Exams',
        academicUnitKey: 'Semester',
        supportsCourses: true,
        supportsSemesters: true,
        supportsPromotion: false,
        supportsMockTests: false,
    },
    coaching: {
        id: 'coaching',
        labelKey: 'Coaching Center',
        groupWordKey: 'Batch',
        timetableWordKey: 'Batch Schedule',
        testsWordKey: 'Weekly / Mock Tests',
        academicUnitKey: 'Batch Cycle',
        supportsCourses: true,
        supportsSemesters: false,
        supportsPromotion: false,
        supportsMockTests: true,
    },
    university: {
        id: 'university',
        labelKey: 'University',
        groupWordKey: 'Course',
        timetableWordKey: 'Lecture Timetable',
        testsWordKey: 'Exams',
        academicUnitKey: 'Semester',
        supportsCourses: true,
        supportsSemesters: true,
        supportsPromotion: false,
        supportsMockTests: false,
    },
};

export const COLLEGE_MODE_TYPES: OrgType[] = ['college', 'coaching', 'university'];

export const ORG_TYPE_ORDER: OrgType[] = ['school', 'college', 'coaching', 'university'];

export function isCollegeModeType(type?: string | null): boolean {
    return COLLEGE_MODE_TYPES.includes(type as OrgType);
}

export function orgTypeFeatures(type?: string | null): OrgTypeFeatures {
    return ORG_TYPE_FEATURES[(type as OrgType) ?? 'school'] ?? ORG_TYPE_FEATURES.school;
}

export function orgTypeLabel(type?: string | null): string {
    return orgTypeFeatures(type).labelKey;
}