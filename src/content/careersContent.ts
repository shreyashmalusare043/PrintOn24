import type { CareerItem } from '../services/api';

export const careersFaqs: Array<[string, string]> = [
  ['Is printOn24 hiring?', 'Active openings at printOn24 are listed on this Careers page. The list is loaded from the active careers records available to the application.'],
  ['Does printOn24 offer internships?', 'The active careers list may include part-time or internship opportunities. Check the role type and location shown for each current opening.'],
  ['Where is printOn24 located?', 'printOn24 is based in Pune, Maharashtra, India. Each opening shows its applicable work location.'],
  ['Can I work remotely at printOn24?', 'Remote or hybrid work is role-specific. Read the location shown on the current opening and confirm the arrangement during the application process.'],
  ['How do I apply to printOn24?', 'Choose an active opening, select Apply Now, sign in when requested, and submit the application form with your name and email.'],
  ['What should I include in a printOn24 job application?', 'Provide accurate contact details and the role you are applying for. Add relevant college, experience or portfolio information when the application form requests it.'],
  ['How can I become a campus ambassador?', 'Look for an active Campus Brand Ambassador or Growth Lead opening. If it is listed, apply through that opening and provide your genuine campus or student-community experience.'],
  ['How can I prepare for a developer role at printOn24?', 'Review the requirements shown on the active developer opening and be ready to discuss the skills and experience you actually have.'],
  ['Can I apply for a role that is not listed?', 'You can contact printOn24 through the available support contact, but applications are processed against active openings when a role is listed.'],
  ['How do I check my application status?', 'The current application form submits your details for the selected opening. Contact printOn24 through the available support contact for status questions.'],
  ['Which teams are hiring at printOn24?', 'The active openings identify the hiring department, such as Marketing, Operations or Engineering. The current database list is the source of truth.'],
  ['Which printOn24 roles are part-time or full-time?', 'The role card shows the employment type for each active opening, including part-time, internship or full-time where applicable.'],
  ['Does printOn24 hire for Pune campuses?', 'A campus-focused role may list Pune campuses in its location. Check the active opening for the current campus scope.'],
  ['Can I work with printOn24 partner print shops?', 'Some operations roles may involve connected partner print shops. Apply only to an active role whose description and requirements match your experience.']
];

export const careerSlug = (title: string) => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const careerDescription = (role: CareerItem) => `${role.title} in ${role.location}. ${role.description} Employment type: ${role.type}. Experience: ${role.experience}.`;
