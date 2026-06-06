/**
 * Builds the WhatsApp Flow JSON for Himalayan Yoga Academy.
 *
 * Version: 7.0, Data API: 3.0, Mode: Endpoint (data_exchange)
 *
 * Screens:
 *  SERVICE_SELECT         — main menu with 3 new intent options + existing
 *  TTC_COURSE_SELECT      — batch dates for Become a Teacher
 *  TTC_CONFIRM            — terminal, triggers PDF + Yes/No message
 *  PRACTICE_PROGRAM_SELECT— programs for Deepen Practice
 *  PRACTICE_SESSION_SELECT— session dates for chosen practice program
 *  PRACTICE_CONFIRM       — terminal
 *  RETREAT_PROGRAM_SELECT — programs for Retreat
 *  RETREAT_DATE_SELECT    — dates for chosen retreat
 *  RETREAT_CONFIRM        — terminal
 *  REGISTER               — new-user registration form
 *  PROFILE                — registered-user profile (read-only)
 *  EVENTS                 — upcoming events list
 *  EVENT_DETAILS          — event detail view
 *  ENQUIRY                — enquiry form
 *  PDFS                   — PDF resources (terminal → webhook delivers)
 *  INFO                   — universal terminal thank-you screen
 */

function buildFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      SERVICE_SELECT: [
        'TTC_COURSE_SELECT',
        'PRACTICE_PROGRAM_SELECT',
        'RETREAT_PROGRAM_SELECT',
        'REGISTER',
        'PROFILE',
        'EVENTS',
        'ENQUIRY',
        'PDFS',
        'INFO',
      ],
      TTC_COURSE_SELECT: ['TTC_CONFIRM'],
      TTC_CONFIRM: [],
      PRACTICE_PROGRAM_SELECT: ['PRACTICE_SESSION_SELECT'],
      PRACTICE_SESSION_SELECT: ['PRACTICE_CONFIRM'],
      PRACTICE_CONFIRM: [],
      RETREAT_PROGRAM_SELECT: ['RETREAT_DATE_SELECT'],
      RETREAT_DATE_SELECT: ['RETREAT_CONFIRM'],
      RETREAT_CONFIRM: [],
      REGISTER: ['INFO'],
      PROFILE: ['INFO'],
      EVENTS: ['EVENT_DETAILS', 'INFO'],
      EVENT_DETAILS: ['INFO'],
      ENQUIRY: ['INFO'],
      PDFS: [],
      INFO: [],
    },
    screens: [
      /* ─── SERVICE_SELECT ─── */
      {
        id: 'SERVICE_SELECT',
        title: 'Choose Service',
        data: {
          welcome_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_welcome_banner: { type: 'boolean', __example__: true },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'ttc', title: '🎓 Become a Teacher', description: 'YA-certified TTC programs' },
              { id: 'practice', title: '🧘 Deepen Practice', description: 'Immersive practice programs' },
              { id: 'retreat', title: '🏕️ Retreat / Short Program', description: '7–26 night retreats' },
              { id: 'register', title: '👤 Register', description: 'Join Himalayan Yoga Academy' },
              { id: 'events', title: '📅 Events', description: 'Upcoming events & workshops' },
              { id: 'enquiry', title: '✉️ Enquiry', description: 'Send us a message' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.welcome_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Welcome to Himalayan Yoga Academy',
              visible: '${data.has_welcome_banner}',
            },
            { type: 'TextBody', text: 'Welcome to Himalayan Yoga Academy 🧘\n\nWhat brings you to Rishikesh?' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_service',
              label: 'Select a service',
              required: true,
              'data-source': '${data.services}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: { selected_service: '${form.selected_service}' },
              },
            },
          ],
        },
      },

      /* ─── TTC_COURSE_SELECT ─── */
      {
        id: 'TTC_COURSE_SELECT',
        title: 'Yoga Teacher Training',
        data: {
          ttc_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_ttc_banner: { type: 'boolean', __example__: false },
          batches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'batch1', title: '200hr TTC — Nov 2026', description: '₹45,000 · 8 spots left' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.ttc_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Yoga Teacher Training',
              visible: '${data.has_ttc_banner}',
            },
            { type: 'TextHeading', text: 'Yoga Teacher Training Courses 🎓' },
            { type: 'TextBody', text: 'YA-certified · Rishikesh, Uttarakhand\n\nSelect an upcoming batch:' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_batch',
              label: 'Available Batches',
              required: true,
              'data-source': '${data.batches}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'ttc_batch_pick',
                  selected_batch: '${form.selected_batch}',
                },
              },
            },
          ],
        },
      },

      /* ─── TTC_CONFIRM (terminal) ─── */
      {
        id: 'TTC_CONFIRM',
        title: 'Great Choice!',
        terminal: true,
        success: true,
        data: {
          confirm_text: { type: 'string', __example__: 'You selected 200hr TTC — Nov 2026' },
          selected_batch: { type: 'string', __example__: 'batch1' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Great choice! 🙏' },
            { type: 'TextBody', text: '${data.confirm_text}' },
            { type: 'TextBody', text: "We'll send you full details, brochure & payment info on WhatsApp right away." },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'complete',
                payload: {
                  kind: 'ttc_confirm',
                  selected_batch: '${data.selected_batch}',
                },
              },
            },
          ],
        },
      },

      /* ─── PRACTICE_PROGRAM_SELECT ─── */
      {
        id: 'PRACTICE_PROGRAM_SELECT',
        title: 'Practice Programs',
        data: {
          practice_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_practice_banner: { type: 'boolean', __example__: false },
          programs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'p1', title: 'Immersive Hatha Yoga', description: '7 days · ₹18,000' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.practice_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Practice Programs',
              visible: '${data.has_practice_banner}',
            },
            { type: 'TextHeading', text: 'Yoga Practice Programs 🧘' },
            { type: 'TextBody', text: 'Select a program to deepen your practice:' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_program',
              label: 'Programs',
              required: true,
              'data-source': '${data.programs}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'practice_program_pick',
                  selected_program: '${form.selected_program}',
                },
              },
            },
          ],
        },
      },

      /* ─── PRACTICE_SESSION_SELECT ─── */
      {
        id: 'PRACTICE_SESSION_SELECT',
        title: 'Available Sessions',
        data: {
          program_name: { type: 'string', __example__: 'Immersive Hatha Yoga' },
          sessions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'sess1', title: '14 Jun 2026', description: '6:00am – 7:30am' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.program_name}' },
            { type: 'TextSubheading', text: 'Choose an available session:' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_session',
              label: 'Sessions',
              required: true,
              'data-source': '${data.sessions}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'practice_session_pick',
                  selected_session: '${form.selected_session}',
                },
              },
            },
          ],
        },
      },

      /* ─── PRACTICE_CONFIRM (terminal) ─── */
      {
        id: 'PRACTICE_CONFIRM',
        title: 'Session Selected!',
        terminal: true,
        success: true,
        data: {
          confirm_text: { type: 'string', __example__: 'Immersive Hatha Yoga — 14 Jun 2026, 6:00am' },
          selected_batch: { type: 'string', __example__: 'sess1' },
          selected_program: { type: 'string', __example__: 'p1' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Your session is selected! 🙏' },
            { type: 'TextBody', text: '${data.confirm_text}' },
            { type: 'TextBody', text: "We'll send full details & payment link on WhatsApp right away." },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'complete',
                payload: {
                  kind: 'practice_confirm',
                  selected_batch: '${data.selected_batch}',
                  selected_program: '${data.selected_program}',
                },
              },
            },
          ],
        },
      },

      /* ─── RETREAT_PROGRAM_SELECT ─── */
      {
        id: 'RETREAT_PROGRAM_SELECT',
        title: 'Retreat Programs',
        data: {
          retreat_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_retreat_banner: { type: 'boolean', __example__: false },
          programs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'r1', title: 'Himalayan Wellness Retreat', description: '7 nights · ₹25,000' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.retreat_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Retreat Programs',
              visible: '${data.has_retreat_banner}',
            },
            { type: 'TextHeading', text: 'Retreats & Short Programs 🏕️' },
            { type: 'TextBody', text: 'Select a retreat program:' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_program',
              label: 'Programs',
              required: true,
              'data-source': '${data.programs}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'retreat_program_pick',
                  selected_program: '${form.selected_program}',
                },
              },
            },
          ],
        },
      },

      /* ─── RETREAT_DATE_SELECT ─── */
      {
        id: 'RETREAT_DATE_SELECT',
        title: 'Available Dates',
        data: {
          program_name: { type: 'string', __example__: 'Himalayan Wellness Retreat' },
          dates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'date1', title: '1 Jul – 7 Jul 2026', description: '3 spots left' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.program_name}' },
            { type: 'TextSubheading', text: 'Choose your dates:' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_date',
              label: 'Dates',
              required: true,
              'data-source': '${data.dates}',
            },
            {
              type: 'Footer',
              label: 'Continue',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'retreat_date_pick',
                  selected_date: '${form.selected_date}',
                },
              },
            },
          ],
        },
      },

      /* ─── RETREAT_CONFIRM (terminal) ─── */
      {
        id: 'RETREAT_CONFIRM',
        title: 'Retreat Selected!',
        terminal: true,
        success: true,
        data: {
          confirm_text: { type: 'string', __example__: 'Himalayan Wellness Retreat — 1–7 Jul 2026' },
          selected_batch: { type: 'string', __example__: 'date1' },
          selected_program: { type: 'string', __example__: 'r1' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: 'Perfect choice! 🏕️' },
            { type: 'TextBody', text: '${data.confirm_text}' },
            { type: 'TextBody', text: "We'll send the retreat brochure, food menu & payment link on WhatsApp right away." },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'complete',
                payload: {
                  kind: 'retreat_confirm',
                  selected_batch: '${data.selected_batch}',
                  selected_program: '${data.selected_program}',
                },
              },
            },
          ],
        },
      },

      /* ─── REGISTER ─── */
      {
        id: 'REGISTER',
        title: 'Register',
        data: {
          register_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_register_banner: { type: 'boolean', __example__: false },
          init_phone: { type: 'string', __example__: '919999999999' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.register_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Register',
              visible: '${data.has_register_banner}',
            },
            { type: 'TextHeading', text: 'Create your profile' },
            { type: 'TextBody', text: 'Please share a few details so we can welcome you 🙏' },
            { type: 'TextInput', name: 'full_name', label: 'Full Name', required: true, 'input-type': 'text' },
            { type: 'TextInput', name: 'email', label: 'Email (optional)', required: false, 'input-type': 'email' },
            {
              type: 'TextInput',
              name: 'mobile',
              label: 'WhatsApp Number',
              required: true,
              'input-type': 'phone',
              enabled: false,
              'init-value': '${data.init_phone}',
            },
            { type: 'DatePicker', name: 'dob', label: 'Date of Birth', required: false },
            {
              type: 'Dropdown',
              name: 'gender',
              label: 'Gender',
              required: false,
              'data-source': [
                { id: 'male', title: 'Male' },
                { id: 'female', title: 'Female' },
                { id: 'other', title: 'Other' },
              ],
            },
            {
              type: 'Footer',
              label: 'Submit',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'register_submit',
                  full_name: '${form.full_name}',
                  email: '${form.email}',
                  mobile: '${data.init_phone}',
                  dob: '${form.dob}',
                  gender: '${form.gender}',
                },
              },
            },
          ],
        },
      },

      /* ─── PROFILE ─── */
      {
        id: 'PROFILE',
        title: 'My Profile',
        data: {
          profile_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_profile_banner: { type: 'boolean', __example__: false },
          profile_info: { type: 'string', __example__: 'Name: John\nEmail: john@x.com' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.profile_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Profile',
              visible: '${data.has_profile_banner}',
            },
            { type: 'TextHeading', text: 'Your Profile' },
            { type: 'TextBody', text: '${data.profile_info}' },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'profile_close' },
              },
            },
          ],
        },
      },

      /* ─── EVENTS ─── */
      {
        id: 'EVENTS',
        title: 'Events',
        data: {
          events_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_events_banner: { type: 'boolean', __example__: false },
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [{ id: 'evt1', title: 'Yoga Day', description: '21 Jun 2026' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.events_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Events',
              visible: '${data.has_events_banner}',
            },
            { type: 'TextSubheading', text: 'Upcoming Events' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_event',
              label: 'Events',
              required: true,
              'data-source': '${data.events}',
            },
            {
              type: 'Footer',
              label: 'View Details',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'event_pick', selected_event: '${form.selected_event}' },
              },
            },
          ],
        },
      },

      /* ─── EVENT_DETAILS ─── */
      {
        id: 'EVENT_DETAILS',
        title: 'Event Details',
        data: {
          event_image: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_event_image: { type: 'boolean', __example__: false },
          event_title: { type: 'string', __example__: 'Yoga Day' },
          event_meta: { type: 'string', __example__: '21 Jun 2026' },
          event_description: { type: 'string', __example__: 'Description...' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.event_image}',
              width: 1000,
              height: 250,
              'scale-type': 'cover',
              'alt-text': 'Event',
              visible: '${data.has_event_image}',
            },
            { type: 'TextHeading', text: '${data.event_title}' },
            { type: 'TextCaption', text: '${data.event_meta}' },
            { type: 'TextBody', text: '${data.event_description}' },
            {
              type: 'Footer',
              label: 'Register Interest',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'event_interest' },
              },
            },
          ],
        },
      },

      /* ─── ENQUIRY ─── */
      {
        id: 'ENQUIRY',
        title: 'Enquiry',
        data: {
          enquiry_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_enquiry_banner: { type: 'boolean', __example__: false },
          init_phone: { type: 'string', __example__: '919999999999' },
          init_name: { type: 'string', __example__: '' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.enquiry_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Enquiry',
              visible: '${data.has_enquiry_banner}',
            },
            { type: 'TextHeading', text: 'Send us your enquiry' },
            {
              type: 'TextInput',
              name: 'name',
              label: 'Full Name',
              required: true,
              'input-type': 'text',
              'init-value': '${data.init_name}',
            },
            {
              type: 'TextInput',
              name: 'mobile',
              label: 'WhatsApp Number',
              required: true,
              'input-type': 'phone',
              enabled: false,
              'init-value': '${data.init_phone}',
            },
            {
              type: 'TextArea',
              name: 'enquiry',
              label: 'Your Enquiry',
              required: true,
              'helper-text': 'Tell us how we can help.',
            },
            {
              type: 'Footer',
              label: 'Submit',
              'on-click-action': {
                name: 'data_exchange',
                payload: {
                  action: 'enquiry_submit',
                  name: '${form.name}',
                  mobile: '${data.init_phone}',
                  enquiry: '${form.enquiry}',
                },
              },
            },
          ],
        },
      },

      /* ─── PDFS (terminal) ─── */
      {
        id: 'PDFS',
        title: 'Resources',
        terminal: true,
        success: true,
        data: {
          pdfs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                image: { type: 'string' },
              },
            },
            __example__: [
              { id: 'pdf1', title: 'Yoga Beginner Guide', description: '15 page PDF' },
            ],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextSubheading', text: 'Pick a resource' },
            { type: 'TextBody', text: 'We will send the selected PDF to your WhatsApp chat.' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_pdf',
              label: 'Available PDFs',
              required: true,
              'data-source': '${data.pdfs}',
            },
            {
              type: 'Footer',
              label: 'Send PDF',
              'on-click-action': {
                name: 'complete',
                payload: {
                  kind: 'pdf_pick',
                  selected_pdf: '${form.selected_pdf}',
                },
              },
            },
          ],
        },
      },

      /* ─── INFO (terminal) ─── */
      {
        id: 'INFO',
        title: 'Thank you',
        terminal: true,
        success: true,
        data: {
          info_title: { type: 'string', __example__: 'Thank you' },
          info_body: { type: 'string', __example__: 'We will get back to you soon.' },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            { type: 'TextHeading', text: '${data.info_title}' },
            { type: 'TextBody', text: '${data.info_body}' },
            {
              type: 'Footer',
              label: 'Close',
              'on-click-action': {
                name: 'complete',
                payload: {},
              },
            },
          ],
        },
      },
    ],
  };
}

module.exports = { buildFlowJSON };
