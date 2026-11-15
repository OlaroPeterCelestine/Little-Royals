/** Native school cloud apps — free local packages (no Nextcloud). */

export type SchoolCloudAppId =
  | 'mail'
  | 'files'
  | 'calendar'
  | 'contacts'
  | 'talk'
  | 'boards'
  | 'forms'
  | 'docs'

export interface SchoolCloudApp {
  id: SchoolCloudAppId
  label: string
  description: string
  icon: string
  like: string
  package: string
}

export const schoolCloudApps: SchoolCloudApp[] = [
  {
    id: 'files',
    label: 'Files & Drive',
    description: 'Shared folders, policies, parent packs',
    icon: 'lucide-hard-drive',
    like: 'Google Drive',
    package: 'Native files API + file-saver',
  },
  {
    id: 'mail',
    label: 'Mail',
    description: 'School inboxes and SMTP mailer',
    icon: 'lucide-mail',
    like: 'Gmail',
    package: 'Custom /api/v1/mail + TipTap',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Staff & school calendars',
    icon: 'lucide-calendar-days',
    like: 'Google Calendar',
    package: 'FullCalendar',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Staff and parent address books',
    icon: 'lucide-contact',
    like: 'Contacts',
    package: 'Desk people modules',
  },
  {
    id: 'talk',
    label: 'Talk & video',
    description: 'Chat and video calls (STUN / optional TURN)',
    icon: 'lucide-video',
    like: 'Meet / Chat',
    package: 'WebRTC + PeerJS + Free STUN',
  },
  {
    id: 'boards',
    label: 'Boards',
    description: 'Task boards for admins & teachers',
    icon: 'lucide-kanban',
    like: 'Boards',
    package: 'vuedraggable',
  },
  {
    id: 'forms',
    label: 'Forms',
    description: 'Surveys and school forms',
    icon: 'lucide-clipboard-list',
    like: 'Google Forms',
    package: 'Server catalog forms',
  },
  {
    id: 'docs',
    label: 'Office docs',
    description: 'Docs / Sheets / Slides (local)',
    icon: 'lucide-file-pen',
    like: 'Docs / Sheets',
    package: 'TipTap + SheetJS (xlsx)',
  },
]
