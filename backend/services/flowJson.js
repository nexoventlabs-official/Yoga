/**
 * Builds the Endpoint-mode Flow JSON for the Himalayan Yoga Academy welcome flow.
 *
 * Single flow, multiple screens. Backend `INIT` returns the right screen.
 * `data_exchange` actions return the next screen with dynamic content.
 *
 * Screens
 *  ─ SERVICE_SELECT      banner + radio list (Register/Profile, Yoga, Training, Events, Enquiry)
 *  ─ REGISTER            new-user registration form
 *  ─ PROFILE             registered-user profile (read-only summary)
 *  ─ YOGA_PACKAGES       radio list (Yoga Retreats, Sound Healing, Special Yoga Day)
 *  ─ TRAINING_PACKAGES   radio list (Meditation Training, Sound Healing, Yoga Training)
 *  ─ EVENTS              dynamic event list (radio)
 *  ─ EVENT_DETAILS       event banner + description
 *  ─ ENQUIRY             enquiry form
 *  ─ INFO                terminal "thank you" screen with title + body
 */

function buildFlowJSON() {
  return {
    version: '7.0',
    data_api_version: '3.0',
    routing_model: {
      // INFO is the universal terminal screen — every other screen may transition to it
      SERVICE_SELECT: ['REGISTER', 'PROFILE', 'YOGA_PACKAGES', 'TRAINING_PACKAGES', 'EVENTS', 'ENQUIRY', 'PDFS', 'INFO'],
      REGISTER: ['INFO'],
      PROFILE: ['INFO'],
      YOGA_PACKAGES: ['INFO'],
      TRAINING_PACKAGES: ['INFO'],
      EVENTS: ['EVENT_DETAILS', 'INFO'],
      EVENT_DETAILS: ['INFO'],
      ENQUIRY: ['INFO'],
      PDFS: ['INFO'],
      INFO: [],
    },
    screens: [
      // ─── SERVICE_SELECT ───
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
              { id: 'register', title: 'Register', description: 'Join Himalayan Yoga Academy' },
              { id: 'yoga_packages', title: 'Yoga Packages', description: 'Explore yoga retreats & more' },
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
            { type: 'TextBody', text: 'Welcome to Himalayan Yoga Academy 🧘' },
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

      // ─── REGISTER ───
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
            { type: 'DatePicker', name: 'dob', label: 'Date of Birth', required: true },
            {
              type: 'Dropdown',
              name: 'gender',
              label: 'Gender',
              required: true,
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

      // ─── PROFILE ───
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

      // ─── YOGA_PACKAGES ───
      {
        id: 'YOGA_PACKAGES',
        title: 'Yoga Packages',
        data: {
          yoga_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_yoga_banner: { type: 'boolean', __example__: false },
          packages: {
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
            __example__: [{ id: 'yoga_retreats', title: 'Yoga Retreats', description: '7-day retreats' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.yoga_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Yoga Packages',
              visible: '${data.has_yoga_banner}',
            },
            { type: 'TextSubheading', text: 'Choose a Yoga Package' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_package',
              label: 'Yoga Packages',
              required: true,
              'data-source': '${data.packages}',
            },
            {
              type: 'Footer',
              label: 'Enquire',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'yoga_pick', selected_package: '${form.selected_package}' },
              },
            },
          ],
        },
      },

      // ─── TRAINING_PACKAGES ───
      {
        id: 'TRAINING_PACKAGES',
        title: 'Training Packages',
        data: {
          training_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_training_banner: { type: 'boolean', __example__: false },
          trainings: {
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
            __example__: [{ id: 'meditation_training', title: 'Meditation Training', description: 'Daily classes' }],
          },
        },
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Image',
              src: '${data.training_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Training Packages',
              visible: '${data.has_training_banner}',
            },
            { type: 'TextSubheading', text: 'Choose a Training Package' },
            {
              type: 'RadioButtonsGroup',
              name: 'selected_training',
              label: 'Training Packages',
              required: true,
              'data-source': '${data.trainings}',
            },
            {
              type: 'Footer',
              label: 'Enquire',
              'on-click-action': {
                name: 'data_exchange',
                payload: { action: 'training_pick', selected_training: '${form.selected_training}' },
              },
            },
          ],
        },
      },

      // ─── EVENTS ───
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

      // ─── EVENT_DETAILS ───
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

      // ─── ENQUIRY ───
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

      // ─── PDFS (list of downloadable PDF resources) ───
      {
        id: 'PDFS',
        title: 'Resources',
        data: {
          pdfs_banner: { type: 'string', __example__: 'iVBORw0KGgo' },
          has_pdfs_banner: { type: 'boolean', __example__: false },
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
            {
              type: 'Image',
              src: '${data.pdfs_banner}',
              width: 1000,
              height: 125,
              'scale-type': 'cover',
              'alt-text': 'Resources',
              visible: '${data.has_pdfs_banner}',
            },
            { type: 'TextSubheading', text: 'Pick a resource' },
            { type: 'TextBody', text: 'We will send the selected PDF to you on WhatsApp.' },
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
                name: 'data_exchange',
                payload: {
                  action: 'pdf_pick',
                  selected_pdf: '${form.selected_pdf}',
                },
              },
            },
          ],
        },
      },

      // ─── INFO (terminal) ───
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
